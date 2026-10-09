import type { AllDayEvent } from '~/helpers/icalendar';
import type { MajorReleaseSchedule } from './release-schedule';

type CalendarScheduleEntry = Pick<
  MajorReleaseSchedule,
  'version' | 'betaDate' | 'stableDate' | 'chromiumVersion'
>;

const UID_DOMAIN = 'releases.electronjs.org';

const addDays = (date: string, days: number): string => {
  const result = new Date(`${date}T00:00:00Z`);
  result.setUTCDate(result.getUTCDate() + days);
  return result.toISOString().split('T')[0];
};

const singleDay = (slug: string, major: number, summary: string, date: string): AllDayEvent => ({
  uid: `${slug}-${major}@${UID_DOMAIN}`,
  summary,
  start: date,
  end: addDays(date, 1),
});

/**
 * Release team events for one major, matching the `release-calendar-events` workflow.
 * UIDs are derived from the major so calendar clients update events when dates move.
 */
export const getMajorCalendarEvents = (entry: CalendarScheduleEntry): AllDayEvent[] => {
  const major = parseInt(entry.version.split('.')[0], 10);
  const milestone = entry.chromiumVersion;
  const { betaDate, stableDate } = entry;

  const kickOffStableDate = addDays(stableDate, -1);
  const kickOffAlphaDate = addDays(stableDate, 1);
  const alphaDate = addDays(kickOffAlphaDate, 1);
  const stablePrepWeekStart = addDays(kickOffStableDate, -7);

  return [
    singleDay('beta', major, `${major}.0.0-beta.1 (M${milestone})`, betaDate),
    singleDay('stable', major, `✨${major}.0.0 Stable✨ (M${milestone})`, stableDate),
    singleDay('kick-off-stable', major, `Action: Kick Off ${major}.0.0`, kickOffStableDate),
    singleDay(
      'kick-off-next-alpha',
      major,
      `Action: Kick Off ${major + 1}.0.0-alpha.1`,
      kickOffAlphaDate,
    ),
    singleDay('next-alpha', major, `${major + 1}.0.0-alpha.1`, alphaDate),
    {
      uid: `stable-prep-week-${major}@${UID_DOMAIN}`,
      summary: 'Stable Prep Week',
      start: stablePrepWeekStart,
      // The workflow's end date (start + 5) is exclusive, so this covers Monday to Friday
      end: addDays(stablePrepWeekStart, 5),
    },
    singleDay(
      'stable-prep-assignment',
      major,
      'Action: Stable Prep Assignment',
      addDays(kickOffAlphaDate, -14),
    ),
  ];
};

/**
 * Events for every major that isn't EOL yet (supported stables, prereleases and nightlies).
 */
export const getReleaseCalendarEvents = (schedule: MajorReleaseSchedule[]): AllDayEvent[] =>
  schedule
    .filter((entry) => entry.status !== 'eol')
    .sort((a, b) => parseInt(a.version, 10) - parseInt(b.version, 10))
    .flatMap(getMajorCalendarEvents);
