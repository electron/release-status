const { Router } = require('express');

const a = require('../utils/a');
const { getReleasesOrUpdate } = require('../data');

const router = new Router();

router.get('/', (req, res) =>
  res.render('newreleases', {
    css: 'newreleases',
  }),
);

router.get(
  '/:date',
  a(async (req, res) => {
    const releases = await getReleasesOrUpdate();
    const onDate = releases.filter((r) => r.date === req.params.date);
    if (onDate.length === 0) return res.redirect('/newreleases');
    res.render('date', {
      releases: onDate,
      css: 'home',
      title: req.params.date,
    });
  }),
);

module.exports = router;
