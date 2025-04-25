import { beforeEach, describe, expect, test } from 'vitest';
import {
  getReleasesOrUpdate,
  getActiveReleasesOrUpdate,
  getReleaseForVersion,
  getLatestReleases,
  getAllVersionsInMajor,
  getSudowoodoRelease,
  VersionFilter,
} from './release-data';

describe('getReleasesOrUpdate', () => {
  beforeEach(() => {
    return (getReleasesOrUpdate as unknown as { keyv: { clear: () => void } }).keyv.clear();
  });

  test('should return empty array when upstream json file is empty', async () => {
    fetchMock.doMockOnce(() => new Response('[]'));
    expect(await getReleasesOrUpdate()).toEqual([]);
  });

  test('should return empty array when upstream json file errors', async () => {
    fetchMock.doMockOnce(
      () =>
        new Response('[1]', {
          status: 500,
        }),
    );
    expect(await getReleasesOrUpdate()).toEqual([]);
  });

  test('should return upstream content under normal conditions', async () => {
    fetchMock.mockResponseOnce('[{"version":"1.2.3","v8":"10.0"}]');
    expect(await getReleasesOrUpdate()).toEqual([{ version: '1.2.3', v8: '10.0' }]);
  });
});

describe('getActiveReleasesOrUpdate', () => {
  beforeEach(() => {
    return (getActiveReleasesOrUpdate as unknown as { keyv: { clear: () => void } }).keyv.clear();
  });

  test('should return empty array when sudowoodo is empty', async () => {
    fetchMock.doMockOnce(() => new Response('{"currentlyRunning":[],"queued":[]}'));
    expect(await getActiveReleasesOrUpdate()).toEqual({
      currentlyRunning: [],
      queued: [],
    });
  });

  test('should return empty array when sudowoodo errors', async () => {
    fetchMock.doMockOnce(
      () =>
        new Response('[1]', {
          status: 500,
        }),
    );
    expect(await getActiveReleasesOrUpdate()).toEqual({
      currentlyRunning: [],
      queued: [],
    });
  });

  test('should return sudowoodo content under normal conditions', async () => {
    fetchMock.mockResponseOnce(
      JSON.stringify({
        currentlyRunning: [{ id: 'run' }],
        queued: [{ id: 'queued' }],
      }),
    );
    expect(await getActiveReleasesOrUpdate()).toEqual({
      currentlyRunning: [{ id: 'run' }],
      queued: [{ id: 'queued' }],
    });
  });
});

describe('getSudowoodoRelease', () => {
  beforeEach(() => {
    return (getSudowoodoRelease as unknown as { keyv: { clear: () => void } }).keyv.clear();
  });

  test('should return null when sudowoodo 404s', async () => {
    fetchMock.doMockOnce(() => new Response('asd', { status: 404 }));
    expect(await getSudowoodoRelease('123')).toEqual(null);
  });

  test('should return null when sudowoodo errors', async () => {
    fetchMock.doMockOnce(
      () =>
        new Response('[1]', {
          status: 500,
        }),
    );
    expect(await getSudowoodoRelease('123')).toEqual(null);
  });

  test('should return sudowoodo content under normal conditions', async () => {
    fetchMock.mockResponseOnce(
      JSON.stringify({
        hello: 123,
      }),
    );
    expect(await getSudowoodoRelease('123')).toEqual({
      hello: 123,
    });
  });
});

const version0_1_3 = {
  version: '0.1.3',
  v8: '10.0',
};

const version0_1_4 = {
  version: '0.1.4',
  v8: '10.0',
};

const version1_2_3 = {
  version: '1.2.3',
  v8: '10.0',
};

const version1_2_4 = {
  version: '1.2.4',
  v8: '10.0',
};

const version2_3_4 = {
  version: '2.3.4',
  v8: '10.0',
};

const version2_3_4_beta = {
  version: '2.3.4-beta.2',
  v8: '10.0',
};
const version2_3_4_nightly = {
  version: '2.3.4-nightly.20250101',
  v8: '10.0',
};
const version2_3_4_alpha = {
  version: '2.3.4-alpha.1',
  v8: '10.0',
};

const version3_0_0_alpha = {
  version: '3.0.0-alpha.1',
  v8: '10.0',
};

const version3_0_0_beta = {
  version: '3.0.0-beta.1',
  v8: '10.0',
};

const stubReleases = [
  version0_1_3,
  version0_1_4,
  version1_2_3,
  version1_2_4,
  version2_3_4,
  version2_3_4_beta,
  version2_3_4_nightly,
  version2_3_4_alpha,
  version3_0_0_alpha,
  version3_0_0_beta,
];

const mockStubReleases = async (data = stubReleases) => {
  await (getReleasesOrUpdate as unknown as { keyv: { clear: () => Promise<void> } }).keyv.clear();
  fetchMock.mockResponseOnce(JSON.stringify(data));
};

describe('getReleaseForVersion', () => {
  test('should return release matching the provided version', async () => {
    await mockStubReleases();
    expect(await getReleaseForVersion('1.2.3')).toEqual(version1_2_3);
  });

  test('should return undefined if there is no release matching', async () => {
    await mockStubReleases();
    expect(await getReleaseForVersion('9.2.3')).toEqual(undefined);
  });
});

describe('getLatestReleases', () => {
  test('should return the three stable releases', async () => {
    await mockStubReleases();
    expect((await getLatestReleases()).latestSupported).toEqual([
      version2_3_4,
      version1_2_4,
      version0_1_4,
    ]);
  });

  test('should return the latest prerelease', async () => {
    await mockStubReleases();
    expect((await getLatestReleases()).lastPreRelease).toEqual(version3_0_0_beta);
  });

  test('should return the latest prerelease as an alpha if no beta yet', async () => {
    await mockStubReleases([
      version0_1_3,
      version0_1_4,
      version1_2_3,
      version1_2_4,
      version2_3_4,
      version2_3_4_alpha,
      version2_3_4_nightly,
      version3_0_0_alpha,
    ]);
    expect((await getLatestReleases()).lastPreRelease).toEqual(version3_0_0_alpha);
  });

  test('should return undefined for the latest prerelease if there is not a new enough one', async () => {
    await mockStubReleases([
      version0_1_3,
      version0_1_4,
      version1_2_3,
      version1_2_4,
      version2_3_4,
      version2_3_4_alpha,
      version2_3_4_nightly,
    ]);
    expect((await getLatestReleases()).lastPreRelease).toEqual(undefined);
  });
});

describe('getAllVersionsInMajor', () => {
  test('should return all versions in the major version', async () => {
    await mockStubReleases();
    expect(await getAllVersionsInMajor('1.9.4', VersionFilter.NON_NIGHTLY)).toEqual([
      '1.2.4',
      '1.2.3',
    ]);
  });

  test('should ignore nightly versions', async () => {
    await mockStubReleases();
    expect(await getAllVersionsInMajor('2.3.4', VersionFilter.NON_NIGHTLY)).toEqual([
      '2.3.4',
      '2.3.4-beta.2',
      '2.3.4-alpha.1',
    ]);
  });

  test('should return nightly versions when asked', async () => {
    await mockStubReleases();
    expect(await getAllVersionsInMajor('2.3.4', VersionFilter.ALL)).toEqual([
      '2.3.4',
      '2.3.4-beta.2',
      '2.3.4-alpha.1',
      '2.3.4-nightly.20250101',
    ]);
  });

  test('should return empty array if no releases match', async () => {
    await mockStubReleases();
    expect(await getAllVersionsInMajor('9.9.9', VersionFilter.NON_NIGHTLY)).toEqual([]);
  });

  test('should return empty array if the input version is garbage', async () => {
    await mockStubReleases();
    expect(await getAllVersionsInMajor('sup', VersionFilter.NON_NIGHTLY)).toEqual([]);
  });
});
