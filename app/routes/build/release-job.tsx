import {
  SiAppveyor,
  SiAppveyorHex,
  SiCircleci,
  SiCircleciHex,
  SiGithubactions,
  SiGithubactionsHex,
} from '@icons-pack/react-simple-icons';
import type { LoaderFunctionArgs, MetaFunction } from '@remix-run/node';
import { Link, useLoaderData, useParams } from '@remix-run/react';
import { Check, Clock, ExternalLink, GitBranch, X } from 'lucide-react';
import { getSudowoodoRelease, SudowoodoRelease } from '~/data/release-data';
import { prettyDateString } from '~/helpers/time';
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
    args.context.cacheControl = 'private, max-age=30';
    return {
      ...build,
      started: prettyDateString(build.started, timeZone),
      estimatedCompletion: prettyDateString(estimatedCompletion.toISOString(), timeZone),
    };
  }
  return null;
};

const getStatusColor = (status: SudowoodoRelease['status'] | 'pending' | 'success') => {
  switch (status) {
    case 'completed':
    case 'success':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    case 'running':
    case 'pending':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
    case 'failed':
    case 'cancelled':
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    case 'queued':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
  }
};

const getStatusIcon = (status: SudowoodoRelease['status'] | 'pending' | 'success') => {
  switch (status) {
    case 'completed':
    case 'success':
      return <Check className="w-3.5 h-3.5 mr-1" />;
    case 'running':
    case 'pending':
      return <Clock className="w-3.5 h-3.5 mr-1" />;
    case 'failed':
    case 'cancelled':
      return <X className="w-3.5 h-3.5 mr-1" />;
    case 'queued':
      return <Clock className="w-3.5 h-3.5 mr-1" />;
    default:
      return null;
  }
};

const getTypeColor = (type: 'nightly' | 'alpha' | 'beta' | 'stable') => {
  switch (type) {
    case 'alpha':
    case 'beta':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
    case 'stable':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    case 'nightly':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
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
    <div className="max-w-6xl mx-auto">
      {buildData ? (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    {isBuildSuccess ? (
                      <Link
                        to={`/release/${buildData.generatedElectronVersion}`}
                        className="text-2xl font-bold text-[#2f3241] dark:text-white hover:text-[#9feaf9] transition-colors"
                        prefetch="intent"
                      >
                        {buildData.generatedElectronVersion || 'Version Soon...'}
                      </Link>
                    ) : (
                      <h2 className="text-2xl font-bold text-[#2f3241] dark:text-white">
                        {buildData.generatedElectronVersion || 'Version Soon...'}
                      </h2>
                    )}
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(
                        buildData.channel,
                      )}`}
                    >
                      {buildData.channel.charAt(0).toUpperCase() + buildData.channel.slice(1)}
                    </span>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                        buildData.status,
                      )} ${buildData.status === 'running' ? 'animate-pulse' : ''}`}
                    >
                      {getStatusIcon(buildData.status)}
                      {buildData.status === 'running'
                        ? 'Building'
                        : `${buildData.status.charAt(0).toUpperCase() + buildData.status.slice(1)}`}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-1">
                      <GitBranch className="w-4 h-4" />
                      <span>
                        Branch:{' '}
                        <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">
                          {buildData.branch}
                        </code>
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>Started: {buildData.started}</span>
                    </div>
                    {buildData.status === 'running' && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>Est. completion: {buildData.estimatedCompletion}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {buildData.status === 'running' ? (
                      <span className="text-blue-600 dark:text-blue-400 font-medium flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        Release in progress
                      </span>
                    ) : buildData.status === 'completed' ? (
                      <span className="text-green-600 dark:text-green-400 font-medium flex items-center gap-1">
                        <Check className="w-4 h-4" />
                        Release completed
                      </span>
                    ) : (
                      <span className="text-red-600 dark:text-red-400 font-medium flex items-center gap-1">
                        <X className="w-4 h-4" />
                        Release failed
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="mb-8">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                  Release Stage
                </h3>
                <div className="relative z-0">
                  <div className="absolute top-4 left-0 right-0 h-0.5 bg-gray-200 dark:bg-gray-700 transform -translate-y-1/2"></div>
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
                            className={`w-8 h-8 rounded-full flex items-center justify-center 
                                  ${
                                    isCurrentStage
                                      ? isBuildFailed
                                        ? 'bg-red-500 text-white'
                                        : 'bg-blue-500 text-white'
                                      : isPastStage
                                        ? 'bg-green-500 text-white'
                                        : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                                  }
                                  ${
                                    isCurrentStage
                                      ? isBuildFailed
                                        ? 'ring-4 ring-red-100 dark:ring-red-900/30'
                                        : 'ring-4 ring-blue-100 dark:ring-blue-900/30'
                                      : ''
                                  }
                              `}
                          >
                            {isPastStage ? (
                              <Check className="w-4 h-4" />
                            ) : isCurrentStage ? (
                              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                            ) : (
                              <span className="text-xs">{index + 1}</span>
                            )}
                          </div>
                          <div className="mt-2 text-xs text-center max-w-[84px] overflow-hidden text-ellipsis">
                            <span
                              className={`${
                                isCurrentStage
                                  ? isBuildFailed
                                    ? 'font-medium text-red-600 dark:text-red-400'
                                    : 'font-medium text-blue-600 dark:text-blue-400'
                                  : isPastStage
                                    ? 'font-medium text-green-600 dark:text-green-400'
                                    : 'text-gray-500 dark:text-gray-400'
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

              <div className="grid grid-cols-1 gap-4">
                {normalizedCIJobs.map((job) => (
                  <div
                    key={job.id}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg"
                  >
                    <div className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <job.Icon
                          className="w-6 h-6 text-gray-500 dark:text-gray-400"
                          color={job.iconColor}
                        />
                        <span className="font-medium text-[#2f3241] dark:text-white">
                          {job.platform}
                        </span>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                            job.status,
                          )} ${job.status === 'pending' ? 'animate-pulse' : ''}`}
                        >
                          {getStatusIcon(job.status)}
                          {job.status === 'pending'
                            ? 'Building'
                            : job.status === 'success'
                              ? 'Completed'
                              : 'Failed'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Link
                          to={job.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-[#2f3241] dark:text-[#9feaf9] hover:underline flex items-center gap-1"
                          prefetch="intent"
                        >
                          View CI Job
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>

                    <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900/20">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="text-sm text-gray-700 dark:text-gray-300">
                          Architectures:{' '}
                          <span className="font-medium">{job.architectures.join(', ')}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
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
              Release Not Found
            </h3>
            <p className="text-gray-500 dark:text-gray-400 text-center mb-6">
              We couldn&apos;t find a release with the ID {buildId}.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
