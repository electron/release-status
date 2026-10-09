// Minimal RFC 5545 serializer for calendars of all-day events

export interface AllDayEvent {
  uid: string;
  summary: string;
  start: string; // YYYY-MM-DD
  end: string; // YYYY-MM-DD, exclusive
}

export interface CalendarOptions {
  name: string;
  prodId: string;
  now: Date; // Used for DTSTAMP
}

const MAX_LINE_OCTETS = 75;

// Escape a TEXT value (RFC 5545 section 3.3.11)
export const escapeText = (value: string): string =>
  value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\r|\n/g, '\\n');

// Fold a content line so no line exceeds 75 octets, without splitting UTF-8 sequences
// (RFC 5545 section 3.1). Continuation lines start with a single space.
export const foldLine = (line: string): string => {
  const encoder = new TextEncoder();
  const lines: string[] = [];
  let current = '';
  let currentOctets = 0;

  for (const char of line) {
    const octets = encoder.encode(char).length;
    if (currentOctets + octets > MAX_LINE_OCTETS) {
      lines.push(current);
      current = ' ';
      currentOctets = 1;
    }
    current += char;
    currentOctets += octets;
  }
  lines.push(current);

  return lines.join('\r\n');
};

const formatDate = (date: string): string => date.replace(/-/g, '');

const formatDateTime = (date: Date): string =>
  date
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');

export const serializeCalendar = (events: AllDayEvent[], options: CalendarOptions): string => {
  const dtstamp = formatDateTime(options.now);
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:${options.prodId}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText(options.name)}`,
  ];

  for (const event of events) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${escapeText(event.uid)}`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART;VALUE=DATE:${formatDate(event.start)}`,
      `DTEND;VALUE=DATE:${formatDate(event.end)}`,
      `SUMMARY:${escapeText(event.summary)}`,
      'TRANSP:TRANSPARENT',
      'END:VEVENT',
    );
  }

  lines.push('END:VCALENDAR');

  return lines.map(foldLine).join('\r\n') + '\r\n';
};
