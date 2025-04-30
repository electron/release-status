import { parse } from 'cookie';
import geoip from 'geoip-lite';
// eslint-disable-next-line import/no-named-as-default-member
const { lookup } = geoip;

// We do this so that running locally has the correct default timezone
// because geoip does not work for localhost
const DEFAULT_TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;

function isValidTimezone(tz: string): boolean {
  try {
    Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export const guessTimeZoneFromRequest = (request: Request): string => {
  const cookies = parse(request.headers.get('Cookie') || '');
  if (cookies.tz && isValidTimezone(cookies.tz)) {
    // TODO: Check it's a valid timezone
    return cookies.tz;
  }
  const forwardedIps = request.headers.get('x-forwarded-for');
  if (forwardedIps) {
    const allIps = forwardedIps.split(',');
    const ip = allIps[allIps.length - 1].trim();
    const geo = lookup(ip);
    return geo?.timezone ?? DEFAULT_TIMEZONE;
  }
  return DEFAULT_TIMEZONE;
};
