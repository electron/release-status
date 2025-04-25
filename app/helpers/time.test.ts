import { describe, expect, test } from 'vitest';
import { humanFriendlyDaysSince, prettyDateString, prettyReleaseDate } from './time';

describe('humanFriendlyDaysSince', () => {
  test('should return "Today" for today\'s date', () => {
    expect(
      humanFriendlyDaysSince(
        { fullDate: '2020-02-02T00:00:00Z' },
        new Date('2020-02-02T00:00:00Z'),
      ),
    ).toBe('Today');
  });

  test('should return "Yesterday" for yesterday\'s date', () => {
    expect(
      humanFriendlyDaysSince(
        { fullDate: '2020-02-01T00:00:00Z' },
        new Date('2020-02-02T00:00:00Z'),
      ),
    ).toBe('Yesterday');
  });

  test('should return "N days ago" for dates in the past', () => {
    expect(
      humanFriendlyDaysSince(
        { fullDate: '2020-01-30T00:00:00Z' },
        new Date('2020-02-02T00:00:00Z'),
      ),
    ).toBe('3 days ago');
    expect(
      humanFriendlyDaysSince(
        { fullDate: '2020-01-31T00:00:00Z' },
        new Date('2020-02-02T00:00:00Z'),
      ),
    ).toBe('2 days ago');
  });

  test('should return "N days ago" for dates in the past over month boundaries', () => {
    expect(
      humanFriendlyDaysSince(
        { fullDate: '2020-01-30T00:00:00Z' },
        new Date('2020-03-02T00:00:00Z'),
      ),
    ).toBe('32 days ago');
    expect(
      humanFriendlyDaysSince(
        { fullDate: '2020-01-31T00:00:00Z' },
        new Date('2020-03-02T00:00:00Z'),
      ),
    ).toBe('31 days ago');
  });

  test('should return "Tomorrow" for tomorrow', () => {
    expect(
      humanFriendlyDaysSince(
        { fullDate: '2020-03-04T00:00:00Z' },
        new Date('2020-03-03T00:00:00Z'),
      ),
    ).toBe('Tomorrow');
  });

  test('should return "N days in the future" for dates in the future', () => {
    expect(
      humanFriendlyDaysSince(
        { fullDate: '2020-03-04T00:00:00Z' },
        new Date('2020-02-01T00:00:00Z'),
      ),
    ).toBe('32 days in the future');
  });
});

describe('prettyReleaseDate', () => {
  test('should format date correctly', () => {
    expect(prettyReleaseDate({ fullDate: '2020-02-02' }, 'UTC')).toBe('Feb 2, 2020');
    expect(prettyReleaseDate({ fullDate: '2020-01-31' }, 'UTC')).toBe('Jan 31, 2020');
    expect(prettyReleaseDate({ fullDate: '2020-12-31' }, 'UTC')).toBe('Dec 31, 2020');
    expect(prettyReleaseDate({ fullDate: '2020-02-29' }, 'UTC')).toBe('Feb 29, 2020');
  });
});

describe('prettyDateString', () => {
  test('should format date correctly', () => {
    expect(prettyDateString('2020-02-02T12:00:00Z', 'UTC')).toBe('Feb 2, 2020, 12:00:00 PM');
    expect(prettyDateString('2020-01-31T23:59:59Z', 'UTC')).toBe('Jan 31, 2020, 11:59:59 PM');
    expect(prettyDateString('2020-12-31T00:00:00Z', 'UTC')).toBe('Dec 31, 2020, 12:00:00 AM');
    expect(prettyDateString('2020-02-29T12:00:00Z', 'UTC')).toBe('Feb 29, 2020, 12:00:00 PM');
  });
});
