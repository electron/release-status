const Diff = require('diff');
const { Router } = require('express');
const Handlebars = require('handlebars');
const MarkdownIt = require('markdown-it');
const createDOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');
const Prism = require('prismjs');
const semver = require('semver');

const a = require('../utils/a');
const { getGitHubRelease, getVersionsOrUpdate, getTSDefs } = require('../data');

const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);
const md = new MarkdownIt({
  html: true,
});

const router = new Router();

Handlebars.registerHelper('ifEquals', function (arg1, arg2, options) {
  return arg1 == arg2 ? options.fn(this) : options.inverse(this);
});

Handlebars.registerHelper('markdown', function (content) {
  return DOMPurify.sanitize(md.render(content));
});

const knownSections = [
  'Breaking Changes',
  'Features',
  'Fixes',
  'Documentation',
  'Other Changes',
  'Unknown',
];

Handlebars.registerHelper('markdownMergeHeaders', function (contentArr) {
  const groups = {};
  const hasPrerelease = contentArr.find((c) => c[1].includes('-'));
  for (const [content, version] of contentArr) {
    const headers = content.split(/^## ([A-Za-z ]+)\n/gm).slice(1);
    for (let i = 0; i < headers.length; i += 2) {
      const groupName = headers[i];
      const groupContent = headers[i + 1];
      groups[groupName] = groups[groupName] || '';
      groups[groupName] += `<div class="notes-version-group ${
        hasPrerelease ? 'maybe-prerelease' : ''
      }"><div>${version}</div>\n\n${groupContent.trim()}\n\n</div>\n`;
    }
  }
  let generatedNotes = '# Combined Release Notes\n\n';

  const hasReleaseNotes = Object.values(groups).some((v) => v !== '');
  if (hasReleaseNotes) {
    for (const knownSection of knownSections.concat(Object.keys(groups))) {
      if (!groups[knownSection]) continue;
      generatedNotes += `## ${knownSection}\n\n${groups[knownSection]}\n`;
      delete groups[knownSection];
    }
  } else {
    generatedNotes += 'There were no release notes for this version comparison.';
  }

  return DOMPurify.sanitize(md.render(generatedNotes));
});

async function getValidVersionRange(startVersion, endVersion, res) {
  const { releases: allReleases } = await getVersionsOrUpdate();

  const parsedStart = semver.parse(startVersion);
  const parsedEnd = semver.parse(endVersion);
  if (!parsedStart || !parsedEnd || parsedStart.major !== parsedEnd.major) {
    res.end('Sorry you can only compare Electron versions in the same major line at the moment');
    return [allReleases, null];
  }

  if (semver.gt(startVersion, endVersion)) {
    res.redirect(`/release/compare/${endVersion}/${startVersion}`);
    return [allReleases, null];
  }

  // Bad start === give up
  if (!allReleases.find((r) => r.version === startVersion.substr(1))) {
    res.redirect('/');
    return [allReleases, null];
  }

  // Bad end === give up
  if (!allReleases.find((r) => r.version === endVersion.substr(1))) {
    res.redirect('/');
    return [allReleases, null];
  }

  // Start === End - give up
  if (parsedStart.compare(parsedEnd) === 0) {
    res.redirect(`/release/${startVersion}`);
    return [allReleases, null];
  }

  return [
    allReleases,
    allReleases.filter(
      (r) =>
        semver.parse(r.version).compare(startVersion) > 0 &&
        semver.parse(r.version).compare(endVersion) <= 0,
    ),
  ];
}

async function handleComparisonRequest(startVersion, endVersion, res) {
  const [allReleases, versionRange] = await getValidVersionRange(startVersion, endVersion, res);
  if (!versionRange) return;

  const allGitHubReleases = await Promise.all(
    versionRange.map((r) => getGitHubRelease(`v${r.version}`)),
  );
  const allNotes = allGitHubReleases.filter(Boolean).map((r) => {
    let notes = r.body;
    const parsed = semver.parse(r.tag_name);
    if (parsed.prerelease.length) {
      notes = notes.split(`@${r.tag_name.substr(1)}\`.`)[1];
    }
    notes =
      '# Release Notes\n' + notes.replace(/# Release Notes for [^\r\n]+(?:(?:\n)|(?:\r\n))/i, '');
    return [notes, r.tag_name];
  });

  const startReleaseMeta = allReleases.find((r) => r.version === startVersion.substr(1));
  const endReleaseMeta = allReleases.find((r) => r.version === endVersion.substr(1));

  res.render('release-diff', {
    title: `${startVersion} .. ${endVersion}`,
    startVersion,
    endVersion,
    startReleaseMeta,
    endReleaseMeta,
    allNotes,
    css: 'release',
  });
}

async function handleTypescriptComparisonRequest(startVersion, endVersion, res) {
  const [_, versionRange] = await getValidVersionRange(startVersion, endVersion, res);
  if (!versionRange) return;

  const [startTypes, endTypes] = await Promise.all([
    getTSDefs(startVersion),
    getTSDefs(endVersion),
  ]);
  const tsDiff = Diff.createPatch('electron.d.ts', startTypes, endTypes, startVersion, endVersion);
  const diff = Prism.highlight(tsDiff, Prism.languages.javascript, 'typescript');

  res.render('ts-diff', {
    title: `${startVersion} .. ${endVersion} (API Changes)`,
    diff,
    css: 'prismjs/prism.min',
  });
}

router.get(
  '/compare/:startVersion/:endVersion',
  a(async (req, res) => {
    const startVersion = req.params.startVersion;
    const endVersion = req.params.endVersion;
    return await handleComparisonRequest(startVersion, endVersion, res);
  }),
);

router.get(
  '/compare/:startVersion/:endVersion/ts',
  a(async (req, res) => {
    const startVersion = req.params.startVersion;
    const endVersion = req.params.endVersion;
    return await handleTypescriptComparisonRequest(startVersion, endVersion, res);
  }),
);

router.get('/compare/:comparisonRange', (req, res) => {
  const [startVersion, endVersion] = req.params.comparisonRange.split('...');
  res.redirect(`/release/compare/${startVersion}/${endVersion}`);
});

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

router.get(
  '/:version',
  a(async (req, res) => {
    const version = req.params.version;
    const [release, { releases: allReleases }] = await Promise.all([
      getGitHubRelease(version),
      getVersionsOrUpdate(),
    ]);
    if (!release) {
      return res.redirect('/');
    }

    let releaseNotes = release.body;
    const parsed = semver.parse(version);
    if (parsed.prerelease.length) {
      releaseNotes = releaseNotes.split(new RegExp(`@${escapeRegExp(version.substr(1))}\`?.`))[1];
    }
    releaseNotes =
      '# Release Notes\n' +
      releaseNotes.replace(/# Release Notes for [^\r\n]+(?:(?:\n)|(?:\r\n))/i, '');

    const lastPreRelease = allReleases.find(
      (r) =>
        semver.parse(r.version).prerelease[0] === 'beta' ||
        semver.parse(r.version).prerelease[0] === 'alpha',
    );
    const preReleaseMajor = semver.parse(lastPreRelease.version).major;
    const lastSupported = allReleases.find(
      (r) => semver.parse(r.version).major === preReleaseMajor - 1,
    );
    const isLatestStable = lastSupported.version === version.substr(1);
    const isLatestPreRelease = lastPreRelease.version === version.substr(1);
    let tag = '';
    if (isLatestStable) {
      tag = ' <span><span class="latest latest-stable">Latest Stable</span></span>';
    } else if (isLatestPreRelease) {
      tag = ' <span><span class="latest latest-beta">Latest Pre Release</span></span>';
    }

    const releaseMeta = allReleases.find((r) => r.version === version.substr(1));

    res.render('release', {
      title: `${version}${tag}`,
      release,
      releaseNotes,
      version,
      isLatestStable,
      isLatestPreRelease,
      releaseMeta,
      prerelease: parsed.prerelease[0] || '',
      css: 'release',
      compareTarget: version,
      compareList: allReleases
        .filter(
          (r) =>
            r.version !== version.substr(1) &&
            semver.parse(r.version).prerelease[0] !== 'nightly' &&
            parsed.major === semver.parse(r.version).major,
        )
        .map((r) => r.version),
    });
  }),
);

module.exports = router;
