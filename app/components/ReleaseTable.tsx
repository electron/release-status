import { Link } from '@remix-run/react';
import { ElectronRelease } from '~/data/release-data';
import { humanFriendlyDaysSince, prettyReleaseDate } from '~/helpers/time';

type ReleaseTableProps = {
  releases: (ElectronRelease | undefined)[];
  header?: React.ReactNode;
  missingTitle?: string;
  missingMessage?: string;
  showStability?: boolean;
  timeZone: string;
};

export const ReleaseTable = ({
  releases,
  header,
  missingTitle,
  missingMessage,
  showStability,
  timeZone,
}: ReleaseTableProps) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      {header || null}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
              <th className="w-[225px] px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Version
              </th>
              <th className="w-[350px] px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {showStability ? 'Stability' : 'Released'}
              </th>
              <th className="w-[200px] px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Chromium
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Node.js
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {releases.map((release) =>
              release ? (
                <tr
                  key={release.version}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <td className="px-0 py-0 whitespace-nowrap text-sm font-medium text-[#2f3241] dark:text-white">
                    <div className="inline-flex w-full h-full items-stretch">
                      <Link
                        to={`/release/v${release.version}`}
                        className="px-6 py-4 flex-1"
                        prefetch="intent"
                      >
                        {release.version}
                      </Link>
                    </div>
                  </td>
                  <td className="whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {showStability ? (
                      <div className="inline-flex w-full h-full items-stretch">
                        <Link
                          to={`/release/v${release.version}`}
                          className="px-6 py-4 flex-1"
                          prefetch="intent"
                        >
                          <span className="flex items-center gap-2">
                            {release.version.includes('nightly') ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
                                Nightly
                              </span>
                            ) : release.version.includes('-') ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                                Pre Release
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                Stable
                              </span>
                            )}
                          </span>
                        </Link>
                      </div>
                    ) : (
                      <div className="inline-flex w-full h-full items-stretch">
                        <Link
                          to={`/release/v${release.version}`}
                          className="px-6 py-4 flex-1"
                          prefetch="intent"
                        >
                          <span className="flex items-center gap-2">
                            <span>{humanFriendlyDaysSince(release)}</span>
                            <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded-full">
                              {prettyReleaseDate(release, timeZone)}
                            </span>
                          </span>
                        </Link>
                      </div>
                    )}
                  </td>
                  <td className="whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    <div className="inline-flex w-full h-full items-stretch">
                      <Link
                        to={`/release/v${release.version}`}
                        className="px-6 py-4 flex-1"
                        prefetch="intent"
                      >
                        {release.chrome}
                      </Link>
                    </div>
                  </td>
                  <td className="whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    <div className="inline-flex w-full h-full items-stretch">
                      <Link
                        to={`/release/v${release.version}`}
                        className="px-6 py-4 flex-1"
                        prefetch="intent"
                      >
                        {release.node}
                      </Link>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr key="missing">
                  <td colSpan={5} className="px-4 py-8">
                    <div className="flex flex-col items-center justify-center text-center">
                      <h4 className="text-lg font-medium text-[#2f3241] dark:text-white mb-2">
                        {missingTitle || 'No active pre-releases'}
                      </h4>
                      <p className="text-gray-500 dark:text-gray-400 max-w-md">
                        {missingMessage ||
                          'Our electrons are busy orbiting elsewhere. Watch this space for future alpha releases!'}
                      </p>
                      {!missingTitle && !missingMessage && (
                        <div className="mt-4">
                          <Link
                            to="https://www.electronjs.org/docs/latest/tutorial/electron-timelines"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-[#2f3241] dark:text-[#9feaf9] hover:underline font-medium"
                          >
                            View release schedule
                          </Link>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
