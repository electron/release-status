const { getAuthOptionsForRepo, appCredentialsFromString } = require('@electron/github-app-auth');
const fetch = require('node-fetch');
const { Octokit } = require('@octokit/rest');
const semver = require('semver');

const timeMemoize = require('./utils/time-memoize');

let octokit = null;
const getOctokit = async () => {
  if (octokit) return octokit;

  const authOpts = await getAuthOptionsForRepo({
    owner: 'electron',
    name: 'electron'
  }, appCredentialsFromString(process.env.RELEASE_STATUS_GITHUB_APP_CREDS));
  octokit = new Octokit({
    ...authOpts,
  });
  return octokit;
};

const getReleasesOrUpdate = timeMemoize(
  async () => {
    const response = await fetch.default('https://electronjs.org/headers/index.json');
    const releases = await response.json();
    return releases.sort((a, b) => semver.compare(b.version, a.version));
  },
  60 * 1000,
  () => 'releases',
);

const getActiveReleasesOrUpdate = timeMemoize(
  async () => {
    const response = await fetch.default('https://electron-sudowoodo.herokuapp.com/release/active');
    return response.json();
  },
  30 * 1000,
  () => 'active_releases',
);

const getAllSudowoodoReleasesOrUpdate = timeMemoize(
  async () => {
    const response = await fetch.default('https://electron-sudowoodo.herokuapp.com/release/history');
    return response.json();
  },
  30 * 1000,
  () => 'all_releases',
);

const getGitHubRelease = timeMemoize(
  async (version) => {
    try {
      return (
        await (await getOctokit()).repos.getReleaseByTag({
          owner: 'electron',
          repo: version.includes('nightly') ? 'nightlies' : 'electron',
          tag: version,
        })
      ).data;
    } catch(e) {
      console.error(e)
      return null;
    }
  },
  10 * 60 * 1000,
  (version) => `release/${version}`,
);

const getPR = timeMemoize(
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
  30 * 1000,
  (prNumber) => `pr/${prNumber}`,
);

const getPRComments = timeMemoize(
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
  60 * 1000,
  (prNumber) => `pr-comments/${prNumber}`,
);

const compareTagToCommit = timeMemoize(
  async (tag, commitSha) => {
    const compare = await (await getOctokit()).repos.compareCommits({
      owner: 'electron',
      repo: 'electron',
      base: tag,
      head: commitSha,
    });
    return compare.data;
  },
  60 * 60 * 24 * 1000,
  (tag, commitSha) => `compare/${tag}/${commitSha}`,
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
