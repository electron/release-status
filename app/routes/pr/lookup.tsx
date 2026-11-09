import type { LoaderFunctionArgs, MetaFunction } from 'react-router';
import { Link, useLoaderData, useNavigate, useNavigation } from 'react-router';
import { SiGithub } from '@icons-pack/react-simple-icons';
import { PageHeader } from '~/components/PageHeader';
import { getRecentPRs } from '~/data/github-data';
import { useCallback, useState } from 'react';
import { ExternalLink, Search } from 'lucide-react';
import { prettyDateString } from '~/helpers/time';
import { guessTimeZoneFromRequest } from '~/helpers/timezone';

export const meta: MetaFunction = () => {
  return [
    { title: `PR Lookup | Electron Releases` },
    {
      name: 'description',
      content: `Lookup recent pull requests in Electron, including their details and which Electron versions they were included in.`,
    },
  ];
};

export const loader = async (args: LoaderFunctionArgs) => {
  let recentPRs = await getRecentPRs();
  if (recentPRs) {
    recentPRs = recentPRs.map((pr) => ({
      ...pr,
      createdAt: prettyDateString(pr.createdAt, guessTimeZoneFromRequest(args.request)),
    }));
    args.context.cacheControl = 'public, max-age=60, s-maxage=120, stale-while-revalidate=60';
  }
  return recentPRs ?? [];
};

export default function PRLookup() {
  const [searchQuery, setSearchQuery] = useState('');
  const isLoading = useNavigation().state === 'loading';
  const navigate = useNavigate();

  const recentPRs = useLoaderData<typeof loader>();

  const lookupPR = useCallback(() => {
    if (!searchQuery) return;

    let prNumber = parseInt(searchQuery, 10);
    if (!isNaN(prNumber) && `${prNumber}` === searchQuery) {
      navigate(`/pr/${prNumber}`);
      return;
    }

    const prNumberMatch = /^https:\/\/github\.com\/electron\/electron\/pull\/([0-9]+)$/.exec(
      searchQuery.trim(),
    );
    if (prNumberMatch) {
      prNumber = parseInt(prNumberMatch[1], 10);
      if (!isNaN(prNumber)) {
        navigate(`/pr/${prNumber}`);
        return;
      }
    }

    setSearchQuery('');
  }, [navigate, searchQuery]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        lookupPR();
      }
    },
    [lookupPR],
  );

  return (
    <div>
      <PageHeader
        title="PR lookup"
        subtitle={
          <p className="t-lead text-ink-muted max-w-xl">
            Find which Electron versions a pull request shipped in, and where its backports landed.
          </p>
        }
        actionButton={
          <Link
            to="https://github.com/electron/electron/pulls"
            target="_blank"
            rel="noopener noreferrer"
            className="lu-button lu-button-secondary"
          >
            <SiGithub size={14} />
            View all PRs
          </Link>
        }
      />

      <div className="lu-card p-5 md:p-6 mb-8">
        <label htmlFor="pr-number" className="t-headline text-ink block mb-1">
          Find a pull request
        </label>
        <p className="text-ink-muted mb-5">
          Enter a PR number to see the pull request, its release status and its backports.
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="lu-field-box lu-field-box-lg flex-grow">
            <Search className="w-4 h-4 text-ink-faint flex-none" />
            <input
              id="pr-number"
              type="tel"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="PR number, e.g. 46793"
              className="flex-1 min-w-0 bg-transparent outline-none border-0 p-0 placeholder:text-ink-faint t-tabular"
              onKeyDown={onKeyDown}
            />
            <span className="hidden sm:inline-flex items-center gap-1 text-ink-faint t-dense">
              <kbd className="lu-kbd">↵</kbd>
            </span>
          </div>
          <button
            disabled={isLoading}
            className="lu-button lu-button-primary h-10 px-6"
            onClick={lookupPR}
          >
            <Search className="w-4 h-4" />
            Look up
          </button>
        </div>
      </div>

      <div className="lu-card overflow-hidden">
        <div className="px-5 md:px-6 h-12 flex items-center lu-hairline-b">
          <h3 className="t-headline text-ink">Recent pull requests</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="lu-table">
            <thead>
              <tr>
                <th className="w-[110px]">Number</th>
                <th>Title</th>
                <th className="w-[150px]">Author</th>
                <th className="w-[200px]">Created</th>
                <th className="w-[64px]"></th>
              </tr>
            </thead>
            <tbody>
              {recentPRs.map((pr) => (
                <tr key={pr.number}>
                  <td>
                    <Link
                      to={`/pr/${pr.number}`}
                      className="pl-6 pr-4 h-12 flex items-center text-ink font-medium t-tabular hover:text-accent transition-colors"
                      prefetch="intent"
                    >
                      #{pr.number}
                    </Link>
                  </td>
                  <td className="!whitespace-normal">
                    <Link
                      to={`/pr/${pr.number}`}
                      className="px-4 py-3 block text-ink line-clamp-1"
                      prefetch="intent"
                      dangerouslySetInnerHTML={{ __html: pr.title }}
                    ></Link>
                  </td>
                  <td>
                    <span className="px-4 flex items-center gap-2">
                      <img
                        src={`https://github.com/${pr.author}.png?size=40`}
                        alt=""
                        className="w-5 h-5 rounded-full bg-fill"
                        loading="lazy"
                      />
                      {pr.author}
                    </span>
                  </td>
                  <td>
                    <span className="px-4 t-tabular">{pr.createdAt}</span>
                  </td>
                  <td>
                    <span className="px-3 flex justify-end">
                      <Link
                        to={pr.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="lu-button lu-button-ghost lu-button-sm lu-button-icon"
                        aria-label="Open on GitHub"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
