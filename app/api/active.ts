import { getActiveReleasesOrUpdate } from '~/data/release-data';

export const loader = async () => {
  return await getActiveReleasesOrUpdate();
};
