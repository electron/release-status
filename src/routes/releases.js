const { Router } = require('express');
const paginate = require('express-paginate');
// const MarkdownIt = require('markdown-it');
const Handlebars = require('handlebars');
const a = require('../utils/a');
const { getGitHubRelease, getReleasesOrUpdate } = require('../data');

const router = new Router();

Handlebars.registerHelper('erick', function (pages, page) {
  console.log(pages, page);
  return `
    <nav class="pagination" role="navigation" aria-label="Pagination Navigation">
      <ul>
        ${pages
          .map(
            (p) =>
              `<li class="${p.number === page ? 'selected' : ''}"><a href="${p.url}">${
                p.number
              }</a></li>`,
          )
          .join('')}
      </ul>
    </nav>
  `;
});

router.use(paginate.middleware(10, 50));
router.get(
  '/',
  a(async (req, res) => {
    const releases = await getReleasesOrUpdate();
    const filteredReleases = releases.filter(
      (r) =>
        !r.version.includes('alpha') &&
        !r.version.includes('beta') &&
        !r.version.includes('nightly'),
    );
    const { page, limit } = req.query;
    const firstToDisplay = (page - 1) * limit;
    const releasesToDisplay = filteredReleases.slice(firstToDisplay, firstToDisplay + limit);

    // TODO(erick): re-enable github auth
    // for (const r of releasesToDisplay) {
    //   r.body = (await getGitHubRelease(`v${r.version}`)).body;
    // }

    const itemCount = filteredReleases.length;
    const pageCount = Math.ceil(itemCount / req.query.limit);
    return res.render('releases', {
      css: 'releases',
      releases: releasesToDisplay,
      page: page,
      pages: paginate.getArrayPages(req)(3, pageCount, req.query.page),
    });
  }),
);

module.exports = router;
