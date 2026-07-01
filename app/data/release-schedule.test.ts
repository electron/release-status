import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

// Deterministic Chromium milestone schedule: each milestone's stable date is
// derived from the milestone number so the absolute schedule (and therefore the
// computed `eolDate`s) is fully predictable without hitting the network.
// Turn a milestone number into a deterministic YYYY-MM-DD date. Milestone 120
// maps to 2023-01-01 and each further milestone adds 30 days, so higher
// milestones (and therefore higher majors) always have later stable dates.
const milestoneDate = (milestone: number): string => {
  const base = new Date('2023-01-01T00:00:00');
  base.setDate(base.getDate() + (milestone - 120) * 30);
  return base.toISOString().split('T')[0];
};

vi.mock('./dash/chromium-schedule', () => ({
  getMilestoneSchedule: vi.fn(async (milestone: number) => ({
    earliestBeta: milestoneDate(milestone),
    stableDate: milestoneDate(milestone),
  })),
}));

const releasesMock = vi.fn();
vi.mock('./release-data', () => ({
  getReleasesOrUpdate: () => releasesMock(),
}));

import { getRelativeSchedule } from './release-schedule';

// Build one stable release per major from 2..36 (contiguous, as the real feed
// is — the absolute schedule derives each major's beta/alpha dates from the
// previous major, so the chain must be unbroken). Each major maps to a distinct
// Chromium milestone (2 milestones per major for these versions), so the
// absolute schedule is derived directly from `chrome` with no estimation.
//
// With majors 2..36 all stable, latestStableMajor = 36 and the support window
// is 3, so minActiveMajor = 34. Major 33 (< 34) is therefore normally EOL.
// eolMajor(33) = 33 + 3 = 36, so eolDate(33) = stableDate(36).
const buildReleases = () => {
  const releases = [];
  for (let major = 36; major >= 2; major--) {
    const milestone = 120 + (major - 2) * 2;
    releases.push({
      version: `${major}.0.0`,
      fullDate: '2023-01-01 00:00:00Z',
      node: '20.0.0',
      v8: '12.0',
      uv: '1.0.0',
      zlib: '1.0.0',
      openssl: '3.0.0',
      modules: '120',
      chrome: `${milestone}.0.0.0`,
      files: [],
    });
  }
  return releases;
};

describe('getRelativeSchedule eolGracePeriod', () => {
  beforeEach(() => {
    releasesMock.mockReset();
    releasesMock.mockResolvedValue(buildReleases());
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const findMajor = (schedule: Awaited<ReturnType<typeof getRelativeSchedule>>, major: number) =>
    schedule.find((entry) => entry.version === `${major}.0.0`)!;

  test('major 33 is EOL with no grace period (default behavior)', async () => {
    const schedule = await getRelativeSchedule();
    const v33 = findMajor(schedule, 33);
    expect(v33.status).toBe('eol');
    // Sanity: the supported window is still stable.
    expect(findMajor(schedule, 36).status).toBe('stable');
    expect(findMajor(schedule, 34).status).toBe('stable');
  });

  test('major that is normally EOL reports stable within the grace window', async () => {
    const schedule = await getRelativeSchedule();
    const eolDate = new Date(findMajor(schedule, 33).eolDate + 'T00:00:00');

    // 5 days past EOL, with a 10 day grace window -> still stable.
    const now = new Date(eolDate);
    now.setDate(now.getDate() + 5);

    const graced = await getRelativeSchedule(10, now);
    expect(findMajor(graced, 33).status).toBe('stable');
  });

  test('major reports EOL once the grace window has passed', async () => {
    const schedule = await getRelativeSchedule();
    const eolDate = new Date(findMajor(schedule, 33).eolDate + 'T00:00:00');

    // 11 days past EOL, with a 10 day grace window -> back to EOL.
    const now = new Date(eolDate);
    now.setDate(now.getDate() + 11);

    const graced = await getRelativeSchedule(10, now);
    expect(findMajor(graced, 33).status).toBe('eol');
  });

  test('grace window boundary is inclusive of the final day', async () => {
    const schedule = await getRelativeSchedule();
    const eolDate = new Date(findMajor(schedule, 33).eolDate + 'T00:00:00');

    // Exactly at eolDate + 10 days (start of day) -> still within grace.
    const now = new Date(eolDate);
    now.setDate(now.getDate() + 10);

    const graced = await getRelativeSchedule(10, now);
    expect(findMajor(graced, 33).status).toBe('stable');
  });

  test('grace period of 0 leaves EOL classification unchanged', async () => {
    const now = new Date('2030-01-01T00:00:00');
    const schedule = await getRelativeSchedule(0, now);
    expect(findMajor(schedule, 33).status).toBe('eol');
  });

  test('the maximum grace period (365 days) is honored at the grace boundary', async () => {
    // The API loader caps `eolGracePeriod` at 365 days (rather than letting a
    // huge value overflow the Date math into NaN), so the data layer must still
    // apply grace correctly at that maximum. On the final day it is stable, one
    // day later it is EOL.
    const schedule = await getRelativeSchedule();
    const eolDate = new Date(findMajor(schedule, 33).eolDate + 'T00:00:00');

    const lastDayOfGrace = new Date(eolDate);
    lastDayOfGrace.setDate(lastDayOfGrace.getDate() + 365);
    const gracedAtBoundary = await getRelativeSchedule(365, lastDayOfGrace);
    expect(findMajor(gracedAtBoundary, 33).status).toBe('stable');

    const pastGrace = new Date(eolDate);
    pastGrace.setDate(pastGrace.getDate() + 366);
    const gracedPastBoundary = await getRelativeSchedule(365, pastGrace);
    expect(findMajor(gracedPastBoundary, 33).status).toBe('eol');
  });

  test('supported and prerelease/nightly majors are unaffected by grace period', async () => {
    const now = new Date('2030-01-01T00:00:00');
    const withGrace = await getRelativeSchedule(365, now);
    const withoutGrace = await getRelativeSchedule(0, now);

    for (const major of [34, 35, 36]) {
      expect(findMajor(withGrace, major).status).toBe(findMajor(withoutGrace, major).status);
    }
  });
});
