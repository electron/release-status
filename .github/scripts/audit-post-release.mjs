// Post-release audit: checks that every recently published Electron release
// (plus the newest release of each supported line) has all of the follow-up
// artifacts a release is supposed to ship with. Only drift is reported.
//
// Run locally with:  yarn zx .github/scripts/audit-post-release.mjs
// Environment:       AUDIT_WINDOW_DAYS (default 14)
//                    AUDIT_GRACE_HOURS (default 24; see "grace" below)
//
// Checks
//   1. npm dist-tags on `electron` follow the publish rules used by the
//      release tooling: `latest` = newest stable overall, `alpha`/`beta` =
//      newest alpha/beta overall, and per supported line `X-x-y`,
//      `alpha-X-x-y`, `beta-X-x-y` = newest release of that kind on the line.
//   2. `electron-chromedriver@<version>` and `electron-mksnapshot@<version>`
//      exist on npm for every stable release in the set.
//   3. For each major whose first (non-nightly) release is in the window, the
//      published `node-abi` package knows the major and agrees on the ABI.
//   4. For each `X.0.0` stable in the set, the release blog post and the
//      releases.electronjs.org release page exist.
//
// Grace: releases.json is updated from the GitHub release, which happens
// before the (human-approved) npm publish and before the downstream CI that
// publishes the companion packages and node-abi. Anything expected *because*
// of a release published less than AUDIT_GRACE_HOURS ago is deferred rather
// than reported, so a release in flight does not page anyone.
//
// State: if a previous run's `audit-post-release.json` is present in the
// working directory (the workflow restores it from the last run's artifact),
// findings that were already reported carry their `firstSeen` date so the
// Slack message can distinguish new drift from drift that is still pending.

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
const FETCH_TIMEOUT_MS = 30_000;

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

const now = new Date();
const today = now.toISOString().slice(0, 10);
const { GITHUB_SERVER_URL, GITHUB_REPOSITORY, GITHUB_RUN_ID } = process.env;
const runUrl =
  GITHUB_SERVER_URL && GITHUB_REPOSITORY && GITHUB_RUN_ID
    ? `${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}`
    : null;

//
// Previous run state (optional)
//

/** @type {Map<string, string>} finding key -> YYYY-MM-DD first seen */
const previousFirstSeen = new Map();
let previousReport = null;
try {
  previousReport = JSON.parse(await fs.readFile(`${REPORT_BASENAME}.json`, 'utf8'));
  for (const { check, subject, firstSeen } of previousReport.findings ?? []) {
    if (typeof firstSeen === 'string') {
      previousFirstSeen.set(`${check}\u0000${subject}`, firstSeen);
    }
  }
  core.info(
    `Loaded ${previousFirstSeen.size} finding(s) from the previous report (${previousReport.generatedAt})`,
  );
} catch (err) {
  if (err.code !== 'ENOENT') {
    core.warning(`Ignoring unreadable previous report: ${err.message}`);
  }
}

/** @type {{ check: string, subject: string, message: string, url: string, firstSeen: string }[]} */
const findings = [];
const addFinding = (check, subject, message, url) => {
  const firstSeen = previousFirstSeen.get(`${check}\u0000${subject}`) ?? today;
  findings.push({ check, subject, message, url, firstSeen });
};

/** @type {{ check: string, subject: string, reason: string }[]} */
const deferred = [];
const defer = (check, subject, reason) => {
  deferred.push({ check, subject, reason });
  core.info(`Deferred ${check} check for ${subject}: ${reason}`);
};

const fetchWithTimeout = (url, init = {}) =>
  fetch(url, { ...init, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });

const fetchJson = async (url, init) => {
  const response = await fetchWithTimeout(url, init);
  if (!response.ok) {
    throw new Error(`GET ${url} -> ${response.status}`);
  }
  return response.json();
};

/**
 * Fetches a page that is expected to exist and returns null when it does, or
 * a short reason when it does not. A redirect away from the requested URL
 * counts as missing: releases.electronjs.org sends unknown release pages to
 * the index with a 200, and a challenge/soft-404 page can also return 200, so
 * the body must mention the expected marker too.
 */
const pageProblem = async (url, marker) => {
  try {
    const response = await fetchWithTimeout(url, { redirect: 'follow' });
    if (response.status !== 200) {
      return `responded ${response.status}`;
    }
    if (response.url !== url) {
      return `redirected to ${response.url}`;
    }
    if (!(await response.text()).includes(marker)) {
      return `responded 200 but the page does not mention "${marker}"`;
    }
    return null;
  } catch (err) {
    return `could not be fetched: ${err.message}`;
  }
};

const isNightly = (version) => version.includes('-nightly.');
const prereleaseKind = (version) => semver.prerelease(version)?.[0] ?? null;
/** @type {(versions: string[]) => string | null} */
const newest = (versions) => (versions.length ? [...versions].sort(semver.rcompare)[0] : null);

const audit = async () => {
  //
  // Gather inputs
  //

  const releases = (await fetchJson(RELEASES_URL)).filter(({ version }) => !isNightly(version));
  const schedule = await fetchJson(SCHEDULE_URL);
  /** @type {string[]} */
  const allVersions = releases.map(({ version }) => version);
  const releaseByVersion = new Map(releases.map((release) => [release.version, release]));

  const supportedMajors = schedule
    .filter(({ status }) => status === 'stable' || status === 'prerelease')
    .map(({ version }) => semver.major(version));

  const cutoff = new Date(now);
  cutoff.setUTCDate(cutoff.getUTCDate() - windowDays);
  const inWindow = releases.filter(({ fullDate }) => new Date(fullDate) >= cutoff);

  const graceCutoff = new Date(now.getTime() - graceHours * 60 * 60 * 1000);
  /** Whether `version` was released too recently for its follow-ups to be expected yet. */
  const withinGrace = (version) => new Date(releaseByVersion.get(version).fullDate) > graceCutoff;

  // Releases under audit: everything in the window, plus the newest release on
  // each supported line so a stale line is never silently skipped.
  const auditSet = new Map(inWindow.map((release) => [release.version, release]));
  for (const major of supportedMajors) {
    const version = newest(allVersions.filter((v) => semver.major(v) === major));
    if (version !== null && !auditSet.has(version)) {
      auditSet.set(version, releaseByVersion.get(version));
    }
  }
  /** @type {string[]} */
  const auditVersions = [...auditSet.keys()].sort(semver.rcompare);

  core.info(`Window: last ${windowDays} days (since ${cutoff.toISOString()})`);
  core.info(`Grace: ${graceHours}h (releases after ${graceCutoff.toISOString()} are deferred)`);
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
    const subject = `electron@${tag}`;
    if (withinGrace(expected)) {
      defer('npm dist-tag', subject, `${expected} was released within the last ${graceHours}h`);
      return;
    }
    const actual = distTags[tag];
    if (actual === expected) {
      return;
    }
    const actualIsNewerUnknownRelease =
      actual !== undefined &&
      semver.valid(actual) !== null &&
      !releaseByVersion.has(actual) &&
      semver.gt(actual, expected) &&
      semver.major(actual) === semver.major(expected) &&
      prereleaseKind(actual) === prereleaseKind(expected);
    addFinding(
      'npm dist-tag',
      subject,
      actualIsNewerUnknownRelease
        ? `dist-tag \`${tag}\` is \`${actual}\`, which releases.json does not list (newest known is \`${expected}\`)`
        : `dist-tag \`${tag}\` is \`${actual ?? '<unset>'}\`, expected \`${expected}\``,
      distTagUrl,
    );
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
  // repos that runs after the Electron release lands.
  //

  const stableAudit = auditVersions.filter((v) => prereleaseKind(v) === null);
  const dueForPackages = stableAudit.filter((v) => !withinGrace(v));
  for (const version of stableAudit.filter(withinGrace)) {
    defer('npm package', version, `released within the last ${graceHours}h`);
  }

  const companionPackages = ['electron-chromedriver', 'electron-mksnapshot'];
  const packuments = await Promise.all(
    companionPackages.map((pkg) =>
      // Abbreviated packument: small, and `versions` is all we need.
      fetchJson(`${NPM_REGISTRY}/${pkg}`, {
        headers: { Accept: 'application/vnd.npm.install-v1+json' },
      }),
    ),
  );
  for (const [i, pkg] of companionPackages.entries()) {
    const published = new Set(Object.keys(packuments[i].versions));
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
  const newMajors = [];
  for (const [major, first] of firstReleaseOfMajor) {
    if (!inWindow.some((r) => r.version === first)) {
      continue;
    }
    if (withinGrace(first)) {
      defer(
        'node-abi',
        `electron ${major}`,
        `${first} was released within the last ${graceHours}h`,
      );
    } else {
      newMajors.push(major);
    }
  }

  if (newMajors.length > 0) {
    // Read the *published* registry (not the git main branch) so we audit what
    // consumers actually install.
    const packDir = await fs.mkdtemp(path.join(os.tmpdir(), 'node-abi-'));
    const [{ filename: tarball, version: nodeAbiVersion }] = JSON.parse(
      (await $({ cwd: packDir })`npm pack node-abi@latest --json`).stdout,
    );
    await $({ cwd: packDir })`tar -xzf ${tarball} package/abi_registry.json`;
    const abiRegistry = JSON.parse(
      await fs.readFile(path.join(packDir, 'package/abi_registry.json'), 'utf8'),
    ).filter(({ runtime }) => runtime === 'electron');
    core.info(`node-abi@${nodeAbiVersion} knows ${abiRegistry.length} electron majors`);
    await fs.rm(packDir, { recursive: true, force: true });

    for (const major of newMajors) {
      const first = firstReleaseOfMajor.get(major);
      const expectedAbi = String(releaseByVersion.get(first).modules);
      const entry = abiRegistry.find(({ target }) => semver.major(target) === major);
      const url = 'https://github.com/electron/node-abi/blob/main/abi_registry.json';
      if (entry === undefined) {
        addFinding(
          'node-abi',
          `electron ${major}`,
          `node-abi@${nodeAbiVersion} has no entry for Electron ${major} (first release ${first}, ABI ${expectedAbi})`,
          url,
        );
      } else if (String(entry.abi) !== expectedAbi) {
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

  const majorStables = auditVersions.filter(
    (v) => semver.minor(v) === 0 && semver.patch(v) === 0 && prereleaseKind(v) === null,
  );
  await Promise.all(
    majorStables.flatMap((version) => {
      const major = semver.major(version);
      if (withinGrace(version)) {
        defer('web', `electron ${version}`, `released within the last ${graceHours}h`);
        return [];
      }
      return [
        [`https://www.electronjs.org/blog/electron-${major}-0`, `Electron ${major}`],
        [`https://releases.electronjs.org/release/v${version}`, `v${version}`],
      ].map(async ([url, marker]) => {
        const problem = await pageProblem(url, marker);
        if (problem !== null) {
          addFinding('web', `electron ${version}`, `${url} ${problem}`, url);
        }
      });
    }),
  );

  //
  // Report
  //

  const report = {
    generatedAt: now.toISOString(),
    windowDays,
    graceHours,
    supportedLines: supportedMajors.map((m) => `${m}-x-y`),
    audited: auditVersions,
    deferred,
    findings,
  };
  await fs.writeFile(`${REPORT_BASENAME}.json`, `${JSON.stringify(report, null, 2)}\n`);

  const formatVersions = (versions) => versions.map((v) => `\`${v}\``).join(', ');
  const since = ({ firstSeen }) => (firstSeen === today ? 'new' : `since ${firstSeen}`);

  if (findings.length > 0) {
    const newCount = findings.filter(({ firstSeen }) => firstSeen === today).length;
    core.summary.addHeading(`⚠️ ${findings.length} post-release finding(s) (${newCount} new)`);
    core.summary.addTable([
      [
        { data: 'Check', header: true },
        { data: 'Subject', header: true },
        { data: 'Detail', header: true },
        { data: 'First seen', header: true },
      ],
      ...findings.map(({ check, subject, message, url, firstSeen }) => [
        check,
        subject,
        `${message} (<a href="${url}">link</a>)`,
        firstSeen,
      ]),
    ]);

    // One Slack line per finding, with the URL that failed. New findings first.
    const slackLines = [
      `:warning: *Post-release audit* found ${findings.length} issue(s), ${newCount} new:`,
      ...[...findings]
        .sort((a, b) => b.firstSeen.localeCompare(a.firstSeen))
        .map((finding) => `• ${finding.message} — <${finding.url}|link> (${since(finding)})`),
    ];
    if (runUrl !== null) {
      slackLines.push(`<${runUrl}|Run details>`);
    }
    core.setOutput('slackText', slackLines.join('\n'));

    // Set this as failed so it's easy to scan runs to find failures
    core.setOutput('errorsFound', true);
    process.exitCode = 1;
  } else {
    core.summary.addRaw(`🎉 No post-release drift across ${auditVersions.length} releases`);
  }

  core.summary.addEOL();
  core.summary.addRaw(`Audited: ${formatVersions(auditVersions)}`, true);
  if (deferred.length > 0) {
    core.summary.addRaw(
      `Deferred (expected because of a release published within the last ${graceHours}h): ${deferred
        .map(({ check, subject }) => `${check} \`${subject}\``)
        .join(', ')}`,
      true,
    );
  }
};

const writeSummary = async () => {
  await fs.writeFile(`${REPORT_BASENAME}.md`, core.summary.stringify());
  if (process.env.GITHUB_STEP_SUMMARY) {
    await core.summary.write();
  } else {
    core.info(core.summary.stringify());
  }
};

try {
  await audit();
} catch (err) {
  // The audit itself broke (releases.json, schedule.json or the npm registry
  // unreachable, npm pack failed, ...). Say so distinctly rather than staying
  // silent or reporting drift we could not actually observe. Previously
  // reported findings are carried over so their firstSeen survives an outage.
  const message = err instanceof Error ? err.message : String(err);
  core.error(err instanceof Error ? (err.stack ?? message) : message);
  const carried = previousReport?.findings ?? [];
  await fs.writeFile(
    `${REPORT_BASENAME}.json`,
    `${JSON.stringify(
      {
        generatedAt: now.toISOString(),
        windowDays,
        graceHours,
        error: message,
        findings: carried,
        findingsCarriedFrom: carried.length > 0 ? previousReport.generatedAt : null,
      },
      null,
      2,
    )}\n`,
  );
  core.summary.addHeading('❌ Post-release audit could not run');
  core.summary.addRaw(`\`\`\`\n${message}\n\`\`\``, true);
  const slackLines = [`:x: *Post-release audit could not run:* ${message}`];
  if (runUrl !== null) {
    slackLines.push(`<${runUrl}|Run details>`);
  }
  core.setOutput('slackText', slackLines.join('\n'));
  core.setOutput('auditFailed', true);
  process.exitCode = 1;
}

await writeSummary();
