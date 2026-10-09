import { getReleaseCalendarEvents } from '~/data/release-calendar';
import { getRelativeSchedule } from '~/data/release-schedule';
import { serializeCalendar } from '~/helpers/icalendar';

export const loader = async () => {
  const events = getReleaseCalendarEvents(await getRelativeSchedule());
  const body = serializeCalendar(events, {
    name: 'Electron Releases (internal)',
    prodId: '-//Electron//Release Status//EN',
    now: new Date(),
  });

  return new Response(body, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=600',
    },
  });
};
