import { type RouteConfig, index, route } from '@remix-run/route-config';

export default [
  // Home page
  index('routes/home.tsx'),
  // API routes
  route('releases.json', 'api/releases.ts'),
  route('active.json', 'api/active.ts'),
  // UI routes
  route('build/:id', 'routes/build/release-job.tsx'),
  route('history', 'routes/history.tsx'),
  route('history/:date', 'routes/history/date.tsx'),
  route('pr-lookup', 'routes/pr/lookup.tsx'),
  route('pr/:number', 'routes/pr/details.tsx'),
  route('release', 'routes/outlet.tsx', [
    index('routes/release/all.tsx'),
    route('compare/:fromVersion/:toVersion', 'routes/release/compare.tsx'),
    route(':version', 'routes/release/single.tsx'),
  ]),
] satisfies RouteConfig;
