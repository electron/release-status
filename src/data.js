const { getAuthOptionsForRepo, appCredentialsFromString } = require('@electron/github-app-auth');
const fetch = require('node-fetch');
const { Octokit } = require('@octokit/rest');
const ExpiryMap = require('expiry-map');
const pMemoize = require('p-memoize');
const semver = require('semver');

const NUM_STABLE_VERSIONS = 3;

// If you need to extend the EOL for a major, put it here
const EOL_ADJUSTMENTS = new Map([
  [22, '2023-10-10'],
  [16, '2022-05-23'],
  [15, '2022-05-23'],
  [14, '2022-03-29'],
  [13, '2022-02-01'],
  [12, '2021-11-16'],
]);

let octokit = null;
const getOctokit = async () => {
  if (octokit) return octokit;

  if (process.env.RELEASE_STATUS_GITHUB_APP_CREDS) {
    const authOpts = await getAuthOptionsForRepo(
      {
        owner: 'electron',
        name: 'electron',
      },
      appCredentialsFromString(process.env.RELEASE_STATUS_GITHUB_APP_CREDS),
    );
    octokit = new Octokit({
      ...authOpts,
    });
  } else if (process.env.GITHUB_TOKEN) {
    octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN,
    });
  } else {
    octokit = new Octokit();
  }
  return octokit;
};

const getReleasesOrUpdate = pMemoize(
  async () => {
    const response = await fetch.default('https://electronjs.org/headers/index.json');
    const releases = await response.json();
    return releases.sort((a, b) => semver.compare(b.version, a.version));
  },
  {
    cache: new ExpiryMap(60 * 1000),
    cacheKey: () => 'releases',
  },
);

const getChromiumScheduleOrUpdate = pMemoize(
  async (milestone) => {
    const response = await fetch.default(
      `https://chromiumdash.appspot.com/fetch_milestone_schedule?mstone=${milestone}`,
    );
    return (await response.json()).mstones[0];
  },
  {
    cache: new ExpiryMap(60 * 1000),
  },
);

const getVersionsOrUpdate = pMemoize(
  async () => {
    const releases = await getReleasesOrUpdate();
    const majors = new Map();

    // TODO - Use Octokit to pull branches from e/e to check for a new branch without releases

    for (const release of releases) {
      const major = semver.major(release.version);
      if (major < 2) continue; // Only provide info for E2 and above

      // Calculate the final Chromium milestone for non-stable majors
      const majorInfo = majors.get(major) || {
        major,
        chromium: (64 + major * 2).toString(),
        node: null,
        alpha: null,
        beta: null,
        stable: null,
        endOfLife: null,
        isStable: false,
      };

      // Use releases to construct the historical alpha, beta,
      // and stable dates for an Electron major version. Due
      // to a historical quirk, there was no 13.0.0-beta.1
      if (release.version.endsWith('-alpha.1')) {
        majorInfo.alpha = { actual: release.date };
      } else if (release.version.endsWith(major === 13 ? '-beta.2' : '-beta.1')) {
        majorInfo.beta = { actual: release.date };
      } else if (release.version.endsWith('.0.0')) {
        majorInfo.stable = { actual: release.date };
        majorInfo.isStable = true;
        majorInfo.chromium = semver.coerce(release.chrome).major.toString();
      }

      // For the Node.js version, find the latest version
      // across all releases for a major and use that
      if (majorInfo.node === null || semver.gt(release.node, majorInfo.node)) {
        majorInfo.node = release.node;
      }

      majors.set(major, majorInfo);
    }

    // TODO - Load stored major info from previous run
    const storedData = [];

    // Construct the final info for each major version
    const data = await Promise.all(
      Array.from(majors.values())
        .sort((a, b) => b - a)
        .map(async (majorInfo) => {
          const milestone = parseInt(majorInfo.chromium);

          // Exclude the patch version from the Node.js version string
          const nodeVersion = semver.parse(majorInfo.node);
          majorInfo.node = `${nodeVersion.major}.${nodeVersion.minor}`;

          // Major stable date which triggers EOL for this one
          const eolMajorStable = majors.get(majorInfo.major + NUM_STABLE_VERSIONS)?.stable;

          // Pull EOL from the major if it is in our list of majors
          let endOfLife = eolMajorStable?.actual ?? eolMajorStable?.estimated;

          // For versions which aren't stable yet, we need to
          // estimate dates based off of the Chromium schedule
          if (!majorInfo.isStable) {
            // Estimate the alpha date by adding one day to the previous major's stable
            if (!majorInfo.alpha?.actual) {
              const { stable_date: prevMajorStableDate } = await getChromiumScheduleOrUpdate(
                milestone - 2,
              );
              const alphaDate = new Date(prevMajorStableDate);
              alphaDate.setDate(alphaDate.getDate() + 1);
              majorInfo.alpha = { estimated: alphaDate.toISOString().split('T')[0] };
            }

            if (!majorInfo.beta?.actual) {
              try {
                const { earliest_beta: betaDate } = await getChromiumScheduleOrUpdate(milestone);
                majorInfo.beta = { estimated: betaDate.split('T')[0] };
              } catch (err) {
                majorInfo.beta = storedData.find(
                  (storedMajorInfo) => storedMajorInfo.major === majorInfo.major,
                )?.beta;
                console.error('Error fetching Chromium milestone info:', err);
              }
            }

            if (!majorInfo.stable?.actual) {
              try {
                const { stable_date: stableDate } = await getChromiumScheduleOrUpdate(milestone);
                majorInfo.stable = { estimated: stableDate.split('T')[0] };
              } catch (err) {
                majorInfo.stable = storedData.find(
                  (storedMajorInfo) => storedMajorInfo.major === majorInfo.major,
                )?.stable;
                console.error('Error fetching Chromium milestone info:', err);
              }
            }
          }

          // EOL is estimated as the stable release date of a future major release
          if (!endOfLife) {
            try {
              const { stable_date: endOfLifeDate } = await getChromiumScheduleOrUpdate(
                milestone + NUM_STABLE_VERSIONS * 2,
              );
              endOfLife = endOfLifeDate.split('T')[0];
            } catch (err) {
              endOfLife = storedData.find(
                (storedMajorInfo) => storedMajorInfo.major === majorInfo.major,
              )?.endOfLife?.estimated;
              console.error('Error fetching Chromium milestone info:', err);
            }
          }

          // We need to correct the EOL date for certain major releases since
          // the EOL criteria has changed over time and had some extensions
          if (EOL_ADJUSTMENTS.has(majorInfo.major)) {
            endOfLife = EOL_ADJUSTMENTS.get(majorInfo.major);
          }

          // It's supported if it hasn't gone EOL yet
          const isSupported = new Date() <= new Date(endOfLife);

          return {
            ...majorInfo,
            isSupported,
            endOfLife: isSupported ? { estimated: endOfLife } : { actual: endOfLife },
          };
        }),
    );

    // TODO - Upload this JSON somewhere we can fetch it again later

    return { releases, majors: data };
  },
  {
    cache: new ExpiryMap(60 * 1000),
    cacheKey: () => 'versions',
  },
);

const getActiveReleasesOrUpdate = pMemoize(
  async () => {
    const response = await fetch.default('https://electron-sudowoodo.herokuapp.com/release/active');
    return response.json();
  },
  {
    cache: new ExpiryMap(30 * 1000),
    cacheKey: () => 'active_releases',
  },
);

const getAllSudowoodoReleasesOrUpdate = pMemoize(
  async () => {
    const response = await fetch.default(
      'https://electron-sudowoodo.herokuapp.com/release/history',
    );
    return response.json();
  },
  {
    cache: new ExpiryMap(30 * 1000),
    cacheKey: () => 'all_releases',
  },
);

const getGitHubRelease = pMemoize(
  async (version) => {
    try {
      return (
        await (
          await getOctokit()
        ).repos.getReleaseByTag({
          owner: 'electron',
          repo: version.includes('nightly') ? 'nightlies' : 'electron',
          tag: version,
        })
      ).data;
    } catch (e) {
      console.error(e);
      return null;
    }
  },
  {
    cache: new ExpiryMap(10 * 60 * 1000),
    cacheKey: (version) => `release/${version}`,
  },
);

const getPR = pMemoize(
  async (prNumber) => {
    try {
      return (
        await (
          await getOctokit()
        ).pulls.get({
          owner: 'electron',
          repo: 'electron',
          pull_number: prNumber,
        })
      ).data;
    } catch {
      return null;
    }
  },
  {
    cache: new ExpiryMap(30 * 1000),
    cacheKey: (prNumber) => `pr/${prNumber}`,
  },
);

const getPRComments = pMemoize(
  async (prNumber) => {
    const octo = await getOctokit();
    try {
      return await octo.paginate(
        octo.issues.listComments.endpoint.merge({
          owner: 'electron',
          repo: 'electron',
          issue_number: prNumber,
          per_page: 100,
        }),
      );
    } catch {
      return [];
    }
  },
  {
    cache: new ExpiryMap(60 * 1000),
    cacheKey: (prNumber) => `pr-comments/${prNumber}`,
  },
);

const compareTagToCommit = pMemoize(
  async (tag, commitSha) => {
    const compare = await (
      await getOctokit()
    ).repos.compareCommits({
      owner: 'electron',
      repo: 'electron',
      base: tag,
      head: commitSha,
    });
    return compare.data;
  },
  {
    cache: new ExpiryMap(60 * 60 * 24 * 1000),
    cacheKey: (tag, commitSha) => `compare/${tag}/${commitSha}`,
  },
);

const getTSDefs = pMemoize(
  async (version) => {
    const file = await fetch(`https://unpkg.com/electron@${version}/electron.d.ts`);
    return await file.text();
  },
  {
    cache: new ExpiryMap(60 * 60 * 24 * 1000),
    cacheKey: (version) => `ts/${version}`,
  },
);

module.exports = {
  getGitHubRelease,
  getReleasesOrUpdate,
  getVersionsOrUpdate,
  getActiveReleasesOrUpdate,
  getAllSudowoodoReleasesOrUpdate,
  getPR,
  getPRComments,
  compareTagToCommit,
  getTSDefs,
};
