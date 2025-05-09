import { describe, expect, test } from 'vitest';
import { prettyDateString, prettyReleaseDate } from './time';

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
