import type { LoaderFunctionArgs, MetaFunction } from 'react-router';
import { redirect, Link, useLoaderData, useNavigate, useNavigation, useParams } from 'react-router';
import {
  SiGithub,
  SiGooglechrome,
  SiGooglechromeHex,
  SiNodedotjs,
  SiNodedotjsHex,
  SiV8,
  SiV8Hex,
} from '@icons-pack/react-simple-icons';
import { Calendar } from 'lucide-react';
import { InstallCommand } from '~/components/InstallCommand';
import { getGitHubReleaseNotes } from '~/data/github-data';
import { processReleaseNotes } from '~/data/release-notes';
import {
  getAllVersionsInMajor,
  getLatestReleases,
  getReleaseForVersion,
  VersionFilter,
} from '~/data/release-data';
import { renderMarkdownSafely } from '~/data/markdown';
import { textPlainResponse, wantsTextPlain } from '~/helpers/request';
import { fullDateString, humanFriendlyDaysSince, prettyReleaseDate } from '~/helpers/time';
import { guessTimeZoneFromRequest } from '~/helpers/timezone';
import { VersionInfo } from '~/components/VersionInfo';
import { useCallback } from 'react';
import { PageHeader } from '~/components/PageHeader';
import { Select } from '~/components/Select';

export const meta: MetaFunction = ({ params }) => {
  return [
    { title: `${params.version} | Electron Releases` },
    {
      name: 'description',
      content: `Electron ${params.version} - Release details`,
    },
  ];
};

export const loader = async (args: LoaderFunctionArgs) => {
  const cacheControl = 'public, max-age=300, s-maxage=600, stale-while-revalidate=300';
  const version = args.params.version!;
  const [githubReleaseNotes, allVersionsInMajor, electronRelease, latestReleases] =
    await Promise.all([
      getGitHubReleaseNotes(version),
      getAllVersionsInMajor(version, VersionFilter.NON_NIGHTLY),
      getReleaseForVersion(version),
      getLatestReleases(),
    ]);

  if (githubReleaseNotes === null) {
    return redirect('/release');
  }

  if (!electronRelease) {
    return redirect('/release');
  }

  const releaseNotes = processReleaseNotes(version, githubReleaseNotes);

  const isLatestStable = latestReleases.latestSupported[0]?.version === version.substr(1);
  const isLatestPreRelease = latestReleases.lastPreRelease?.version === version.substr(1);

  if (wantsTextPlain(args.request)) {
    const tags: string[] = [];
    if (isLatestStable) tags.push('Latest Stable');
    if (isLatestPreRelease) tags.push('Latest Pre Release');
    const lines = [
      `# Electron ${version}${tags.length ? ` (${tags.join(', ')})` : ''}`,
      '',
      `Released: ${electronRelease.fullDate}`,
      '',
      '## Install',
      '',
      '```',
      `npm install --save-dev electron@${version.substring(1)}`,
      '```',
      '',
      '## Dependencies',
      '',
      `- Chromium: ${electronRelease.chrome}`,
      `- Node.js: ${electronRelease.node}`,
      `- V8: ${electronRelease.v8}`,
      '',
      '## Release Notes',
      '',
      releaseNotes.trim(),
      '',
    ];
    return textPlainResponse(args.context, lines.join('\n'), cacheControl);
  }

  args.context.cacheControl = cacheControl;
  return {
    allVersionsInMajor,
    electronRelease,
    releaseNotesHTML: renderMarkdownSafely(releaseNotes),
    isLatestStable,
    isLatestPreRelease,
    timeZone: guessTimeZoneFromRequest(args.request),
  };
};

export default function SingleRelease() {
  const params = useParams<{ version: string }>();
  const version = params.version!;
  const isLoading = useNavigation().state === 'loading';

  const navigate = useNavigate();
  const data = useLoaderData<typeof loader>();
  const compareTo = useCallback(
    (selectedVersion: string) => {
      if (selectedVersion === 'Compare to...') return;
      navigate(`/release/compare/${version}/${selectedVersion}`);
    },
    [navigate, version],
  );

  return (
    <div>
      <div className="flex flex-col gap-6">
        <PageHeader
          backTo={{ to: '/release', name: 'all releases' }}
          actionButton={
            version.includes('nightly') ? null : (
              <Select
                isDisabled={isLoading}
                onChange={compareTo}
                options={['Compare to...', ...data.allVersionsInMajor.map((v) => `v${v}`)]}
                selected="Compare to..."
              />
            )
          }
          title={`Electron ${version}`}
          subtitle={
            <div
              className="flex items-center gap-2 text-ink-muted"
              title={fullDateString(data.electronRelease.fullDate, data.timeZone)}
            >
              <Calendar className="w-4 h-4 text-ink-faint" />
              <span>Released {prettyReleaseDate(data.electronRelease, data.timeZone)}</span>
              <span className="lu-badge">{humanFriendlyDaysSince(data.electronRelease)}</span>
            </div>
          }
          titleTags={[
            data.isLatestStable ? (
              <span key="latest-stable" className="lu-badge lu-badge-lg" data-tone="success">
                <span className="lu-dot !w-1.5 !h-1.5 !shadow-none" data-tone="success" />
                Latest stable
              </span>
            ) : null,
            data.isLatestPreRelease ? (
              <span key="latest-pre" className="lu-badge lu-badge-lg" data-tone="warning">
                <span className="lu-dot !w-1.5 !h-1.5 !shadow-none" data-tone="warning" />
                Latest pre-release
              </span>
            ) : null,
          ]}
        />

        <div className="grid md:grid-cols-2 gap-4">
          <InstallCommand version={version} name="npm" prefix="npm install --save-dev" />
          <InstallCommand version={version} name="yarn" prefix="yarn add --dev" />
        </div>

        <div className="lu-card">
          <div className="p-5 md:p-6 grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
            <VersionInfo
              name="Chromium"
              version={data.electronRelease.chrome}
              icon={SiGooglechrome}
              iconColor={SiGooglechromeHex}
              href={`https://source.chromium.org/chromium/chromium/src/+/refs/tags/${data.electronRelease.chrome}:`}
            />
            <VersionInfo
              name="Node.js"
              version={data.electronRelease.node}
              icon={SiNodedotjs}
              iconColor={SiNodedotjsHex}
              href={`https://github.com/nodejs/node/releases/tag/v${data.electronRelease.node}`}
            />
            <VersionInfo
              name="V8"
              version={data.electronRelease.v8}
              icon={SiV8}
              iconColor={SiV8Hex}
            />
          </div>
        </div>

        <div className="lu-card">
          <div className="px-5 md:px-8 py-6 md:py-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="t-title text-ink">Release notes</h3>
              <Link
                to={`https://github.com/electron/${version.includes('nightly') ? 'nightlies' : 'electron'}/releases/tag/${version}`}
                target="_blank"
                rel="noopener noreferrer"
                className="lu-button lu-button-secondary lu-button-sm"
              >
                <SiGithub size={13} />
                GitHub
              </Link>
            </div>
            <div className="lu-prose" dangerouslySetInnerHTML={{ __html: data.releaseNotesHTML }} />
          </div>
        </div>
      </div>
    </div>
  );
}
