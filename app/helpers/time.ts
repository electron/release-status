import { ElectronRelease } from '~/data/release-data';

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
