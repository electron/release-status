const Handlebars = require('handlebars');
const { Router } = require('express');
const { ago } = require('time-ago');

const a = require('../utils/a');
const { getAllSudowoodoReleasesOrUpdate, getGitHubRelease } = require('../data');

const router = new Router();

Handlebars.registerHelper('timeAgo', (str) => {
  return ago(new Date(str));
});

const prettyCircleName = (workflow) => {
  switch (workflow) {
    case 'publish-linux':
    case 'linux-publish':
      return 'Linux';
    case 'publish-macos':
    case 'macos-publish':
      return 'macOS';
    default:
      return workflow;
  }
};

const prettyAppveyorName = (project) => {
  switch (project) {
    case 'electron-ia32-release':
      return 'Windows ia32';
    case 'electron-x64-release':
      return 'Windows x64';
    case 'electron-woa-release':
      return 'Windows arm64';
    default:
      return 'Windows Unknown';
  }
};

router.get(
  '/:buildId',
  a(async (req, res) => {
    const allBuilds = await getAllSudowoodoReleasesOrUpdate();
    const build = allBuilds.find(b => b.id === req.params.buildId);
    if (!build) {
      return res.redirect('/');
    }

    const ghRelease = await getGitHubRelease(build.generatedElectronVersion);

    const ciBuilds = [];
    if (build.ciBuilds) {
      for (const circleBuild of build.ciBuilds.circle) {
        ciBuilds.push({
          name: prettyCircleName(circleBuild.buildJob),
          url: `https://circleci.com/workflow-run/${circleBuild.buildId}`,
          status: circleBuild.status,
          icon: circleBuild.buildJob.includes('linux') ? 'linux' : 'apple',
        });
      }
      for (const appveyorBuild of build.ciBuilds.appveyor) {
        ciBuilds.push({
          name: prettyAppveyorName(appveyorBuild.projectSlug),
          url: `https://${appveyorBuild.buildServer}/project/${appveyorBuild.accountName}/${appveyorBuild.projectSlug}/build/${appveyorBuild.buildVersion}`,
          status: appveyorBuild.status,
          icon: 'windows',
        });
      }
    }

    res.render('release-build', {
      build,
      ciBuilds,
      ghRelease,
      css: 'release-build',
      title: `Release Build - ${build.id}`
    });
  }),
);

module.exports = router;
