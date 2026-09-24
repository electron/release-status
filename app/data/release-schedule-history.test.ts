import { beforeEach, describe, expect, test, vi } from 'vitest';
import { getMilestoneSchedule } from './dash/chromium-schedule';

const { historical } = vi.hoisted(() => ({ historical: [] as Record<string, unknown>[] }));

vi.mock('./historical-schedule.json', () => ({ default: historical }));

// Bypass caching so each call recalculates with the current historical data
vi.mock('@keyvhq/memoize', () => ({ default: (fn: unknown) => fn }));

// Milestone 60 maps to 2018-01-01 and each further milestone adds 30 days
const milestoneDate = (milestone: number): string => {
  const base = new Date('2018-01-01T00:00:00');
  base.setDate(base.getDate() + (milestone - 60) * 30);
  return base.toISOString().split('T')[0];
};

vi.mock('./dash/chromium-schedule', () => ({
  getMilestoneSchedule: vi.fn(async (milestone: number) => ({
    earliestBeta: milestoneDate(milestone),
    stableDate: milestoneDate(milestone),
  })),
}));

// One stable release per major from 2..36, newest first
vi.mock('./release-data', () => ({
  getReleasesOrUpdate: async () =>
    Array.from({ length: 35 }, (_, i) => {
      const major = 36 - i;
      return {
        version: `${major}.0.0`,
        node: `${major}.0.0`,
        chrome: `${60 + major * 2}.0.0.0`,
      };
    }),
}));

import { getAbsoluteSchedule } from './release-schedule';

const milestoneFor = (major: number) => 60 + major * 2;

describe('getAbsoluteSchedule historical data', () => {
  beforeEach(() => {
    historical.length = 0;
    vi.mocked(getMilestoneSchedule).mockClear();
  });

  test('matches the fully calculated schedule', async () => {
    const calculated = await getAbsoluteSchedule();
    historical.push(...calculated.slice(0, 29).map((entry) => ({ ...entry })));
    vi.mocked(getMilestoneSchedule).mockClear();

    expect(await getAbsoluteSchedule()).toEqual(calculated);
  });

  test('skips Chromium schedule lookups for historical majors', async () => {
    historical.push(...(await getAbsoluteSchedule()).slice(0, 29));
    vi.mocked(getMilestoneSchedule).mockClear();

    await getAbsoluteSchedule();

    const milestones = vi.mocked(getMilestoneSchedule).mock.calls.map(([milestone]) => milestone);
    expect(milestones).not.toContain(milestoneFor(30));
    expect(milestones).toContain(milestoneFor(31));
  });

  test('uses historical data as-is for dependent calculations', async () => {
    const calculated = await getAbsoluteSchedule();
    const v30 = { ...calculated.find((entry) => entry.version === '30.0.0')! };
    v30.stableDate = '2030-01-01';
    v30.nodeVersion = '1.2.3';
    historical.push(...calculated.slice(0, 28), v30);

    const schedule = await getAbsoluteSchedule();

    expect(schedule.find((entry) => entry.version === '30.0.0')).toEqual(v30);
    expect(schedule.find((entry) => entry.version === '31.0.0')!.alphaDate).toBe('2030-01-03');
  });
});
