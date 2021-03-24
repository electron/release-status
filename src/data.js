const fetch = require('node-fetch');
const { Octokit } = require("@octokit/rest");
const semver = require('semver');

const timeMemoize = require('./utils/time-memoize');

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

const getReleasesOrUpdate = timeMemoize(async () => {
  const response = await fetch.default('https://electronjs.org/headers/index.json');
  const releases = await response.json();
  return releases.sort((a, b) => semver.compare(b.version, a.version));
}, 60 * 1000, () => 'releases');

const getActiveReleasesOrUpdate = timeMemoize(async () => {
  const response = await fetch.default('https://electron-sudowoodo.herokuapp.com/active');
  return response.json();
}, 30 * 1000, () => 'active_releases');

const getPR = timeMemoize(async (prNumber) => {
  try {
    return (await octokit.pulls.get({
      owner: 'electron',
      repo: 'electron',
      pull_number: prNumber,
    })).data;
  } catch {
    return null;
  }
}, 30 * 1000, (prNumber) => `pr/${prNumber}`);

const getPRComments = timeMemoize(async (prNumber) => {
  try {
    return await octokit.paginate(octokit.issues.listComments.endpoint.merge({
      owner: 'electron',
      repo: 'electron',
      issue_number: prNumber,
      per_page: 100,
    }));
  } catch {
    return [];
  }
}, 60 * 1000, (prNumber) => `pr-comments/${prNumber}`);

const compareTagToCommit = timeMemoize(async (tag, commitSha) => {
  const compare = await octokit.repos.compareCommits({
    owner: 'electron',
    repo: 'electron',
    base: tag,
    head: commitSha,
  });
  return compare.data;
}, 60 * 60 * 24 * 1000, (tag, commitSha) => `compare/${tag}/${commitSha}`);

module.exports = {
  getReleasesOrUpdate,
  getActiveReleasesOrUpdate,
  getPR,
  getPRComments,
  compareTagToCommit,
};
