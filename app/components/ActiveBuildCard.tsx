import { Link } from 'react-router';
import { SudowoodoRelease } from '~/data/release-data';
import { ChevronRight } from 'lucide-react';

type ActiveBuildCardProps = {
  build: Pick<SudowoodoRelease, 'id' | 'channel' | 'branch' | 'generatedElectronVersion'>;
  queued?: boolean;
};

const prettyChannel = (channel: SudowoodoRelease['channel']) => {
  switch (channel) {
    case 'alpha':
      return 'Alpha';
    case 'beta':
      return 'Beta';
    case 'stable':
      return 'Stable';
    case 'nightly':
      return 'Nightly';
  }
};

const channelTone = (channel: SudowoodoRelease['channel']) => {
  switch (channel) {
    case 'alpha':
    case 'beta':
      return 'warning';
    case 'stable':
      return 'success';
    case 'nightly':
      return 'accent';
  }
};

export const ActiveBuildCard = ({ build, queued }: ActiveBuildCardProps) => {
  return (
    <Link to={`/build/${build.id}`} className="lu-row group" prefetch="intent">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-ink t-tabular truncate">
            {build.generatedElectronVersion || 'Version soon…'}
          </span>
          <span className="lu-badge" data-tone={channelTone(build.channel)}>
            {prettyChannel(build.channel)}
          </span>
        </div>
        <div className="t-dense text-ink-faint mt-0.5">
          Branch <span className="font-mono text-[12px] text-ink-muted">{build.branch}</span>
        </div>
      </div>
      {queued ? (
        <span className="lu-badge">
          <span className="lu-dot !w-1.5 !h-1.5 !shadow-none" />
          Queued
        </span>
      ) : (
        <span className="lu-badge" data-tone="accent">
          <span className="lu-dot !w-1.5 !h-1.5 animate-pulse" data-tone="accent" />
          Building
        </span>
      )}
      <ChevronRight className="w-4 h-4 text-ink-faint group-hover:text-ink-muted transition-colors" />
    </Link>
  );
};
