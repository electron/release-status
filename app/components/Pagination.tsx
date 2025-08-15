import { useNavigation } from '@remix-run/react';
import { useCallback, useMemo } from 'react';

type PaginationProps = {
  page: number;
  maxPage: number;
  setPage: (page: number) => void;
};

type ButtonProps = {
  isDisabled: boolean;
  children: string;
  onClick: () => void;
};

const Button = ({ children, isDisabled, onClick }: ButtonProps) => {
  return (
    <button
      className={`px-1 sm:px-2 md:px-4 py-1 sm:py-2 text-sm font-medium rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 transition-colors ${
        isDisabled ? 'cursor-not-allowed opacity-50' : 'hover:bg-gray-50 dark:hover:bg-gray-700'
      }`}
      disabled={isDisabled}
      onClick={isDisabled ? undefined : onClick}
    >
      {children}
    </button>
  );
};

const PAGE_DELTA = 2;

export const Pagination = ({ page, maxPage, setPage }: PaginationProps) => {
  const prev = useCallback(() => setPage(page - 1), [page, setPage]);
  const next = useCallback(() => setPage(page + 1), [page, setPage]);

  const isLoading = useNavigation().state === 'loading';

  const pagesToRender = useMemo(() => {
    const pages: ('...' | number)[] = [];

    const start = Math.max(1, page - PAGE_DELTA);
    const end = Math.min(maxPage, page + PAGE_DELTA);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    // Add first page if not in range
    if (start > 2) {
      pages.unshift('...');
      pages.unshift(1);
    } else if (start === 2) {
      pages.unshift(1);
    }

    // Add last page if not in range
    if (end < maxPage - 1) {
      pages.push('...' as const);
      pages.push(maxPage);
    } else if (end === maxPage - 1) {
      pages.push(maxPage);
    }

    return pages;
  }, [maxPage, page]);

  return (
    <div className="flex items-center justify-between mt-8">
      <div className="flex items-center gap-2">
        <Button isDisabled={page === 1} onClick={prev}>
          Previous
        </Button>
      </div>
      <div className="flex items-center gap-1">
        {pagesToRender.map((p, index) => {
          if (p === '...') {
            return (
              <span
                key={`...${index}`}
                className="md:w-8 h-8 flex items-center justify-center text-gray-500 dark:text-gray-400"
              >
                ...
              </span>
            );
          }
          const className =
            p === page
              ? 'w-8 h-7 md:h-8 flex items-center justify-center rounded-md bg-[#2f3241] text-white text-sm font-medium'
              : `w-8 h-7 md:h-8 flex items-center justify-center rounded-md ${
                  isLoading ? '' : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                } text-gray-700 dark:text-gray-300 text-sm font-medium transition-colors`;
          return (
            <button
              key={p}
              className={`${className} ${isLoading ? 'cursor-not-allowed opacity-50' : ''}`}
              onClick={p === page ? undefined : () => setPage(p)}
              disabled={isLoading}
            >
              {p}
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-2">
        <Button isDisabled={page === maxPage} onClick={next}>
          Next
        </Button>
      </div>
    </div>
  );
};
