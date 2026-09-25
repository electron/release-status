import { getRelativeSchedule } from '~/data/release-schedule';
import { now, since, timingLog } from '~/data/schedule-timing';

export const loader = async () => {
  const start = now();
  timingLog('/schedule.json loader start');
  const schedule = await getRelativeSchedule();
  timingLog(`/schedule.json getRelativeSchedule took=${since(start)}`);
  const jsonStart = now();
  const response = Response.json(schedule, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
  timingLog(`/schedule.json Response.json took=${since(jsonStart)} total=${since(start)}`);
  return response;
};
