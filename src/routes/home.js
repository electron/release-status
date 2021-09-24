const { Router } = require('express');
const Handlebars = require('handlebars');
const semver = require('semver');

const a = require('../utils/a');
const { getReleasesOrUpdate, getActiveReleasesOrUpdate } = require('../data');

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

const minutesSince = (str) => {
  const d = new Date(str);
  const now = new Date();
  const since = now.getTime() - d.getTime();
  let minutes = Math.floor(since / 60000);
  if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  const hours = Math.floor(minutes / 60);
  minutes = minutes % 60;
  if (minutes === 0) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  return `${hours} hour${hours !== 1 ? 's' : ''} and ${minutes} minute${
    minutes !== 1 ? 's' : ''
  } ago`;
};

Handlebars.registerPartial('releaseBar', function (version) {
  return `<a class="release" href="/release/v${version.version}">
  <div class="version">
    <span>${version.version}</span>
    <span>${timeSince(version.date)}</span>
  </div>
  <div class="dependency-info">
    <span>
      <i class="fab fa-chrome"></i>
      ${version.chrome}
    </span>
    <span>
      <i class="fab fa-node-js"></i>
      ${version.node}
    </span>
  </div>
</a>`;
});

Handlebars.registerPartial('releaseSquare', function (release) {
  let channelIcon = '<i class="fas fa-pencil-alt"></i>';
  switch (release.channel) {
    case 'minor': {
      channelIcon = '<i class="fas fa-feather"></i>';
      break;
    }
    case 'alpha':
    case 'beta': {
      channelIcon = '<i class="fas fa-flask"></i>';
      break;
    }
    case 'nightly': {
      channelIcon = '<i class="fas fa-moon"></i>';
      break;
    }
  }
  return `<a href="/release-build/${release.id}" class="active-release">
  <span><i class="fas fa-code-branch"></i>${release.branch}</span>
  <span>${channelIcon}${release.channel.substr(0, 1).toUpperCase()}${release.channel.substr(1)} Release</span>
  <span>Started ${minutesSince(release.started)}</span>
</a>`;
});

router.get(
  '/',
  a(async (req, res) => {
    const [releases, activeReleases] = await Promise.all([
      getReleasesOrUpdate(),
      getActiveReleasesOrUpdate(),
    ]);
    const lastNightly = releases.find((r) => semver.parse(r.version).prerelease[0] === 'nightly');
    const lastPreRelease = releases.find((r) => semver.parse(r.version).prerelease[0] === 'beta' || semver.parse(r.version).prerelease[0] === 'alpha');
    const betaMajor = semver.parse(lastPreRelease.version).major;
    const latestSupported = [betaMajor - 1, betaMajor - 2, betaMajor - 3].map((major) =>
      releases.find((r) => semver.parse(r.version).major === major),
    );
    res.render('home', {
      releases,
      lastNightly,
      lastPreRelease,
      latestSupported,
      currentlyReleasing: activeReleases.currentlyRunning,
      queuedReleases: activeReleases.queued,
      css: 'home',
    });
  }),
);

module.exports = router;
