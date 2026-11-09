import type { LoaderFunctionArgs, MetaFunction } from 'react-router';
import { useLoaderData } from 'react-router';
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
  args.context.cacheControl = 'public, max-age=30, s-maxage=30, stale-while-revalidate=60';
  return { releases, active, timeZone };
};

export default function Index() {
  const { releases, active, timeZone } = useLoaderData<typeof loader>();

  return (
    <div>
      <div className="flex flex-col gap-2 mb-10">
        <h2 className="t-page text-ink">Electron releases</h2>
        <p className="t-lead text-ink-muted max-w-xl">
          The latest stable, pre-release and nightly builds of Electron, with the Chromium and
          Node.js they ship.
        </p>
      </div>

      {active.currentlyRunning.length + active.queued.length > 0 ? (
        <section className="mb-10">
          <div className="flex items-center gap-2.5 mb-3 px-1">
            <span className="lu-dot animate-pulse" data-tone="accent" />
            <h3 className="t-headline text-ink">Active builds</h3>
          </div>
          <div className="lu-card p-2 grid grid-cols-1 md:grid-cols-2 gap-x-2">
            {active.currentlyRunning.map((build) => (
              <ActiveBuildCard key={build.id} build={build} />
            ))}
            {active.queued.map((build) => (
              <ActiveBuildCard key={build.id} build={build} queued />
            ))}
          </div>
        </section>
      ) : null}

      <div className="space-y-10">
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
