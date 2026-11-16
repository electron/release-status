import type { LoaderFunctionArgs, MetaFunction } from 'react-router';
import { redirect, useLoaderData, useParams } from 'react-router';
import { Calendar } from 'lucide-react';
import { parse as semverParse, compare as semverCompare } from 'semver';
import { ReleaseTable } from '~/components/ReleaseTable';
import { PageHeader } from '~/components/PageHeader';
import { getReleasesOrUpdate } from '~/data/release-data';
import { guessTimeZoneFromRequest } from '~/helpers/timezone';

export const meta: MetaFunction = (args) => {
  return [
    { title: `${args.params.date} | Electron Releases` },
    {
      name: 'description',
      content: `Electron releases on ${args.params.date}`,
    },
  ];
};

function isSameDay(d1: Date, d2: Date) {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

export const loader = async (args: LoaderFunctionArgs) => {
  if (!args.params.date || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(args.params.date)) {
    return redirect('/history');
  }
  const [year, month, day] = args.params.date.split('-').map((s) => parseInt(s, 10));
  const releases = await getReleasesOrUpdate();
  const onDay = releases.filter((r) =>
    isSameDay(new Date(r.fullDate), new Date(year, month - 1, day)),
  );

  args.context.cacheControl = 'public, max-age=120, s-maxage=300, stale-while-revalidate=120';

  const timeZone = guessTimeZoneFromRequest(args.request);

  if (onDay.length === 0)
    return {
      releases: [undefined],
      timeZone,
    };

  return {
    releases: onDay.sort((a, b) => {
      const parsedA = semverParse(a.version);
      const parsedB = semverParse(b.version);
      const aNightly = parsedA?.prerelease[0] === 'nightly';
      const bNightly = parsedB?.prerelease[0] === 'nightly';
      if (aNightly && !bNightly) {
        return 1;
      }
      if (!aNightly && bNightly) {
        return -1;
      }
      return semverCompare(b.version, a.version);
    }),
    timeZone,
  };
};

export default function ReleaseDate() {
  const params = useParams();
  const { releases, timeZone } = useLoaderData<typeof loader>();

  return (
    <div>
      <PageHeader
        backTo={{ to: `/history?year=${params.date?.slice(0, 4)}`, name: 'release history' }}
        title={`Releases on ${params.date}`}
        subtitle={
          <div className="flex items-center gap-2 text-ink-muted">
            <Calendar className="w-4 h-4 text-ink-faint" />
            <span>Everything Electron shipped that day.</span>
          </div>
        }
      />

      <ReleaseTable
        releases={releases}
        missingTitle="No releases on this day"
        missingMessage="No releases found — our atoms were still getting organized."
        showStability
        timeZone={timeZone}
      />
    </div>
  );
}
