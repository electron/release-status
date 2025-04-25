import type { LoaderFunctionArgs, MetaFunction } from '@remix-run/node';
import { Link, redirect, useLoaderData, useParams } from '@remix-run/react';
import { SiGithub } from '@icons-pack/react-simple-icons';
import { getPRDetails } from '~/data/github-data';
import {
  ArrowUpRight,
  Calendar,
  Clock,
  CornerDownRight,
  GitBranch,
  GitMerge,
  GitPullRequest,
  Info,
  MessageSquare,
  Plane,
  Tag,
  User,
  X,
} from 'lucide-react';
import { PageHeader } from '~/components/PageHeader';
import { SemverBlock } from '~/components/SemverBlock';
import { NoBackports } from '~/components/NoBackports';
import { guessTimeZoneFromRequest } from '~/helpers/timezone';
import { prettyDateString } from '~/helpers/time';

export const meta: MetaFunction = (args) => {
  return [
    { title: `Electron PR #${args.params.number}` },
    {
      name: 'description',
      content: `Details about Electron PR #${args.params.number}, including its status, author, and which Electron versions it was included in.`,
    },
  ];
};

export const loader = async (args: LoaderFunctionArgs) => {
  const { number } = args.params;
  if (
    !number ||
    isNaN(parseInt(number, 10)) ||
    parseInt(number) <= 0 ||
    `${parseInt(number, 10)}` !== number
  ) {
    return redirect('/pr-lookup');
  }

  let pr = await getPRDetails(parseInt(number, 10));
  if (pr) {
    const timeZone = guessTimeZoneFromRequest(args.request);

    pr = {
      ...pr,
      backports:
        pr.backports?.map((b) => ({
          ...b,
          mergedAt: b.mergedAt ? prettyDateString(b.mergedAt, timeZone) : null,
          releasedAt: b.releasedAt ? prettyDateString(b.releasedAt, timeZone) : null,
        })) || null,
      backportOf: pr.backportOf
        ? {
            ...pr.backportOf,
            mergedAt: pr.backportOf.mergedAt
              ? prettyDateString(pr.backportOf.mergedAt, timeZone)
              : null,
          }
        : null,
      createdAt: prettyDateString(pr.createdAt, timeZone),
      mergedAt: pr.mergedAt ? prettyDateString(pr.mergedAt, timeZone) : null,
    };
    args.context.cacheControl = 'private, max-age=60';
  }
  return pr;
};

const getStatusColor = (
  status: 'merged' | 'open' | 'closed' | 'pending' | 'not-needed' | 'in-flight',
) => {
  switch (status) {
    case 'merged':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
    case 'open':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    case 'closed':
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
    case 'in-flight':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
    case 'not-needed':
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
  }
};

const getStatusIcon = (
  status: 'merged' | 'open' | 'closed' | 'pending' | 'not-needed' | 'in-flight',
) => {
  switch (status) {
    case 'merged':
      return <GitMerge className="w-3.5 h-3.5 mr-1" />;
    case 'open':
      return <GitPullRequest className="w-3.5 h-3.5 mr-1" />;
    case 'closed':
      return <X className="w-3.5 h-3.5 mr-1" />;
    case 'pending':
      return <Clock className="w-3.5 h-3.5 mr-1" />;
    case 'not-needed':
      return <Info className="w-3.5 h-3.5 mr-1" />;
    case 'in-flight':
      return <Plane className="w-3.5 h-3.5 mr-1" />;
    default:
      return null;
  }
};

const getSemverBadgeStyle = (semver: 'major' | 'minor' | 'patch' | 'none' | null) => {
  switch (semver) {
    case 'major':
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800';
    case 'minor':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800';
    case 'patch':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800';
    case 'none':
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600';
  }
};

export default function PRDetails() {
  const prData = useLoaderData<typeof loader>();
  const { number } = useParams();

  const prState = prData ? (prData.merged ? 'merged' : prData.state) : 'pending';

  const backportOfState = prData?.backportOf
    ? prData.backportOf.merged
      ? 'merged'
      : prData.backportOf.state
    : 'pending';

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader
        backTo={{
          to: '/pr-lookup',
          name: 'PR Lookup',
        }}
        actionButton={
          prData && (
            <Link
              to={prData.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm font-medium text-[#2f3241] dark:text-white bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 transition-colors"
            >
              <SiGithub className="w-4 h-4" />
              View on GitHub
            </Link>
          )
        }
      />

      {prData ? (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-6">
              {prData.backportOf && (
                <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CornerDownRight className="w-5 h-5 text-blue-500 dark:text-blue-400" />
                    <span className="font-medium text-blue-700 dark:text-blue-300">
                      This is a backport PR for branch {prData.targetBranch}
                    </span>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <img
                    src={prData.authorAvatar || '/placeholder.svg'}
                    alt={prData.author}
                    className="w-12 h-12 rounded-full border border-gray-200 dark:border-gray-700"
                  />
                </div>
                <div className="flex-grow">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-2">
                    <h2 className="text-2xl font-bold text-[#2f3241] dark:text-white">
                      #{prData.number}: {prData.title}
                    </h2>
                    <div className="flex items-center">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                          prState,
                        )}`}
                      >
                        {getStatusIcon(prState)}
                        {prState.charAt(0).toUpperCase() + prState.slice(1)}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-500 dark:text-gray-400 mb-4">
                    <div className="flex items-center gap-1">
                      <User className="w-4 h-4" />
                      {prData.authorUrl ? (
                        <Link
                          to={prData.authorUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-[#2f3241] dark:text-white hover:text-[#9feaf9] transition-colors"
                        >
                          {prData.author}
                        </Link>
                      ) : (
                        prData.author
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>Created: {prData.createdAt}</span>
                    </div>
                    {prData.merged && (
                      <div className="flex items-center gap-1">
                        <GitMerge className="w-4 h-4" />
                        <span>Merged: {prData.mergedAt}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <MessageSquare className="w-4 h-4" />
                      <span>{prData.comments} comments</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <GitBranch className="w-4 h-4" />
                      <span>Target: {prData.targetBranch}</span>
                    </div>
                  </div>

                  <div
                    className="text-gray-700 dark:text-gray-300 mb-4"
                    dangerouslySetInnerHTML={{ __html: prData.body }}
                  ></div>
                  <div className="flex flex-wrap gap-2">
                    {prData.releasedIn ? (
                      <Link
                        to={`/release/v${prData.releasedIn}`}
                        className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-800/30 transition-colors"
                        prefetch="intent"
                      >
                        <Tag className="w-3.5 h-3.5 mr-1" />
                        Released in v{prData.releasedIn}
                      </Link>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {prData.backportOf ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                <h3 className="text-lg font-semibold text-[#2f3241] dark:text-white flex items-center gap-2">
                  <GitBranch className="w-5 h-5" />
                  Backport Information
                </h3>
              </div>
              <div className="p-6">
                <div className="flex flex-col space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-blue-100 dark:bg-blue-900/30 rounded-full">
                      <CornerDownRight className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-grow">
                      <p className="text-sm text-gray-500 dark:text-gray-400">Backported from</p>
                      <Link
                        to={`/pr/${prData.backportOf.number}`}
                        className="text-lg font-medium text-[#2f3241] dark:text-white hover:text-[#9feaf9] transition-colors"
                        prefetch="intent"
                      >
                        #{prData.backportOf.number}: {prData.backportOf.title}
                      </Link>
                    </div>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-900/20 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                          Original PR Author
                        </div>
                        {prData.backportOf.authorUrl ? (
                          <Link
                            to={prData.backportOf.authorUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium text-[#2f3241] dark:text-[#9feaf9] hover:underline flex items-center gap-1"
                          >
                            <User className="w-3.5 h-3.5" />
                            {prData.backportOf.author}
                          </Link>
                        ) : (
                          <>
                            <User className="w-3.5 h-3.5" />
                            {prData.backportOf.author}
                          </>
                        )}
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                          Original PR Status
                        </div>
                        <div className="text-sm">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(
                              backportOfState,
                            )}`}
                          >
                            {getStatusIcon(backportOfState)}
                            {backportOfState.charAt(0).toUpperCase() + backportOfState.slice(1)}
                          </span>
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                          Original PR Merged At
                        </div>
                        <div className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-1">
                          <GitMerge className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                          {prData.backportOf.mergedAt}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                          Original PR Link
                        </div>
                        <Link
                          to={prData.backportOf.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-[#2f3241] dark:text-[#9feaf9] hover:underline flex items-center gap-1"
                        >
                          <SiGithub className="w-3.5 h-3.5" />
                          View on GitHub
                          <ArrowUpRight className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {prData.backports ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-[#2f3241] dark:text-white flex items-center gap-2">
                  <GitBranch className="w-5 h-5" />
                  Backports
                </h3>
              </div>

              <div className="p-6">
                {prData.backports.length ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {prData.backports.map((backport, index) => (
                      <div
                        key={index}
                        className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <GitBranch className="w-5 h-5 text-[#2f3241] dark:text-[#9feaf9]" />
                            <span className="font-medium text-[#2f3241] dark:text-white">
                              {backport.targetBranch}
                            </span>
                          </div>
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                              backport.state,
                            )}`}
                          >
                            {getStatusIcon(backport.state)}
                            {backport.state.charAt(0).toUpperCase() + backport.state.slice(1)}
                          </span>
                        </div>

                        {backport.state === 'merged' && (
                          <>
                            <div className="grid grid-cols-2 gap-2 mb-3">
                              <div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                                  PR Number
                                </div>
                                <Link
                                  to={`/pr/${backport.backportPRNumber}`}
                                  className="text-sm font-medium text-[#2f3241] dark:text-[#9feaf9] hover:underline"
                                  prefetch="intent"
                                >
                                  #{backport.backportPRNumber}
                                </Link>
                              </div>
                              <div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                                  Merged At
                                </div>
                                <div className="text-sm text-gray-700 dark:text-gray-300">
                                  {backport.mergedAt}
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                                  Released In
                                </div>
                                {backport.releasedIn ? (
                                  <Link
                                    to={`/release/v${backport.releasedIn}`}
                                    className="text-sm font-medium text-[#2f3241] dark:text-[#9feaf9] hover:underline"
                                    prefetch="intent"
                                  >
                                    v{backport.releasedIn}
                                  </Link>
                                ) : (
                                  <div className="text-sm text-gray-700 dark:text-gray-300">
                                    Not yet
                                  </div>
                                )}
                              </div>
                              <div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                                  Release Date
                                </div>
                                <div className="text-sm text-gray-700 dark:text-gray-300">
                                  {backport.releasedAt || 'Not yet'}
                                </div>
                              </div>
                            </div>
                          </>
                        )}

                        {backport.state === 'pending' && (
                          <div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                              PR Number
                            </div>
                            <Link
                              to={`/pr/${backport.backportPRNumber}`}
                              className="text-sm font-medium text-[#2f3241] dark:text-[#9feaf9] hover:underline"
                              prefetch="intent"
                            >
                              #{backport.backportPRNumber}
                            </Link>
                            <div className="mt-2 text-sm text-yellow-600 dark:text-yellow-400 flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              <span>{backport.pendingReason}</span>
                            </div>
                          </div>
                        )}

                        {backport.state === 'in-flight' && (
                          <div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                              PR Number
                            </div>
                            <Link
                              to={`/pr/${backport.backportPRNumber}`}
                              className="text-sm font-medium text-[#2f3241] dark:text-[#9feaf9] hover:underline"
                              prefetch="intent"
                            >
                              #{backport.backportPRNumber}
                            </Link>
                            <div className="mt-2 text-sm text-blue-600 dark:text-blue-400 flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              <span>Waiting to be merged</span>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <NoBackports />
                )}
              </div>
            </div>
          ) : null}

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
              <h3 className="text-lg font-semibold text-[#2f3241] dark:text-white flex items-center gap-2">
                <Tag className="w-5 h-5" />
                Semver Impact
              </h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <SemverBlock
                  activeStyle={getSemverBadgeStyle('major')}
                  isActive={prData.semver === 'major'}
                  title="Major"
                  description="Breaking changes"
                />
                <SemverBlock
                  activeStyle={getSemverBadgeStyle('minor')}
                  isActive={prData.semver === 'minor'}
                  title="Minor"
                  description="New features"
                />
                <SemverBlock
                  activeStyle={getSemverBadgeStyle('patch')}
                  isActive={prData.semver === 'patch'}
                  title="Patch"
                  description="Bug fixes"
                />
                <SemverBlock
                  activeStyle={getSemverBadgeStyle('none')}
                  isActive={prData.semver === 'none'}
                  title="None"
                  description="Docs, tests, etc."
                />
              </div>
              <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                <p>
                  <strong>Semantic Versioning</strong> helps users understand the impact of updates:
                </p>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li>
                    <strong>Major (X.y.z):</strong> Breaking changes that may require code
                    modifications
                  </li>
                  <li>
                    <strong>Minor (x.Y.z):</strong> New features that maintain backward
                    compatibility
                  </li>
                  <li>
                    <strong>Patch (x.y.Z):</strong> Bug fixes that don&apos;t change the API
                  </li>
                  <li>
                    <strong>None:</strong> Changes that don&apos;t affect using facing parts of
                    Electron
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden p-12">
          <div className="flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
              <X className="w-8 h-8 text-gray-500 dark:text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-[#2f3241] dark:text-white mb-2">
              PR Not Found
            </h3>
            <p className="text-gray-500 dark:text-gray-400 text-center mb-6">
              We couldn&apos;t find a pull request with the number #{number}.
            </p>
            <Link
              to="/pr-lookup"
              className="px-4 py-2 bg-[#2f3241] hover:bg-[#47496b] dark:bg-[#9feaf9] dark:hover:bg-[#8ad9e8] text-white dark:text-[#2f3241] font-medium rounded-lg transition-colors"
              prefetch="intent"
            >
              Return to PR Lookup
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
