import { getActiveReleasesOrUpdate, getReleasesOrUpdate } from './release-data';

export const startDataRefreshTimer = () => {
  // This is a bit aggressive, but we want to make sure we have the latest data
  // for the active builds and releases to avoid stale data in the UI and to avoid
  // long loading times
  setInterval(() => {
    void getActiveReleasesOrUpdate();
  }, 10_000);

  setInterval(() => {
    void getReleasesOrUpdate();
  }, 20_000);
};
