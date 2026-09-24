import { getRelativeSchedule } from '~/data/release-schedule';

export const loader = async () => {
  return Response.json(await getRelativeSchedule(), {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
};
