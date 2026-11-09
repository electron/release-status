import { useNavigation } from 'react-router';
import { useCallback, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

type PaginationProps = {
  page: number;
  maxPage: number;
  setPage: (page: number) => void;
};

type ButtonProps = {
  isDisabled: boolean;
  children: React.ReactNode;
  onClick: () => void;
};

const Button = ({ children, isDisabled, onClick }: ButtonProps) => {
  return (
    <button
      className="lu-button lu-button-secondary"
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
    <div className="flex items-center justify-between mt-6">
      <div className="flex items-center gap-2">
        <Button isDisabled={page === 1} onClick={prev}>
          <ChevronLeft className="w-3.5 h-3.5 -ml-1" />
          Previous
        </Button>
      </div>
      <div className="lu-segmented">
        {pagesToRender.map((p, index) => {
          if (p === '...') {
            return (
              <span
                key={`...${index}`}
                className="w-6 md:w-8 flex items-center justify-center text-ink-faint t-dense"
              >
                …
              </span>
            );
          }
          return (
            <button
              key={p}
              className="lu-segment min-w-8 !px-2 t-tabular"
              data-selected={p === page}
              aria-current={p === page ? 'page' : undefined}
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
          <ChevronRight className="w-3.5 h-3.5 -mr-1" />
        </Button>
      </div>
    </div>
  );
};
