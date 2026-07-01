import type { LoaderFunctionArgs } from 'react-router';
import { getRelativeSchedule } from '~/data/release-schedule';

// Upper bound for the `eolGracePeriod` query param. Values above this are
// clamped so that a huge-but-valid integer can't overflow the underlying Date
// math into NaN territory.
const MAX_EOL_GRACE_PERIOD_DAYS = 365;

/**
 * Parse the optional `eolGracePeriod` query param (integer number of days).
 * Invalid or negative values fall back to 0 (no grace period), leaving the
 * default behavior unchanged. Values are capped at `MAX_EOL_GRACE_PERIOD_DAYS`.
 */
const parseEolGracePeriod = (request: Request): number => {
  const raw = new URL(request.url).searchParams.get('eolGracePeriod');
  if (raw === null) {
    return 0;
  }
  const days = Number(raw);
  if (!Number.isInteger(days) || days < 0) {
    return 0;
  }
  return Math.min(days, MAX_EOL_GRACE_PERIOD_DAYS);
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const eolGracePeriodDays = parseEolGracePeriod(request);
  return Response.json(await getRelativeSchedule(eolGracePeriodDays), {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
};
