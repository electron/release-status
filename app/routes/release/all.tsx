import type { LoaderFunctionArgs, MetaFunction } from '@remix-run/node';
import { redirect, useLoaderData, useNavigation, useSearchParams } from '@remix-run/react';
import { LoaderCircle } from 'lucide-react';
import { useCallback } from 'react';
import { parse as semverParse } from 'semver';
import { ChannelFilterButton } from '~/components/ChannelFilterButton';
import { Pagination } from '~/components/Pagination';
import { ReleaseTable } from '~/components/ReleaseTable';
import { Select } from '~/components/Select';
import { getReleasesOrUpdate } from '~/data/release-data';
import { guessTimeZoneFromRequest } from '~/helpers/timezone';

export const meta: MetaFunction = () => {
  return [
    { title: 'Electron Releases' },
    {
      name: 'description',
      content: 'All historical Electron releases.',
    },
  ];
};

const PER_PAGE = 10;
const ALL_MAJORS = 'All Majors';

export const loader = async (args: LoaderFunctionArgs) => {
  const url = new URL(args.request.url);
  let channel = url.searchParams.get('channel') ?? 'stable';
  let page = parseInt(url.searchParams.get('page') ?? '1', 10);
  const passedMajor = url.searchParams.get('major') ?? null;
  let major: number | null = null;

  if (channel !== 'stable' && channel !== 'pre' && channel !== 'nightly') {
    channel = 'stable';
  }
  if (isNaN(page) || page < 1) {
    page = 1;
  }
  if (passedMajor?.startsWith('v')) {
    major = parseInt(passedMajor.substring(1), 10);
    if (isNaN(major) || major <= 0) {
      major = null;
    }
  }

  const releases = await getReleasesOrUpdate();
  const inChannel = releases
    .sort((a, b) => {
      const dateA = new Date(a.fullDate);
      const dateB = new Date(b.fullDate);
      return dateB.getTime() - dateA.getTime();
    })
    .filter((r) => {
      switch (channel) {
        case 'stable':
          return !r.version.includes('-');
        case 'nightly':
          return r.version.includes('nightly');
        case 'pre':
          return r.version.includes('-') && !r.version.includes('nightly');
        default:
          return false;
      }
    })
    .filter((r) => {
      if (major) {
        return semverParse(r.version)!.major === major;
      }
      return true;
    });
  const start = (page - 1) * PER_PAGE;
  const end = page * PER_PAGE;
  const maxPage = Math.ceil(inChannel.length / PER_PAGE);
  if (page > maxPage && page !== 1) {
    return redirect(`/release?channel=${encodeURIComponent(channel)}`);
  }

  const timeZone = guessTimeZoneFromRequest(args.request);

  args.context.cacheControl = 'private, max-age=30';
  return {
    releases: page > maxPage ? [undefined] : inChannel.slice(start, end),
    maxPage,
    timeZone,
    majors: [ALL_MAJORS].concat(
      Array.from(new Set(releases.map((r) => semverParse(r.version)!.major)))
        .sort((a, b) => b - a)
        .map((major) => `v${major}`),
    ),
    major,
  };
};

export default function AllReleases() {
  const { releases, maxPage, timeZone, majors, major } = useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();
  const channel = searchParams.get('channel') ?? 'stable';
  let page = parseInt(searchParams.get('page') ?? '1', 10);
  if (isNaN(page)) {
    page = 1;
  }
  const isLoading = useNavigation().state === 'loading';

  const updateChanelFilter = useCallback(
    (channelFilter: string) => {
      setSearchParams((current) => {
        const newParams = new URLSearchParams(current);
        newParams.set('channel', channelFilter);
        newParams.delete('page');
        return newParams.toString();
      });
    },
    [setSearchParams],
  );
  const updatePage = useCallback(
    (page: number) => {
      setSearchParams((current) => {
        const newParams = new URLSearchParams(current);
        newParams.set('page', page.toString());
        return newParams.toString();
      });
    },
    [setSearchParams],
  );
  const updateMajor = useCallback(
    (major: string) => {
      setSearchParams((current) => {
        const newParams = new URLSearchParams(current);
        if (major === ALL_MAJORS) {
          newParams.delete('major');
        } else {
          newParams.set('major', major);
        }
        newParams.delete('page');
        return newParams.toString();
      });
    },
    [setSearchParams],
  );

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
        <h2 className="text-3xl font-bold text-[#2f3241] dark:text-white">All Releases</h2>
        <Select
          options={majors}
          selected={major ? `v${major}` : ALL_MAJORS}
          onChange={updateMajor}
        />
      </div>

      <ReleaseTable
        releases={releases}
        header={
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
            <div className="flex flex-row items-start justify-between gap-4">
              <div className="flex flex-wrap gap-2">
                <ChannelFilterButton
                  channel="stable"
                  onChangeChannel={updateChanelFilter}
                  activeChannel={channel}
                />
                <ChannelFilterButton
                  channel="pre"
                  onChangeChannel={updateChanelFilter}
                  activeChannel={channel}
                />
                <ChannelFilterButton
                  channel="nightly"
                  onChangeChannel={updateChanelFilter}
                  activeChannel={channel}
                />
              </div>
              <div>{isLoading ? <LoaderCircle className="animate-spin" /> : null}</div>
            </div>
          </div>
        }
        timeZone={timeZone}
        missingTitle="No releases found"
        missingMessage="We couldn't find any releases matching your filters."
      />

      <Pagination page={page} maxPage={maxPage} setPage={updatePage} />
    </div>
  );
}
