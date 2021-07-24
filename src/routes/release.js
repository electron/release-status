const { Router } = require('express');
const Handlebars = require('handlebars');
const MarkdownIt = require('markdown-it');
const createDOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');
const semver = require('semver');

const a = require('../utils/a');
const { getGitHubRelease, getReleasesOrUpdate } = require('../data');

const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);
const md = new MarkdownIt({
  html: true,
});

const router = new Router();

Handlebars.registerHelper('ifEquals', function(arg1, arg2, options) {
  return (arg1 == arg2) ? options.fn(this) : options.inverse(this);
});

Handlebars.registerHelper('markdown', function(content) {
  return DOMPurify.sanitize(md.render(content));
});

router.get('/:version', a(async (req, res) => {
  const version = req.params.version;
  const [release, allReleases] = await Promise.all([getGitHubRelease(version), getReleasesOrUpdate()]);
  if (!release) {
    return res.redirect('/');
  }

  let releaseNotes = release.body;
  const parsed = semver.parse(version);
  if (parsed.prerelease.length) {
    releaseNotes = releaseNotes.split(`@${version.substr(1)}\`.`)[1];
  }
  releaseNotes = releaseNotes.replace(`Release Notes for ${version}`, 'Release Notes');

  const lastAlpha = allReleases.find((r) => semver.parse(r.version).prerelease[0] === 'alpha');
  const lastBeta = allReleases.find((r) => semver.parse(r.version).prerelease[0] === 'beta');
  const betaMajor = semver.parse(lastBeta.version).major;
  const lastSupported = allReleases.find((r) => semver.parse(r.version).major === betaMajor - 1);
  const isLatestStable = lastSupported.version === version.substr(1);
  const isLatestBeta = lastBeta.version === version.substr(1);
  const isLatestAlpha = lastAlpha.version === version.substr(1);
  let tag = '';
  if (isLatestStable) {
    tag = ' <span><span class="latest latest-stable">Latest Stable</span></span>';
  } else if (isLatestBeta) {
    tag = ' <span><span class="latest latest-beta">Latest Beta</span></span>';
  } else if (isLatestAlpha) {
    tag = ' <span><span class="latest latest-alpha">Latest Alpha</span></span>';
  }

  const releaseMeta = allReleases.find((r) => r.version === version.substr(1));

  res.render('release', {
    title: `${version}${tag}`,
    release,
    releaseNotes,
    version,
    isLatestStable,
    isLatestBeta,
    isLatestAlpha,
    releaseMeta,
    prerelease: parsed.prerelease[0] || '',
    css: 'release',
  });
}));

module.exports = router;