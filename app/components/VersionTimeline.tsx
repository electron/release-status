type VersionTimelineProps = {
  fromVersion: string;
  toVersion: string;
  versionsBetween: string[];
};

export const VersionTimeline = ({
  fromVersion,
  toVersion,
  versionsBetween,
}: VersionTimelineProps) => {
  return (
    <div className="relative">
      <div className="overflow-x-auto pb-4 hide-scrollbar">
        <div className="flex items-center min-w-max px-5 justify-center">
          <div className="flex flex-col items-center mr-2">
            <div className="w-4 h-4 rounded-full bg-blue-500"></div>
            <span className="text-xs font-medium mt-1 text-blue-600 dark:text-blue-400 whitespace-nowrap">
              {fromVersion}
            </span>
          </div>

          <div className="h-0.5 w-4 bg-gray-300 dark:bg-gray-700"></div>

          <div className="flex items-center">
            {versionsBetween.map((version) => (
              <div key={version} className="flex items-center">
                <div className="flex flex-col items-center mx-1">
                  <div className={`w-2 h-2 rounded-full bg-purple-500`}></div>
                  <span className="text-[10px] font-medium mt-1 text-purple-600 dark:text-purple-400 whitespace-nowrap">
                    v{version}
                  </span>
                </div>
                <div className="h-0.5 w-4 bg-gray-300 dark:bg-gray-700"></div>
              </div>
            ))}
          </div>

          <div className="flex flex-col items-center ml-2">
            <div className="w-4 h-4 rounded-full bg-green-500"></div>
            <span className="text-xs font-medium mt-1 text-green-600 dark:text-green-400 whitespace-nowrap">
              {toVersion}
            </span>
          </div>
        </div>
      </div>

      <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white dark:from-gray-800 to-transparent pointer-events-none"></div>
      <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white dark:from-gray-800 to-transparent pointer-events-none"></div>
    </div>
  );
};
