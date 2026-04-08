import { LoaderFunctionArgs, redirect } from 'react-router';

export const loader = (args: LoaderFunctionArgs) => {
  return redirect(`/build/${encodeURIComponent(args.params.id!)}`);
};
