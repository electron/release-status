import type { LoaderFunctionArgs, MetaFunction } from 'react-router';
import { Link, PrefetchPageLinks, useLoaderData, useSearchParams } from 'react-router';
import { ArrowLeft, ArrowRight, Calendar, Clock, Info, MoonIcon } from 'lucide-react';
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
  nightly: boolean;
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
        nightly: false,
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
      calendarData[month][day].nightly = true;
    } else if (parsed?.prerelease.length) {
      calendarData[month][day].prerelease.push(release.version);
    } else {
      calendarData[month][day].stable.push(release.version);
    }
  }
  args.context.cacheControl = 'public, max-age=120, s-maxage=300, stale-while-revalidate=120';

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
  const [preloadAllYears, setPreloadAllYears] = useState(false);
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
  const onYearSelectClick = useCallback(() => {
    setPreloadAllYears(true);
  }, []);

  const decrementYear = useCallback(() => {
    setYear(`${year - 1}`);
  }, [year, setYear]);

  const incrementYear = useCallback(() => {
    setYear(`${year + 1}`);
  }, [year, setYear]);

  const allowedYears = [];
  for (let y = MIN_YEAR; y <= new Date().getFullYear(); y++) {
    allowedYears.push(`${y}`);
  }

  return (
    <div>
      {preloadAllYears
        ? allowedYears.map((year) => (
            <PrefetchPageLinks key={year} page={`/history?year=${year}`} />
          ))
        : null}
      <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-4 mb-8">
        <div className="flex flex-col gap-2">
          <h2 className="t-page text-ink flex items-baseline gap-3">
            Release history
            <span className="text-ink-faint t-tabular">{year}</span>
          </h2>
          <p className="t-lead text-ink-muted">Every day Electron shipped something, by year.</p>
        </div>

        <div className="flex gap-2 items-center">
          <button
            className="lu-button lu-button-secondary lu-button-icon"
            onClick={decrementYear}
            disabled={year <= MIN_YEAR}
            aria-label="Previous year"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>{' '}
          <Select
            options={allowedYears}
            selected={`${year}`}
            onChange={setYear}
            onClick={onYearSelectClick}
          />
          <button
            className="lu-button lu-button-secondary lu-button-icon"
            disabled={year >= Number(allowedYears[allowedYears.length - 1])}
            onClick={incrementYear}
            aria-label="Next year"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="lu-callout mb-6 flex-wrap items-center gap-x-6 gap-y-2 !py-3 !px-4">
        <div className="flex items-center gap-2">
          <span className="lu-dot !shadow-none" data-tone="success"></span>
          <span className="text-ink">Stable</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="lu-dot !shadow-none" data-tone="warning"></span>
          <span className="text-ink">Pre-release</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="lu-dot !shadow-none" data-tone="danger"></span>
          <span className="text-ink">Missed nightly</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex -space-x-0.5">
            <span className="lu-dot !shadow-none" data-tone="success"></span>
            <span className="lu-dot !shadow-none ring-2 ring-[var(--lu-surface-sunken)]" data-tone="warning"></span>
          </div>
          <span className="text-ink">Multiple releases</span>
        </div>
        <div className="flex items-center gap-1.5 ml-auto text-ink-muted t-dense">
          <Info className="w-3.5 h-3.5" />
          <span>Click a day to see its releases</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {months.map((month) => {
          const monthIndex = months.indexOf(month);
          const isFutureMonth = year === new Date().getFullYear() && monthIndex > currentMonth;
          const isCurrentMonth = year === new Date().getFullYear() && monthIndex === currentMonth;
          const daysInMonth = getDaysInMonth(year, month);
          const daysSoFar = isCurrentMonth ? currentDayOfMonth : daysInMonth;

          let missedNightlies = 0;
          for (let i = 1; i <= daysSoFar; i++) {
            missedNightlies += calendarData[month][i].missedNightly ? 1 : 0;
          }
          const nightlyPercentage =
            Math.round(((daysSoFar - missedNightlies) / daysSoFar) * 10_000) / 100;

          return (
            <div
              key={month}
              className={`lu-card overflow-hidden ${isFutureMonth ? 'relative' : ''}`}
            >
              <div className="px-4 h-11 flex justify-between items-center lu-hairline-b">
                <h3 className="t-headline text-ink">{month}</h3>
                {isFutureMonth ? (
                  <span className="lu-badge">
                    <Clock className="w-3 h-3" />
                    Future
                  </span>
                ) : (
                  <span
                    className="lu-badge t-tabular"
                    data-tone={nightlyPercentage >= 90 ? 'accent' : nightlyPercentage >= 70 ? 'warning' : 'danger'}
                  >
                    <MoonIcon className="w-3 h-3" />
                    {nightlyPercentage}% nightly
                  </span>
                )}
              </div>
              <div className={`p-3 ${isFutureMonth ? 'opacity-50' : ''}`}>
                <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
                  {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
                    <div key={day} className="t-caption text-ink-faint py-1">
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
                          className="h-9 flex items-center justify-center rounded-item relative"
                        >
                          <span className="t-dense t-tabular text-ink-faint opacity-60">{day}</span>
                        </div>
                      );
                    }

                    const dayData = calendarData[month][day];
                    const hasBoth = dayData.stable.length >= 1 && dayData.prerelease.length >= 1;
                    const canListBoth =
                      dayData.stable.length === 1 && dayData.prerelease.length === 1;
                    const hasLotsOfReleases = dayData.stable.length + dayData.prerelease.length > 2;

                    // Day cells are tinted wells: success for stable, warning for
                    // pre-release, spark for a missed nightly. No borders, per Lucent.
                    let bgColor = '';
                    let borderColor = '';
                    let textColor = 'text-ink';
                    let tooltip = '';

                    if (dayData.missedNightly) {
                      bgColor = 'bg-spark-soft';
                      textColor = 'text-spark font-medium';
                      tooltip = 'Missed Nightly';
                    }
                    if (hasBoth && canListBoth) {
                      bgColor =
                        bgColor ||
                        'bg-[linear-gradient(100deg,color-mix(in_srgb,var(--lu-success)_16%,transparent)_45%,color-mix(in_srgb,var(--lu-warning)_18%,transparent)_55%)]';
                      textColor = dayData.missedNightly ? textColor : 'text-ink font-medium';
                      tooltip = `Stable ${dayData.stable[0]} & ${dayData.prerelease[0]}`;
                    } else if (dayData.stable.length) {
                      bgColor = bgColor || 'bg-[color-mix(in_srgb,var(--lu-success)_16%,transparent)]';
                      textColor = dayData.missedNightly ? textColor : 'text-success font-medium';
                      tooltip = hasLotsOfReleases
                        ? `Lots of releases...`
                        : `Stable ${dayData.stable[0]}`;
                    } else if (dayData.prerelease.length) {
                      bgColor = bgColor || 'bg-[color-mix(in_srgb,var(--lu-warning)_16%,transparent)]';
                      textColor = dayData.missedNightly ? textColor : 'text-warning font-medium';
                      tooltip = hasLotsOfReleases
                        ? `Lots of releases...`
                        : `${dayData.prerelease[0]}`;
                    } else if (!dayData.nightly && !dayData.missedNightly) {
                      // No releases at all on this day, lightly grey it out
                      bgColor = '';
                      textColor = 'text-ink-faint opacity-60';
                    } else {
                      bgColor = bgColor || 'bg-surface-sunken';
                    }

                    const hasReleases =
                      dayData.nightly || dayData.stable.length > 0 || dayData.prerelease.length > 0;

                    if (!hasReleases) {
                      // Nothing to show on the details page, so don't link to it
                      return (
                        <div
                          key={`day-${day}`}
                          className={`h-9 flex items-center justify-center rounded-item lu-squircle ${bgColor} ${borderColor} relative cursor-default`}
                          onMouseEnter={(e) => showTooltip(e, tooltip)}
                          onMouseLeave={hideTooltip}
                        >
                          <span className={`t-dense t-tabular ${textColor}`}>{day}</span>
                        </div>
                      );
                    }

                    return (
                      <Link
                        key={`day-${day}`}
                        to={`/history/${year}-${monthIndex + 1 < 10 ? 0 : ''}${
                          monthIndex + 1
                        }-${day < 10 ? 0 : ''}${day}`}
                        className={`h-9 flex items-center justify-center rounded-item lu-squircle ${bgColor} ${borderColor} relative cursor-pointer hover:shadow-edge transition-shadow`}
                        onMouseEnter={(e) => showTooltip(e, tooltip)}
                        onMouseLeave={hideTooltip}
                        prefetch="intent"
                      >
                        <span className={`t-dense t-tabular ${textColor}`}>{day}</span>

                        <div className="absolute top-1 right-1 flex">
                          {dayData.stable.length > 0 ? (
                            <div className="w-1.5 h-1.5 rounded-full bg-success"></div>
                          ) : null}
                          {dayData.prerelease.length > 0 ? (
                            <div className="w-1.5 h-1.5 rounded-full bg-warning -ml-0.5"></div>
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
          className="fixed z-50 px-2.5 py-1.5 bg-[var(--lu-tooltip)] text-[var(--lu-tooltip-ink)] t-dense rounded-item whitespace-nowrap pointer-events-none shadow-popover backdrop-blur"
          style={{
            left: `${tooltipInfo.x}px`,
            top: `${tooltipInfo.y - 30}px`,
            transform: 'translateX(-50%)',
          }}
        >
          {tooltipInfo.text}

        </div>
      )}
    </div>
  );
}
