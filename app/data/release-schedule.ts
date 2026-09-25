import { parse as parseSemver } from 'semver';
import memoize from '@keyvhq/memoize';
import { ElectronRelease, getReleasesOrUpdate } from './release-data';
import { extractChromiumMilestone, getPrereleaseType } from '../helpers/version';
import { getMilestoneSchedule } from './dash/chromium-schedule';
import { getKeyvCache } from './cache';
import historicalSchedule from './historical-schedule.json';

export interface MajorReleaseSchedule {
  version: string; // `${major}.0.0`
  branch: string; // release branch name
  alphaDate: string | null; // YYYY-MM-DD -- some old versions didn't have alpha releases
  betaDate: string; // YYYY-MM-DD
  stableDate: string; // YYYY-MM-DD
  eolDate: string; // YYYY-MM-DD
  chromiumVersion: number; // milestone, aka major version
  nodeVersion: string; // full semver
  status: 'stable' | 'prerelease' | 'nightly' | 'eol';
}

type AbsoluteMajorReleaseSchedule = Omit<MajorReleaseSchedule, 'status'>;

// Schedules for EOL majors, which no longer change. These are used as-is instead of being
// recalculated. Majors 2-41 hold actual release dates in Pacific time, with EOL being the
// later of the actual release date of the major that ended support (e.g. v27 for v22's
// extended EOL) and the last release on the line. Later majors are added by the
// `update-historical-schedule` workflow exactly as served by /schedule.json once they
// have been EOL for a week.
const HISTORICAL_SCHEDULE: AbsoluteMajorReleaseSchedule[] = historicalSchedule;

// Schedule overrides for calculated (non-historical) majors whose dates deviate from the
// calculated estimates. Historical majors come from `historical-schedule.json` instead.
const SCHEDULE_OVERRIDES: Map<string, Partial<AbsoluteMajorReleaseSchedule>> = new Map();

interface MajorReleaseGroup {
  major: number;
  releases: ElectronRelease[];
  firstStable?: ElectronRelease; // Only used for Chromium milestone extraction
}

// Number of supported stable majors
const SUPPORT_WINDOW = 3;

// Chromium milestones per Electron major: 4 starting with v45, 2 for all prior versions
const getMilestonesPerMajor = (major: number): number => {
  return major >= 45 ? 4 : 2;
};

// Sum of Chromium milestone steps from fromMajor (exclusive) to toMajor (inclusive)
const calculateMilestoneOffset = (fromMajor: number, toMajor: number): number => {
  let offset = 0;
  for (let m = fromMajor + 1; m <= toMajor; m++) {
    offset += getMilestonesPerMajor(m);
  }
  return offset;
};

const offsetDays = (dateStr: string, days: number): string => {
  const date = new Date(dateStr + 'T00:00:00');
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
};

/**
 * Get absolute schedule data (cacheable, not time-dependent).
 */
export const getAbsoluteSchedule = memoize(
  async (): Promise<AbsoluteMajorReleaseSchedule[]> => {
    const allReleases = await getReleasesOrUpdate();

    const schedule = new Map<number, AbsoluteMajorReleaseSchedule>();
    const milestoneMap = new Map<number, number>();
    for (const entry of HISTORICAL_SCHEDULE) {
      const major = parseInt(entry.version.split('.')[0], 10);
      schedule.set(major, { ...entry });
      milestoneMap.set(major, entry.chromiumVersion);
    }
    // Every major after the newest historical one is calculated
    const lastHistoricalMajor = Math.max(...schedule.keys());

    // Group releases of calculated (non-historical) majors by major version
    const majorGroups = new Map<number, MajorReleaseGroup>();

    for (const release of allReleases) {
      const major = parseSemver(release.version)?.major;
      if (!major || major <= lastHistoricalMajor) continue;

      if (!majorGroups.has(major)) {
        majorGroups.set(major, { major, releases: [] });
      }

      const group = majorGroups.get(major)!;
      group.releases.push(release);

      const prereleaseType = getPrereleaseType(release.version);

      // Track first stable release (last in iteration = first chronologically)
      // Only used for extracting Chromium milestone
      if (prereleaseType === 'stable') {
        group.firstStable = release;
      }
    }

    // Build milestone map in forward pass, continuing from the historical majors
    const sortedMajors = Array.from(majorGroups.keys()).sort((a, b) => a - b);

    for (const major of sortedMajors) {
      const group = majorGroups.get(major)!;

      if (group.firstStable) {
        // Use actual Chromium version from stable release
        const milestone = extractChromiumMilestone(group.firstStable.chrome);
        milestoneMap.set(major, milestone);
      } else {
        // Estimate: M(V) = M(V-1) + getMilestonesPerMajor(V)
        const prevMajor = major - 1;
        const prevMilestone = milestoneMap.get(prevMajor);

        if (!prevMilestone) {
          throw new Error(
            `Cannot determine Chromium milestone for Electron ${major}: no stable release and no previous milestone`,
          );
        }

        milestoneMap.set(major, prevMilestone + getMilestonesPerMajor(major));
      }
    }

    // Build absolute schedule data for each calculated major
    for (const major of sortedMajors) {
      const milestone = milestoneMap.get(major)!;
      const chromiumSchedule = await getMilestoneSchedule(milestone);

      // Alpha is two days after the previous major's stable. Beta follows Chromium's
      // earliest beta (a Wednesday), offset by -1 to land on Tuesday
      const alphaDate = offsetDays(schedule.get(major - 1)!.stableDate, 2);
      const betaDate = offsetDays(chromiumSchedule.earliestBeta, -1);

      const group = majorGroups.get(major)!;
      const latestRelease = group.releases[0];

      const entry: AbsoluteMajorReleaseSchedule = {
        version: `${major}.0.0`,
        branch: `${major}-x-y`,
        alphaDate,
        betaDate,
        stableDate: chromiumSchedule.stableDate,
        chromiumVersion: milestone,
        nodeVersion: group.firstStable?.node ?? latestRelease.node,
        eolDate: '', // Placeholder, will be calculated
      };

      // Apply overrides early so they cascade to dependent calculations (e.g. EOL)
      const override = SCHEDULE_OVERRIDES.get(entry.version);
      if (override) {
        Object.assign(entry, override);
      }

      schedule.set(major, entry);
    }

    // Calculate EOL dates
    for (const entry of schedule.values()) {
      if (entry.eolDate !== '') {
        // Already set by the historical schedule or an override
        continue;
      }

      const major = parseInt(entry.version.split('.')[0], 10);
      const eolMajor = major + SUPPORT_WINDOW;
      const eolEntry = schedule.get(eolMajor);

      if (eolEntry) {
        entry.eolDate = eolEntry.stableDate;
      } else {
        // Extrapolate for future versions
        const maxMajor = Math.max(...Array.from(schedule.keys()));
        const maxEntry = schedule.get(maxMajor)!;
        const milestone = maxEntry.chromiumVersion + calculateMilestoneOffset(maxMajor, eolMajor);
        const eolSchedule = await getMilestoneSchedule(milestone);
        entry.eolDate = eolSchedule.stableDate;
      }
    }

    return Array.from(schedule.entries())
      .sort(([a], [b]) => a - b)
      .map(([, entry]) => entry);
  },
  getKeyvCache('absolute-schedule'),
  {
    // Cache for 2 hours
    ttl: 2 * 60 * 60 * 1000,
    // At 10 minutes, refetch but serve stale data
    staleTtl: 10 * 60 * 1000,
  },
);

/**
 * Get relative schedule data (time-dependent, includes status and EOL).
 */
export async function getRelativeSchedule(): Promise<MajorReleaseSchedule[]> {
  // Find latest major version
  const allReleases = await getReleasesOrUpdate();
  const latestStableMajor = parseInt(
    allReleases
      .find((release) => getPrereleaseType(release.version) === 'stable')
      ?.version.split('.')[0] || '0',
    10,
  );

  const absoluteData = await getAbsoluteSchedule();
  const minActiveMajor = latestStableMajor - SUPPORT_WINDOW + 1;

  const schedule: MajorReleaseSchedule[] = absoluteData.map((entry) => {
    const major = parseInt(entry.version.split('.')[0], 10);

    let branch = entry.branch;
    let status: MajorReleaseSchedule['status'];
    if (major > latestStableMajor) {
      const hasNonNightlyRelease = allReleases.find(
        (release) =>
          release.version.startsWith(`${major}.`) &&
          getPrereleaseType(release.version) !== 'nightly',
      );
      status = hasNonNightlyRelease ? 'prerelease' : 'nightly';
      branch = status === 'nightly' ? 'main' : branch;
    } else if (major >= minActiveMajor) {
      status = 'stable';
    } else {
      status = 'eol';
    }

    return { ...entry, branch, status };
  });

  // Sort descending by major version
  return schedule.sort((a, b) => {
    const aMajor = parseInt(a.version.split('.')[0], 10);
    const bMajor = parseInt(b.version.split('.')[0], 10);
    return bMajor - aMajor;
  });
}
