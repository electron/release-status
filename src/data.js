const { getAuthOptionsForRepo, appCredentialsFromString } = require('@electron/github-app-auth');
const { Octokit } = require('@octokit/rest');
const ExpiryMap = require('expiry-map');
const pMemoize = require('p-memoize');
const semver = require('semver');

const REPO_DATA = {
  owner: 'electron',
  repo: 'electron',
};

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
    octokit = new Octokit({
      ...authOpts,
    });
  } else if (GITHUB_TOKEN) {
    octokit = new Octokit({
      auth: GITHUB_TOKEN,
    });
  } else {
    octokit = new Octokit();
  }
  return octokit;
};

const getReleasesOrUpdate = pMemoize(
  async () => {
    try {
      const response = await fetch('https://electronjs.org/headers/index.json');
      if (!response.ok) {
        console.error(`Failed to fetch releases: ${response.status} ${response.statusText}`);
        return [];
      }
      const releases = await response.json();
      return releases.sort((a, b) => semver.compare(b.version, a.version));
    } catch (error) {
      console.error('Error fetching releases:', error);
      return [];
    }
  },
  {
    cache: new ExpiryMap(60 * 1000),
    cacheKey: () => 'releases',
  },
);

const getDownloadStatsOrUpdate = pMemoize(
  async () => {
    try {
      const response = await fetch('https://electron-sudowoodo.herokuapp.com/release/active');
      if (!response.ok) {
        console.error(`Failed to fetch download stats: ${response.status} ${response.statusText}`);
        return {}; // Return empty object as fallback
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching download stats:', error);
      return {}; // Return empty object as fallback
    }
  },
  {
    cache: new ExpiryMap(60 * 1000),
    cacheKey: () => 'download_stats',
  },
);

const getActiveReleasesOrUpdate = pMemoize(
  async () => {
    try {
      const response = await fetch('https://electron-sudowoodo.herokuapp.com/release/active');
      if (!response.ok) {
        console.error(`Failed to fetch active releases: ${response.status} ${response.statusText}`);
        return { currentlyRunning: [], queued: [] }; // Return structured fallback
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching active releases:', error);
      return { currentlyRunning: [], queued: [] }; // Return structured fallback
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
      const response = await fetch('https://electron-sudowoodo.herokuapp.com/release/history');
      if (!response.ok) {
        console.error(`Failed to fetch release history: ${response.status} ${response.statusText}`);
        return [];
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching release history:', error);
      return [];
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
      const octokit = await getOctokit();
      const response = await octokit.repos.getReleaseByTag({
        owner: 'electron',
        repo: version.includes('nightly') ? 'nightlies' : 'electron',
        tag: version,
      });
      return response.data;
    } catch (e) {
      console.error(`Error fetching GitHub release for ${version}:`, e);
      return null;
    }
  },
  {
    cache: new ExpiryMap(10 * 60 * 1000),
    cacheKey: ([version]) => `release/${version}`,
  },
);

const getRecentPRs = pMemoize(
  async () => {
    try {
      const octokit = await getOctokit();
      const response = await octokit.pulls.list({
        ...REPO_DATA,
        state: 'closed',
        base: 'main',
      });
      return response.data
        .filter((pr) => {
          return pr.user.type !== 'Bot' && pr.merged_at;
        })
        .slice(0, 10);
    } catch (error) {
      console.error('Error fetching recent PRs:', error);
      return null;
    }
  },
  {
    cache: new ExpiryMap(10 * 60 * 1000),
    cacheKey: () => 'recent_prs',
  },
);

const getPR = pMemoize(
  async (prNumber) => {
    try {
      const octokit = await getOctokit();
      const response = await octokit.pulls.get({
        ...REPO_DATA,
        pull_number: prNumber,
        mediaType: {
          format: 'html',
        },
      });
      return response.data;
    } catch (error) {
      console.error(`Error fetching PR ${prNumber}:`, error);
      return null;
    }
  },
  {
    cache: new ExpiryMap(30 * 1000),
    cacheKey: ([prNumber]) => `pr/${prNumber}`,
  },
);

const getPRComments = pMemoize(
  async (prNumber) => {
    try {
      const octo = await getOctokit();
      return await octo.paginate(
        octo.issues.listComments.endpoint.merge({
          ...REPO_DATA,
          issue_number: prNumber,
          per_page: 100,
        }),
      );
    } catch (error) {
      console.error(`Error fetching PR comments for ${prNumber}:`, error);
      return [];
    }
  },
  {
    cache: new ExpiryMap(60 * 1000),
    cacheKey: ([prNumber]) => `pr-comments/${prNumber}`,
  },
);

const compareTagToCommit = pMemoize(
  async (tag, commitSha) => {
    try {
      const octokit = await getOctokit();
      const compare = await octokit.repos.compareCommits({
        ...REPO_DATA,
        base: tag,
        head: commitSha,
      });
      return compare.data;
    } catch (error) {
      console.error(`Error comparing ${tag} to ${commitSha}:`, error);
      return null;
    }
  },
  {
    cache: new ExpiryMap(60 * 60 * 24 * 1000),
    cacheKey: ([tag, commitSha]) => `compare/${tag}/${commitSha}`,
  },
);

const getTSDefs = pMemoize(
  async (version) => {
    try {
      const file = await fetch(`https://unpkg.com/electron@${version}/electron.d.ts`);
      if (!file.ok) {
        console.error(
          `Failed to fetch TypeScript definitions for ${version}: ${file.status} ${file.statusText}`,
        );
        return '// TypeScript definitions could not be loaded';
      }
      return await file.text();
    } catch (error) {
      console.error(`Error fetching TypeScript definitions for ${version}:`, error);
      return '// TypeScript definitions could not be loaded';
    }
  },
  {
    cache: new ExpiryMap(60 * 60 * 24 * 1000),
    cacheKey: ([version]) => `ts/${version}`,
  },
);

module.exports = {
  getGitHubRelease,
  getReleasesOrUpdate,
  getActiveReleasesOrUpdate,
  getAllSudowoodoReleasesOrUpdate,
  getPR,
  getPRComments,
  getRecentPRs,
  compareTagToCommit,
  getTSDefs,
};
