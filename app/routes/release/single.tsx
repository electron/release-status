import type { LoaderFunctionArgs, MetaFunction } from '@remix-run/node';
import { parse as semverParse } from 'semver';
import { redirect, useLoaderData, useNavigate, useNavigation, useParams } from '@remix-run/react';
import {
  SiGooglechrome,
  SiGooglechromeHex,
  SiNodedotjs,
  SiNodedotjsHex,
  SiV8,
  SiV8Hex,
} from '@icons-pack/react-simple-icons';
import { InstallCommand } from '~/components/InstallCommand';
import { getGitHubReleaseNotes } from '~/data/github-data';
import {
  getAllVersionsInMajor,
  getLatestReleases,
  getReleaseForVersion,
  VersionFilter,
} from '~/data/release-data';
import { renderMarkdownSafely } from '~/data/markdown';
import { VersionInfo } from '~/components/VersionInfo';
import { useCallback } from 'react';
import { PageHeader } from '~/components/PageHeader';
import { Select } from '~/components/Select';

export const meta: MetaFunction = ({ params }) => {
  return [
    { title: `Electron ${params.version}` },
    {
      name: 'description',
      content: `Electron ${params.version} - Release details`,
    },
  ];
};

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

export const loader = async (args: LoaderFunctionArgs) => {
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

  let releaseNotes = githubReleaseNotes;
  const parsed = semverParse(version);
  if (parsed?.prerelease.length) {
    releaseNotes = releaseNotes?.split(new RegExp(`@${escapeRegExp(version.slice(1))}\`?.`))[1];
  }
  releaseNotes =
    releaseNotes?.replace(/# Release Notes for [^\r\n]+(?:(?:\n)|(?:\r\n))/i, '') || 'Missing...';

  const isLatestStable = latestReleases.latestSupported[0]?.version === version.substr(1);
  const isLatestPreRelease = latestReleases.lastPreRelease?.version === version.substr(1);

  args.context.cacheControl = 'private, max-age=300';
  return {
    allVersionsInMajor,
    electronRelease,
    releaseNotesHTML: renderMarkdownSafely(releaseNotes),
    isLatestStable,
    isLatestPreRelease,
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
    <div className="max-w-4xl mx-auto">
      <div className="flex flex-col gap-6">
        <PageHeader
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
          titleTags={[
            data.isLatestStable ? (
              <span
                key="latest-stable"
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
              >
                Latest Stable
              </span>
            ) : null,
            data.isLatestPreRelease ? (
              <span
                key="latest-pre"
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
              >
                Latest Pre Release
              </span>
            ) : null,
          ]}
        />

        <div className="grid md:grid-cols-2 gap-4">
          <InstallCommand version={version} name="npm" prefix="npm install" />
          <InstallCommand version={version} name="yarn" prefix="yarn add" />
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
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

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-4 md:p-6">
            <h3 className="text-xl font-bold text-[#2f3241] dark:text-white mb-4">Release Notes</h3>
            <div dangerouslySetInnerHTML={{ __html: data.releaseNotesHTML }} />
          </div>
        </div>
      </div>
    </div>
  );
}
