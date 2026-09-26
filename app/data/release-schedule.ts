import { parse as parseSemver } from 'semver';
import memoize from '@keyvhq/memoize';
import { ElectronRelease, getReleasesOrUpdate } from './release-data';
import { extractChromiumMilestone, getPrereleaseType } from '../helpers/version';
import { getMilestoneSchedule } from './dash/chromium-schedule';
import { getKeyvCache } from './cache';
import historicalSchedule from './historical-schedule.json';
import { milestoneFetchedAt, now, since, timingLog } from './schedule-timing';

// TEMPORARY [schedule-timing]: counts absolute schedule computations, to tell a cache hit
// (no computation) from a stale hit (computation still running in the background)
const absoluteComputes = { started: 0, finished: 0 };

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

// Number of supported stable majors, keyed off the major in case it changes again
const getSupportWindow = (_major: number): number => {
  return 3;
};

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
    const calcStart = now();
    absoluteComputes.started++;
    timingLog('getAbsoluteSchedule compute start');
    const allReleases = await getReleasesOrUpdate();
    timingLog(`getAbsoluteSchedule getReleasesOrUpdate took=${since(calcStart)}`);

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
      // Most releases are of historical majors, so skip those before the costlier semver parse
      if (parseInt(release.version, 10) <= lastHistoricalMajor) continue;

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

    // Fetch every Chromium milestone schedule the calculation needs concurrently, so an
    // uncached calculation costs one round trip instead of one per milestone: one milestone per
    // calculated major, plus those of the future majors that extrapolated EOL dates land on
    const maxMajor = Math.max(lastHistoricalMajor, ...sortedMajors);
    const milestones = new Set(sortedMajors.map((major) => milestoneMap.get(major)!));
    for (const major of sortedMajors) {
      const eolMajor = major + getSupportWindow(major);
      if (eolMajor > maxMajor && !SCHEDULE_OVERRIDES.get(`${major}.0.0`)?.eolDate) {
        milestones.add(milestoneMap.get(maxMajor)! + calculateMilestoneOffset(maxMajor, eolMajor));
      }
    }
    const prefetchStart = now();
    timingLog(`getAbsoluteSchedule prefetch start milestones=${Array.from(milestones).join(',')}`);
    const chromiumSchedules = new Map(
      await Promise.all(
        Array.from(milestones, async (milestone) => {
          const lookupStart = now();
          const result = await getMilestoneSchedule(milestone);
          const source =
            (milestoneFetchedAt.get(milestone) ?? -1) >= lookupStart ? 'network' : 'cache';
          timingLog(
            `chromium M${milestone} lookup start=+${(lookupStart - calcStart).toFixed(1)}ms ` +
              `end=+${(now() - calcStart).toFixed(1)}ms took=${since(lookupStart)} source=${source}`,
          );
          return [milestone, result] as const;
        }),
      ),
    );
    timingLog(`getAbsoluteSchedule prefetch Promise.all took=${since(prefetchStart)}`);

    // Build absolute schedule data for each calculated major
    for (const major of sortedMajors) {
      const milestone = milestoneMap.get(major)!;
      const chromiumSchedule = chromiumSchedules.get(milestone)!;

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
      const eolMajor = major + getSupportWindow(major);
      const eolEntry = schedule.get(eolMajor);

      if (eolEntry) {
        entry.eolDate = eolEntry.stableDate;
      } else {
        // Extrapolate for future versions
        const maxEntry = schedule.get(maxMajor)!;
        const milestone = maxEntry.chromiumVersion + calculateMilestoneOffset(maxMajor, eolMajor);
        // Prefetched above, unless an override changed the newest major's Chromium version
        const eolSchedule =
          chromiumSchedules.get(milestone) ?? (await getMilestoneSchedule(milestone));
        entry.eolDate = eolSchedule.stableDate;
      }
    }

    const result = Array.from(schedule.entries())
      .sort(([a], [b]) => a - b)
      .map(([, entry]) => entry);
    absoluteComputes.finished++;
    timingLog(`getAbsoluteSchedule compute done took=${since(calcStart)}`);
    return result;
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
  const start = now();
  // Find latest major version
  const allReleases = await getReleasesOrUpdate();
  timingLog(`getRelativeSchedule getReleasesOrUpdate took=${since(start)}`);
  const latestStableMajor = parseInt(
    allReleases
      .find((release) => getPrereleaseType(release.version) === 'stable')
      ?.version.split('.')[0] || '0',
    10,
  );

  const absoluteStart = now();
  const { started, finished } = absoluteComputes;
  const absoluteData = await getAbsoluteSchedule();
  const cacheState =
    absoluteComputes.finished > finished
      ? 'miss (computed)'
      : absoluteComputes.started > started
        ? 'stale (served cached, recomputing in background)'
        : 'hit';
  timingLog(
    `getRelativeSchedule getAbsoluteSchedule took=${since(absoluteStart)} cache=${cacheState}`,
  );
  const supportWindow = getSupportWindow(latestStableMajor);
  const minActiveMajor = latestStableMajor - supportWindow + 1;

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
  const sorted = schedule.sort((a, b) => {
    const aMajor = parseInt(a.version.split('.')[0], 10);
    const bMajor = parseInt(b.version.split('.')[0], 10);
    return bMajor - aMajor;
  });
  timingLog(`getRelativeSchedule total took=${since(start)}`);
  return sorted;
}
