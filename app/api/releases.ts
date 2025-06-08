import { getReleasesOrUpdate } from '~/data/release-data';

export const loader = async () => {
  return Response.json(await getReleasesOrUpdate(), {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
};
