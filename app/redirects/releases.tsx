import { LoaderFunctionArgs } from '@remix-run/node';
import { redirect } from '@remix-run/react';

const channelsMap: Record<string, string | undefined> = {
  stable: 'stable',
  prerelease: 'pre',
  nightly: 'nightly',
};

export const loader = (args: LoaderFunctionArgs) => {
  let channel = channelsMap[args.params.channel || 'stable'];
  if (!channel) {
    channel = 'stable';
  }
  return redirect(`/release?channel=${encodeURIComponent(channel)}`);
};
