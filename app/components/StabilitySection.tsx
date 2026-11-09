import { ElectronRelease } from '~/data/release-data';
import { ReleaseTable } from './ReleaseTable';

type StabilitySectionProps = {
  stability: keyof typeof stabilityNames;
  releases: (ElectronRelease | undefined)[];
  missingTitle?: string;
  missingMessage?: string;
  timeZone: string;
};

const stabilityNames = {
  stable: 'Stable',
  prerelease: 'Prerelease',
  nightly: 'Nightly',
};

// Lucent tones: success for stable, warning for pre-release, accent for nightly.
export const stabilityTones = {
  stable: 'success',
  prerelease: 'warning',
  nightly: 'accent',
} as const;

export function StabilitySection({
  stability,
  releases,
  missingTitle,
  missingMessage,
  timeZone,
}: StabilitySectionProps) {
  return (
    <section>
      <div className="flex items-center gap-2.5 mb-3 px-1">
        <span className="lu-dot" data-tone={stabilityTones[stability]} />
        <h3 className="t-headline text-ink">{stabilityNames[stability]}</h3>
      </div>
      <ReleaseTable
        releases={releases}
        missingMessage={missingMessage}
        missingTitle={missingTitle}
        timeZone={timeZone}
      />
    </section>
  );
}
