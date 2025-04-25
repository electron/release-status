import { Check, Copy } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

type InstallCommandProps = {
  version: string;
  name: string;
  prefix: string;
};

export const InstallCommand = ({ name, prefix, version }: InstallCommandProps) => {
  const installString = `${prefix} electron@${version.slice(1)}`;

  const [recentlyCopied, setDidRecentlyCopy] = useState(false);

  const timerRef = useRef<NodeJS.Timeout>();
  const copyCommand = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      navigator.clipboard.writeText(installString);
      setDidRecentlyCopy(true);
      timerRef.current = setTimeout(() => {
        setDidRecentlyCopy(false);
      }, 3000);
    },
    [installString],
  );

  useEffect(() => {
    return () => {
      clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="p-3 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{name}</span>
        <button
          className="text-gray-500 hover:text-[#2f3241] dark:text-gray-400 dark:hover:text-white transition-colors"
          onClick={copyCommand}
        >
          {recentlyCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>
      <div className="p-4 bg-gray-900 text-gray-100 font-mono text-sm overflow-x-auto">
        {installString}
      </div>
    </div>
  );
};
