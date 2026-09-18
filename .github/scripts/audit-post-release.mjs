// Post-release audit: checks that every recently published Electron release
// (plus the newest release of each supported line) has all of the follow-up
// artifacts a release is supposed to ship with. Only drift is reported.
//
// Run locally with:  yarn zx .github/scripts/audit-post-release.mjs
// Environment:       AUDIT_WINDOW_DAYS (default 14)
//                    AUDIT_GRACE_HOURS (default 24; see check 2)
//
// Checks
//   1. npm dist-tags on `electron` follow the publish rules used by the
//      release tooling: `latest` = newest stable overall, `alpha`/`beta` =
//      newest alpha/beta overall, and per supported line `X-x-y`,
//      `alpha-X-x-y`, `beta-X-x-y` = newest release of that kind on the line.
//   2. `electron-chromedriver@<version>` and `electron-mksnapshot@<version>`
//      exist on npm for every release in the set.
//   3. For each major whose first (non-nightly) release is in the window, the
//      published `node-abi` package knows the major and agrees on the ABI.
//   4. For each `X.0.0` stable in the set, the release blog post and the
//      releases.electronjs.org release page respond 200.

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import * as core from '@actions/core';
import semver from 'semver';
import { $ } from 'zx';

const RELEASES_URL = 'https://releases.electronjs.org/releases.json';
const SCHEDULE_URL = 'https://releases.electronjs.org/schedule.json';
const NPM_REGISTRY = 'https://registry.npmjs.org';
const REPORT_BASENAME = 'audit-post-release';

const windowDays = Number.parseInt(process.env.AUDIT_WINDOW_DAYS ?? '14', 10);
if (!Number.isInteger(windowDays) || windowDays <= 0) {
  throw new Error(
    `AUDIT_WINDOW_DAYS must be a positive integer, got ${process.env.AUDIT_WINDOW_DAYS}`,
  );
}

const graceHours = Number.parseInt(process.env.AUDIT_GRACE_HOURS ?? '24', 10);
if (!Number.isInteger(graceHours) || graceHours < 0) {
  throw new Error(
    `AUDIT_GRACE_HOURS must be a non-negative integer, got ${process.env.AUDIT_GRACE_HOURS}`,
  );
}

/** @type {{ check: string, subject: string, message: string, url: string }[]} */
const findings = [];
const addFinding = (check, subject, message, url) => {
  findings.push({ check, subject, message, url });
};

const fetchJson = async (url, init) => {
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error(`GET ${url} -> ${response.status}`);
  }
  return response.json();
};

const urlStatus = async (url) => {
  try {
    const response = await fetch(url, { method: 'GET', redirect: 'follow' });
    return response.status;
  } catch (err) {
    return `error: ${err.message}`;
  }
};

const isNightly = (version) => version.includes('-nightly.');
const prereleaseKind = (version) => semver.prerelease(version)?.[0] ?? null;
/** @type {(versions: string[]) => string | null} */
const newest = (versions) => (versions.length ? [...versions].sort(semver.rcompare)[0] : null);

//
// Gather inputs
//

const releases = (await fetchJson(RELEASES_URL)).filter(({ version }) => !isNightly(version));
const schedule = await fetchJson(SCHEDULE_URL);
/** @type {string[]} */
const allVersions = releases.map(({ version }) => version);

const supportedMajors = schedule
  .filter(({ status }) => status === 'stable' || status === 'prerelease')
  .map(({ version }) => semver.major(version));

const cutoff = new Date();
cutoff.setUTCDate(cutoff.getUTCDate() - windowDays);
const inWindow = releases.filter(({ fullDate }) => new Date(fullDate) >= cutoff);

// Releases under audit: everything in the window, plus the newest release on
// each supported line so a stale line is never silently skipped.
const auditSet = new Map(inWindow.map((release) => [release.version, release]));
for (const major of supportedMajors) {
  const version = newest(allVersions.filter((v) => semver.major(v) === major));
  if (version !== null && !auditSet.has(version)) {
    auditSet.set(
      version,
      releases.find((release) => release.version === version),
    );
  }
}
/** @type {string[]} */
const auditVersions = [...auditSet.keys()].sort(semver.rcompare);

core.info(`Window: last ${windowDays} days (since ${cutoff.toISOString()})`);
core.info(`Supported lines: ${supportedMajors.map((m) => `${m}-x-y`).join(', ')}`);
core.info(`Auditing ${auditVersions.length} releases: ${auditVersions.join(', ')}`);

//
// 1. npm dist-tags
//

const distTags = await fetchJson(`${NPM_REGISTRY}/-/package/electron/dist-tags`);
const distTagUrl = 'https://www.npmjs.com/package/electron?activeTab=versions';

const expectTag = (tag, expected) => {
  if (expected === null) {
    return;
  }
  const actual = distTags[tag];
  if (actual !== expected) {
    addFinding(
      'npm dist-tag',
      `electron@${tag}`,
      `dist-tag \`${tag}\` is \`${actual ?? '<unset>'}\`, expected \`${expected}\``,
      distTagUrl,
    );
  }
};

const stableVersions = allVersions.filter((v) => prereleaseKind(v) === null);
expectTag('latest', newest(stableVersions));
expectTag('beta', newest(allVersions.filter((v) => prereleaseKind(v) === 'beta')));
expectTag('alpha', newest(allVersions.filter((v) => prereleaseKind(v) === 'alpha')));

for (const major of supportedMajors) {
  const line = `${major}-x-y`;
  const onLine = allVersions.filter((v) => semver.major(v) === major);
  expectTag(line, newest(onLine.filter((v) => prereleaseKind(v) === null)));
  expectTag(`beta-${line}`, newest(onLine.filter((v) => prereleaseKind(v) === 'beta')));
  expectTag(`alpha-${line}`, newest(onLine.filter((v) => prereleaseKind(v) === 'alpha')));
}

//
// 2. electron-chromedriver / electron-mksnapshot
//
// These packages are only published for stable releases, by CI in their own
// repos that runs after the Electron release lands, so very fresh releases
// get a grace period before their absence counts as drift.
//

const graceCutoff = new Date(Date.now() - graceHours * 60 * 60 * 1000);
const stableAudit = auditVersions.filter((v) => prereleaseKind(v) === null);
const pending = stableAudit.filter((v) => new Date(auditSet.get(v).fullDate) > graceCutoff);
const dueForPackages = stableAudit.filter((v) => !pending.includes(v));
if (pending.length > 0) {
  core.info(`Within ${graceHours}h grace, skipping package checks: ${pending.join(', ')}`);
}

for (const pkg of ['electron-chromedriver', 'electron-mksnapshot']) {
  // Abbreviated packument: small, and `versions` is all we need.
  const packument = await fetchJson(`${NPM_REGISTRY}/${pkg}`, {
    headers: { Accept: 'application/vnd.npm.install-v1+json' },
  });
  const published = new Set(Object.keys(packument.versions));
  for (const version of dueForPackages) {
    if (!published.has(version)) {
      addFinding(
        'npm package',
        `${pkg}@${version}`,
        `\`${pkg}@${version}\` is not published`,
        `https://www.npmjs.com/package/${pkg}/v/${version}`,
      );
    }
  }
}

//
// 3. node-abi
//

const firstReleaseOfMajor = new Map();
for (const version of allVersions) {
  const major = semver.major(version);
  const current = firstReleaseOfMajor.get(major);
  if (current === undefined || semver.lt(version, current)) {
    firstReleaseOfMajor.set(major, version);
  }
}
const newMajors = [...firstReleaseOfMajor.entries()]
  .filter(([, version]) => auditSet.has(version) && inWindow.some((r) => r.version === version))
  .map(([major]) => major);

if (newMajors.length > 0) {
  // Read the *published* registry (not the git main branch) so we audit what
  // consumers actually install.
  const packDir = await fs.mkdtemp(path.join(os.tmpdir(), 'node-abi-'));
  // npm prints the tarball filename as the last line of stdout.
  const tarball = (await $({ cwd: packDir })`npm pack node-abi@latest --silent`).stdout
    .trim()
    .split('\n')
    .at(-1);
  await $({ cwd: packDir })`tar -xzf ${tarball} package/abi_registry.json package/package.json`;
  const nodeAbiVersion = JSON.parse(
    await fs.readFile(path.join(packDir, 'package/package.json')),
  ).version;
  const abiRegistry = JSON.parse(
    await fs.readFile(path.join(packDir, 'package/abi_registry.json')),
  ).filter(({ runtime }) => runtime === 'electron');
  core.info(`node-abi@${nodeAbiVersion} knows ${abiRegistry.length} electron majors`);
  await fs.rm(packDir, { recursive: true, force: true });

  for (const major of newMajors) {
    const first = firstReleaseOfMajor.get(major);
    const expectedAbi = auditSet.get(first).modules;
    const entry = abiRegistry.find(({ target }) => semver.major(target) === major);
    const url = 'https://github.com/electron/node-abi/blob/main/abi_registry.json';
    if (entry === undefined) {
      addFinding(
        'node-abi',
        `electron ${major}`,
        `node-abi@${nodeAbiVersion} has no entry for Electron ${major} (first release ${first}, ABI ${expectedAbi})`,
        url,
      );
    } else if (entry.abi !== expectedAbi) {
      addFinding(
        'node-abi',
        `electron ${major}`,
        `node-abi@${nodeAbiVersion} maps Electron ${major} to ABI ${entry.abi}, but ${first} reports ABI ${expectedAbi}`,
        url,
      );
    }
  }
}

//
// 4. Blog post and release page for X.0.0 stables
//

for (const version of auditVersions) {
  if (
    semver.minor(version) !== 0 ||
    semver.patch(version) !== 0 ||
    prereleaseKind(version) !== null
  ) {
    continue;
  }
  const major = semver.major(version);
  for (const url of [
    `https://www.electronjs.org/blog/electron-${major}-0`,
    `https://releases.electronjs.org/release/v${version}`,
  ]) {
    const status = await urlStatus(url);
    if (status !== 200) {
      addFinding('web', `electron ${version}`, `${url} responded ${status}`, url);
    }
  }
}

//
// Report
//

const report = {
  generatedAt: new Date().toISOString(),
  windowDays,
  graceHours,
  pendingPackageChecks: pending,
  supportedLines: supportedMajors.map((m) => `${m}-x-y`),
  audited: auditVersions,
  findings,
};
await fs.writeFile(`${REPORT_BASENAME}.json`, `${JSON.stringify(report, null, 2)}\n`);

if (findings.length > 0) {
  core.summary.addHeading(`⚠️ ${findings.length} post-release finding(s)`);
  core.summary.addTable([
    [
      { data: 'Check', header: true },
      { data: 'Subject', header: true },
      { data: 'Detail', header: true },
    ],
    ...findings.map(({ check, subject, message, url }) => [
      check,
      subject,
      `${message} (<a href="${url}">link</a>)`,
    ]),
  ]);

  // One Slack line per finding, with the URL that failed.
  const slackLines = [
    `:warning: *Post-release audit* found ${findings.length} issue(s):`,
    ...findings.map(({ message, url }) => `• ${message} — <${url}|link>`),
  ];
  const { GITHUB_SERVER_URL, GITHUB_REPOSITORY, GITHUB_RUN_ID } = process.env;
  if (GITHUB_SERVER_URL && GITHUB_REPOSITORY && GITHUB_RUN_ID) {
    slackLines.push(
      `<${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}|Run details>`,
    );
  }
  core.setOutput('slackText', slackLines.join('\n'));

  // Set this as failed so it's easy to scan runs to find failures
  core.setOutput('errorsFound', true);
  process.exitCode = 1;
} else {
  core.summary.addRaw(`🎉 No post-release drift across ${auditVersions.length} releases`);
}

core.summary.addEOL();
core.summary.addRaw(`Audited: ${auditVersions.map((v) => `\`${v}\``).join(', ')}`, true);
if (pending.length > 0) {
  core.summary.addRaw(
    `Package checks deferred (published within the last ${graceHours}h): ${pending.map((v) => `\`${v}\``).join(', ')}`,
    true,
  );
}

await fs.writeFile(`${REPORT_BASENAME}.md`, core.summary.stringify());
if (process.env.GITHUB_STEP_SUMMARY) {
  await core.summary.write();
} else {
  core.info(core.summary.stringify());
}
