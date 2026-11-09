import type { LoaderFunctionArgs, MetaFunction } from 'react-router';
import { Link, redirect, useLoaderData, useParams } from 'react-router';
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
  X,
} from 'lucide-react';
import { PageHeader } from '~/components/PageHeader';
import { SemverBlock } from '~/components/SemverBlock';
import { NoBackports } from '~/components/NoBackports';
import { textPlainResponse, wantsTextPlain } from '~/helpers/request';
import { guessTimeZoneFromRequest } from '~/helpers/timezone';
import { prettyDateString } from '~/helpers/time';

export const meta: MetaFunction = (args) => {
  return [
    { title: `PR #${args.params.number} | Electron Releases` },
    {
      name: 'description',
      content: `Details about Electron PR #${args.params.number}, including its status, author, and which Electron versions it was included in.`,
    },
  ];
};

export const loader = async (args: LoaderFunctionArgs) => {
  const cacheControl = 'public, max-age=60, s-maxage=120, stale-while-revalidate=60';
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

  if (wantsTextPlain(args.request)) {
    if (!pr) {
      return textPlainResponse(args.context, `# PR #${number}\n\nNot found.\n`, cacheControl);
    }
    const state = pr.merged ? 'merged' : pr.state;
    const lines = [
      `# PR #${pr.number}: ${pr.rawTitle}`,
      '',
      `- State: ${state}`,
      `- Author: ${pr.author}`,
      `- Created: ${pr.createdAt}`,
    ];
    if (pr.mergedAt) lines.push(`- Merged: ${pr.mergedAt}`);
    lines.push(`- Target branch: ${pr.targetBranch}`);
    if (pr.semver) lines.push(`- Semver impact: ${pr.semver}`);
    if (pr.releasedIn) lines.push(`- Released in: v${pr.releasedIn}`);
    lines.push(`- URL: ${pr.url}`, '');

    if (pr.backportOf) {
      const parentState = pr.backportOf.merged ? 'merged' : pr.backportOf.state;
      lines.push(
        '## Backport Of',
        '',
        `- PR: #${pr.backportOf.number}: ${pr.backportOf.rawTitle}`,
        `- Author: ${pr.backportOf.author}`,
        `- State: ${parentState}`,
      );
      if (pr.backportOf.mergedAt) lines.push(`- Merged: ${pr.backportOf.mergedAt}`);
      lines.push(`- URL: ${pr.backportOf.url}`, '');
    }

    if (pr.backports) {
      lines.push('## Backports', '');
      if (pr.backports.length === 0) {
        lines.push('No backports.', '');
      } else {
        lines.push('| Branch | State | PR | Released In |', '| --- | --- | --- | --- |');
        for (const bp of pr.backports) {
          const prRef = bp.backportPRNumber ? `#${bp.backportPRNumber}` : '';
          const released = bp.releasedIn ? `v${bp.releasedIn}` : '';
          lines.push(`| ${bp.targetBranch} | ${bp.state} | ${prRef} | ${released} |`);
        }
        lines.push('');
      }
    }

    lines.push('## Description', '', pr.rawBody.trim(), '');
    return textPlainResponse(args.context, lines.join('\n'), cacheControl);
  }

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
    args.context.cacheControl = cacheControl;
  }
  return pr;
};

type PRStatus = 'merged' | 'open' | 'closed' | 'pending' | 'not-needed' | 'in-flight';

// Lucent tones for a PR's state. Red is for broken things only, so "closed" reads muted.
const getStatusTone = (status: PRStatus) => {
  switch (status) {
    case 'merged':
      return 'accent';
    case 'open':
      return 'success';
    case 'pending':
      return 'warning';
    case 'in-flight':
      return 'accent';
    case 'closed':
    case 'not-needed':
    default:
      return undefined;
  }
};

const getStatusIcon = (status: PRStatus) => {
  switch (status) {
    case 'merged':
      return <GitMerge className="w-3 h-3" />;
    case 'open':
      return <GitPullRequest className="w-3 h-3" />;
    case 'closed':
      return <X className="w-3 h-3" />;
    case 'pending':
      return <Clock className="w-3 h-3" />;
    case 'not-needed':
      return <Info className="w-3 h-3" />;
    case 'in-flight':
      return <Plane className="w-3 h-3" />;
    default:
      return null;
  }
};

const prettyStatus = (status: PRStatus) =>
  status === 'in-flight'
    ? 'In flight'
    : status === 'not-needed'
      ? 'Not needed'
      : status.charAt(0).toUpperCase() + status.slice(1);

const StatusBadge = ({ status, large }: { status: PRStatus; large?: boolean }) => (
  <span className={`lu-badge ${large ? 'lu-badge-lg' : ''}`} data-tone={getStatusTone(status)}>
    {getStatusIcon(status)}
    {prettyStatus(status)}
  </span>
);

const getSemverBadgeStyle = (semver: 'major' | 'minor' | 'patch' | 'none' | null) => {
  switch (semver) {
    case 'major':
      return '!bg-spark-soft text-spark shadow-[inset_0_0_0_0.5px_color-mix(in_srgb,var(--lu-spark)_30%,transparent)]';
    case 'minor':
      return '!bg-[color-mix(in_srgb,var(--lu-warning)_14%,transparent)] text-warning';
    case 'patch':
      return '!bg-[color-mix(in_srgb,var(--lu-success)_14%,transparent)] text-success';
    case 'none':
    default:
      return '!bg-fill-strong text-ink';
  }
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="min-w-0">
    <div className="t-caption text-ink-muted mb-1">{label}</div>
    <div className="text-ink flex items-center gap-1.5 min-w-0">{children}</div>
  </div>
);

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
    <div>
      <PageHeader
        backTo={{
          to: '/pr-lookup',
          name: 'PR lookup',
        }}
      />

      {prData ? (
        <div className="space-y-6 -mt-2">
          <div className="lu-card px-5 md:px-8 py-6 md:py-7">
            {prData.backportOf && (
              <div className="lu-callout mb-5" data-tone="accent">
                <CornerDownRight className="w-4 h-4" />
                <span>
                  This is a backport of{' '}
                  <Link
                    to={`/pr/${prData.backportOf.number}`}
                    className="lu-link"
                    prefetch="intent"
                  >
                    #{prData.backportOf.number}
                  </Link>{' '}
                  for the <span className="font-mono text-[13px]">{prData.targetBranch}</span>{' '}
                  branch.
                </span>
              </div>
            )}
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="t-tabular text-ink-muted t-lead">#{prData.number}</span>
                <StatusBadge status={prState} large />
                {prData.releasedIn ? (
                  <Link
                    to={`/release/v${prData.releasedIn}`}
                    className="lu-badge lu-badge-lg hover:brightness-95"
                    data-tone="success"
                    prefetch="intent"
                  >
                    <Tag className="w-3 h-3" />
                    Released in v{prData.releasedIn}
                  </Link>
                ) : null}
              </div>
              <h2
                className="t-page text-ink [text-wrap:balance]"
                dangerouslySetInnerHTML={{ __html: prData.title }}
              ></h2>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-ink-muted">
                <div className="flex items-center gap-2">
                  <img
                    src={prData.authorAvatar || '/placeholder.svg'}
                    alt=""
                    className="w-5 h-5 rounded-full bg-fill"
                  />
                  {prData.authorUrl ? (
                    <Link
                      to={prData.authorUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-ink hover:text-accent transition-colors"
                    >
                      {prData.author}
                    </Link>
                  ) : (
                    prData.author
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-ink-faint" />
                  <span>Created {prData.createdAt}</span>
                </div>
                {prData.merged && (
                  <div className="flex items-center gap-1.5">
                    <GitMerge className="w-3.5 h-3.5 text-ink-faint" />
                    <span>Merged {prData.mergedAt}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-ink-faint" />
                  <span>{prData.comments} comments</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <GitBranch className="w-3.5 h-3.5 text-ink-faint" />
                  <span className="font-mono text-[12.5px]">{prData.targetBranch}</span>
                </div>
                <Link
                  to={prData.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="lu-button lu-button-secondary lu-button-sm ml-auto"
                >
                  <SiGithub size={12} />
                  View on GitHub
                </Link>
              </div>
            </div>

            <div className="lu-hairline-t mt-6 pt-6">
              <div className="lu-prose" dangerouslySetInnerHTML={{ __html: prData.body }}></div>
            </div>
          </div>

          {prData.backportOf ? (
            <div className="lu-card overflow-hidden">
              <div className="px-5 md:px-6 h-12 flex items-center gap-2 lu-hairline-b">
                <CornerDownRight className="w-4 h-4 text-ink-muted" />
                <h3 className="t-headline text-ink">Backported from</h3>
              </div>
              <div className="p-5 md:p-6 flex flex-col gap-5">
                <Link
                  to={`/pr/${prData.backportOf.number}`}
                  className="group flex items-baseline gap-2 text-ink"
                  prefetch="intent"
                >
                  <span className="t-tabular text-ink-muted">#{prData.backportOf.number}</span>
                  <span
                    className="t-headline group-hover:text-accent transition-colors"
                    dangerouslySetInnerHTML={{ __html: prData.backportOf.title }}
                  ></span>
                </Link>

                <div className="lu-well p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Field label="Author">
                    {prData.backportOf.authorUrl ? (
                      <Link
                        to={prData.backportOf.authorUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium hover:text-accent transition-colors truncate"
                      >
                        {prData.backportOf.author}
                      </Link>
                    ) : (
                      prData.backportOf.author
                    )}
                  </Field>
                  <Field label="Status">
                    <StatusBadge status={backportOfState} />
                  </Field>
                  <Field label="Merged">
                    <span className="t-tabular">{prData.backportOf.mergedAt}</span>
                  </Field>
                  <Field label="Link">
                    <Link
                      to={prData.backportOf.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="lu-link inline-flex items-center gap-1 font-medium"
                    >
                      GitHub
                      <ArrowUpRight className="w-3 h-3" />
                    </Link>
                  </Field>
                </div>
              </div>
            </div>
          ) : null}

          {prData.backports ? (
            <div className="lu-card overflow-hidden">
              <div className="px-5 md:px-6 h-12 flex items-center justify-between lu-hairline-b">
                <div className="flex items-center gap-2">
                  <GitBranch className="w-4 h-4 text-ink-muted" />
                  <h3 className="t-headline text-ink">Backports</h3>
                </div>
                {prData.backports.length ? (
                  <span className="t-dense text-ink-muted t-tabular">
                    {prData.backports.filter((b) => b.state === 'merged').length} of{' '}
                    {prData.backports.length} merged
                  </span>
                ) : null}
              </div>

              {prData.backports.length ? (
                <div className="p-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                  {prData.backports.map((backport, index) => (
                    <div key={index} className="lu-well p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <GitBranch className="w-4 h-4 text-accent" />
                          <span className="font-mono text-[13px] font-medium text-ink">
                            {backport.targetBranch}
                          </span>
                        </div>
                        <StatusBadge status={backport.state} />
                      </div>

                      {backport.state === 'merged' && (
                        <div className="grid grid-cols-2 gap-x-3 gap-y-3">
                          <Field label="PR">
                            <Link
                              to={`/pr/${backport.backportPRNumber}`}
                              className="font-medium hover:text-accent t-tabular"
                              prefetch="intent"
                            >
                              #{backport.backportPRNumber}
                            </Link>
                          </Field>
                          <Field label="Merged">
                            <span className="t-tabular truncate">{backport.mergedAt}</span>
                          </Field>
                          <Field label="Released in">
                            {backport.releasedIn ? (
                              <Link
                                to={`/release/v${backport.releasedIn}`}
                                className="lu-badge t-tabular hover:brightness-95"
                                data-tone="success"
                                prefetch="intent"
                              >
                                v{backport.releasedIn}
                              </Link>
                            ) : (
                              <span className="text-ink-muted">Not yet</span>
                            )}
                          </Field>
                          <Field label="Release date">
                            <span className="t-tabular truncate">
                              {backport.releasedAt || (
                                <span className="text-ink-muted">Not yet</span>
                              )}
                            </span>
                          </Field>
                        </div>
                      )}

                      {backport.state === 'pending' && (
                        <div className="flex flex-col gap-3">
                          {backport.backportPRNumber ? (
                            <Field label="PR">
                              <Link
                                to={`/pr/${backport.backportPRNumber}`}
                                className="font-medium hover:text-accent t-tabular"
                                prefetch="intent"
                              >
                                #{backport.backportPRNumber}
                              </Link>
                            </Field>
                          ) : null}
                          <div className="text-warning flex items-center gap-1.5 t-dense">
                            <Clock className="w-3.5 h-3.5" />
                            <span>{backport.pendingReason}</span>
                          </div>
                        </div>
                      )}

                      {backport.state === 'in-flight' && (
                        <div className="flex flex-col gap-3">
                          <Field label="PR">
                            <Link
                              to={`/pr/${backport.backportPRNumber}`}
                              className="font-medium hover:text-accent t-tabular"
                              prefetch="intent"
                            >
                              #{backport.backportPRNumber}
                            </Link>
                          </Field>
                          <div className="text-accent flex items-center gap-1.5 t-dense">
                            <Clock className="w-3.5 h-3.5" />
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
          ) : null}

          <div className="lu-card overflow-hidden">
            <div className="px-5 md:px-6 h-12 flex items-center gap-2 lu-hairline-b">
              <Tag className="w-4 h-4 text-ink-muted" />
              <h3 className="t-headline text-ink">Semver impact</h3>
            </div>
            <div className="p-5 md:p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
              <div className="mt-5 text-ink-muted">
                <p>
                  <span className="font-medium text-ink">Semantic versioning</span> helps users
                  understand the impact of updates:
                </p>
                <ul className="list-disc pl-5 mt-2 space-y-1 marker:text-ink-faint">
                  <li>
                    <span className="font-medium text-ink">Major (X.y.z):</span> breaking changes
                    that may require code modifications
                  </li>
                  <li>
                    <span className="font-medium text-ink">Minor (x.Y.z):</span> new features that
                    maintain backward compatibility
                  </li>
                  <li>
                    <span className="font-medium text-ink">Patch (x.y.Z):</span> bug fixes that
                    don&apos;t change the API
                  </li>
                  <li>
                    <span className="font-medium text-ink">None:</span> changes that don&apos;t
                    affect user-facing parts of Electron
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="lu-card p-12">
          <div className="flex flex-col items-center justify-center gap-1.5 text-center">
            <div className="w-10 h-10 rounded-panel lu-squircle bg-fill flex items-center justify-center mb-2 text-ink-muted">
              <X className="w-5 h-5" />
            </div>
            <h3 className="t-headline text-ink">PR not found</h3>
            <p className="text-ink-muted mb-5">
              We couldn&apos;t find a pull request with the number #{number}.
            </p>
            <Link to="/pr-lookup" className="lu-button lu-button-primary" prefetch="intent">
              Return to PR lookup
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
