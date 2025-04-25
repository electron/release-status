import { Link } from '@remix-run/react';
import { SudowoodoRelease } from '~/data/release-data';

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

const channelColor = (channel: SudowoodoRelease['channel']) => {
  switch (channel) {
    case 'alpha':
    case 'beta':
      return 'yellow';
    case 'stable':
      return 'green';
    case 'nightly':
      return 'purple';
  }
};

export const ActiveBuildCard = ({ build, queued }: ActiveBuildCardProps) => {
  const channelBubbleColor = channelColor(build.channel);

  return (
    <Link
      to={`/build/${build.id}`}
      className="border border-blue-200 dark:border-blue-800 rounded-lg p-4 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-700/20 hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
      prefetch="intent"
    >
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-[#2f3241] dark:text-white">
              {build.generatedElectronVersion || 'Version Soon...'}
            </span>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-${channelBubbleColor}-100 text-${channelBubbleColor}-800 dark:bg-${channelBubbleColor}-900/30 dark:text-${channelBubbleColor}-400`}
            >
              {prettyChannel(build.channel)}
            </span>
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Branch: <span className="font-mono">{build.branch}</span>
          </div>
        </div>
        <div className="flex items-center">
          {queued ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 animate-pulse">
              <span className="w-1.5 h-1.5 bg-orange-500 rounded-full mr-1"></span>
              Queued
            </span>
          ) : (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 animate-pulse">
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-1"></span>
              Building
            </span>
          )}
        </div>
      </div>
    </Link>
  );
};
