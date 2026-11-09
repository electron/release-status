import { IconType } from '@icons-pack/react-simple-icons';
import { Link } from 'react-router';
import { ArrowDown, ArrowUpRight } from 'lucide-react';

type VersionInfoProps = {
  version: string;
  compareVersion?: string;
  name: string;
  icon: IconType;
  iconColor: string;
  href?: string;
  compareHref?: string;
};

const VersionLink = ({ href, version }: { href?: string; version: string }) =>
  href ? (
    <Link
      to={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group inline-flex items-center gap-1 text-ink hover:text-accent transition-colors"
    >
      {version}
      <ArrowUpRight className="w-3.5 h-3.5 text-ink-faint group-hover:text-accent transition-colors" />
    </Link>
  ) : (
    <>{version}</>
  );

export const VersionInfo = ({
  version,
  compareVersion,
  name,
  icon,
  href,
  compareHref,
}: VersionInfoProps) => {
  const Icon = icon;
  return (
    <div className="flex flex-col gap-1.5 min-w-0">
      <div className="flex items-center gap-2 text-ink-muted">
        <Icon height={14} width={14} color="currentColor" />
        <span className="t-caption">{name}</span>
      </div>

      <span className="font-mono text-[15px] leading-5 font-medium text-ink t-tabular break-all">
        <VersionLink href={href} version={version} />
      </span>

      {compareVersion ? (
        <div className="flex items-start gap-2 flex-col">
          <ArrowDown className="w-3.5 h-3.5 text-ink-faint" />
          <span className="font-mono text-[15px] leading-5 font-medium text-ink t-tabular break-all">
            <VersionLink href={compareHref} version={compareVersion} />
          </span>
          {compareVersion === version ? (
            <span className="lu-badge">No change</span>
          ) : (
            <span className="lu-badge" data-tone="accent">
              Updated
            </span>
          )}
        </div>
      ) : null}
    </div>
  );
};
