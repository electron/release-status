import { ElectronRelease } from '~/data/release-data';

/**
 * @param date A date string from an ElectronRelease, or any date string in the format
 * YYYY-MM-DD
 * @returns A human friendly string describing how many days ago the date was
 */
export const humanFriendlyDaysSince = (
  release: Pick<ElectronRelease, 'fullDate'>,
  currentDate = new Date(),
) => {
  const releaseDate = new Date(release.fullDate);
  const daysAgo = Math.floor(
    (currentDate.getTime() - releaseDate.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (daysAgo === 0) return 'Today';
  if (daysAgo === 1) return 'Yesterday';
  if (daysAgo === -1) return 'Tomorrow';
  if (daysAgo < 0) return `${-daysAgo} days in the future`;
  return `${daysAgo} days ago`;
};

/**
 * This function requires a timezone, do not call it from inside a memoized or cached
 * data function. Return a date string from those functions and in the loader apply
 * the timezone with this function
 *
 * @param date A date string from an ElectronRelease, or any date string in the format
 * YYYY-MM-DD
 * @returns The date formatted like Month DD, YYYY
 */
export const prettyReleaseDate = (release: Pick<ElectronRelease, 'fullDate'>, timeZone: string) => {
  const releaseDate = new Date(release.fullDate);
  return releaseDate.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone,
  });
};

/**
 * This function requires a timezone, do not call it from inside a memoized or cached
 * data function. Return a date string from those functions and in the loader apply
 * the timezone with this function
 */
export function prettyDateString(date: string, timeZone: string) {
  const d = new Date(date);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
    timeZone,
  });
}
