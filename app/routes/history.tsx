import type { LoaderFunctionArgs, MetaFunction } from '@remix-run/node';
import { Link, useLoaderData, useSearchParams } from '@remix-run/react';
import { Calendar, Clock, Info, MoonIcon } from 'lucide-react';
import { MouseEvent, useCallback, useState } from 'react';
import { getReleasesOrUpdate } from '~/data/release-data';
import { parse as semverParse } from 'semver';
import { Select } from '~/components/Select';

export const meta: MetaFunction = () => {
  return [
    { title: 'History | Electron Releases' },
    {
      name: 'description',
      content: 'Calendar of Electron releases from the past year.',
    },
  ];
};

type DateInfo = {
  missedNightly: boolean;
  stable: string[];
  prerelease: string[];
};

const months = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

const MIN_YEAR = 2019;

export const loader = async (args: LoaderFunctionArgs) => {
  // Calendar specifically always uses server TZ which is always America/Los_Angeles
  const currentDate = new Date();
  let year = currentDate.getFullYear();
  const providedYear = new URL(args.request.url).searchParams.get('year');
  if (providedYear) {
    const parsedYear = parseInt(providedYear, 10);
    if (!isNaN(parsedYear) && parsedYear >= MIN_YEAR && parsedYear <= year) {
      year = parsedYear;
    }
  }
  const releases = await getReleasesOrUpdate();
  const releasesThisYear = releases.filter((r) => new Date(r.fullDate).getFullYear() === year);

  const calendarData: Record<(typeof months)[number], Record<number, DateInfo>> = Object.create(
    null,
  );
  for (let i = 0; i < months.length; i++) {
    const daysInMonth = new Date(year, i + 1, 0).getDate();
    calendarData[months[i]] = Object.create(null);

    for (let day = 1; day <= daysInMonth; day++) {
      const dayOfWeek = new Date(year, i, day).getDay();

      calendarData[months[i]][day] = {
        // Ignore missed nightlies on weekends
        missedNightly: dayOfWeek !== 6 && dayOfWeek !== 0,
        stable: [],
        prerelease: [],
      };
    }
  }

  for (const release of releasesThisYear) {
    const month = months[new Date(release.fullDate).getMonth()];
    const day = new Date(release.fullDate).getDate();

    const parsed = semverParse(release.version);

    if (parsed?.prerelease[0] === 'nightly') {
      calendarData[month][day].missedNightly = false;
    } else if (parsed?.prerelease.length) {
      calendarData[month][day].prerelease.push(release.version);
    } else {
      calendarData[month][day].stable.push(release.version);
    }
  }
  args.context.cacheControl = 'private, max-age=30';

  const currentMonth = currentDate.getMonth();
  const currentDayOfMonth = currentDate.getDate();
  return { data: calendarData, year, currentMonth, currentDayOfMonth };
};

const getDayOfWeek = (year: number, month: (typeof months)[number], day: number) => {
  const date = new Date(year, months.indexOf(month), day);
  return date.getDay();
};

const getMonthStartDay = (year: number, month: (typeof months)[number]) => {
  return getDayOfWeek(year, month, 1);
};

const getDaysInMonth = (year: number, month: (typeof months)[number]) => {
  return new Date(year, months.indexOf(month) + 1, 0).getDate();
};

export default function ReleaseHistory() {
  const [, setSearchParams] = useSearchParams();
  const {
    data: calendarData,
    year,
    currentMonth,
    currentDayOfMonth,
  } = useLoaderData<typeof loader>();
  const [tooltipInfo, setTooltipInfo] = useState({
    visible: false,
    text: '',
    x: 0,
    y: 0,
  });

  const showTooltip = useCallback((e: MouseEvent, text: string) => {
    if (!text) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top;

    setTooltipInfo({
      visible: true,
      text,
      x,
      y,
    });
  }, []);

  const hideTooltip = useCallback(() => {
    setTooltipInfo((tooltipInfo) => ({ ...tooltipInfo, visible: false }));
  }, []);

  const setYear = useCallback(
    (year: string) => {
      if (year === new Date().getFullYear().toString()) {
        setSearchParams({});
      } else {
        setSearchParams({ year });
      }
    },
    [setSearchParams],
  );

  const allowedYears = [];
  for (let y = MIN_YEAR; y <= new Date().getFullYear(); y++) {
    allowedYears.push(`${y}`);
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
        <h2 className="text-3xl font-bold text-[#2f3241] dark:text-white flex items-center gap-2">
          <Calendar className="w-7 h-7" />
          Release History {year}
        </h2>
        <Select options={allowedYears} selected={`${year}`} onChange={setYear} />
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden mb-6">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-sm text-gray-700 dark:text-gray-300">Stable Release</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <span className="text-sm text-gray-700 dark:text-gray-300">Pre Release</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span className="text-sm text-gray-700 dark:text-gray-300">Missed Nightly</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex">
              <div className="w-3 h-3 rounded-tl-full rounded-bl-full bg-green-500"></div>
              <div className="w-3 h-3 rounded-tr-full rounded-br-full bg-yellow-500"></div>
            </div>
            <span className="text-sm text-gray-700 dark:text-gray-300">Multiple Releases</span>
          </div>
          <div className="flex items-center gap-1 ml-auto">
            <Info className="w-4 h-4 text-gray-400" />
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Click on a day to see release details
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {months.map((month) => {
          const monthIndex = months.indexOf(month);
          const isFutureMonth = year === new Date().getFullYear() && monthIndex > currentMonth;
          const isCurrentMonth = year === new Date().getFullYear() && monthIndex === currentMonth;
          const daysInMonth = getDaysInMonth(year, month);

          let missedNightlies = 0;
          for (let i = 1; i <= daysInMonth; i++) {
            missedNightlies += calendarData[month][i].missedNightly ? 1 : 0;
          }
          const nightlyPercentage =
            Math.round(((daysInMonth - missedNightlies) / daysInMonth) * 10_000) / 100;

          return (
            <div
              key={month}
              className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden ${
                isFutureMonth ? 'relative' : ''
              }`}
            >
              <div className="p-3 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <h3 className="text-base font-medium text-[#2f3241] dark:text-white">{month}</h3>
                {isFutureMonth ? (
                  <div className="flex items-center gap-1 text-blue-500 dark:text-blue-400">
                    <Clock className="w-4 h-4" />
                    <span className="text-xs font-medium">Future</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-purple-500 dark:text-purple-400">
                    <MoonIcon className="w-4 h-4" />
                    <span className="text-xs font-medium">{nightlyPercentage}% Nightly</span>
                  </div>
                )}
              </div>
              <div className={`p-4 ${isFutureMonth ? 'opacity-60' : ''}`}>
                <div className="grid grid-cols-7 gap-1 text-center mb-2">
                  {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
                    <div key={day} className="text-xs font-medium text-gray-500 dark:text-gray-400">
                      {day}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: getMonthStartDay(year, month) }).map((_, index) => (
                    <div key={`empty-start-${index}`} className="h-9"></div>
                  ))}

                  {Array.from({ length: daysInMonth }).map((_, index) => {
                    const day = index + 1;

                    if (isFutureMonth || (isCurrentMonth && day > currentDayOfMonth)) {
                      return (
                        <div
                          key={`day-${day}`}
                          className="h-9 flex items-center justify-center rounded border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 relative"
                        >
                          <span className="text-sm text-gray-400 dark:text-gray-500">{day}</span>
                        </div>
                      );
                    }

                    const dayData = calendarData[month][day];
                    const hasBoth = dayData.stable.length >= 1 && dayData.prerelease.length >= 1;
                    const canListBoth =
                      dayData.stable.length === 1 && dayData.prerelease.length === 1;
                    const hasLotsOfReleases = dayData.stable.length + dayData.prerelease.length > 2;

                    let bgColor = '';
                    let borderColor = '';
                    const textColor = 'text-[#2f3241] dark:text-white';
                    let tooltip = '';

                    if (dayData.missedNightly) {
                      bgColor = 'bg-red-100 dark:bg-red-900/30';
                      borderColor = 'border-red-300 dark:border-red-700';
                      tooltip = 'Missed Nightly';
                    }
                    if (hasBoth && canListBoth) {
                      bgColor =
                        bgColor ||
                        'bg-gradient-to-r from-green-100 to-yellow-100 dark:from-green-900/30 dark:to-yellow-900/30';
                      borderColor = borderColor || 'border-green-300 dark:border-green-700';
                      tooltip = `Stable ${dayData.stable[0]} & ${dayData.prerelease[0]}`;
                    } else if (dayData.stable.length) {
                      bgColor = bgColor || 'bg-green-100 dark:bg-green-900/30';
                      borderColor = borderColor || 'border-green-300 dark:border-green-700';
                      tooltip = hasLotsOfReleases
                        ? `Lots of releases...`
                        : `Stable ${dayData.stable[0]}`;
                    } else if (dayData.prerelease.length) {
                      bgColor = bgColor || 'bg-yellow-100 dark:bg-yellow-900/30';
                      borderColor = borderColor || 'border-yellow-300 dark:border-yellow-700';
                      tooltip = hasLotsOfReleases
                        ? `Lots of releases...`
                        : `${dayData.prerelease[0]}`;
                    } else {
                      bgColor = bgColor || '';
                      borderColor = borderColor || 'border-gray-200 dark:border-gray-700';
                    }

                    return (
                      <Link
                        key={`day-${day}`}
                        to={`/history/${year}-${monthIndex < 10 ? 0 : ''}${
                          monthIndex + 1
                        }-${day < 10 ? 0 : ''}${day}`}
                        className={`h-9 flex items-center justify-center rounded border ${bgColor} ${borderColor} relative cursor-pointer`}
                        onMouseEnter={(e) => showTooltip(e, tooltip)}
                        onMouseLeave={hideTooltip}
                        prefetch="intent"
                      >
                        <span className={`text-sm ${textColor}`}>{day}</span>

                        <div className="absolute top-1 right-1 flex">
                          {dayData.stable.length > 0 ? (
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                          ) : null}
                          {dayData.prerelease.length > 0 ? (
                            <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 -ml-0.5"></div>
                          ) : null}
                        </div>
                      </Link>
                    );
                  })}

                  {Array.from({
                    length:
                      (7 - ((getMonthStartDay(year, month) + getDaysInMonth(year, month)) % 7)) % 7,
                  }).map((_, index) => (
                    <div key={`empty-end-${index}`} className="h-9"></div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {tooltipInfo.visible && (
        <div
          className="fixed z-50 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap pointer-events-none"
          style={{
            left: `${tooltipInfo.x}px`,
            top: `${tooltipInfo.y - 30}px`,
            transform: 'translateX(-50%)',
          }}
        >
          {tooltipInfo.text}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
        </div>
      )}
    </div>
  );
}
