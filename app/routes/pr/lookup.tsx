import type { LoaderFunctionArgs, MetaFunction } from '@remix-run/node';
import { Link, useLoaderData, useNavigate, useNavigation } from '@remix-run/react';
import { SiGithub } from '@icons-pack/react-simple-icons';
import { getRecentPRs } from '~/data/github-data';
import { useCallback, useState } from 'react';
import { ExternalLink, Search } from 'lucide-react';
import { prettyDateString } from '~/helpers/time';
import { guessTimeZoneFromRequest } from '~/helpers/timezone';

export const meta: MetaFunction = () => {
  return [
    { title: `Electron PR Lookup` },
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
    args.context.cacheControl = 'private, max-age=60';
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

    const prNumber = parseInt(searchQuery, 10);
    if (isNaN(prNumber) || `${prNumber}` !== searchQuery) {
      setSearchQuery('');
      return;
    }

    navigate(`/pr/${prNumber}`);
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
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
        <h2 className="text-3xl font-bold text-[#2f3241] dark:text-white flex items-center gap-2">
          <Search className="w-7 h-7" />
          PR Lookup
        </h2>
        <div className="flex items-center gap-2">
          <Link
            to="https://github.com/electron/electron/pulls"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm font-medium text-[#2f3241] dark:text-white bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 transition-colors"
          >
            <SiGithub className="w-4 h-4" />
            View All PRs
          </Link>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden mb-8">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-[#2f3241] dark:text-white mb-4">
            Find Pull Request
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Enter a PR number to find information about a specific pull request, including which
            Electron versions it was included in.
          </p>

          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-grow">
              <div className="relative">
                <input
                  type="number"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Enter PR number (e.g. 46793)"
                  className="w-full px-4 py-3 pl-10 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-[#2f3241] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2f3241] dark:focus:ring-[#9feaf9]"
                  onKeyDown={onKeyDown}
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              </div>
            </div>
            <button
              disabled={isLoading}
              className="px-6 py-3 bg-[#2f3241] hover:bg-[#47496b] dark:bg-[#9feaf9] dark:hover:bg-[#8ad9e8] text-white dark:text-[#2f3241] font-medium rounded-lg transition-colors disabled:opacity-70"
              onClick={lookupPR}
            >
              Lookup
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          <h3 className="text-lg font-semibold text-[#2f3241] dark:text-white">
            Recent Pull Requests
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  PR Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Author
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  GitHub
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {recentPRs.map((pr) => (
                <tr
                  key={pr.number}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[#2f3241] dark:text-white">
                    <Link
                      to={`/pr/${pr.number}`}
                      className="hover:text-[#9feaf9] transition-colors"
                      prefetch="intent"
                    >
                      #{pr.number}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300 max-w-md truncate">
                    {pr.title}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {pr.author}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {pr.createdAt}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link
                      to={pr.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#2f3241] dark:text-[#9feaf9] hover:text-[#47496b] dark:hover:text-white transition-colors"
                    >
                      <ExternalLink className="w-4 h-4 inline" />
                    </Link>
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
