import { getAuthOptionsForRepo, appCredentialsFromString } from '@electron/github-app-auth';
import { Octokit } from '@octokit/rest';

import memoize from '@keyvhq/memoize';
import { getKeyvCache } from './cache';
import { ElectronRelease, getAllVersionsInMajor, VersionFilter } from './release-data';
import { styleHtmlContent } from './html-renderer';

const REPO_DATA = {
  owner: 'electron',
  repo: 'electron',
};

let octokit: Octokit | null = null;
const getOctokit = async () => {
  if (octokit) return octokit;

  const { RELEASE_STATUS_GITHUB_APP_CREDS, GITHUB_TOKEN } = process.env;

  if (RELEASE_STATUS_GITHUB_APP_CREDS) {
    const authOpts = await getAuthOptionsForRepo(
      {
        owner: REPO_DATA.owner,
        name: REPO_DATA.repo,
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

export const getGitHubReleaseNotes = memoize(
  async (version: string) => {
    try {
      const { data } = await (
        await getOctokit()
      ).repos.getReleaseByTag({
        owner: 'electron',
        repo: version.includes('nightly') ? 'nightlies' : 'electron',
        tag: version,
      });
      if (!data.body) {
        return 'Missing release notes';
      }
      return data.body;
    } catch (e) {
      console.error(e);
      return null;
    }
  },
  getKeyvCache('github-release'),
  {
    ttl: 10 * 60 * 1000,
    staleTtl: 24 * 60 * 60 * 1000,
  },
);

function findMostAggressiveSemver(labels: { name: string }[]) {
  const semverLabels = labels
    .map((label) => label.name)
    .filter((label) => label.startsWith('semver/'));
  if (semverLabels.length === 0) return null;
  const semverMap: Record<string, number> = {
    'semver/major': 3,
    'semver/minor': 2,
    'semver/patch': 1,
    'semver/none': 1,
  };
  const semverValues = semverLabels.map((label) => semverMap[label]);
  const maxValue = Math.max(...semverValues);
  const maxLabel = Object.keys(semverMap).find((key) => semverMap[key] === maxValue);
  return maxLabel
    ? (maxLabel.replace('semver/', '') as 'major' | 'minor' | 'patch' | 'none')
    : null;
}

export const getRecentPRs = memoize(
  async () => {
    try {
      const { data } = await (
        await getOctokit()
      ).pulls.list({
        ...REPO_DATA,
        state: 'closed',
        base: 'main',
      });
      return data
        .filter((pr) => {
          return pr.user?.type !== 'Bot' && pr.merged_at;
        })
        .slice(0, 10)
        .map((pr) => ({
          number: pr.number,
          title: pr.title,
          url: pr.html_url,
          createdAt: pr.created_at,
          author: pr.user?.login || 'Unknown User',
        }));
    } catch {
      return null;
    }
  },
  getKeyvCache('github-recent-prs'),
  {
    ttl: 10 * 60 * 1000,
    staleTtl: 24 * 60 * 60 * 1000,
  },
);

type BackportState = {
  targetBranch: string;
  state: 'merged' | 'pending' | 'in-flight';
  pendingReason: string | null;
  backportPRNumber: number | null;
  mergedAt: string | null;
  releasedAt: string | null;
  releasedIn: string | null;
};

const trackBackports = async (prNumber: number, prLabels: { name: string }[]) => {
  const backportsToResolve: Promise<BackportState>[] = [];
  const comments = await getPRComments(prNumber);

  const tropComments = comments.filter((c) => c.author === 'trop[bot]');
  for (const label of prLabels) {
    let targetBranch = null;
    let state = null;
    let pendingReason = null;
    const [pre, post, ...rest] = label.name.split('/');
    if (rest.length) {
      continue;
    }

    if (pre === 'merged') {
      targetBranch = post;
      state = 'merged' as const;
    } else if (pre === 'target') {
      targetBranch = post;
      state = 'pending' as const;
      pendingReason = 'Waiting for trop to backport';
    } else if (pre === 'needs-manual-bp') {
      targetBranch = post;
      state = 'pending' as const;
      pendingReason = 'Waiting for a manual backport';
    } else if (pre === 'in-flight') {
      targetBranch = post;
      state = 'in-flight' as const;
    }

    if (targetBranch && state) {
      const backportComment = tropComments.find(
        (c) =>
          (c.body?.startsWith('I have automatically backported') ||
            c.body?.includes('has manually backported this PR ')) &&
          c.body.includes(`"${targetBranch}"`),
      );
      backportsToResolve.push(
        (async () => {
          let pr = null;
          let backportReleasedIn: string | null = null;
          let backportPRNumber: number | null = null;
          if (backportComment) {
            backportPRNumber = parseInt(backportComment.body!.split('#')[1], 10);
            pr = (
              await (
                await getOctokit()
              ).pulls.get({
                ...REPO_DATA,
                pull_number: backportPRNumber,
                mediaType: {
                  format: 'html',
                },
              })
            ).data;
            if (pr.merged && pr.merge_commit_sha) {
              state = 'merged' as const;
              backportReleasedIn = await getFirstVersionForCommit(
                pr.merge_commit_sha,
                parseInt(targetBranch.split('-')[0], 10),
                VersionFilter.NON_NIGHTLY,
              );
            }
          }
          return {
            targetBranch,
            state,
            pendingReason,
            backportPRNumber,
            mergedAt: pr?.merged_at || null,
            releasedAt: backportReleasedIn
              ? new Date((await getReleaseCommitTime(backportReleasedIn))!).toString()
              : null,
            releasedIn: backportReleasedIn,
          };
        })(),
      );
    }
  }
  return backportsToResolve;
};

export const getPRDetails = memoize(
  async (prNumber: number) => {
    try {
      const pr = (
        await (
          await getOctokit()
        ).pulls.get({
          ...REPO_DATA,
          pull_number: prNumber,
          mediaType: {
            format: 'html',
          },
        })
      ).data;

      let targetMajor: number = 0;

      let backportOf = null;
      let backports: Promise<BackportState>[] | null = null;
      if (pr.base.ref === 'main' || pr.base.ref === 'master') {
        backports = await trackBackports(pr.number, pr.labels);
      } else {
        const major = parseInt(pr.base.ref.split('-')[0], 10);
        if (!isNaN(major)) {
          targetMajor = major;
        }

        const backportPattern =
          /(?:^|\n)(?:manual |manually )?backport (?:of )?(?:#(\d+)|https:\/\/github.com\/.*\/pull\/(\d+))/gim;
        const manualBackportMatch = backportPattern.exec(pr.body || '');

        if (manualBackportMatch) {
          const parentPRNumber = manualBackportMatch[1]
            ? parseInt(manualBackportMatch[1], 10)
            : parseInt(manualBackportMatch[2], 10);
          const parentPR = (
            await (
              await getOctokit()
            ).pulls.get({
              ...REPO_DATA,
              pull_number: parentPRNumber,
              mediaType: {
                format: 'html',
              },
            })
          ).data;
          backportOf = {
            number: parentPR.number,
            title: parentPR.title,
            author: parentPR.user?.login || 'Unknown User',
            authorAvatar: parentPR.user?.avatar_url || null,
            authorUrl: parentPR.user?.html_url || null,
            url: parentPR.html_url,
            mergedAt: parentPR.merged_at || null,
            state: parentPR.state,
            merged: parentPR.merged,
          };
        }
      }

      const semver = findMostAggressiveSemver(pr.labels);

      return {
        number: pr.number,
        title: pr.title,
        body: styleHtmlContent((pr as unknown as Record<string, string>).body_html),
        url: pr.html_url,
        state: pr.state,
        createdAt: pr.created_at,
        mergedAt: pr.merged_at || null,
        merged: pr.merged,
        comments: pr.comments,
        targetBranch: pr.base.ref,
        author: pr.user?.login || 'Unknown User',
        authorAvatar: pr.user?.avatar_url || null,
        authorUrl: pr.user?.html_url || null,
        semver,
        releasedIn:
          semver !== 'none'
            ? targetMajor && pr.merged && pr.merge_commit_sha
              ? await getFirstVersionForCommit(
                  pr.merge_commit_sha,
                  targetMajor,
                  VersionFilter.NON_NIGHTLY,
                )
              : pr.merge_commit_sha
                ? // TODO: Figure out how to correctly track the release for a PR
                  // merged to main, will need to figure out a "suspect" set of releases
                  // not based on major but based on date? It either is a nightly from main
                  // or it technically could be an alpha from a future release branch.
                  // These could be different major versions so we'll need some other heuristic
                  // to figure out the release and avoid comparing commits (as that is API expensive)
                  null
                : null
            : null,
        backportOf,
        backports: backports ? await Promise.all(backports) : null,
      };
    } catch (e) {
      console.error(e);
      return null;
    }
  },
  getKeyvCache('github-pr-details'),
  {
    ttl: 10 * 60 * 1000,
    staleTtl: 365 * 24 * 60 * 60 * 1000,
  },
);

export const getPRComments = memoize(
  async (prNumber: number) => {
    const octo = await getOctokit();
    try {
      return (
        await octo.paginate('GET /repos/{owner}/{repo}/issues/{issue_number}/comments', {
          ...REPO_DATA,
          issue_number: prNumber,
          per_page: 100,
        })
      ).map((comment) => ({ body: comment.body, author: comment.user?.login }));
    } catch {
      return [];
    }
  },
  getKeyvCache('github-pr-comments-v2'),
  {
    ttl: 10 * 60 * 1000,
    staleTtl: 365 * 24 * 60 * 60 * 1000,
  },
);

export const getReleaseCommitTime = memoize(
  async (version: string) => {
    try {
      const octokit = await getOctokit();
      const { data } = await octokit.git.getRef({
        ...REPO_DATA,
        ref: `tags/v${version}`,
      });
      const tag = await octokit.git.getTag({
        ...REPO_DATA,
        tag_sha: data.object.sha,
      });
      return new Date(tag.data.tagger.date).getTime();
    } catch {
      return null;
    }
  },
  getKeyvCache('github-release-commit-time'),
  {
    ttl: 24 * 60 * 60 * 1000,
    staleTtl: 365 * 24 * 60 * 60 * 1000,
  },
);

const getCommitTime = memoize(
  async (sha: string) => {
    try {
      const octokit = await getOctokit();
      const { data } = await octokit.repos.getCommit({
        ...REPO_DATA,
        ref: sha,
      });
      if (!data.commit.committer?.date) {
        return null;
      }
      return new Date(data.commit.committer.date).getTime();
    } catch (e) {
      console.error(e);
      return null;
    }
  },
  getKeyvCache('github-commit-time'),
  {
    ttl: 365 * 24 * 60 * 60 * 1000,
    staleTtl: 1000 * 24 * 60 * 60 * 1000,
  },
);

// This function is intentionally not memoized, all the functions it calls
// are memoized heavily so it should be fast enough. Memoizing off of two
// keys is just a pain.
export const getFirstVersionForCommit = async (
  sha: string,
  majorLine: number,
  versionFilter: VersionFilter,
  releaseFilter?: (release: ElectronRelease) => boolean,
) => {
  const releasesInMajor = [
    ...(await getAllVersionsInMajor(`${majorLine}.0.0`, versionFilter, releaseFilter)),
  ].reverse();

  const [commitTime, ...releaseTimes] = await Promise.all([
    getCommitTime(sha),
    ...releasesInMajor.map(async (release) => ({
      release,
      releaseTime: await getReleaseCommitTime(release),
    })),
  ]);

  if (!commitTime) {
    return null;
  }

  for (const { release, releaseTime } of releaseTimes) {
    if (releaseTime && releaseTime > commitTime) {
      return release;
    }
  }

  return null;
};
