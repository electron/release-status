import { parse as semverParse } from 'semver';

export const NIGHTLY_RELEASE_NOTES =
  'Nightlies do not get release notes, please compare tags for info.';
export const MISSING_RELEASE_NOTES = 'Missing...';

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

/**
 * Normalize the body of a GitHub release into the markdown we render as release notes.
 *
 * Pre-release bodies may carry an install preamble ending in `@<version>` (e.g.
 * "`npm install electron@1.2.3-beta.1`."); when that marker is present only the text
 * after it is kept, otherwise the whole body is used. Empty bodies fall back to a
 * placeholder, which for nightlies explains that they do not get release notes.
 */
export function processReleaseNotes(version: string, body: string): string {
  let releaseNotes = body;
  const parsed = semverParse(version);
  if (parsed?.prerelease.length) {
    const parts = releaseNotes.split(new RegExp(`@${escapeRegExp(parsed.version)}\`?.`));
    if (parts.length > 1) {
      releaseNotes = parts[1];
    }
  }
  releaseNotes = releaseNotes
    .replace(/# Release Notes for [^\r\n]+(?:(?:\n)|(?:\r\n))/i, '')
    .trim();
  if (!releaseNotes) {
    return version.includes('nightly') ? NIGHTLY_RELEASE_NOTES : MISSING_RELEASE_NOTES;
  }
  return releaseNotes;
}
