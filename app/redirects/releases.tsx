import { LoaderFunctionArgs } from '@remix-run/node';
import { redirect } from '@remix-run/react';

const CHANNELS = ['stable', 'pre', 'nightly'];

export const loader = (args: LoaderFunctionArgs) => {
  let channel = args.params.channel || 'stable';
  if (!CHANNELS.includes(channel)) {
    channel = 'stable';
  }
  return redirect(`/release?channel=${encodeURIComponent(channel)}`);
};
