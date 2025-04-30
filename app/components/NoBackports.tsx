import { GitBranch } from 'lucide-react';

export const NoBackports = () => (
  <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
    <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
      <GitBranch className="w-8 h-8 text-gray-400 dark:text-gray-500" />
    </div>
    <h4 className="text-lg font-medium text-[#2f3241] dark:text-white mb-2">
      No Backports Requested
    </h4>
    <p className="text-gray-500 dark:text-gray-400 max-w-md mb-4">
      This pull request doesn&apos;t have any backports requested or created for older release
      branches.
    </p>
    <div className="bg-gray-50 dark:bg-gray-900/20 p-4 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 max-w-lg">
      <p className="mb-2">
        <strong>What are backports?</strong>
      </p>
      <p>
        Backports are copies of changes made to the main branch that are applied to older release
        branches. They ensure that bug fixes and important changes are available in maintained older
        versions of Electron.
      </p>
    </div>
  </div>
);
