import { Check, Copy } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

type InstallCommandProps = {
  version: string;
  name: string;
  prefix: string;
};

export const InstallCommand = ({ name, prefix, version }: InstallCommandProps) => {
  const isNightly = version.includes('nightly');
  const installString = `${prefix} electron@${isNightly ? 'npm:electron-nightly@' : ''}${version.slice(1)}`;

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
      }, 3_000);
    },
    [installString],
  );

  useEffect(() => {
    return () => {
      clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <div className="lu-card p-1.5">
      <div className="flex items-center justify-between pl-3 pr-1 h-8">
        <span className="t-caption text-ink-muted">{name}</span>
        <button
          className="lu-button lu-button-ghost lu-button-sm lu-button-icon"
          onClick={copyCommand}
          aria-label={`Copy ${name} command`}
        >
          {recentlyCopied ? (
            <Check className="w-3.5 h-3.5 text-success" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
        </button>
      </div>
      <div className="lu-well px-3.5 py-3 t-code text-[12.5px] text-ink overflow-x-auto whitespace-nowrap">
        <span className="text-ink-faint select-none">$ </span>
        {installString}
      </div>
    </div>
  );
};
