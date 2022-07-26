const { Router } = require('express');
const paginate = require('express-paginate');
const Handlebars = require('handlebars');
const a = require('../utils/a');
const { getGitHubRelease, getReleasesOrUpdate } = require('../data');
const semver = require('semver');

const router = new Router();

const timeSince = (str) => {
  const d = new Date();
  const today = new Date(d.getFullYear(), d.getMonth() + 1, d.getDate());
  const parts = str.split('-').map((n) => parseInt(n, 10));
  const releaseDate = new Date(parts[0], parts[1], parts[2]);
  const daysAgo = Math.floor((today.getTime() - releaseDate.getTime()) / (1000 * 60 * 60 * 24));
  if (daysAgo === 0) return 'Today';
  if (daysAgo === 1) return 'Yesterday';
  return `${daysAgo} days ago`;
};

Handlebars.registerPartial('metadata', function (version) {
  return `
  <div>
    <a href="https://github.com/electron/electron/releases/tag/v${
      version.version
    }"><div class="tag"><i class="fab fa-github"></i>&nbsp;v${version.version}</div></a>
    <div class="dependency-info">
      <span><i class="fa fa-calendar"></i>&nbsp;${timeSince(version.date)}</span>
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
      <ul>
        <a href=${prev}><li>Prev</li></a>
        ${pages
          .map(
            (p) =>
              `<a href="${p.url}"><li class="${p.number === page ? 'selected' : ''}">${
                p.number
              }</li></a>`,
          )
          .join('')}
          <a href=${next}><li>Next</li></a>
      </ul>
    </nav>
  `;
});

router.use(paginate.middleware(6, 50));
router.get(
  '/:channel',
  a(async (req, res) => {
    const { channel } = req.params;
    let filter;

    if (!['stable', 'prerelease', 'nightly'].includes(channel)) {
      res.redirect('/releases/stable');
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
      r.body = (await getGitHubRelease(`v${r.version}`)).body;
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
