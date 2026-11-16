import { GitBranch, Info } from 'lucide-react';

export const NoBackports = () => (
  <div className="flex flex-col items-center justify-center py-10 px-6 text-center gap-1.5">
    <div className="w-10 h-10 rounded-panel lu-squircle bg-fill flex items-center justify-center mb-2 text-ink-muted">
      <GitBranch className="w-5 h-5" />
    </div>
    <h4 className="t-headline text-ink">No backports requested</h4>
    <p className="text-ink-muted max-w-sm [text-wrap:balance] mb-4">
      This pull request doesn&apos;t have any backports requested or created for older release
      branches.
    </p>
    <div className="lu-callout max-w-lg text-left">
      <Info className="w-4 h-4" />
      <div>
        <p className="font-medium text-ink mb-0.5">What are backports?</p>
        <p>
          Backports are copies of changes made to the main branch that are applied to older release
          branches. They ensure that bug fixes and important changes are available in maintained
          older versions of Electron.
        </p>
      </div>
    </div>
  </div>
);
