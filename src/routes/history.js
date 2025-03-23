const { Router } = require('express');
const a = require('../utils/a');
const { getReleasesOrUpdate } = require('../data');

const router = new Router();

// Route: Render history page
router.get('/', (req, res) =>
  res.render('history', {
    css: 'history',
  }),
);

// Route: Fetch releases for a specific date
router.get(
  '/:date',
  a(async (req, res) => {
    try {
      const releases = await getReleasesOrUpdate();
      const onDate = releases.filter((r) => r.date === req.params.date);

      if (!onDate.length) {
        return res.redirect('/history');
      }

      res.render('date', {
        releases: onDate,
        css: 'home',
        title: req.params.date,
      });
    } catch (error) {
      console.error('Error fetching releases:', error);
      res.status(500).send('Internal Server Error');
    }
  }),
);

module.exports = router;
