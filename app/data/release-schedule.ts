import { parse as parseSemver } from 'semver';
import memoize from '@keyvhq/memoize';
import { ElectronRelease, getReleasesOrUpdate } from './release-data';
import { extractChromiumMilestone, getPrereleaseType } from '~/helpers/version';
import { getMilestoneSchedule } from './dash/chromium-schedule';
import { getKeyvCache } from './cache';

export interface MajorReleaseSchedule {
  version: string; // `${major}.0.0`
  alphaDate: string | null; // YYYY-MM-DD -- some old versions didn't have alpha releases
  betaDate: string; // YYYY-MM-DD
  stableDate: string; // YYYY-MM-DD
  eolDate: string; // YYYY-MM-DD
  chromiumVersion: number; // milestone, aka major version
  nodeVersion: string; // full semver
  status: 'stable' | 'prerelease' | 'nightly' | 'eol';
}

type AbsoluteMajorReleaseSchedule = Omit<MajorReleaseSchedule, 'status'>;

interface MajorReleaseGroup {
  major: number;
  releases: ElectronRelease[];
  firstStable?: ElectronRelease; // Only used for Chromium milestone extraction
}

// Schedule overrides for dates that deviate from calculated estimates:
// - v2-v5: Pre-Chromium alignment era (before standardized release cadence afaik)
// - v6-v14: Transition to modern release process
// - v15: Introduction of alpha releases
// - v16+: Minor adjustments from Chromium schedule predictions
const SCHEDULE_OVERRIDES: Map<string, Partial<AbsoluteMajorReleaseSchedule>> = new Map([
  [
    '2.0.0',
    {
      betaDate: '2018-02-21',
      stableDate: '2018-05-01',
    },
  ],
  [
    '3.0.0',
    {
      betaDate: '2018-06-21',
      stableDate: '2018-09-18',
    },
  ],
  [
    '4.0.0',
    {
      betaDate: '2018-10-11',
      stableDate: '2018-12-20',
    },
  ],
  [
    '5.0.0',
    {
      betaDate: '2019-01-22',
      stableDate: '2019-04-23',
    },
  ],
  [
    '6.0.0',
    {
      betaDate: '2019-04-25',
    },
  ],
  [
    '15.0.0',
    {
      alphaDate: '2021-07-20',
      betaDate: '2021-09-01',
    },
  ],
  [
    '16.0.0',
    {
      betaDate: '2021-10-20',
    },
  ],
  [
    '22.0.0',
    {
      // Policy exception: extended EOL to support extended end-of-life for Windows 7/8/8.1
      eolDate: '2023-10-10',
    },
  ],
  [
    '28.0.0',
    {
      alphaDate: '2023-10-11',
      betaDate: '2023-11-06',
    },
  ],
  [
    '32.0.0',
    {
      alphaDate: '2024-06-14',
    },
  ],
]);

// Determine support window: 4 for v12-15, 3 for the rest
const getSupportWindow = (major: number): number => {
  return major >= 12 && major <= 15 ? 4 : 3;
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

    // Group releases by major version (filter to >= 2)
    const majorGroups = new Map<number, MajorReleaseGroup>();

    for (const release of allReleases) {
      const major = parseSemver(release.version)?.major;
      if (!major || major < 2) continue;

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

    // Build milestone map in forward pass
    const milestoneMap = new Map<number, number>();
    const sortedMajors = Array.from(majorGroups.keys()).sort((a, b) => a - b);

    for (const major of sortedMajors) {
      const group = majorGroups.get(major)!;

      if (group.firstStable) {
        // Use actual Chromium version from stable release
        const milestone = extractChromiumMilestone(group.firstStable.chrome);
        milestoneMap.set(major, milestone);
      } else {
        // Estimate: M(V) = M(V-1) + 2
        const prevMajor = major - 1;
        const prevMilestone = milestoneMap.get(prevMajor);

        if (!prevMilestone) {
          throw new Error(
            `Cannot determine Chromium milestone for Electron ${major}: no stable release and no previous milestone`,
          );
        }

        milestoneMap.set(major, prevMilestone + 2);
      }
    }

    // Build absolute schedule data for each major
    const schedule = new Map<number, AbsoluteMajorReleaseSchedule>();

    for (const major of sortedMajors) {
      const milestone = milestoneMap.get(major)!;
      const chromiumSchedule = await getMilestoneSchedule(milestone);

      // Alpha/Beta pattern:
      // | ------- | ------------------ | ------------------------- |
      // | Version | Alpha              | Beta                      |
      // | ------- | ------------------ | ------------------------- |
      // | v2-5    | None               | History (overrides)       |
      // | v6-14   | None               | Prev stable + 2 days      |
      // | v15+    | Prev stable + 2    | Chromium dates + offset   |
      // | ------- | ------------------ | ------------------------- |
      let alphaDate: string | null = null;
      let betaDate: string;
      if (major < 6) {
        // (no alpha)
        betaDate = ''; // Will be set by override
      } else {
        const prevStablePlus2 = offsetDays(schedule.get(major - 1)!.stableDate, 2);

        if (major < 15) {
          // (no alpha)
          betaDate = prevStablePlus2;
        } else {
          alphaDate = prevStablePlus2;

          // Chromium beta offset pattern:
          // - M113 and below: beta on Thursdays, offset -2 to Tuesday
          // - M114 and above: beta on Wednesdays, offset -1 to Tuesday
          const betaOffset = milestone <= 113 ? -2 : -1;
          betaDate = offsetDays(chromiumSchedule.earliestBeta, betaOffset);
        }
      }

      const group = majorGroups.get(major)!;
      const latestRelease = group.releases[0];

      const entry: AbsoluteMajorReleaseSchedule = {
        version: `${major}.0.0`,
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
        // Already set via override
        continue;
      }

      const major = parseInt(entry.version.split('.')[0], 10);
      const eolMajor = major + getSupportWindow(major);
      const eolEntry = schedule.get(eolMajor);

      if (eolEntry) {
        entry.eolDate = eolEntry.stableDate;
      } else {
        // Extrapolate for future versions
        const maxMajor = Math.max(...Array.from(schedule.keys()));
        const maxEntry = schedule.get(maxMajor)!;
        const milestone = maxEntry.chromiumVersion + (eolMajor - maxMajor) * 2; // 2 milestones per major
        const eolSchedule = await getMilestoneSchedule(milestone);
        entry.eolDate = eolSchedule.stableDate;
      }
    }

    // NB: `Map.values()` iterates in insertion order (ascending major)
    return Array.from(schedule.values());
  },
  getKeyvCache('absolute-schedule'),
  {
    // Cache for 2 hours
    ttl: 2 * 60 * 60 * 1000,
    // At 10 mineutes, refetch but serve stale data
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
  const supportWindow = getSupportWindow(latestStableMajor);
  const minActiveMajor = latestStableMajor - supportWindow + 1;

  const schedule: MajorReleaseSchedule[] = absoluteData.map((entry) => {
    const major = parseInt(entry.version.split('.')[0], 10);

    let status: MajorReleaseSchedule['status'];
    if (major > latestStableMajor) {
      const hasNonNightlyRelease = allReleases.find(
        (release) =>
          release.version.startsWith(`${major}.`) &&
          getPrereleaseType(release.version) !== 'nightly',
      );
      status = hasNonNightlyRelease ? 'prerelease' : 'nightly';
    } else if (major >= minActiveMajor) {
      status = 'stable';
    } else {
      status = 'eol';
    }

    return { ...entry, status };
  });

  // Sort descending by major version
  return schedule.sort((a, b) => {
    const aMajor = parseInt(a.version.split('.')[0], 10);
    const bMajor = parseInt(b.version.split('.')[0], 10);
    return bMajor - aMajor;
  });
}
