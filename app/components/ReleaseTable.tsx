import { Link } from 'react-router';
import { ElectronRelease } from '~/data/release-data';
import { fullDateString, humanFriendlyDaysSince, prettyReleaseDate } from '~/helpers/time';

type ReleaseTableProps = {
  releases: (ElectronRelease | undefined)[];
  header?: React.ReactNode;
  missingTitle?: string;
  missingMessage?: string;
  showStability?: boolean;
  timeZone: string;
};

export const channelBadge = (version: string) =>
  version.includes('nightly') ? (
    <span className="lu-badge" data-tone="accent">
      Nightly
    </span>
  ) : version.includes('-') ? (
    <span className="lu-badge" data-tone="warning">
      Pre-release
    </span>
  ) : (
    <span className="lu-badge" data-tone="success">
      Stable
    </span>
  );

const cell = 'px-4 h-12 flex items-center flex-1';

export const ReleaseTable = ({
  releases,
  header,
  missingTitle,
  missingMessage,
  showStability,
  timeZone,
}: ReleaseTableProps) => {
  return (
    <div className="lu-card overflow-hidden">
      {header || null}
      <div className="overflow-x-auto">
        <table className="lu-table">
          <thead>
            <tr>
              <th className="w-[225px]">Version</th>
              <th className="w-[350px]">{showStability ? 'Stability' : 'Released'}</th>
              <th className="w-[200px]">Chromium</th>
              <th>Node.js</th>
            </tr>
          </thead>
          <tbody>
            {releases.map((release) =>
              release ? (
                <tr key={release.version}>
                  <td>
                    <div className="flex w-full h-full items-stretch">
                      <Link
                        to={`/release/v${release.version}`}
                        className={`${cell} pl-6 text-ink font-medium t-tabular`}
                        prefetch="intent"
                      >
                        {release.version}
                      </Link>
                    </div>
                  </td>
                  <td>
                    {showStability ? (
                      <div className="flex w-full h-full items-stretch">
                        <Link
                          to={`/release/v${release.version}`}
                          className={cell}
                          prefetch="intent"
                        >
                          {channelBadge(release.version)}
                        </Link>
                      </div>
                    ) : (
                      <div className="flex w-full h-full items-stretch">
                        <Link
                          to={`/release/v${release.version}`}
                          className={cell}
                          prefetch="intent"
                        >
                          <span
                            className="flex items-center gap-2"
                            title={fullDateString(release.fullDate, timeZone)}
                          >
                            <span>{humanFriendlyDaysSince(release)}</span>
                            <span className="lu-badge">{prettyReleaseDate(release, timeZone)}</span>
                          </span>
                        </Link>
                      </div>
                    )}
                  </td>
                  <td>
                    <div className="flex w-full h-full items-stretch">
                      <Link
                        to={`/release/v${release.version}`}
                        className={`${cell} font-mono text-[12.5px] t-tabular`}
                        prefetch="intent"
                      >
                        {release.chrome}
                      </Link>
                    </div>
                  </td>
                  <td>
                    <div className="flex w-full h-full items-stretch">
                      <Link
                        to={`/release/v${release.version}`}
                        className={`${cell} font-mono text-[12.5px] t-tabular`}
                        prefetch="intent"
                      >
                        {release.node}
                      </Link>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr key="missing" className="hover:!bg-transparent">
                  <td colSpan={5} className="!whitespace-normal">
                    <div className="flex flex-col items-center justify-center text-center px-6 py-10 gap-1.5">
                      <h4 className="t-headline text-ink">
                        {missingTitle || 'No active pre-releases'}
                      </h4>
                      <p className="text-ink-muted max-w-md [text-wrap:balance]">
                        {missingMessage ||
                          'Our electrons are busy orbiting elsewhere. Watch this space for future alpha releases!'}
                      </p>
                      {!missingTitle && !missingMessage && (
                        <div className="mt-3">
                          <Link
                            to="https://www.electronjs.org/docs/latest/tutorial/electron-timelines"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="lu-button lu-button-secondary"
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
