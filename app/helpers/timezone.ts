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
    return cookies.tz;
  }
  // CF-Connecting-IP is the real client IP when behind Cloudflare,
  // x-forwarded-for may contain Cloudflare edge IPs which would
  // resolve to the data center's location instead of the user's.
  const clientIp = request.headers.get('cf-connecting-ip');
  if (clientIp) {
    const geo = lookup(clientIp.trim());
    return geo?.timezone ?? DEFAULT_TIMEZONE;
  }
  const forwardedIps = request.headers.get('x-forwarded-for');
  if (forwardedIps) {
    const allIps = forwardedIps.split(',');
    const ip = allIps[0].trim();
    const geo = lookup(ip);
    return geo?.timezone ?? DEFAULT_TIMEZONE;
  }
  return DEFAULT_TIMEZONE;
};
