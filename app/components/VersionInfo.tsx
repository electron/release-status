import { IconType } from '@icons-pack/react-simple-icons';
import { Link } from '@remix-run/react';
import { ArrowDown, ArrowRight } from 'lucide-react';

type VersionInfoProps = {
  version: string;
  compareVersion?: string;
  name: string;
  icon: IconType;
  iconColor: string;
  href?: string;
  compareHref?: string;
};

export const VersionInfo = ({
  version,
  compareVersion,
  name,
  icon,
  iconColor,
  href,
  compareHref,
}: VersionInfoProps) => {
  const Icon = icon;
  return (
    <div className="flex flex-col items-center md:items-start gap-1">
      <div className="flex items-center gap-2">
        <Icon
          className="text-base font-medium text-[#2f3241] dark:text-white"
          height={20}
          color={iconColor}
        />
        <span className="text-sm text-gray-500 dark:text-gray-400">{name}</span>
      </div>

      <span className="md:pl-8 text-base font-medium text-[#2f3241] dark:text-white">
        {href ? (
          <Link
            to={href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-[#0366d6] dark:text-[#58a6ff] hover:text-[#0550ae] dark:hover:text-[#9feaf9] transition-colors underline decoration-dotted underline-offset-2"
          >
            {version}
          </Link>
        ) : (
          version
        )}
      </span>

      {compareVersion ? (
        <div className="flex items-center gap-2 md:pl-8 md:flex-row flex-col">
          <ArrowRight className="w-4 h-4 text-gray-400 dark:text-gray-500 md:block hidden" />
          <ArrowDown className="w-4 h-4 text-gray-400 dark:text-gray-500 md:hidden block" />
          <span className="text-base font-medium text-[#2f3241] dark:text-white">
            {compareHref ? (
              <Link
                to={compareHref}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-[#0366d6] dark:text-[#58a6ff] hover:text-[#0550ae] dark:hover:text-[#9feaf9] transition-colors underline decoration-dotted underline-offset-2"
              >
                {compareVersion}
              </Link>
            ) : (
              compareVersion
            )}
          </span>
          {compareVersion === version ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
              No Change
            </span>
          ) : (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
              Updated
            </span>
          )}
        </div>
      ) : null}
    </div>
  );
};
