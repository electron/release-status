const { Router } = require('express');
const paginate = require('express-paginate');
const Handlebars = require('handlebars');
const a = require('../utils/a');
const { getGitHubRelease, getReleasesOrUpdate } = require('../data');
const semver = require('semver');

const router = new Router();

const { timeSince } = require('../utils/format-time');

Handlebars.registerPartial('metadata', function (version) {
  return `
  <div class="release-card__metadata">
    <a href="https://github.com/electron/electron/releases/tag/v${
      version.version
    }"><div><i class="fab fa-github"></i>&nbsp;v${version.version} on GitHub</div></a>
    <div class="dependency-info">
      <span><i class="fa fa-calendar"></i>&nbsp;${version.date} (${timeSince(version.date)})</span>
      <span>
        <i class="fab fa-chrome"></i>
        ${version.chrome}
      </span>
      <span>
        <i class="fab fa-node-js"></i>
        ${version.node}
      </span>
    </div>
  </div>`;
});

Handlebars.registerHelper('paginate', function (pages, page, prev, next) {
  return `
    <nav class="pagination" role="navigation" aria-label="Pagination Navigation">
      <ul class="pagination__list">
        <a href=${prev} class="pagination__list-item"><li>Prev</li></a>
        ${pages
          .map(
            (p) =>
              `<a href="${p.url}"><li class="pagination__list-item ${
                p.number === page ? 'pagination__list-item--selected' : ''
              }">${p.number}</li></a>`,
          )
          .join('')}
          <a href=${next} class="pagination__list-item"><li>Next</li></a>
      </ul>
    </nav>
  `;
});

router.use(paginate.middleware(2, 50));

function stripPreReleasePreamble(body) {
  const RELEASE_NOTES_START = '# Release Notes for';
  return `${RELEASE_NOTES_START}${body
    .split(RELEASE_NOTES_START)
    .slice(1)
    .join(RELEASE_NOTES_START)}`;
}

function linkifyReleaseHeader(body) {
  return body.replace(/# Release Notes for ([^\r\n]+)(?:(?:\n)|(?:\r\n))/, '# [Release Notes for $1](/release/$1)\n')
}

router.get(
  '/:channel',
  a(async (req, res) => {
    const { channel } = req.params;
    let filter;

    if (!['stable', 'prerelease', 'nightly'].includes(channel)) {
      return res.redirect('/releases/stable');
    }

    if (channel === 'stable') {
      filter = ({ version }) =>
        !version.includes('alpha') && !version.includes('beta') && !version.includes('nightly');
    } else if (channel === 'prerelease') {
      filter = ({ version }) => version.includes('alpha') || version.includes('beta');
    } else if (channel === 'nightly') {
      filter = ({ version }) => version.includes('nightly');
    }

    const releases = await getReleasesOrUpdate();
    const { page, limit, version } = req.query;
    const releasesFromChannel = releases.filter(filter);
    const major = Number(version);
    const majors = releasesFromChannel.reduce((acc, val) => {
      acc.add(semver.major(val.version));
      return acc;
    }, new Set());
    const releasesFromMajor = releasesFromChannel.filter((release) => {
      if (Number.isInteger(major) && major >= 0) {
        return semver.major(release.version) === major;
      } else {
        return true;
      }
    });
    const firstToDisplay = (page - 1) * limit;
    const releasesToDisplay = releasesFromMajor.slice(firstToDisplay, firstToDisplay + limit);

    for (const r of releasesToDisplay) {
      const prereleaseInfo = semver.prerelease(r.version);
      if (prereleaseInfo && prereleaseInfo[0] === 'nightly') {
        r.body = `# Release Notes for v${r.version}\nThis release is published to npm under the electron-nightly package and can be installed via:\n\n\`npm install electron-nightly@${r.version}\`.\n\nNightlies do not get release notes, please compare tags for info.`;
      } else {
        r.body = stripPreReleasePreamble((await getGitHubRelease(`v${r.version}`)).body);
      }
      r.body = linkifyReleaseHeader(r.body);
    }

    const itemCount = releasesFromMajor.length;
    const pageCount = Math.ceil(itemCount / req.query.limit);
    return res.render('releases', {
      css: 'releases',
      channel: channel,
      major: major,
      majors: Array.from(majors),
      releases: releasesToDisplay,
      page: page,
      prev: paginate.href(req)(true),
      next: paginate.href(req)(false),
      pages: paginate.getArrayPages(req)(5, pageCount, req.query.page),
    });
  }),
);

router.get(
  '*',
  a(async (req, res) => {
    res.redirect('/releases/stable');
  }),
);

module.exports = router;
