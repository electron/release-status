import memoize from '@keyvhq/memoize';
import { compare as semverCompare, eq as semverEq, parse as semverParse } from 'semver';
import { getKeyvCache } from './cache';

export type ElectronRelease = {
  version: string;
  // yyyy-mm-dd
  date: string;
  // yyyy-mm-dd hh:mm:ssZ
  fullDate: string;
  node: string;
  v8: string;
  uv: string;
  zlib: string;
  openssl: string;
  modules: string;
  chrome: string;
  files: string[];
};

export const getReleasesOrUpdate = memoize(
  async () => {
    const response = await fetch('https://electronjs.org/headers/index.json');
    if (response.status !== 200) return [];
    const releases = (await response.json()) as ElectronRelease[];
    return releases
      .sort((a, b) => {
        const aParsed = semverParse(a.version);
        const bParsed = semverParse(b.version);
        if (!aParsed || !bParsed) return 0;
        const mainCompared = bParsed.compareMain(aParsed);
        if (mainCompared !== 0) return mainCompared;
        if (aParsed.prerelease.length === 0 && bParsed.prerelease.length > 0) return -1;
        if (aParsed.prerelease.length > 0 && bParsed.prerelease.length === 0) return 1;
        if (aParsed.prerelease.length > 0 && bParsed.prerelease.length > 0) {
          const aPre = aParsed.prerelease[0];
          const bPre = bParsed.prerelease[0];
          if (aPre === bPre) return 0;
          if (aPre === 'nightly') return 1;
          if (bPre === 'nightly') return -1;
          return bParsed.comparePre(aParsed);
        }
        return semverCompare(b.version, a.version);
      })
      .map((r) => ({
        ...r,
        v8: r.v8.replace('-electron.0', ''),
      }));
  },
  getKeyvCache('electron-releases'),
  {
    ttl: 60_000,
    staleTtl: 300_0000,
  },
);

export type SudowoodoRelease = {
  id: string;
  branch: string;
  channel: 'nightly' | 'alpha' | 'beta' | 'stable';
  started: string;
  stage:
    | 'bootstrapping'
    | 'bumping_version'
    | 'triggering_builds'
    | 'waiting_for_builds'
    | 'validating_release'
    | 'publishing_release_to_github'
    | 'publishing_release_to_npm'
    | 'triggering_dependency_releases';
  status: 'completed' | 'failed' | 'cancelled' | 'queued' | 'running';
  generatedElectronVersion: string | null;
  ciBuilds: {
    githubactions?: {
      buildId: string;
      buildJob: string;
      status: 'success' | 'pending' | 'failed';
      workflowId: string;
    }[];
    appveyor?: {
      accountName: string;
      buildServer: string;
      buildVersion: string;
      projectSlug: string;
      status: 'success' | 'pending' | 'failed';
    }[];
    circle?: {
      buildId: string;
      buildJob: string;
      status: 'success' | 'pending' | 'failed';
    }[];
  } | null;
};

export const getActiveReleasesOrUpdate = memoize(
  async () => {
    const response = await fetch('https://electron-sudowoodo.herokuapp.com/release/active');
    if (response.status !== 200) {
      return {
        currentlyRunning: [],
        queued: [],
      };
    }
    return (await response.json()) as {
      currentlyRunning: SudowoodoRelease[];
      queued: SudowoodoRelease[];
    };
  },
  getKeyvCache('sudowoodo-releases'),
  {
    ttl: 30_000,
  },
);

export const getSudowoodoRelease = memoize(
  async (id: string) => {
    const response = await fetch(`https://electron-sudowoodo.herokuapp.com/release/history/${id}`);
    if (response.status !== 200) {
      return null;
    }
    return (await response.json()) as SudowoodoRelease;
  },
  getKeyvCache('sudowoodo-releases-by-id'),
  {
    ttl: 10_000,
    staleTtl: 20_000,
  },
);

export const getReleaseForVersion = async (version: string) => {
  const allReleases = await getReleasesOrUpdate();
  return allReleases.find((r) => semverEq(r.version, version));
};

export const getLatestReleases = async () => {
  const allReleases = await getReleasesOrUpdate();
  const lastNightly = allReleases.find((r) => semverParse(r.version)!.prerelease[0] === 'nightly')!;
  let lastPreRelease = allReleases.find(
    (r) =>
      semverParse(r.version)!.prerelease[0] === 'beta' ||
      semverParse(r.version)!.prerelease[0] === 'alpha',
  );
  const lastStable = allReleases.find((r) => semverParse(r.version)!.prerelease.length === 0);
  const stableMajor = semverParse(lastStable!.version)!.major;
  const latestSupported = [stableMajor, stableMajor - 1, stableMajor - 2].map((major) =>
    allReleases.find((r) => semverParse(r.version)!.major === major),
  );
  if (semverParse(lastPreRelease!.version)!.major <= stableMajor) {
    lastPreRelease = undefined;
  }
  return {
    latestSupported,
    lastPreRelease,
    lastNightly,
  };
};

export enum VersionFilter {
  ALL = 'all',
  NON_NIGHTLY = 'non-nightly',
}

export const getAllVersionsInMajor = async (
  version: string,
  filter: VersionFilter,
  releaseFilter?: (release: ElectronRelease) => boolean,
) => {
  const parsed = semverParse(version);
  if (!parsed) return [];

  const allReleases = await getReleasesOrUpdate();
  return allReleases
    .filter(
      (r) =>
        semverParse(r.version)!.major === parsed.major &&
        (filter === VersionFilter.ALL || semverParse(r.version)!.prerelease[0] !== 'nightly') &&
        (releaseFilter ? releaseFilter(r) : true),
    )
    .map((r) => r.version);
};
