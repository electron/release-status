import type { LoaderFunctionArgs, MetaFunction } from 'react-router';
import { parse as semverParse, lt as semverLessThan, gt as semverGreaterThan } from 'semver';
import { Link, redirect, useLoaderData, useNavigate, useNavigation, useParams } from 'react-router';
import {
  SiGooglechrome,
  SiGooglechromeHex,
  SiNodedotjs,
  SiNodedotjsHex,
  SiV8,
  SiV8Hex,
} from '@icons-pack/react-simple-icons';
import { getGitHubReleaseNotes } from '~/data/github-data';
import { processReleaseNotes } from '~/data/release-notes';
import { getAllVersionsInMajor, getReleaseForVersion, VersionFilter } from '~/data/release-data';
import { groupReleaseNotes, renderGroupedReleaseNotes } from '~/data/markdown';
import { textPlainResponse, wantsTextPlain } from '~/helpers/request';
import { ArrowDown, ArrowRight } from 'lucide-react';
import { VersionInfo } from '~/components/VersionInfo';
import { PageHeader } from '~/components/PageHeader';
import { useCallback } from 'react';
import { VersionTimeline } from '~/components/VersionTimeline';
import { Select } from '~/components/Select';

export const meta: MetaFunction = ({ params }) => {
  return [
    {
      title: `Comparing ${params.fromVersion} -> ${params.toVersion} | Electron Releases`,
    },
    {
      name: 'description',
      content: `Electron Release Comparison - Comparing ${params.fromVersion} to ${params.toVersion}`,
    },
  ];
};

export const loader = async (args: LoaderFunctionArgs) => {
  const cacheControl = 'public, max-age=300, s-maxage=600, stale-while-revalidate=300';
  const fromVersion = args.params.fromVersion!;
  const toVersion = args.params.toVersion!;

  const fromParsed = semverParse(fromVersion);
  const toParsed = semverParse(toVersion);
  if (!fromParsed || !toParsed || fromParsed.major !== toParsed.major) {
    return redirect('/release');
  }

  if (fromParsed.compare(toParsed) === 1) {
    return redirect(`/release/compare/${toVersion}/${fromVersion}`);
  }

  const [fromElectronRelease, toElectronRelease, allVersionsInMajor] = await Promise.all([
    getReleaseForVersion(fromVersion),
    getReleaseForVersion(toVersion),
    getAllVersionsInMajor(fromVersion, VersionFilter.NON_NIGHTLY),
  ]);

  if (!fromElectronRelease || !toElectronRelease) {
    return redirect('/release');
  }

  const versionsBetween = allVersionsInMajor
    .filter((v) => {
      return semverLessThan(fromParsed, v) && semverGreaterThan(toParsed, v);
    })
    .reverse();

  const versionsForNotes = versionsBetween.concat([toElectronRelease.version]);
  const githubReleaseNotes = await Promise.all(
    versionsForNotes.map((v) => getGitHubReleaseNotes(`v${v}`)),
  );
  if (githubReleaseNotes.some((notes) => notes === null)) {
    return redirect('/release');
  }

  const processedNotes = versionsForNotes.map((version, i) => ({
    version,
    content: processReleaseNotes(version, githubReleaseNotes[i]!),
  }));

  if (wantsTextPlain(args.request)) {
    const dep = (name: string, from: string, to: string) =>
      from === to ? `- ${name}: ${from}` : `- ${name}: ${from} → ${to}`;
    const lines = [
      `# Electron Release Comparison: ${fromVersion} → ${toVersion}`,
      '',
      `${toVersion} includes changes from ${versionsBetween.length + 1} version${
        versionsBetween.length ? 's' : ''
      } since ${fromVersion}.`,
      '',
      '## Dependency Changes',
      '',
      dep('Chromium', fromElectronRelease.chrome, toElectronRelease.chrome),
      dep('Node.js', fromElectronRelease.node, toElectronRelease.node),
      dep('V8', fromElectronRelease.v8, toElectronRelease.v8),
      '',
      '## Combined Release Notes',
      '',
    ];
    const rawGrouped = groupReleaseNotes(processedNotes);
    for (const groupName of Object.keys(rawGrouped)) {
      lines.push(`### ${groupName}`, '');
      for (const { version, content } of rawGrouped[groupName]) {
        lines.push(`#### v${version}`, '', content, '');
      }
    }
    return textPlainResponse(args.context, lines.join('\n'), cacheControl);
  }

  const grouped = renderGroupedReleaseNotes(processedNotes);

  args.context.cacheControl = cacheControl;

  return {
    fromElectronRelease,
    toElectronRelease,
    allVersionsInMajor,
    versionsBetween,
    grouped,
  };
};

export default function CompareReleases() {
  const params = useParams();
  const fromVersion = params.fromVersion!;
  const toVersion = params.toVersion!;

  const isLoading = useNavigation().state === 'loading';
  const navigate = useNavigate();

  const { fromElectronRelease, toElectronRelease, allVersionsInMajor, versionsBetween, grouped } =
    useLoaderData<typeof loader>();

  const setFromVersion = useCallback(
    (version: string) => {
      if (version === fromVersion) return;
      navigate(`/release/compare/${version}/${toVersion}`);
    },
    [fromVersion, navigate, toVersion],
  );

  const setToVersion = useCallback(
    (version: string) => {
      if (version === toVersion) return;
      navigate(`/release/compare/${fromVersion}/${version}`);
    },
    [fromVersion, navigate, toVersion],
  );

  return (
    <div>
      <div className="flex flex-col gap-6">
        <PageHeader
          backTo={{ to: `/release/${fromVersion}`, name: fromVersion }}
          title="Compare releases"
          subtitle={
            <p className="t-lead text-ink-muted">
              Dependency changes and the combined release notes between two versions of the same
              major.
            </p>
          }
        />

        <div className="lu-card p-4">
          <div className="flex flex-col sm:flex-row items-center sm:justify-center gap-4">
            <div className="flex items-center justify-center gap-3 w-full md:w-auto">
              <span className="t-caption text-ink-muted">From</span>
              <Select
                isDisabled={isLoading}
                onChange={setFromVersion}
                options={allVersionsInMajor.map((v) => `v${v}`)}
                selected={fromVersion}
              />
            </div>

            <div className="flex items-center justify-center text-ink-faint">
              <ArrowRight className="w-4 h-4 sm:block hidden" />
              <ArrowDown className="w-4 h-4 sm:hidden block" />
            </div>

            <div className="flex items-center justify-center gap-3 w-full md:w-auto">
              <span className="t-caption text-ink-muted">To</span>
              <Select
                isDisabled={isLoading}
                onChange={setToVersion}
                options={allVersionsInMajor.map((v) => `v${v}`)}
                selected={toVersion}
              />
            </div>
          </div>
        </div>

        <div className="lu-card overflow-hidden">
          <div className="px-5 md:px-6 h-12 flex items-center lu-hairline-b">
            <h3 className="t-headline text-ink">Dependency changes</h3>
          </div>
          <div className="p-5 md:p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <VersionInfo
                name="Chromium"
                version={fromElectronRelease.chrome}
                compareVersion={toElectronRelease.chrome}
                icon={SiGooglechrome}
                iconColor={SiGooglechromeHex}
                href={`https://source.chromium.org/chromium/chromium/src/+/refs/tags/${fromElectronRelease.chrome}:`}
                compareHref={`https://source.chromium.org/chromium/chromium/src/+/refs/tags/${toElectronRelease.chrome}:`}
              />
              <VersionInfo
                name="Node.js"
                version={fromElectronRelease.node}
                compareVersion={toElectronRelease.node}
                icon={SiNodedotjs}
                iconColor={SiNodedotjsHex}
                href={`https://github.com/nodejs/node/releases/tag/v${fromElectronRelease.node}`}
                compareHref={`https://github.com/nodejs/node/releases/tag/v${toElectronRelease.node}`}
              />
              <VersionInfo
                name="V8"
                version={fromElectronRelease.v8}
                compareVersion={toElectronRelease.v8}
                icon={SiV8}
                iconColor={SiV8Hex}
              />
            </div>
          </div>
        </div>

        <div className="lu-card overflow-hidden">
          <div className="px-5 md:px-6 h-12 flex items-center justify-between lu-hairline-b">
            <h3 className="t-headline text-ink">Combined release notes</h3>
            <span className="t-dense text-ink-muted">
              {versionsBetween.length + 1} version{versionsBetween.length ? 's' : ''} since{' '}
              <Link to={`/release/${fromVersion}`} className="text-ink hover:text-accent t-tabular">
                {fromVersion}
              </Link>
            </span>
          </div>
          <div className="px-5 md:px-8 py-6">
            <div className="lu-well py-5 mb-8">
              <VersionTimeline
                fromVersion={fromVersion}
                toVersion={toVersion}
                versionsBetween={versionsBetween}
              />
            </div>

            <div className="space-y-10">
              {Object.keys(grouped).map((groupName) => {
                return (
                  <div key={groupName}>
                    <h4 className="t-title text-[19px] text-ink mb-4">{groupName}</h4>
                    <ul className="space-y-6">
                      {grouped[groupName].map(({ version, content }) => {
                        const isTarget = version === toElectronRelease.version;
                        return (
                          <li
                            key={version}
                            className={`relative pl-6 ${isTarget ? 'shadow-[inset_2px_0_0_var(--lu-accent)]' : 'shadow-[inset_2px_0_0_var(--lu-line)]'}`}
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <Link
                                to={`/release/v${version}`}
                                className="lu-badge t-tabular hover:brightness-95"
                                data-tone={isTarget ? 'accent' : undefined}
                              >
                                v{version}
                              </Link>
                            </div>
                            <div
                              className="lu-prose"
                              dangerouslySetInnerHTML={{ __html: content }}
                            ></div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
