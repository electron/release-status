import type { LoaderFunctionArgs, MetaFunction } from '@remix-run/node';
import { parse as semverParse, lt as semverLessThan, gt as semverGreaterThan } from 'semver';
import { redirect, useLoaderData, useNavigate, useNavigation, useParams } from '@remix-run/react';
import {
  SiGooglechrome,
  SiGooglechromeHex,
  SiNodedotjs,
  SiNodedotjsHex,
  SiV8,
  SiV8Hex,
} from '@icons-pack/react-simple-icons';
import { getGitHubReleaseNotes } from '~/data/github-data';
import { getAllVersionsInMajor, getReleaseForVersion, VersionFilter } from '~/data/release-data';
import { renderGroupedReleaseNotes } from '~/data/markdown';
import { ArrowDown, ArrowRight } from 'lucide-react';
import { VersionInfo } from '~/components/VersionInfo';
import { useCallback } from 'react';
import { VersionTimeline } from '~/components/VersionTimeline';
import { Select } from '~/components/Select';

export const meta: MetaFunction = ({ params }) => {
  return [
    {
      title: `Electron Compare - ${params.fromVersion} -> ${params.toVersion}`,
    },
    {
      name: 'description',
      content: `Electron Release Comparison - Comparing ${params.fromVersion} to ${params.toVersion}`,
    },
  ];
};

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

export const loader = async (args: LoaderFunctionArgs) => {
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

  const grouped = renderGroupedReleaseNotes(
    versionsForNotes.map((version, i) => {
      let releaseNotes = githubReleaseNotes[i]!;
      const parsed = semverParse(version);
      if (parsed?.prerelease.length) {
        releaseNotes = releaseNotes?.split(new RegExp(`@${escapeRegExp(version)}\`?.`))[1];
      }
      releaseNotes =
        releaseNotes?.replace(/# Release Notes for [^\r\n]+(?:(?:\n)|(?:\r\n))/i, '') ||
        'Missing...';
      return {
        version,
        content: releaseNotes,
      };
    }),
  );

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
    <div className="max-w-4xl mx-auto">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-bold text-[#2f3241] dark:text-white">
              Release Comparison
            </h2>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden p-4">
          <div className="flex flex-col sm:flex-row items-center md:justify-between gap-4">
            <div className="flex items-center justify-center gap-2 w-full md:w-auto">
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">From:</span>
              <Select
                isDisabled={isLoading}
                onChange={setFromVersion}
                options={allVersionsInMajor.map((v) => `v${v}`)}
                selected={fromVersion}
              />
            </div>

            <div className="flex items-center justify-center">
              <ArrowRight className="w-5 h-5 text-gray-400 dark:text-gray-500 sm:block hidden" />
              <ArrowDown className="w-5 h-5 text-gray-400 dark:text-gray-500 sm:hidden block" />
            </div>

            <div className="flex items-center justify-center gap-2 w-full md:w-auto">
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">To:</span>
              <Select
                isDisabled={isLoading}
                onChange={setToVersion}
                options={allVersionsInMajor.map((v) => `v${v}`)}
                selected={toVersion}
              />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
            <h3 className="text-lg font-semibold text-[#2f3241] dark:text-white">
              Dependency Changes
            </h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <VersionInfo
                name="Chromium"
                version={fromElectronRelease.chrome}
                compareVersion={toElectronRelease.chrome}
                icon={SiGooglechrome}
                iconColor={SiGooglechromeHex}
              />
              <VersionInfo
                name="Node.js"
                version={fromElectronRelease.node}
                compareVersion={toElectronRelease.node}
                icon={SiNodedotjs}
                iconColor={SiNodedotjsHex}
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

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
            <h3 className="text-lg font-semibold text-[#2f3241] dark:text-white">
              Combined Release Notes
            </h3>
          </div>
          <div className="p-6">
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-0.5 flex-grow bg-gradient-to-r from-blue-500 via-purple-500 to-green-500"></div>
                <span className="text-sm text-gray-500 dark:text-gray-400">Version Timeline</span>
                <div className="h-0.5 flex-grow bg-gradient-to-r from-green-500 via-purple-500 to-blue-500"></div>
              </div>

              <VersionTimeline
                fromVersion={fromVersion}
                toVersion={toVersion}
                versionsBetween={versionsBetween}
              />

              <div className="text-center mt-2">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {toVersion} includes changes from {versionsBetween.length + 1} version
                  {versionsBetween.length ? 's' : ''} since {fromVersion}
                </span>
              </div>
            </div>

            <div className="space-y-8">
              {Object.keys(grouped).map((groupName) => {
                return (
                  <div key={groupName}>
                    <h4 className="text-lg font-semibold text-[#2f3241] dark:text-white mb-4">
                      {groupName}
                    </h4>
                    <ul className="space-y-6">
                      {grouped[groupName].map(({ version, content }) => {
                        const color = version === toElectronRelease.version ? 'green' : 'purple';
                        return (
                          <li
                            key={version}
                            className={`relative pl-6 border-l-2 border-${color}-500 dark:border-${color}-700`}
                          >
                            <div className="absolute -left-2 top-0 flex items-center justify-center">
                              <div
                                className={`w-4 h-4 rounded-full bg-${color}-500 dark:bg-${color}-700`}
                              ></div>
                            </div>
                            <div className="text-gray-700 dark:text-gray-300">
                              <div className="flex items-center gap-2 mb-1">
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-${color}-100 text-${color}-800 dark:bg-${color}-900/30 dark:text-${color}-400`}
                                >
                                  {version}
                                </span>
                              </div>
                              <div dangerouslySetInnerHTML={{ __html: content }}></div>
                            </div>
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
