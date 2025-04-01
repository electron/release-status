const Handlebars = require('handlebars');
const { Router } = require('express');
const semver = require('semver');
const createDOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');

const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

const a = require('../utils/a');
const { compareTagToCommit, getReleasesOrUpdate, getPR, getPRComments, getReleasesOrUpdateSortedByDate } = require('../data');

const router = new Router();

Handlebars.registerHelper('formattedDate', (date) => new Date(date).toUTCString());

Handlebars.registerHelper('html', (content) => DOMPurify.sanitize(content));

async function getPRReleaseStatus(prNumber) {
  const releases = await getReleasesOrUpdateSortedByDate();
  const [prInfo, comments] = await Promise.all([getPR(prNumber), getPRComments(prNumber)]); // get PR info
  if (!prInfo) return null; // if the PR is not found, return null

  const { base, merged, merged_at, merge_commit_sha } = prInfo;

  // PR is somehow targeting a repo that isn't in the electron org
  // or that isn't electron/electron.
  if (base.user.login !== 'electron' || base.repo.name !== 'electron') {
    return null;
  }

  // PRs merged before we renamed the default branch to main from master
  // will have a base.ref of master and a base.repo.default_branch of main.
  const primaryPRBeforeRename =
    base.ref === 'master' && new Date(merged_at) < new Date('June 1 2021');
  if (primaryPRBeforeRename || base.ref === base.repo.default_branch) {
    const backports = [];
    let availableIn = null;

    // We've been merged
    if (merged) {
      const allPrereleases = releases.filter((r) => { // non-nightly prereleases
        let releaseTag = semver.parse(r.version).prerelease[0];
        return releaseTag !== 'nightly' && releaseTag !== undefined; // filter out non-nightly releases and not stable releases
      });
      for (const prerelease of allPrereleases) {
        const dateParts = prerelease.date.split('-').map((n) => parseInt(n, 10));
        const releaseDate = new Date(dateParts[0], dateParts[1] - 1, dateParts[2] + 1);
        if (releaseDate > new Date(merged_at)) {
          const comparison = await compareTagToCommit(`v${prerelease.version}`, merge_commit_sha);
          if (comparison.status === 'behind') {
            availableIn = prerelease;
            break;
          }
        }
      }
    }

    const tropComments = comments.filter((c) => c.user.login === 'trop[bot]');

    for (const label of prInfo.labels) {
      let targetBranch = null;
      let state = null;

      if (label.name.startsWith('merged/')) {
        targetBranch = label.name.substr('merged/'.length);
        state = 'merged';
      } else if (label.name.startsWith('target/')) {
        targetBranch = label.name.substr('target/'.length);
        state = 'pending';
      } else if (label.name.startsWith('needs-manual-bp/')) {
        targetBranch = label.name.substr('needs-manual-bp/'.length);
        state = 'needs-manual';
      } else if (label.name.startsWith('in-flight/')) {
        targetBranch = label.name.substr('in-flight/'.length);
        state = 'in-flight';
      }

      if (targetBranch && state) {
        const backportComment = tropComments.find(
          (c) =>
            (c.body.startsWith('I have automatically backported') ||
              c.body.includes('has manually backported this PR ')) &&
            c.body.includes(`"${targetBranch}"`),
        );

        backports.push(
          (async () => {
            let pr = null;
            let backportAvailableIn;
            if (backportComment) {
              pr = await getPR(parseInt(backportComment.body.split('#')[1], 10));
              if (pr.merged) {
                state = 'merged';

                const allInMajor = releases.filter((r) => {
                  const parsed = semver.parse(r.version);
                  return (
                    parsed.major === parseInt(targetBranch.split('-')[0], 10) &&
                    parsed.prerelease[0] !== 'nightly'
                  );
                });
                for (const release of allInMajor) {
                  const dateParts = release.date.split('-').map((n) => parseInt(n, 10));
                  const releaseDate = new Date(dateParts[0], dateParts[1] - 1, dateParts[2] + 1);
                  if (releaseDate > new Date(pr.merged_at)) {
                    const comparison = await compareTagToCommit(
                      `v${release.version}`,
                      pr.merge_commit_sha,
                    );
                    if (comparison.status === 'behind') {
                      backportAvailableIn = release;
                      state = 'released';
                      break;
                    }
                  }
                }
              }
            }

            return {
              targetBranch,
              state,
              pr,
              availableIn: backportAvailableIn,
            };
          })(),
        );
      }
    }

    // This is the primary PR, we can scan from here for backports
    return {
      primary: {
        pr: prInfo,
        availableIn,
      },
      backports: (await Promise.all(backports)).sort((a, b) =>
        semver.compare(
          a.targetBranch.replace(/-/g, '.').replace(/[xy]/g, '0'),
          b.targetBranch.replace(/-/g, '.').replace(/[xy]/g, '0'),
        ),
      ),
    };
  }

  // This is a backport PR, we should scan from here for the primary PR and then re-call getPRReleaseStatus with that primary PR

  // c.f. https://github.com/electron/trop/blob/master/src/utils/branch-util.ts#L62
  const backportPattern =
    /(?:^|\n)(?:manual |manually )?backport (?:of )?(?:#(\d+)|https:\/\/github.com\/.*\/pull\/(\d+))/gim;
  const match = backportPattern.exec(prInfo.body);

  if (!match) return null;
  const parentPRNumber = match[1] ? parseInt(match[1], 10) : parseInt(match[2], 10);

  return { ...(await getPRReleaseStatus(parentPRNumber)) };
}

router.get('/is-valid/:number', async (req, res) => {
  const prNumber = parseInt(req.params.number, 10);
  const valid = prNumber > 0 && !!(await getPR(prNumber));
  return res.json({ valid });
});

router.get(
  '/:number',
  a(async (req, res) => {
    const prNumber = parseInt(req.params.number, 10);
    if (isNaN(prNumber) || prNumber < 0) return res.redirect('/');
    const prInfo = await getPRReleaseStatus(prNumber);
    if (!prInfo) return res.redirect('/');

    res.render('pr', {
      ...prInfo,
      css: 'pr',
      title: `PR #${prNumber} - Release Status`,
    });
  }),
);

module.exports = router;
