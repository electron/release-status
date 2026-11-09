import { Link } from 'react-router';

type VersionTimelineProps = {
  fromVersion: string;
  toVersion: string;
  versionsBetween: string[];
};

export const VersionTimeline = ({
  fromVersion,
  toVersion,
  versionsBetween,
}: VersionTimelineProps) => {
  return (
    <div className="relative">
      <div className="overflow-x-auto pb-2 hide-scrollbar">
        <div className="flex items-start min-w-max px-6 justify-center">
          <div className="flex flex-col items-center mr-1">
            <div className="w-3 h-3 rounded-full bg-ink-muted ring-[3px] ring-fill mt-[2px]"></div>
            <Link
              to={`/release/${fromVersion}`}
              className="t-caption mt-2 text-ink whitespace-nowrap hover:text-accent"
            >
              {fromVersion}
            </Link>
          </div>

          <div className="h-px w-5 bg-line-strong opacity-50 mt-[7px]"></div>

          <div className="flex items-start">
            {versionsBetween.map((version) => (
              <div key={version} className="flex items-start">
                <div className="flex flex-col items-center mx-0.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-line-strong mt-[5px]"></div>
                  <Link
                    to={`/release/v${version}`}
                    className="text-[10px] leading-3 font-medium mt-2.5 text-ink-faint hover:text-accent whitespace-nowrap t-tabular"
                  >
                    v{version}
                  </Link>
                </div>
                <div className="h-px w-5 bg-line-strong opacity-50 mt-[7px]"></div>
              </div>
            ))}
          </div>

          <div className="flex flex-col items-center ml-1">
            <div className="w-3 h-3 rounded-full bg-accent ring-[3px] ring-accent-soft mt-[2px]"></div>
            <Link
              to={`/release/${toVersion}`}
              className="t-caption mt-2 text-accent whitespace-nowrap"
            >
              {toVersion}
            </Link>
          </div>
        </div>
      </div>

      <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-surface to-transparent pointer-events-none"></div>
      <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-surface to-transparent pointer-events-none"></div>
    </div>
  );
};
