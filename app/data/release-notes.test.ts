import { describe, expect, test } from 'vitest';
import { MISSING_RELEASE_NOTES, NIGHTLY_RELEASE_NOTES, processReleaseNotes } from './release-notes';

describe('processReleaseNotes', () => {
  test('strips the install preamble from a pre-release body that carries the marker', () => {
    const body =
      'Note: This is a beta release.  Please file new issues for any bugs you find in it.\n \n ' +
      'This release is published to npm under the beta tag and can be installed via ' +
      '`npm install electron@beta`, or `npm install electron@40.0.0-beta.1`.\n \n # Release Notes for v40.0.0-beta.1\n\n## Fixes\n\n* Fixed a thing.';
    expect(processReleaseNotes('v40.0.0-beta.1', body)).toBe('## Fixes\n\n* Fixed a thing.');
    // compare.tsx passes versions without the leading "v"
    expect(processReleaseNotes('40.0.0-beta.1', body)).toBe('## Fixes\n\n* Fixed a thing.');
  });

  test('keeps the whole body of a pre-release when the marker is absent', () => {
    expect(processReleaseNotes('v43.0.0-nightly.20260409', NIGHTLY_RELEASE_NOTES)).toBe(
      NIGHTLY_RELEASE_NOTES,
    );
    expect(processReleaseNotes('v40.0.0-beta.1', '## Fixes\n\n* Fixed a thing.')).toBe(
      '## Fixes\n\n* Fixed a thing.',
    );
  });

  test('explains that nightlies do not get release notes when the body is empty', () => {
    expect(processReleaseNotes('v43.0.0-nightly.20260409', '')).toBe(NIGHTLY_RELEASE_NOTES);
    expect(processReleaseNotes('v43.0.0-nightly.20260409', ' \n ')).toBe(NIGHTLY_RELEASE_NOTES);
  });

  test('falls back to a placeholder when a stable body is empty', () => {
    expect(processReleaseNotes('v40.0.0', '')).toBe(MISSING_RELEASE_NOTES);
    expect(processReleaseNotes('v40.0.0', ' \n ')).toBe(MISSING_RELEASE_NOTES);
  });

  test('strips the release notes header from a stable body', () => {
    expect(
      processReleaseNotes('v40.0.0', '# Release Notes for v40.0.0\n\n## Fixes\n\n* Fixed.'),
    ).toBe('## Fixes\n\n* Fixed.');
  });
});
