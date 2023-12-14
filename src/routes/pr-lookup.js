const { Router } = require('express');

const router = new Router();

router.get('/', (req, res) =>
  res.render('pr-lookup', {
    title: 'PR Lookup',
    css: 'pr-lookup',
  }),
);

router.get('/:number', (req, res) => res.redirect(`/pr/${req.params.number}`));

module.exports = router;
