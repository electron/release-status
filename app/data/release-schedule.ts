import { parse as parseSemver } from 'semver';
import memoize from '@keyvhq/memoize';
import { ElectronRelease, getReleasesOrUpdate } from './release-data';
import { extractChromiumMilestone, extractNodeVersion, getPrereleaseType } from '~/helpers/version';
import { getMilestoneSchedule } from './dash/chromium-schedule';
import { getKeyvCache } from './cache';

export interface MajorReleaseSchedule {
  version: string; // `${major}.0.0`
  alphaDate: string | null; // YYYY-MM-DD -- some old versions didn't have alpha releases
  betaDate: string; // YYYY-MM-DD
  stableDate: string; // YYYY-MM-DD
  eolDate: string; // YYYY-MM-DD
  chromiumVersion: number; // milestone, aka major version
  nodeVersion: string; // `${major}.${minor}`
  status: 'active' | 'prerelease' | 'eol';
}

type AbsoluteMajorReleaseSchedule = Omit<MajorReleaseSchedule, 'status'>;

interface MajorReleaseGroup {
  major: number;
  releases: ElectronRelease[];
  firstStable?: ElectronRelease; // Only used for Chromium milestone extraction
}

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
    },
  ],
]);

/**
 * Add days to a date string in YYYY-MM-DD format.
 */
const addDays = (dateString: string, days: number): string => {
  const date = new Date(dateString + 'T00:00:00');
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
};

// Determine support window: 4 for v12-15, 3 for the rest
const getSupportWindow = (major: number): number => {
  return major >= 12 && major <= 15 ? 4 : 3;
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

    // Helper to get stable date estimate
    const getStableDate = async (major: number): Promise<string> => {
      const milestone = milestoneMap.get(major);
      if (!milestone) {
        throw new Error(`No milestone found for major ${major}`);
      }

      const schedule = await getMilestoneSchedule(milestone);
      return schedule.stableDate;
    };

    // Helper to get alpha date estimate
    const getAlphaDate = async (major: number): Promise<string> => {
      // Estimate: previous major's stable + 2 days
      // Note: There is no exact rule for alpha release dates at this time,
      // but historically they have been released ~2 days after the previous stable.
      const prevMajor = major - 1;
      const prevStableDate = await getStableDate(prevMajor);
      return addDays(prevStableDate, 2);
    };

    // Build absolute schedule data for each major
    const schedule: AbsoluteMajorReleaseSchedule[] = [];

    for (const major of sortedMajors) {
      const milestone = milestoneMap.get(major)!;

      // Get beta date from Chromium schedule
      const chromiumSchedule = await getMilestoneSchedule(milestone);
      const betaDate = chromiumSchedule.earliestBeta;

      // Get stable date from Chromium schedule
      const stableDate = chromiumSchedule.stableDate;

      // Get alpha date (null for v14 and earlier, estimated for v15+)
      let alphaDate: string | null;
      if (major <= 14) {
        // No alpha releases before v15
        alphaDate = null;
      } else {
        alphaDate = await getAlphaDate(major);
      }

      // Extract Node.js version from latest release in major
      const latestRelease = majorGroups.get(major)!.releases[0]; // Already sorted newest first
      const nodeVersion = extractNodeVersion(latestRelease.node);

      const entry: AbsoluteMajorReleaseSchedule = {
        version: `${major}.0.0`,
        alphaDate,
        betaDate,
        stableDate,
        chromiumVersion: milestone,
        nodeVersion,
        eolDate: '', // Placeholder, will be calculated
      };

      // Apply overrides early so they cascade to dependent calculations
      const override = SCHEDULE_OVERRIDES.get(entry.version);
      if (override) {
        Object.assign(entry, override);
      }

      schedule.push(entry);
    }

    // Helper to get stable date for EOL calculation
    const getStableDateForEOL = async (major: number): Promise<string> => {
      const entry = schedule.find((r) => r.version === `${major}.0.0`);
      if (entry) {
        return entry.stableDate;
      }

      // Need to estimate - this major doesn't exist in our data yet
      const maxMajor = Math.max(...schedule.map((r) => parseInt(r.version.split('.')[0], 10)));
      const maxEntry = schedule.find((r) => r.version === `${maxMajor}.0.0`);
      if (!maxEntry) {
        throw new Error(`Cannot extrapolate milestone for major ${major}`);
      }

      const diff = major - maxMajor;
      const milestone = maxEntry.chromiumVersion + diff * 2;
      const chromiumSchedule = await getMilestoneSchedule(milestone);
      return chromiumSchedule.stableDate;
    };

    // Calculate EOL dates for all entries
    for (const entry of schedule) {
      const major = parseInt(entry.version.split('.')[0], 10);
      const eolMajor = major + getSupportWindow(major);
      entry.eolDate = await getStableDateForEOL(eolMajor);
    }

    return schedule;
  },
  getKeyvCache('absolute-schedule'),
  {
    // Cache for 60 seconds
    ttl: 60_000,
    // At 10 seconds, refetch but serve stale data
    staleTtl: 10_000,
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

  // Build final schedule with status
  const absoluteData = await getAbsoluteSchedule();
  const schedule: MajorReleaseSchedule[] = [];

  for (const entry of absoluteData) {
    const major = parseInt(entry.version.split('.')[0], 10);

    // Determine status based on support window
    let status: 'active' | 'prerelease' | 'eol';
    const latestSupportWindow = getSupportWindow(latestStableMajor);

    if (major > latestStableMajor) {
      // Future release
      status = 'prerelease';
    } else if (major >= latestStableMajor - latestSupportWindow + 1) {
      // Within support window
      status = 'active';
    } else {
      // Outside support window
      status = 'eol';
    }

    schedule.push({
      ...entry,
      status,
    });
  }

  // Sort descending by major version
  return schedule.sort((a, b) => {
    const aMajor = parseInt(a.version.split('.')[0], 10);
    const bMajor = parseInt(b.version.split('.')[0], 10);
    return bMajor - aMajor;
  });
}
