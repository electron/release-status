import { useNavigation } from '@remix-run/react';
import { useCallback } from 'react';

const prettyChannels = {
  stable: 'Stable',
  pre: 'Pre Release',
  nightly: 'Nightly',
};

const channelColors = {
  stable: 'green',
  pre: 'yellow',
  nightly: 'purple',
};

type ChannelFilterButtonProps = {
  channel: keyof typeof prettyChannels;
  onChangeChannel: (channel: keyof typeof prettyChannels) => void;
  activeChannel: string;
};

export const ChannelFilterButton = ({
  channel,
  onChangeChannel,
  activeChannel,
}: ChannelFilterButtonProps) => {
  const { state } = useNavigation();
  const isLoading = state === 'loading';

  const onClick = useCallback(() => onChangeChannel(channel), [channel, onChangeChannel]);

  const color = channelColors[channel];
  const baseClassName = 'px-3 py-1 text-xs font-medium rounded-full transition-colors';
  const activeClassName = `bg-${color}-100 text-${color}-800 dark:bg-${color}-900/30 dark:text-${color}-400`;
  const inactiveClassName = 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  const disabledClassName =
    'bg-gray-200 text-gray-400 dark:bg-gray-600 dark:text-gray-500 cursor-not-allowed';

  const className = isLoading
    ? `${baseClassName} ${disabledClassName}`
    : activeChannel === channel
      ? `${baseClassName} ${activeClassName}`
      : `${baseClassName} ${inactiveClassName}`;

  return (
    <button className={className} onClick={onClick} disabled={isLoading}>
      {prettyChannels[channel]}
    </button>
  );
};
