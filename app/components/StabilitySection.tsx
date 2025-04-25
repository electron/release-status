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

const stabilityColors = {
  stable: 'bg-green-500',
  prerelease: 'bg-yellow-500',
  nightly: 'bg-purple-500',
};

export function StabilitySection({
  stability,
  releases,
  missingTitle,
  missingMessage,
  timeZone,
}: StabilitySectionProps) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <div className={`${stabilityColors[stability]} w-2 h-2 rounded-full`}></div>
        <h3 className="text-xl font-semibold text-[#2f3241] dark:text-white">
          {stabilityNames[stability]}
        </h3>
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
