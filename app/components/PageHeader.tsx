import { Link } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import React from 'react';

type PageHeaderProps = {
  backTo?: {
    to: string;
    name: string;
  };
  title?: string;
  titleTags?: React.ReactNode[];
  subtitle?: React.ReactNode;
  actionButton?: React.ReactNode;
};

export const PageHeader = ({
  backTo,
  actionButton,
  title,
  titleTags,
  subtitle,
}: PageHeaderProps) => {
  return (
    <div className="flex flex-col gap-3 mb-8">
      {backTo ? (
        <div>
          <Link
            to={backTo.to}
            className="lu-button lu-button-ghost lu-button-sm -ml-3"
            prefetch="intent"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to {backTo.name}
          </Link>
        </div>
      ) : null}
      <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-4">
        {title ? (
          <div className="flex flex-col gap-2 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="t-page text-ink">{title}</h2>
              {titleTags}
            </div>
            {subtitle}
          </div>
        ) : null}
        {actionButton ? <div className="flex items-center gap-2 flex-none">{actionButton}</div> : null}
      </div>
    </div>
  );
};
