import { parse as parseSemver } from 'semver';

/**
 * Get the prerelease type from a version string.
 * @returns 'alpha', 'beta', 'nightly', 'stable', or undefined for unknown prerelease types
 */
export function getPrereleaseType(
  version: string,
): 'alpha' | 'beta' | 'nightly' | 'stable' | undefined {
  const parsed = parseSemver(version);
  if (!parsed || parsed.prerelease.length === 0) {
    return 'stable';
  }
  const prereleaseType = parsed.prerelease[0];
  if (prereleaseType === 'alpha' || prereleaseType === 'beta' || prereleaseType === 'nightly') {
    return prereleaseType;
  }
  // Silently ignore unknown prerelease types
  return undefined;
}

/**
 * Extract Chromium milestone (major version) from a Chrome version string.
 * @param chromeString - Chrome version string like "116.0.5845.190"
 * @returns Chromium milestone like 116
 */
export function extractChromiumMilestone(chromeString: string): number {
  const milestone = parseInt(chromeString.split('.')[0], 10);
  if (isNaN(milestone)) {
    throw new Error(`Invalid Chrome version string: ${chromeString}`);
  }
  return milestone;
}
