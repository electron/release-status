const { Router } = require('express');
const MarkdownIt = require('markdown-it');
const a = require('../utils/a');
const { getGitHubRelease, getReleasesOrUpdate } = require('../data');

const router = new Router();

router.get(
  '/',
  a(async (req, res) => {
    const releases = await getReleasesOrUpdate();
    const releasesToDisplay = releases
      .filter(
        (r) =>
          !r.version.includes('alpha') &&
          !r.version.includes('beta') &&
          !r.version.includes('nightly'),
      )
      .slice(0, 4);
    for (const r of releasesToDisplay) {
      console.log(Object.keys(r));
      r.body = (await getGitHubRelease(`v${r.version}`)).body;
    }
    return res.render('releases', {
      css: 'releases',
      releases: releasesToDisplay,
    });
  }),
);

module.exports = router;
