import memoize from '@keyvhq/memoize';
import { getKeyvCache } from '../cache';

export interface ChromiumMilestoneSchedule {
  earliestBeta: string; // YYYY-MM-DD
  stableDate: string; // YYYY-MM-DD
}

interface ChromiumDashResponse {
  mstones: Array<{
    earliest_beta: string; // ISO timestamp
    stable_date: string; // ISO timestamp
    mstone: number;
  }>;
}

/**
 * Fetch Chromium milestone schedule from chromiumdash API.
 * @param milestone - Chromium milestone number (e.g., 140)
 * @returns Object with earliestBeta and stableDate in YYYY-MM-DD format
 */
export const getMilestoneSchedule = memoize(
  async (milestone: number): Promise<ChromiumMilestoneSchedule> => {
    const response = await fetch(
      `https://chromiumdash.appspot.com/fetch_milestone_schedule?mstone=${milestone}`,
    );

    if (!response.ok) {
      throw new Error(
        `Failed to fetch Chromium schedule for milestone ${milestone}: ${response.status}`,
      );
    }

    const data = (await response.json()) as ChromiumDashResponse;

    if (!data.mstones || !Array.isArray(data.mstones) || data.mstones.length === 0) {
      throw new Error(`No schedule data found for Chromium milestone ${milestone}`);
    }

    const schedule = data.mstones[0];

    return {
      earliestBeta: schedule.earliest_beta.split('T')[0],
      stableDate: schedule.stable_date.split('T')[0],
    };
  },
  getKeyvCache('chromium-schedule'),
  {
    // Cache for 6 hours
    ttl: 6 * 60 * 60 * 1_000,
    // At 5 hours, refetch but serve stale data
    staleTtl: 60 * 60 * 1_000,
  },
);
