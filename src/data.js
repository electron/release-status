const { getAuthOptionsForRepo, appCredentialsFromString } = require('@electron/github-app-auth');
const fetch = require('node-fetch');
const { Octokit } = require('@octokit/rest');
const ExpiryMap = require('expiry-map');
const pMemoize = require('p-memoize');
const semver = require('semver');
const log = require('debug')('data');

let octokit = null;
const getOctokit = async () => {
  if (octokit) return octokit;

  const { RELEASE_STATUS_GITHUB_APP_CREDS, GITHUB_TOKEN } = process.env;

  if (RELEASE_STATUS_GITHUB_APP_CREDS) {
    const authOpts = await getAuthOptionsForRepo(
      {
        owner: 'electron',
        name: 'electron',
      },
      appCredentialsFromString(RELEASE_STATUS_GITHUB_APP_CREDS),
    );
    log('Using Octokit with GitHub App auth');
    octokit = new Octokit({
      ...authOpts,
    });
  } else if (GITHUB_TOKEN) {
    log('Using Octokit with GitHub token auth');
    octokit = new Octokit({
      auth: GITHUB_TOKEN,
    });
  } else {
    log('Using Octokit with unauthenticated GitHub API');
    octokit = new Octokit();
  }
  return octokit;
};

const getReleasesOrUpdate = pMemoize(
  async () => {
    try {
      const response = await fetch.default('https://electronjs.org/headers/index.json');
      const releases = await response.json();
      return releases.sort((a, b) => semver.compare(b.version, a.version));
    } catch (e) {
      log(e.message);
      throw e;
    }
  },
  {
    cache: new ExpiryMap(60 * 1000),
    cacheKey: () => 'releases',
  },
);

const getActiveReleasesOrUpdate = pMemoize(
  async () => {
    try {
      const response = await fetch.default(
        'https://electron-sudowoodo.herokuapp.com/release/active',
      );
      return response.json();
    } catch (e) {
      log('Failed to fetch active releases: ', e.message);
      return {};
    }
  },
  {
    cache: new ExpiryMap(30 * 1000),
    cacheKey: () => 'active_releases',
  },
);

const getAllSudowoodoReleasesOrUpdate = pMemoize(
  async () => {
    try {
      const response = await fetch.default(
        'https://electron-sudowoodo.herokuapp.com/release/history',
      );
      return response.json();
    } catch (e) {
      log('Failed to fetch release history from Sudowoodo: ', e.message);
      return {};
    }
  },
  {
    cache: new ExpiryMap(30 * 1000),
    cacheKey: () => 'all_releases',
  },
);

const getGitHubRelease = pMemoize(
  async (version) => {
    try {
      const octo = await getOctokit();
      const { data } = await octo.repos.getReleaseByTag({
        owner: 'electron',
        repo: version.includes('nightly') ? 'nightlies' : 'electron',
        tag: version,
      });
      return data;
    } catch (e) {
      log(`Failed to fetch GitHub release for version ${version}: `, e.message);
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
      const octo = await getOctokit();
      const { data } = await octo.pulls.get({
        owner: 'electron',
        repo: 'electron',
        pull_number: prNumber,
        mediaType: {
          format: 'html',
        },
      });
      return data;
    } catch (e) {
      log(`Failed to fetch PR ${prNumber}: `, e.message);
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
    } catch (e) {
      log(`Failed to fetch comments for PR ${prNumber}: `, e.message);
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
    try {
      const octo = await getOctokit();
      const { data } = await octo.repos.compareCommits({
        owner: 'electron',
        repo: 'electron',
        base: tag,
        head: commitSha,
      });
      return data;
    } catch (e) {
      log(`Failed to compare tag ${tag} to commit ${commitSha}: `, e.message);
      return [];
    }
  },
  {
    cache: new ExpiryMap(60 * 60 * 24 * 1000),
    cacheKey: (tag, commitSha) => `compare/${tag}/${commitSha}`,
  },
);

const getTSDefs = pMemoize(
  async (version) => {
    try {
      const file = await fetch(`https://unpkg.com/electron@${version}/electron.d.ts`);
      return await file.text();
    } catch (e) {
      log(`Failed to fetch TS defs for version ${version}: `, e.message);
      return '';
    }
  },
  {
    cache: new ExpiryMap(60 * 60 * 24 * 1000),
    cacheKey: (version) => `ts/${version}`,
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
  getTSDefs,
};
