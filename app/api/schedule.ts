import { getRelativeSchedule } from '~/data/release-schedule';

export const loader = async () => {
  const schedule = await getRelativeSchedule();
  const publicSchedule = schedule.map(({ tentativeDates: _tentativeDates, ...release }) => release);
  return Response.json(publicSchedule, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
};
