const { getAuthOptionsForRepo, appCredentialsFromString } = require('@electron/github-app-auth');
const fetch = require('node-fetch');
const { Octokit } = require('@octokit/rest');
const ExpiryMap = require('expiry-map');
const pMemoize = require('p-memoize');
const semver = require('semver');


let octokit = null;
const getOctokit = async () => {
  if (octokit) return octokit;

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
        await (await getOctokit()).repos.getReleaseByTag({
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
        await (await getOctokit()).pulls.get({
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
    const compare = await (await getOctokit()).repos.compareCommits({
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

module.exports = {
  getGitHubRelease,
  getReleasesOrUpdate,
  getActiveReleasesOrUpdate,
  getAllSudowoodoReleasesOrUpdate,
  getPR,
  getPRComments,
  compareTagToCommit,
};
