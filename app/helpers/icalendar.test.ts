import { describe, expect, test } from 'vitest';
import { escapeText, foldLine, serializeCalendar } from './icalendar';

describe('escapeText', () => {
  test('escapes backslashes, semicolons, commas and newlines', () => {
    expect(escapeText('a\\b;c,d\ne\r\nf')).toBe('a\\\\b\\;c\\,d\\ne\\nf');
  });
});

describe('foldLine', () => {
  const octets = (line: string) => new TextEncoder().encode(line).length;
  const unfold = ([first, ...rest]: string[]) => first + rest.map((part) => part.slice(1)).join('');

  test('leaves short lines alone', () => {
    expect(foldLine('SUMMARY:short')).toBe('SUMMARY:short');
  });

  test('folds lines at 75 octets with a leading space', () => {
    const line = `SUMMARY:${'x'.repeat(200)}`;
    const folded = foldLine(line).split('\r\n');
    expect(folded.length).toBeGreaterThan(1);
    for (const part of folded) {
      expect(octets(part)).toBeLessThanOrEqual(75);
    }
    expect(folded[0]).toHaveLength(75);
    expect(folded.slice(1).every((part) => part.startsWith(' '))).toBe(true);
    expect(unfold(folded)).toBe(line);
  });

  test('does not split multi-byte characters', () => {
    const line = `SUMMARY:${'✨🚀'.repeat(30)}`;
    const folded = foldLine(line).split('\r\n');
    for (const part of folded) {
      expect(octets(part)).toBeLessThanOrEqual(75);
      // A split surrogate pair would not survive a UTF-8 round trip
      expect(new TextDecoder().decode(new TextEncoder().encode(part))).toBe(part);
    }
    expect(unfold(folded)).toBe(line);
  });
});

describe('serializeCalendar', () => {
  const ics = serializeCalendar(
    [
      {
        uid: 'stable-45@releases.electronjs.org',
        summary: '✨45.0.0 Stable✨ (M156)',
        start: '2026-09-01',
        end: '2026-09-02',
      },
      {
        uid: 'stable-prep-week-45@releases.electronjs.org',
        summary: 'Prep; week, done',
        start: '2026-08-24',
        end: '2026-08-29',
      },
    ],
    {
      name: 'Electron Releases (internal)',
      prodId: '-//Electron//Release Status//EN',
      now: new Date('2026-10-09T01:30:00.123Z'),
    },
  );

  test('uses CRLF line endings throughout', () => {
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
    expect(ics.replace(/\r\n/g, '')).not.toMatch(/[\r\n]/);
  });

  test('emits the calendar header', () => {
    expect(ics.split('\r\n').slice(0, 6)).toEqual([
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Electron//Release Status//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:Electron Releases (internal)',
    ]);
  });

  test('emits all-day events with an exclusive DTEND', () => {
    expect(ics).toContain(
      [
        'BEGIN:VEVENT',
        'UID:stable-45@releases.electronjs.org',
        'DTSTAMP:20261009T013000Z',
        'DTSTART;VALUE=DATE:20260901',
        'DTEND;VALUE=DATE:20260902',
        'SUMMARY:✨45.0.0 Stable✨ (M156)',
        'TRANSP:TRANSPARENT',
        'END:VEVENT',
      ].join('\r\n'),
    );
    expect(ics).toContain('DTSTART;VALUE=DATE:20260824\r\nDTEND;VALUE=DATE:20260829\r\n');
    expect(ics).toContain('SUMMARY:Prep\\; week\\, done\r\n');
  });
});
