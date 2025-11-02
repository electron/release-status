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
 * Extract Node.js major.minor version from a Node version string.
 * @param nodeString - Node version string like "20.11.1" or "22.14.0"
 * @returns Node version in "major.minor" format like "20.11"
 */
export function extractNodeVersion(nodeString: string): string {
  const parts = nodeString.split('.');
  if (parts.length < 2) {
    throw new Error(`Invalid Node.js version string: ${nodeString}`);
  }
  return `${parts[0]}.${parts[1]}`;
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
