import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { getMilestoneSchedule } from './dash/chromium-schedule';
import { getReleasesOrUpdate } from './release-data';

// The newest historical majors, as committed in historical-schedule.json
const HISTORICAL = vi.hoisted(() => [
  {
    version: '39.0.0',
    branch: '39-x-y',
    alphaDate: '2025-09-03',
    betaDate: '2025-10-06',
    stableDate: '2025-10-27',
    chromiumVersion: 142,
    nodeVersion: '22.20.0',
    eolDate: '2026-05-05',
  },
  {
    version: '40.0.0',
    branch: '40-x-y',
    alphaDate: '2025-10-30',
    betaDate: '2025-12-01',
    stableDate: '2026-01-15',
    chromiumVersion: 144,
    nodeVersion: '24.11.1',
    eolDate: '2026-07-01',
  },
  {
    version: '41.0.0',
    branch: '41-x-y',
    alphaDate: '2026-01-19',
    betaDate: '2026-02-11',
    stableDate: '2026-03-10',
    chromiumVersion: 146,
    nodeVersion: '24.14.0',
    eolDate: '2026-08-24',
  },
]);

vi.mock('./historical-schedule.json', () => ({ default: HISTORICAL }));

// Bypass caching so each call recalculates
vi.mock('@keyvhq/memoize', () => ({ default: (fn: unknown) => fn }));

// Milestone 146 is stable on 2026-03-10 and each further milestone adds 4 weeks, with the
// earliest beta 27 days (a Wednesday) before stable
vi.mock('./dash/chromium-schedule', () => ({
  getMilestoneSchedule: vi.fn(async (milestone: number) => {
    const stable = new Date(Date.UTC(2026, 2, 10 + (milestone - 146) * 28));
    const beta = new Date(stable);
    beta.setUTCDate(beta.getUTCDate() - 27);
    return {
      earliestBeta: beta.toISOString().split('T')[0],
      stableDate: stable.toISOString().split('T')[0],
    };
  }),
}));

// Newest first, like the real feed: stables through 44, a 45 beta, a 46 nightly, and
// releases of historical and pre-historical majors that must be ignored
const RELEASES = vi.hoisted(() =>
  [
    ['46.0.0-nightly.20260901', '158.0.0.0', '2026-09-01T12:00:00Z'],
    ['45.0.0-beta.2', '154.0.0.0', '2026-09-08T12:00:00Z'],
    ['45.0.0-beta.1', '154.0.0.0', '2026-09-03T12:00:00Z'],
    ['45.0.0-alpha.2', '154.0.0.0', '2026-09-01T12:00:00Z'],
    ['45.0.0-alpha.1', '154.0.0.0', '2026-08-29T02:00:00Z'],
    ['44.0.0', '152.0.0.0', '2026-08-25T12:00:00Z'],
    ['43.0.0', '150.0.0.0', '2026-06-30T12:00:00Z'],
    ['42.0.0', '148.0.0.0', '2026-05-07T12:00:00Z'],
    ['41.0.0', '146.0.0.0', '2026-03-10T12:00:00Z'],
    ['40.0.0', '144.0.0.0', '2026-01-15T12:00:00Z'],
    ['39.0.0', '142.0.0.0', '2025-10-27T12:00:00Z'],
    ['1.0.0', '49.0.0.0', '2016-05-11T12:00:00Z'],
  ].map(([version, chrome, fullDate]) => ({
    version,
    chrome,
    fullDate,
    node: `node-${version}`,
    v8: '',
    uv: '',
    zlib: '',
    openssl: '',
    modules: '',
    files: [],
  })),
);

vi.mock('./release-data', () => ({
  getReleasesOrUpdate: vi.fn(async () => RELEASES),
}));

import { getAbsoluteSchedule, getRelativeSchedule } from './release-schedule';

afterEach(() => {
  vi.clearAllMocks();
});

const find = <T extends { version: string }>(schedule: T[], major: number) =>
  schedule.find((entry) => entry.version === `${major}.0.0`)!;

describe('getAbsoluteSchedule', () => {
  test('uses historical majors as-is without Chromium schedule lookups', async () => {
    vi.mocked(getMilestoneSchedule).mockClear();
    const schedule = await getAbsoluteSchedule();

    expect(schedule.slice(0, 3)).toEqual(
      HISTORICAL.map((entry) => ({ ...entry, tentativeDates: [] })),
    );
    const milestones = vi.mocked(getMilestoneSchedule).mock.calls.map(([milestone]) => milestone);
    expect(milestones).not.toContain(142);
    expect(milestones).not.toContain(144);
    expect(milestones).not.toContain(146);
  });

  test('calculates only majors after the historical schedule', async () => {
    const schedule = await getAbsoluteSchedule();
    expect(schedule.map((entry) => entry.version)).toEqual(
      [39, 40, 41, 42, 43, 44, 45, 46].map((major) => `${major}.0.0`),
    );
  });

  test('chains the first calculated major off the last historical one', async () => {
    expect(find(await getAbsoluteSchedule(), 42)).toEqual({
      version: '42.0.0',
      branch: '42-x-y',
      alphaDate: '2026-03-12', // v41 stable + 2 days
      betaDate: '2026-04-09', // Chromium earliest beta + 1 day
      stableDate: '2026-05-07', // Actual release, not Chromium's 2026-05-05 goal
      chromiumVersion: 148,
      nodeVersion: 'node-42.0.0',
      eolDate: '2026-12-15', // v45 stable
      tentativeDates: ['alphaDate', 'betaDate', 'eolDate'],
    });
  });

  test('locks alpha.1 and beta.1 to their actual Pacific dates, not later prereleases', async () => {
    const entry = find(await getAbsoluteSchedule(), 45);
    expect(entry.alphaDate).toBe('2026-08-28');
    expect(entry.betaDate).toBe('2026-09-03');
    expect(entry.tentativeDates).toEqual(['stableDate', 'eolDate']);
  });

  test('cascades actual stable dates to the next alpha forecast', async () => {
    const entry = find(await getAbsoluteSchedule(), 43);
    expect(entry.alphaDate).toBe('2026-05-09');
    expect(entry.tentativeDates).toContain('alphaDate');
  });

  test('keeps unpublished dates tentative even when their forecast is in the past', async () => {
    const entry = find(await getAbsoluteSchedule(), 42);
    expect(entry.tentativeDates).toContain('alphaDate');
    expect(entry.tentativeDates).toContain('betaDate');
    expect(entry.tentativeDates).not.toContain('stableDate');
  });

  test('locks EOL to the actual stable release ending support without fetching its forecast', async () => {
    vi.mocked(getReleasesOrUpdate).mockResolvedValueOnce([
      {
        ...RELEASES[0],
        version: '45.0.0',
        chrome: '156.0.0.0',
        fullDate: '2026-12-18T02:00:00Z',
      },
      ...RELEASES,
    ]);
    const schedule = await getAbsoluteSchedule();
    expect(find(schedule, 45).stableDate).toBe('2026-12-17');
    expect(find(schedule, 45).tentativeDates).toEqual(['eolDate']);
    expect(find(schedule, 42).eolDate).toBe('2026-12-17');
    expect(find(schedule, 42).tentativeDates).not.toContain('eolDate');
    expect(
      vi.mocked(getMilestoneSchedule).mock.calls.map(([milestone]) => milestone),
    ).not.toContain(156);
  });

  test('does not use a later stable patch release as the initial stable date', async () => {
    vi.mocked(getReleasesOrUpdate).mockResolvedValueOnce([
      { ...RELEASES[0], version: '44.0.1', chrome: '152.0.0.0' },
      ...RELEASES,
    ]);
    expect(find(await getAbsoluteSchedule(), 44).stableDate).toBe('2026-08-25');
  });

  test('estimates milestones for majors without a stable release', async () => {
    const schedule = await getAbsoluteSchedule();
    // 4 milestones per major from v45
    expect(find(schedule, 45).chromiumVersion).toBe(156);
    expect(find(schedule, 46).chromiumVersion).toBe(160);
    expect(find(schedule, 46).branch).toBe('46-x-y');
  });

  test('extrapolates EOL dates past the newest known major', async () => {
    const schedule = await getAbsoluteSchedule();
    // v44 EOL is v47 stable: milestone 160 (v46) + 4
    expect(find(schedule, 44).eolDate).toBe('2027-07-27');
    expect(find(schedule, 43).eolDate).toBe(find(schedule, 46).stableDate);
    expect(find(schedule, 46).tentativeDates).toEqual([
      'alphaDate',
      'betaDate',
      'stableDate',
      'eolDate',
    ]);
  });
});

describe('getRelativeSchedule', () => {
  test('assigns statuses from the latest stable major', async () => {
    const schedule = await getRelativeSchedule();
    expect(schedule.map(({ version, branch, status }) => [version, branch, status])).toEqual([
      ['46.0.0', 'main', 'nightly'],
      ['45.0.0', '45-x-y', 'prerelease'],
      ['44.0.0', '44-x-y', 'stable'],
      ['43.0.0', '43-x-y', 'stable'],
      ['42.0.0', '42-x-y', 'stable'],
      ['41.0.0', '41-x-y', 'eol'],
      ['40.0.0', '40-x-y', 'eol'],
      ['39.0.0', '39-x-y', 'eol'],
    ]);
  });
});

describe('historical-schedule.json', () => {
  const entries: Awaited<ReturnType<typeof getAbsoluteSchedule>> = JSON.parse(
    readFileSync(new URL('./historical-schedule.json', import.meta.url), 'utf8'),
  );

  test('has contiguous majors in ascending order', () => {
    expect(entries.map((entry) => entry.version)).toEqual(entries.map((_, i) => `${i + 2}.0.0`));
  });

  test('has complete and ordered dates', () => {
    const date = /^\d{4}-\d{2}-\d{2}$/;
    for (const entry of entries) {
      if (entry.alphaDate !== null) {
        expect(entry.alphaDate).toMatch(date);
        expect(entry.alphaDate <= entry.betaDate).toBe(true);
      }
      for (const value of [entry.betaDate, entry.stableDate, entry.eolDate]) {
        expect(value).toMatch(date);
      }
      expect(entry.betaDate <= entry.stableDate).toBe(true);
      expect(entry.stableDate < entry.eolDate).toBe(true);
    }
  });
});
