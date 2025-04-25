import { Link } from '@remix-run/react';
import { ArrowLeft } from 'lucide-react';
import React from 'react';

type PageHeaderProps = {
  backTo?: {
    to: string;
    name: string;
  };
  title?: string;
  titleTags?: React.ReactNode[];
  actionButton?: React.ReactNode;
};

export const PageHeader = ({ backTo, actionButton, title, titleTags }: PageHeaderProps) => {
  return (
    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
      {backTo ? (
        <div className="flex items-center gap-2">
          <Link
            to={backTo.to}
            className="flex items-center gap-1 text-sm font-medium text-[#2f3241] dark:text-white hover:text-[#47496b] dark:hover:text-[#9feaf9] transition-colors"
            prefetch="intent"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to {backTo.name}
          </Link>
        </div>
      ) : null}
      {title ? (
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-bold text-[#2f3241] dark:text-white">{title}</h2>
            {titleTags}
          </div>
        </div>
      ) : null}
      {actionButton ? <div className="flex items-center gap-2">{actionButton}</div> : null}
    </div>
  );
};
