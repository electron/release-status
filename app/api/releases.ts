import { getReleasesOrUpdate } from '~/data/release-data';

export const loader = async () => {
  return await getReleasesOrUpdate();
};
