import { describe, expect, test } from 'vitest';
import { getMajorCalendarEvents, getReleaseCalendarEvents } from './release-calendar';
import type { MajorReleaseSchedule } from './release-schedule';

const entry = (
  major: number,
  stableDate: string,
  status: MajorReleaseSchedule['status'],
): MajorReleaseSchedule => ({
  version: `${major}.0.0`,
  branch: `${major}-x-y`,
  alphaDate: null,
  betaDate: '2026-08-06',
  stableDate,
  eolDate: '2027-03-02',
  chromiumVersion: 156,
  nodeVersion: '24.0.0',
  status,
});

describe('getMajorCalendarEvents', () => {
  test('matches the release-calendar-events workflow', () => {
    // Earliest beta Wednesday 2026-08-05 (+1 day), stable Tuesday 2026-09-01. Single-day
    // events end the next day (DTEND is exclusive).
    expect(getMajorCalendarEvents(entry(45, '2026-09-01', 'nightly'))).toEqual([
      {
        uid: 'beta-45@releases.electronjs.org',
        summary: '45.0.0-beta.1 (M156)',
        start: '2026-08-06',
        end: '2026-08-07',
      },
      {
        uid: 'stable-45@releases.electronjs.org',
        summary: '✨45.0.0 Stable✨ (M156)',
        start: '2026-09-01',
        end: '2026-09-02',
      },
      {
        uid: 'kick-off-stable-45@releases.electronjs.org',
        summary: 'Action: Kick Off 45.0.0',
        start: '2026-08-31',
        end: '2026-09-01',
      },
      {
        uid: 'kick-off-next-alpha-45@releases.electronjs.org',
        summary: 'Action: Kick Off 46.0.0-alpha.1',
        start: '2026-09-02',
        end: '2026-09-03',
      },
      {
        uid: 'next-alpha-45@releases.electronjs.org',
        summary: '46.0.0-alpha.1',
        start: '2026-09-03',
        end: '2026-09-04',
      },
      {
        uid: 'stable-prep-week-45@releases.electronjs.org',
        summary: 'Stable Prep Week',
        start: '2026-08-24',
        end: '2026-08-29',
      },
      {
        uid: 'stable-prep-assignment-45@releases.electronjs.org',
        summary: 'Action: Stable Prep Assignment',
        start: '2026-08-19',
        end: '2026-08-20',
      },
    ]);
  });

  test('handles month and year boundaries', () => {
    const events = getMajorCalendarEvents(entry(46, '2027-01-05', 'nightly'));
    expect(events.find((e) => e.uid.startsWith('stable-prep-week-'))).toMatchObject({
      start: '2026-12-28',
      end: '2027-01-02',
    });
    expect(events.find((e) => e.uid.startsWith('stable-prep-assignment-'))?.start).toBe(
      '2026-12-23',
    );
  });

  test('UIDs only depend on the major', () => {
    const a = getMajorCalendarEvents(entry(45, '2026-09-01', 'nightly')).map((e) => e.uid);
    const b = getMajorCalendarEvents(entry(45, '2026-09-29', 'prerelease')).map((e) => e.uid);
    expect(b).toEqual(a);
    expect(new Set(a).size).toBe(a.length);
  });
});

describe('getReleaseCalendarEvents', () => {
  test('covers non-EOL majors in ascending order', () => {
    const events = getReleaseCalendarEvents([
      entry(45, '2026-09-29', 'nightly'),
      entry(44, '2026-09-01', 'prerelease'),
      entry(43, '2026-08-04', 'stable'),
      entry(40, '2026-01-13', 'eol'),
    ]);
    const majors = [...new Set(events.map((e) => e.uid.match(/-(\d+)@/)![1]))];
    expect(majors).toEqual(['43', '44', '45']);
    expect(new Set(events.map((e) => e.uid)).size).toBe(events.length);
  });
});
