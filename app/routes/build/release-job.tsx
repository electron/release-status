import {
  SiAppveyor,
  SiAppveyorHex,
  SiCircleci,
  SiCircleciHex,
  SiGithubactions,
  SiGithubactionsHex,
} from '@icons-pack/react-simple-icons';
import type { LoaderFunctionArgs, MetaFunction } from 'react-router';
import { Link, useLoaderData, useParams } from 'react-router';
import { Check, Clock, ExternalLink, GitBranch, X } from 'lucide-react';
import { getSudowoodoRelease, SudowoodoRelease } from '~/data/release-data';
import { prettyDateString } from '~/helpers/time';
import { PageHeader } from '~/components/PageHeader';
import { guessTimeZoneFromRequest } from '~/helpers/timezone';

export const meta: MetaFunction = (args) => {
  return [
    { title: `Job ${args.params.id} | Electron Releases` },
    {
      name: 'description',
      content: 'Live information about a specific Electron release job.',
    },
  ];
};

export const loader = async (args: LoaderFunctionArgs) => {
  const build = await getSudowoodoRelease(args.params.id!);
  if (build) {
    const started = new Date(build.started);
    // Guess at three hours for the build time
    const estimatedCompletion = new Date(started.getTime() + 1_000 * 60 * 60 * 3);
    const timeZone = guessTimeZoneFromRequest(args.request);
    args.context.cacheControl = 'public, max-age=30, s-maxage=30, stale-while-revalidate=60';
    return {
      ...build,
      started: prettyDateString(build.started, timeZone),
      estimatedCompletion: prettyDateString(estimatedCompletion.toISOString(), timeZone),
    };
  }
  return null;
};

// Accent for in-progress work; spark red is kept for failed or cancelled jobs.
const getStatusTone = (status: SudowoodoRelease['status'] | 'pending' | 'success') => {
  switch (status) {
    case 'completed':
    case 'success':
      return 'success';
    case 'running':
    case 'pending':
      return 'accent';
    case 'failed':
    case 'cancelled':
      return 'danger';
    case 'queued':
      return 'warning';
    default:
      return undefined;
  }
};

const getStatusIcon = (status: SudowoodoRelease['status'] | 'pending' | 'success') => {
  switch (status) {
    case 'completed':
    case 'success':
      return <Check className="w-3 h-3" />;
    case 'running':
    case 'pending':
      return <span className="lu-dot !w-1.5 !h-1.5 animate-pulse" data-tone="accent" />;
    case 'failed':
    case 'cancelled':
      return <X className="w-3 h-3" />;
    case 'queued':
      return <Clock className="w-3 h-3" />;
    default:
      return null;
  }
};

const getTypeTone = (type: 'nightly' | 'alpha' | 'beta' | 'stable') => {
  switch (type) {
    case 'alpha':
    case 'beta':
      return 'warning';
    case 'stable':
      return 'success';
    case 'nightly':
      return 'accent';
    default:
      return undefined;
  }
};

const releaseStages: Record<string, string> = {
  bootstrapping: 'Bootstrapping',
  bumping_version: 'Bumping Version',
  triggering_builds: 'Triggering Builds',
  waiting_for_builds: 'Waiting for Builds',
  validating_release: 'Validating Release',
  publishing_release_to_github: 'Publishing to GitHub',
  publishing_release_to_npm: 'Publishing to NPM',
  triggering_dependency_releases: 'Finalizing',
};

const githubactionsPlatforms: Record<string, string> = {
  'linux-publish': 'Linux',
  'macos-publish': 'macOS',
  'windows-publish': 'Windows',
};

export default function ReleaseBuild() {
  const buildData = useLoaderData<typeof loader>();

  const { id: buildId } = useParams();

  const normalizedCIJobs = (buildData?.ciBuilds?.githubactions || [])
    .map((job) => ({
      id: job.buildId,
      platform: githubactionsPlatforms[job.buildJob] ?? 'Unknown',
      status: job.status,
      architectures: ['Unified CI Job, all supported architectures'],
      href: `https://github.com/electron/electron/actions/runs/${job.workflowId}`,
      Icon: SiGithubactions,
      iconColor: SiGithubactionsHex,
    }))
    .concat(
      buildData?.ciBuilds?.appveyor?.map((job) => ({
        id: job.buildVersion,
        platform: 'Windows',
        status: job.status,
        architectures: job.projectSlug.includes('x64')
          ? ['x64']
          : job.projectSlug.includes('woa')
            ? ['arm64']
            : ['ia32'],
        href: `https://${job.buildServer}/project/${job.accountName}/${job.projectSlug}/build/${job.buildVersion}`,
        Icon: SiAppveyor,
        iconColor: SiAppveyorHex,
      })) ?? [],
    )
    .concat(
      buildData?.ciBuilds?.circle?.map((job) => ({
        id: job.buildId,
        platform: job.buildJob.includes('macos') ? 'macOS' : 'Linux',
        status: job.status,
        architectures: ['Unified CI Job, all supported architectures'],
        href: `https://circleci.com/workflow-run/${job.buildId}`,
        Icon: SiCircleci,
        iconColor: SiCircleciHex,
      })) ?? [],
    );

  const isBuildFailed = buildData?.status === 'cancelled' || buildData?.status === 'failed';
  const isBuildSuccess = buildData?.status === 'completed';

  return (
    <div>
      <PageHeader backTo={{ to: '/', name: 'releases' }} />
      {buildData ? (
        <div className="space-y-6 -mt-2">
          <div className="lu-card px-5 md:px-8 py-6 md:py-7">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-8">
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="t-caption text-ink-muted">Release job</span>
                  <span className="lu-badge" data-tone={getTypeTone(buildData.channel)}>
                    {buildData.channel.charAt(0).toUpperCase() + buildData.channel.slice(1)}
                  </span>
                  <span className="lu-badge" data-tone={getStatusTone(buildData.status)}>
                    {getStatusIcon(buildData.status)}
                    {buildData.status === 'running'
                      ? 'Building'
                      : `${buildData.status.charAt(0).toUpperCase() + buildData.status.slice(1)}`}
                  </span>
                </div>
                {isBuildSuccess ? (
                  <Link
                    to={`/release/${buildData.generatedElectronVersion}`}
                    className="t-page text-ink hover:text-accent transition-colors"
                    prefetch="intent"
                  >
                    {buildData.generatedElectronVersion || 'Version soon…'}
                  </Link>
                ) : (
                  <h2 className="t-page text-ink">
                    {buildData.generatedElectronVersion || 'Version soon…'}
                  </h2>
                )}
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-ink-muted">
                  <div className="flex items-center gap-1.5">
                    <GitBranch className="w-3.5 h-3.5 text-ink-faint" />
                    <span className="font-mono text-[12.5px]">{buildData.branch}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-ink-faint" />
                    <span>Started {buildData.started}</span>
                  </div>
                  {buildData.status === 'running' && (
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-ink-faint" />
                      <span>Est. completion {buildData.estimatedCompletion}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex-none">
                {buildData.status === 'running' ? (
                  <span className="lu-callout !py-2 items-center" data-tone="accent">
                    <span className="lu-dot animate-pulse" data-tone="accent" />
                    <span className="font-medium">Release in progress</span>
                  </span>
                ) : buildData.status === 'completed' ? (
                  <span className="lu-callout !py-2 items-center !bg-[color-mix(in_srgb,var(--lu-success)_14%,transparent)] !text-success">
                    <Check className="w-4 h-4 !text-success" />
                    <span className="font-medium">Release completed</span>
                  </span>
                ) : (
                  <span className="lu-callout !py-2 items-center" data-tone="danger">
                    <X className="w-4 h-4" />
                    <span className="font-medium text-spark">Release failed</span>
                  </span>
                )}
              </div>
            </div>

            <div className="mb-8">
              <h3 className="t-caption text-ink-muted mb-4">Release stage</h3>
              <div className="relative z-0">
                <div className="absolute top-3.5 left-4 right-4 h-px bg-line-strong opacity-30"></div>
                <div className="relative z-10 flex justify-between">
                  {Object.keys(releaseStages).map((stage, index) => {
                    const keys = Object.keys(releaseStages);
                    const isSuccessfulLastStage = index === keys.length - 1 && isBuildSuccess;
                    const isCurrentStage = stage === buildData.stage && !isSuccessfulLastStage;
                    const isPastStage =
                      keys.indexOf(buildData.stage) > index || isSuccessfulLastStage;

                    return (
                      <div key={stage} className="flex flex-col items-center relative">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center t-caption t-tabular ring-4 ring-[var(--lu-surface)]
                                ${
                                  isCurrentStage
                                    ? isBuildFailed
                                      ? 'bg-spark text-white shadow-[0_0_0_4px_var(--lu-surface),0_0_0_7px_var(--lu-spark-soft)]'
                                      : 'bg-accent-soft text-accent shadow-[0_0_0_4px_var(--lu-surface),0_0_0_6.5px_color-mix(in_srgb,var(--lu-accent)_26%,transparent)]'
                                    : isPastStage
                                      ? 'bg-action text-action-on'
                                      : 'bg-fill-strong text-ink-muted'
                                }
                            `}
                        >
                          {isPastStage ? (
                            <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                          ) : isCurrentStage ? (
                            isBuildFailed ? (
                              <X className="w-3.5 h-3.5" strokeWidth={2.5} />
                            ) : (
                              <div className="w-2 h-2 bg-accent rounded-full animate-pulse"></div>
                            )
                          ) : (
                            <span>{index + 1}</span>
                          )}
                        </div>
                        <div className="mt-2.5 text-center max-w-[88px] overflow-hidden text-ellipsis t-dense leading-4">
                          <span
                            className={`${
                              isCurrentStage
                                ? isBuildFailed
                                  ? 'font-medium text-spark'
                                  : 'font-medium text-accent'
                                : isPastStage
                                  ? 'font-medium text-ink'
                                  : 'text-ink-faint'
                            }`}
                          >
                            {releaseStages[stage]}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <h3 className="t-caption text-ink-muted mb-3">CI jobs</h3>
            <div className="grid grid-cols-1 gap-3">
              {normalizedCIJobs.map((job) => (
                <div key={job.id} className="lu-well p-1.5">
                  <div className="px-3 py-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <job.Icon className="w-5 h-5 text-ink-muted" color="currentColor" />
                      <span className="font-medium text-ink">{job.platform}</span>
                      <span className="lu-badge" data-tone={getStatusTone(job.status)}>
                        {getStatusIcon(job.status)}
                        {job.status === 'pending'
                          ? 'Building'
                          : job.status === 'success'
                            ? 'Completed'
                            : 'Failed'}
                      </span>
                    </div>
                    <Link
                      to={job.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="lu-button lu-button-secondary lu-button-sm"
                      prefetch="intent"
                    >
                      View CI job
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>

                  <div className="rounded-item lu-squircle bg-surface px-3 py-2.5 text-ink-muted shadow-edge">
                    Architectures{' '}
                    <span className="font-medium text-ink">{job.architectures.join(', ')}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="lu-card p-12">
          <div className="flex flex-col items-center justify-center gap-1.5 text-center">
            <div className="w-10 h-10 rounded-panel lu-squircle bg-fill flex items-center justify-center mb-2 text-ink-muted">
              <X className="w-5 h-5" />
            </div>
            <h3 className="t-headline text-ink">Release not found</h3>
            <p className="text-ink-muted">We couldn&apos;t find a release with the ID {buildId}.</p>
          </div>
        </div>
      )}
    </div>
  );
}
