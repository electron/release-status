import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { JSDOM } from 'jsdom';
import { describe, expect, test, vi } from 'vitest';
import type { MajorReleaseSchedule } from '../data/release-schedule';

vi.mock('~/data/release-schedule', () => ({ getRelativeSchedule: vi.fn() }));
vi.mock('~/helpers/time', async () => import('../helpers/time'));
vi.mock('~/helpers/timezone', () => ({ guessTimeZoneFromRequest: vi.fn() }));
vi.mock('react-router', () => ({ useLoaderData: vi.fn() }));

import { useLoaderData } from 'react-router';
import Schedule from './schedule';

const release: MajorReleaseSchedule = {
  version: '45.0.0',
  branch: '45-x-y',
  status: 'prerelease',
  alphaDate: '2026-08-28',
  betaDate: '2026-09-03',
  stableDate: '2026-12-15',
  eolDate: '2027-11-16',
  tentativeDates: ['stableDate', 'eolDate'],
  chromiumVersion: 156,
  nodeVersion: '24.0.0',
};

function render(entry = release) {
  vi.mocked(useLoaderData).mockReturnValue({ releases: [entry], timeZone: 'UTC' });
  return new JSDOM(renderToStaticMarkup(<Schedule />)).window.document;
}

describe('Schedule', () => {
  test('marks only tentative dates in italics with a superscript dagger', () => {
    const document = render();
    const dates = document.querySelectorAll('tbody tr td');
    for (const index of [0, 1]) {
      expect(dates[index].querySelector('.italic')).toBeNull();
      expect(dates[index].querySelector('sup')).toBeNull();
    }
    for (const index of [2, 3]) {
      expect(dates[index].querySelector('.italic')?.textContent).toBeTruthy();
      expect(dates[index].querySelector('sup')?.textContent).toBe('†');
      expect(dates[index].querySelector('sup')?.getAttribute('title')).toBe('Tentative date');
    }
    expect(document.body.textContent).toContain('† Tentative date');
  });

  test('does not mark historical dates or missing alpha dates as tentative', () => {
    const document = render({ ...release, status: 'eol', alphaDate: null, tentativeDates: [] });
    expect(document.querySelector('tbody td')?.textContent).toBe('—');
    expect(document.querySelector('tbody .italic')).toBeNull();
    expect(document.querySelector('tbody sup')).toBeNull();
  });
});
