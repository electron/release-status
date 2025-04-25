import type { LoaderFunctionArgs, MetaFunction } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { ActiveBuildCard } from '~/components/ActiveBuildCard';
import { StabilitySection } from '~/components/StabilitySection';
import { getActiveReleasesOrUpdate, getLatestReleases } from '~/data/release-data';
import { guessTimeZoneFromRequest } from '~/helpers/timezone';

export const meta: MetaFunction = () => {
  return [
    { title: 'Electron Releases' },
    {
      name: 'description',
      content: "Electron's latest releases, versions and release notes.",
    },
  ];
};

export const loader = async (args: LoaderFunctionArgs) => {
  const [releases, active] = await Promise.all([getLatestReleases(), getActiveReleasesOrUpdate()]);
  const timeZone = guessTimeZoneFromRequest(args.request);
  args.context.cacheControl = 'private, max-age=30';
  return { releases, active, timeZone };
};

export default function Index() {
  const { releases, active, timeZone } = useLoaderData<typeof loader>();

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-bold text-[#2f3241] dark:text-white">Electron Releases</h2>
      </div>

      {active.currentlyRunning.length + active.queued.length > 0 ? (
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="bg-blue-500 w-2 h-2 rounded-full animate-pulse"></div>
            <h3 className="text-xl font-semibold text-[#2f3241] dark:text-white">Active Builds</h3>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              {active.currentlyRunning.map((build) => (
                <ActiveBuildCard key={build.id} build={build} />
              ))}
              {active.queued.map((build) => (
                <ActiveBuildCard key={build.id} build={build} queued />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <div className="space-y-8">
        <StabilitySection
          stability="stable"
          releases={releases.latestSupported}
          timeZone={timeZone}
        />

        <StabilitySection
          stability="prerelease"
          releases={[releases.lastPreRelease]}
          timeZone={timeZone}
        />

        <StabilitySection
          stability="nightly"
          releases={[releases.lastNightly]}
          timeZone={timeZone}
        />
      </div>
    </div>
  );
}
