import type { LoaderFunctionArgs, MetaFunction } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { ArrowUpRight, Calendar, Info } from 'lucide-react';
import React from 'react';
import { getRelativeSchedule, type MajorReleaseSchedule } from '~/data/release-schedule';
import { prettyReleaseDate } from '~/helpers/time';
import { guessTimeZoneFromRequest } from '~/helpers/timezone';

import './schedule.css';

export const meta: MetaFunction = () => [
  { title: 'Schedule | Electron Releases' },
  {
    name: 'description',
    content: 'Schedule of Electron releases, from the next upcoming releases back to version 2.',
  },
];

function FormatDate({
  children: releaseDate,
  timeZone,
}: {
  children: string | null; // YYYY-MM-DD
  timeZone: string;
}) {
  if (releaseDate === null) {
    return <span>—</span>;
  }

  return <span>{prettyReleaseDate({ fullDate: releaseDate + 'T00:00:00' }, timeZone)}</span>;
}

function DependencyRelease({
  href,
  release,
  children,
}: {
  href: string;
  release: MajorReleaseSchedule;
  children: React.ReactNode;
}) {
  if (release.status === 'stable' || release.status === 'eol') {
    return (
      <a
        href={href}
        className="hover:underline flex items-center"
        target="_blank"
        rel="noopener noreferrer"
      >
        {children}
        <ArrowUpRight className="w-4 h-4 inline-block ml-0.5" />
      </a>
    );
  } else {
    return <span>{children}</span>;
  }
}

export const loader = async (args: LoaderFunctionArgs) => {
  const timeZone = guessTimeZoneFromRequest(args.request);
  const releases = await getRelativeSchedule();
  args.context.cacheControl = 'private, max-age=120';
  return { releases, timeZone };
};

function Release({ release, timeZone }: { release: MajorReleaseSchedule; timeZone: string }) {
  const styles = {
    nightly: {
      row: 'bg-release-nightly text-purple-900 dark:text-purple-100',
      status: 'bg-purple-500',
    },
    prerelease: {
      row: 'bg-release-prerelease text-yellow-900 dark:text-yellow-100',
      status: 'bg-yellow-500',
    },
    stable: {
      row: 'bg-release-stable text-green-900 dark:text-green-100',
      status: 'bg-green-500',
    },
    eol: {
      row: 'opacity-50 bg-gray-100 dark:bg-gray-900/30 hover:bg-gray-200 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300',
      status: 'bg-slate-500',
    },
  }[release.status];

  return (
    <tr key={release.version} className={`${styles.row} text-sm transition-colors`}>
      <th className="px-4 py-3 whitespace-nowrap font-semibold">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${styles.status}`}></div>
          <span>{release.version}</span>
        </div>
      </th>
      <td className="px-4 py-3 whitespace-nowrap">
        <FormatDate timeZone={timeZone}>{release.alphaDate}</FormatDate>
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <FormatDate timeZone={timeZone}>{release.betaDate}</FormatDate>
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <FormatDate timeZone={timeZone}>{release.stableDate}</FormatDate>
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <FormatDate timeZone={timeZone}>{release.eolDate}</FormatDate>
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <DependencyRelease
          href={`https://developer.chrome.com/blog/new-in-chrome-${release.chromiumVersion}`}
          release={release}
        >
          M{release.chromiumVersion}
        </DependencyRelease>
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <DependencyRelease
          href={`https://nodejs.org/en/blog/release/v${release.nodeVersion}`}
          release={release}
        >
          v{release.nodeVersion}
        </DependencyRelease>
      </td>
    </tr>
  );
}

export default function Schedule() {
  const { releases, timeZone } = useLoaderData<typeof loader>();

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-[#2f3241] dark:text-white flex items-center gap-2 mb-3">
          <Calendar className="w-8 h-8" />
          Release Schedule
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          A complete schedule of Electron major releases showing key milestones including alpha,
          beta, and stable release dates, as well as end-of-life dates and dependency versions.{' '}
          <a
            href="https://www.electronjs.org/docs/latest/tutorial/electron-timelines"
            className="text-blue-600 dark:text-blue-400 hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Learn more about Electron&apos;s release schedule
          </a>
          .
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden mb-6">
        <div className="p-4 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-sm text-gray-700 dark:text-gray-300">Stable (Supported)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <span className="text-sm text-gray-700 dark:text-gray-300">Prerelease</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-purple-500"></div>
            <span className="text-sm text-gray-700 dark:text-gray-300">Nightly</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-slate-500"></div>
            <span className="text-sm text-gray-700 dark:text-gray-300">End of Life</span>
          </div>
        </div>
      </div>

      <section className="mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                    Release
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                    Alpha
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                    Beta
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                    Stable
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                    End of Life
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                    Chromium
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                    Node.js
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {releases.map((release) => (
                  <Release key={release.version} release={release} timeZone={timeZone} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <div className="flex items-start gap-2 text-sm text-gray-500 dark:text-gray-500">
        <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <p>
          Release dates are goals and may be adjusted at any time for significant reasons, such as
          security bugfixes. Prerelease dependency versions (Chromium, Node.js) are estimates and
          may be upgraded before the stable release.
        </p>
      </div>
    </div>
  );
}
