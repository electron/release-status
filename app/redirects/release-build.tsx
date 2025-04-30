import { LoaderFunctionArgs } from '@remix-run/node';
import { redirect } from '@remix-run/react';

export const loader = (args: LoaderFunctionArgs) => {
  return redirect(`/build/${encodeURIComponent(args.params.id!)}`);
};
