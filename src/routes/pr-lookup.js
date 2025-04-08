const { Router } = require('express');
const Handlebars = require('handlebars');
const { getRecentPRs } = require('../data');
const a = require('../utils/a');

const router = new Router();

Handlebars.registerPartial('recentPR', function (pr) {
  const mergedAt = new Date(pr.merged_at).toLocaleString();
  const author = pr.user.login;
  return `<tr onclick="window.open('/pr/${encodeURIComponent(pr.number)}', '_blank')">
    <td><a target="_blank"
      href="https://github.com/electron/electron/pulls/${pr.number}">
      #${pr.number}
    </a></td>
    <td>${pr.title}</td>
    <td><a target="_blank"
      href="https://github.com/${author}">
      ${author}
    </a></td>
    <td>${mergedAt}</td>
  </tr>`;
});

router.get(
  '/',
  a(async (req, res) => {
    const recentPRs = await getRecentPRs();
    res.render('pr-lookup', {
      recentPRs,
      title: 'PR Lookup',
      css: 'pr-lookup',
    });
  }),
);

router.get('/:number', (req, res) => res.redirect(`/pr/${req.params.number}`));

module.exports = router;
