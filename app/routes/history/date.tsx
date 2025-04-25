import type { LoaderFunctionArgs, MetaFunction } from '@remix-run/node';
import { redirect, useLoaderData, useParams } from '@remix-run/react';
import { Calendar } from 'lucide-react';
import { parse as semverParse, compare as semverCompare } from 'semver';
import { ReleaseTable } from '~/components/ReleaseTable';
import { getReleasesOrUpdate } from '~/data/release-data';
import { guessTimeZoneFromRequest } from '~/helpers/timezone';

export const meta: MetaFunction = (args) => {
  return [
    { title: `Electron Releases - ${args.params.date}` },
    {
      name: 'description',
      content: `Electron releases on ${args.params.date}`,
    },
  ];
};

export const loader = async (args: LoaderFunctionArgs) => {
  if (!args.params.date || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(args.params.date)) {
    return redirect('/history');
  }
  const releases = await getReleasesOrUpdate();
  const onDay = releases.filter((r) => r.date === `${args.params.date}`);

  args.context.cacheControl = 'private, max-age=120';

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
    <div className="max-w-4xl mx-auto">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
        <h2 className="text-3xl font-bold text-[#2f3241] dark:text-white flex items-center gap-2">
          <Calendar className="w-7 h-7" />
          Releases - {params.date}
        </h2>
      </div>

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
