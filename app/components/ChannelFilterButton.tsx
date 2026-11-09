import { useNavigation } from 'react-router';
import { useCallback } from 'react';

const prettyChannels = {
  stable: 'Stable',
  pre: 'Pre-release',
  nightly: 'Nightly',
};

const channelTones = {
  stable: 'success',
  pre: 'warning',
  nightly: 'accent',
} as const;

type ChannelFilterButtonProps = {
  channel: keyof typeof prettyChannels;
  onChangeChannel: (channel: keyof typeof prettyChannels) => void;
  activeChannel: string;
};

// One segment of the channel segmented control (wrap a row of these in `.lu-segmented`).
export const ChannelFilterButton = ({
  channel,
  onChangeChannel,
  activeChannel,
}: ChannelFilterButtonProps) => {
  const { state } = useNavigation();
  const isLoading = state === 'loading';

  const onClick = useCallback(() => onChangeChannel(channel), [channel, onChangeChannel]);
  const selected = activeChannel === channel;

  return (
    <button
      className="lu-segment"
      data-selected={selected}
      aria-pressed={selected}
      onClick={onClick}
      disabled={isLoading}
    >
      {selected ? (
        <span className="lu-dot !w-1.5 !h-1.5 !shadow-none" data-tone={channelTones[channel]} />
      ) : null}
      {prettyChannels[channel]}
    </button>
  );
};
