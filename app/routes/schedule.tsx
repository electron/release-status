import type { LoaderFunctionArgs, MetaFunction } from 'react-router';
import { useLoaderData } from 'react-router';
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
  tentative,
}: {
  children: string | null; // YYYY-MM-DD
  timeZone: string;
  tentative: boolean;
}) {
  if (releaseDate === null) {
    return <span>—</span>;
  }

  return (
    <span>
      <span className={tentative ? 'italic text-ink-muted' : undefined}>
        {prettyReleaseDate({ fullDate: releaseDate + 'T00:00:00' }, timeZone)}
      </span>
      {tentative && (
        <sup title="Tentative date" className="text-ink-faint ml-0.5">
          †
        </sup>
      )}
    </span>
  );
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
        className="group hover:text-accent inline-flex items-center gap-0.5 transition-colors"
        target="_blank"
        rel="noopener noreferrer"
      >
        {children}
        <ArrowUpRight className="w-3.5 h-3.5 text-ink-faint group-hover:text-accent" />
      </a>
    );
  } else {
    return <span>{children}</span>;
  }
}

export const loader = async (args: LoaderFunctionArgs) => {
  const timeZone = guessTimeZoneFromRequest(args.request);
  const releases = await getRelativeSchedule();
  args.context.cacheControl = 'public, max-age=120, s-maxage=300, stale-while-revalidate=120';
  return { releases, timeZone };
};

function Release({ release, timeZone }: { release: MajorReleaseSchedule; timeZone: string }) {
  const styles = {
    nightly: { row: 'bg-release-nightly', tone: 'accent', label: 'Nightly' },
    prerelease: { row: 'bg-release-prerelease', tone: 'warning', label: 'Pre' },
    stable: { row: 'bg-release-stable', tone: 'success', label: 'Stable' },
    eol: { row: 'text-ink-muted hover:bg-hover', tone: undefined, label: 'EOL' },
  }[release.status];

  const cell = 'px-4 h-11 whitespace-nowrap t-tabular';

  return (
    <tr key={release.version} className={`${styles.row} transition-colors`}>
      <th className={`${cell} pl-6 text-left font-semibold text-ink`}>
        <div className="flex items-center gap-3">
          <span className={release.status === 'eol' ? 'text-ink-muted font-medium' : ''}>
            {release.version}
          </span>
          {release.status !== 'eol' ? (
            <span className="lu-badge" data-tone={styles.tone}>
              {styles.label}
            </span>
          ) : null}
        </div>
      </th>
      <td className={cell}>
        <FormatDate timeZone={timeZone} tentative={release.tentativeDates.includes('alphaDate')}>
          {release.alphaDate}
        </FormatDate>
      </td>
      <td className={cell}>
        <FormatDate timeZone={timeZone} tentative={release.tentativeDates.includes('betaDate')}>
          {release.betaDate}
        </FormatDate>
      </td>
      <td className={`${cell} ${release.status === 'eol' ? '' : 'text-ink font-medium'}`}>
        <FormatDate timeZone={timeZone} tentative={release.tentativeDates.includes('stableDate')}>
          {release.stableDate}
        </FormatDate>
      </td>
      <td className={cell}>
        <FormatDate timeZone={timeZone} tentative={release.tentativeDates.includes('eolDate')}>
          {release.eolDate}
        </FormatDate>
      </td>
      <td className={`${cell} font-mono text-[12.5px]`}>
        <DependencyRelease
          href={`https://developer.chrome.com/blog/new-in-chrome-${release.chromiumVersion}`}
          release={release}
        >
          M{release.chromiumVersion}
        </DependencyRelease>
      </td>
      <td className={`${cell} font-mono text-[12.5px]`}>
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
    <div>
      <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-4 mb-8">
        <div className="flex flex-col gap-2 max-w-2xl">
          <h2 className="t-page text-ink">Release schedule</h2>
          <p className="t-lead text-ink-muted">
            Every Electron major with its alpha, beta, stable and end-of-life dates, and the
            Chromium and Node.js it ships.{' '}
            <a
              href="https://www.electronjs.org/docs/latest/tutorial/electron-timelines"
              className="lu-link"
              target="_blank"
              rel="noopener noreferrer"
            >
              How the schedule works
            </a>
            .
          </p>
        </div>
        <a href="/release-calendar.ics" className="lu-button lu-button-secondary">
          <Calendar className="w-3.5 h-3.5" />
          Add to calendar
        </a>
      </div>

      <section className="mb-6">
        <div className="lu-card overflow-hidden">
          <div className="px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-2 lu-hairline-b">
            <div className="flex items-center gap-2">
              <span className="lu-dot !shadow-none" data-tone="success"></span>
              <span>Stable (supported)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="lu-dot !shadow-none" data-tone="warning"></span>
              <span>Pre-release</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="lu-dot !shadow-none" data-tone="accent"></span>
              <span>Nightly</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="lu-dot !shadow-none"></span>
              <span>End of life</span>
            </div>
            <div className="text-ink-muted ml-auto t-dense">
              <sup>†</sup> Tentative date
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="lu-table [&_td]:text-inherit">
              <thead>
                <tr>
                  <th>Release</th>
                  <th>Alpha</th>
                  <th>Beta</th>
                  <th>Stable</th>
                  <th>End of life</th>
                  <th>Chromium</th>
                  <th>Node.js</th>
                </tr>
              </thead>
              <tbody>
                {releases.map((release) => (
                  <Release key={release.version} release={release} timeZone={timeZone} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <div className="lu-callout">
        <Info className="w-4 h-4" />
        <p>
          Release dates are goals and may be adjusted at any time for significant reasons, such as
          security bugfixes. Prerelease dependency versions (Chromium, Node.js) are estimates and
          may be upgraded before the stable release. A major&apos;s first beta is published
          automatically once Electron&apos;s Chromium version reaches Chromium&apos;s beta version,
          which can be a few days after the goal date.
        </p>
      </div>
    </div>
  );
}
