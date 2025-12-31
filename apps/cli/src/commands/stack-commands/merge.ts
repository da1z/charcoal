import yargs from 'yargs';
import chalk from 'chalk';
import { execFileSync } from 'child_process';
import { graphite } from '../../lib/runner';
import { TContext } from '../../lib/context';
import { SCOPE } from '../../lib/engine/scope_spec';
import { KilledError, PreconditionsFailedError } from '../../lib/errors';
import { syncAction } from '../../actions/sync/sync';
import { syncPrInfo } from '../../actions/sync_pr_info';
import { uncommittedTrackedChangesPrecondition } from '../../lib/preconditions';

const args = {
  'dry-run': {
    describe: 'List PRs that would be merged without actually merging',
    type: 'boolean',
    default: false,
  },
  until: {
    describe: 'Stop merging at this branch name (inclusive)',
    type: 'string',
  },
  timeout: {
    describe: 'Timeout in minutes per PR for checks to complete',
    type: 'number',
    default: 15,
  },
  method: {
    describe: 'Merge method to use',
    type: 'string',
    choices: ['squash', 'merge', 'rebase'],
    default: 'squash',
  },
} as const;

type argsT = yargs.Arguments<yargs.InferredOptionTypes<typeof args>>;

export const aliases = ['m'];
export const command = 'merge';
export const canonical = 'stack merge';
export const description =
  'Merge PRs in the current stack sequentially from trunk toward the current branch, waiting for CI checks to pass.';
export const builder = args;

type PRInfo = {
  number: number;
  state: 'OPEN' | 'CLOSED' | 'MERGED';
  headRefName: string;
  baseRefName: string;
  reviewDecision: 'APPROVED' | 'REVIEW_REQUIRED' | 'CHANGES_REQUESTED' | '';
  mergeable: 'MERGEABLE' | 'CONFLICTING' | 'UNKNOWN';
  mergeStateStatus:
    | 'BLOCKED'
    | 'BEHIND'
    | 'CLEAN'
    | 'DIRTY'
    | 'HAS_HOOKS'
    | 'UNKNOWN'
    | 'UNSTABLE';
};

type CheckInfo = {
  state: 'pending' | 'success' | 'failure' | 'error';
  total: number;
  completed: number;
};

type BranchMergeInfo = {
  branchName: string;
  prNumber: number;
  prState: PRInfo['state'];
  reviewDecision: PRInfo['reviewDecision'];
};

type MergeOpts = {
  timeout: number;
  dryRun: boolean;
  until?: string;
  method: 'squash' | 'merge' | 'rebase';
};

function getPRInfo(prNumber: number): PRInfo {
  const result = execFileSync('gh', [
    'pr',
    'view',
    `${prNumber}`,
    '--json',
    'number,state,headRefName,baseRefName,reviewDecision,mergeable,mergeStateStatus',
  ]).toString();
  return JSON.parse(result);
}

function getCheckStatus(prNumber: number): CheckInfo {
  try {
    const result = execFileSync('gh', [
      'pr',
      'checks',
      `${prNumber}`,
      '--json',
      'state,name',
    ]).toString();
    const checks = JSON.parse(result) as Array<{ state: string; name: string }>;

    const pending = checks.filter(
      (c) =>
        c.state === 'PENDING' ||
        c.state === 'QUEUED' ||
        c.state === 'IN_PROGRESS'
    ).length;
    const failing = checks.filter(
      (c) => c.state === 'FAILURE' || c.state === 'ERROR'
    ).length;
    const completed = checks.filter(
      (c) => c.state === 'SUCCESS' || c.state === 'SKIPPED'
    ).length;

    let state: CheckInfo['state'] = 'pending';
    if (failing > 0) {
      state = 'failure';
    } else if (pending === 0 && checks.length > 0) {
      state = 'success';
    }
    // When checks.length === 0, keep state as 'pending' to wait for checks to appear

    return { state, total: checks.length, completed };
  } catch {
    // gh pr checks failed - checks might not be registered yet, keep waiting
    return { state: 'pending', total: 0, completed: 0 };
  }
}

function mergePR(prNumber: number, method: MergeOpts['method']): void {
  execFileSync('gh', [
    'pr',
    'merge',
    `${prNumber}`,
    `--${method}`,
    '--delete-branch=false',
  ]);
}

function updatePRBase(prNumber: number, base: string): void {
  execFileSync('gh', ['pr', 'edit', `${prNumber}`, '--base', base]);
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function validatePreconditions(
  branches: string[],
  context: TContext
): { valid: BranchMergeInfo[]; stoppedAtFrozen?: string } {
  const result: BranchMergeInfo[] = [];

  for (const branchName of branches) {
    const prInfo = context.engine.getPrInfo(branchName);
    const isFrozen = context.engine.isBranchFrozen(branchName);

    if (isFrozen) {
      return { valid: result, stoppedAtFrozen: branchName };
    }

    if (!prInfo?.number) {
      throw new PreconditionsFailedError(
        `Branch ${chalk.yellow(branchName)} does not have an associated PR. ` +
          `Run ${chalk.cyan('gt stack submit')} first.`
      );
    }

    result.push({
      branchName,
      prNumber: prInfo.number,
      prState: prInfo.state ?? 'OPEN',
      reviewDecision: prInfo.reviewDecision ?? '',
    });
  }

  return { valid: result };
}

function validateApprovals(branches: BranchMergeInfo[]): void {
  const unapproved = branches.filter(
    (b) =>
      b.prState === 'OPEN' &&
      b.reviewDecision !== 'APPROVED' &&
      b.reviewDecision !== ''
  );

  if (unapproved.length > 0) {
    const list = unapproved
      .map(
        (b) =>
          `  - PR #${b.prNumber} (${b.branchName}): ${
            b.reviewDecision || 'No review'
          }`
      )
      .join('\n');
    throw new PreconditionsFailedError(
      `The following PRs are not approved:\n${list}\n\n` +
        `All PRs must be approved before merging the stack.`
    );
  }
}

type WaitOpts = {
  prNumber: number;
  branchName: string;
  timeoutMinutes: number;
};

async function waitForChecks(
  opts: WaitOpts,
  context: TContext
): Promise<'success' | 'failure' | 'timeout'> {
  const { prNumber, branchName, timeoutMinutes } = opts;
  const startTime = Date.now();
  const timeoutMs = timeoutMinutes * 60 * 1000;
  const pollIntervalMs = 30 * 1000;

  while (Date.now() - startTime < timeoutMs) {
    const checkInfo = getCheckStatus(prNumber);

    // If no checks registered, check if PR is actually mergeable (no checks required)
    if (checkInfo.total === 0) {
      const prInfo = getPRInfo(prNumber);
      if (prInfo.mergeStateStatus === 'CLEAN') {
        context.splog.info(
          `PR #${prNumber} (${branchName}): No checks required, ready to merge.`
        );
        return 'success';
      }
      context.splog.info(
        `PR #${prNumber} (${branchName}): Waiting for checks to start...`
      );
    } else {
      context.splog.info(
        `PR #${prNumber} (${branchName}): Waiting for checks (${checkInfo.completed}/${checkInfo.total} complete)...`
      );

      if (checkInfo.state === 'success') {
        return 'success';
      }
      if (checkInfo.state === 'failure') {
        return 'failure';
      }
    }

    await sleep(pollIntervalMs);
  }

  return 'timeout';
}

async function promptRetryOrAbort(
  message: string,
  context: TContext
): Promise<'retry' | 'abort'> {
  if (!context.interactive) {
    throw new PreconditionsFailedError(message);
  }

  const response = await context.prompts({
    type: 'select',
    name: 'value',
    message,
    choices: [
      { title: 'Retry', value: 'retry' },
      { title: 'Abort', value: 'abort' },
    ],
  });

  if (response.value === 'abort') {
    throw new KilledError();
  }
  return 'retry';
}

function getDownstack(context: TContext, opts: MergeOpts): string[] {
  const currentBranch = context.engine.currentBranchPrecondition;

  if (context.engine.isTrunk(currentBranch)) {
    throw new PreconditionsFailedError(
      `Cannot merge stack from trunk. Checkout a branch in your stack first.`
    );
  }

  let downstack = context.engine.getRelativeStack(
    currentBranch,
    SCOPE.DOWNSTACK
  );

  if (opts.until) {
    const untilIndex = downstack.indexOf(opts.until);
    if (untilIndex === -1) {
      throw new PreconditionsFailedError(
        `Branch ${chalk.yellow(opts.until)} is not in the current stack.`
      );
    }
    downstack = downstack.slice(0, untilIndex + 1);
  }

  return downstack;
}

async function syncAndRestack(context: TContext): Promise<void> {
  await syncAction(
    {
      pull: true,
      force: true,
      delete: true,
      showDeleteProgress: false,
      restack: true,
    },
    context
  );
}

async function mergeSinglePR(
  branch: BranchMergeInfo,
  opts: MergeOpts,
  context: TContext
): Promise<boolean> {
  const trunk = context.engine.trunk;
  const freshPrInfo = getPRInfo(branch.prNumber);

  if (freshPrInfo.state === 'MERGED') {
    context.splog.info(
      `PR #${branch.prNumber} (${branch.branchName}): Already merged, skipping.`
    );
    return true;
  }

  // Re-validate approval status with fresh data
  if (
    freshPrInfo.reviewDecision !== 'APPROVED' &&
    freshPrInfo.reviewDecision !== ''
  ) {
    throw new PreconditionsFailedError(
      `PR #${branch.prNumber} (${branch.branchName}) is no longer approved ` +
        `(status: ${freshPrInfo.reviewDecision || 'No review'}). ` +
        `Please get approval before merging.`
    );
  }

  // If PR is behind trunk (first PR case), sync and push
  if (freshPrInfo.mergeStateStatus === 'BEHIND') {
    context.splog.info(
      `PR #${branch.prNumber} (${branch.branchName}): Restacking to ${trunk}...`
    );
    await syncAndRestack(context);
    context.engine.pushBranch(branch.branchName, true);
  }

  let checksResult: 'success' | 'failure' | 'timeout' = 'failure';
  while (checksResult !== 'success') {
    checksResult = await waitForChecks(
      {
        prNumber: branch.prNumber,
        branchName: branch.branchName,
        timeoutMinutes: opts.timeout,
      },
      context
    );

    if (checksResult === 'failure') {
      const msg = `Checks failed for PR #${branch.prNumber} (${branch.branchName}). What would you like to do?`;
      await promptRetryOrAbort(msg, context);
    } else if (checksResult === 'timeout') {
      const msg = `Timeout waiting for checks on PR #${branch.prNumber} (${branch.branchName}). What would you like to do?`;
      await promptRetryOrAbort(msg, context);
    }
  }

  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      context.splog.info(
        `PR #${branch.prNumber} (${branch.branchName}): Merging...`
      );
      mergePR(branch.prNumber, opts.method);
      context.splog.info(
        `PR #${branch.prNumber} (${branch.branchName}): ${chalk.green(
          '✓ Merged'
        )}`
      );
      return true;
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Unknown error';
      const msg = `Failed to merge PR #${branch.prNumber} (${branch.branchName}): ${errMsg}`;
      await promptRetryOrAbort(msg, context);
      // User chose retry, loop and try again
    }
  }
}

function submitRemainingBranches(
  opts: { openPRs: BranchMergeInfo[]; startIndex: number; trunk: string },
  context: TContext
): void {
  for (let j = opts.startIndex; j < opts.openPRs.length; j++) {
    const pr = opts.openPRs[j];
    if (!context.engine.branchExists(pr.branchName)) {
      continue;
    }
    // Update PR base to trunk if needed
    const prInfo = getPRInfo(pr.prNumber);
    if (prInfo.baseRefName !== opts.trunk) {
      context.splog.info(
        `PR #${pr.prNumber} (${pr.branchName}): Updating base to ${opts.trunk}...`
      );
      updatePRBase(pr.prNumber, opts.trunk);
    }
    // Push the rebased branch
    context.engine.pushBranch(pr.branchName, true);
  }
}

async function mergeStack(
  openPRs: BranchMergeInfo[],
  opts: MergeOpts,
  context: TContext
): Promise<void> {
  const trunk = context.engine.trunk;
  context.splog.info(`Merging stack (${openPRs.length} PRs)...\n`);

  for (let i = 0; i < openPRs.length; i++) {
    const branch = openPRs[i];
    // mergeSinglePR always returns true on success or throws KilledError on abort
    await mergeSinglePR(branch, opts, context);

    if (i < openPRs.length - 1) {
      context.splog.info(`\nRestacking remaining branches...`);
      await syncAndRestack(context);
      // Push all remaining branches and update their PR bases
      submitRemainingBranches({ openPRs, startIndex: i + 1, trunk }, context);

      const nextBranch = openPRs[i + 1];
      context.splog.info(
        `\nWaiting for checks on next PR #${nextBranch.prNumber} (${nextBranch.branchName})...`
      );
    }

    context.splog.newline();
  }

  context.splog.info(`${chalk.green('All PRs merged successfully!')}`);
  context.splog.info(`Running repo sync to clean up...`);

  await syncAction(
    {
      pull: true,
      force: true,
      delete: true,
      showDeleteProgress: true,
      restack: false,
    },
    context
  );
}

function printDryRun(
  openPRs: BranchMergeInfo[],
  trunk: string,
  context: TContext
): void {
  context.splog.info('Would merge the following PRs (in order):');
  openPRs.forEach((b, i) => {
    const suffix = i > 0 ? ' (after restack)' : '';
    context.splog.info(
      `${i + 1}. PR #${b.prNumber}: ${b.branchName} -> ${trunk}${suffix}`
    );
  });
}

export const handler = async (argv: argsT): Promise<void> => {
  await graphite(argv, canonical, async (context) => {
    const opts: MergeOpts = {
      timeout: argv.timeout,
      dryRun: argv['dry-run'],
      until: argv.until,
      method: argv.method,
    };

    const downstack = getDownstack(context, opts);
    if (downstack.length === 0) {
      context.splog.info('No branches to merge.');
      return;
    }

    await syncPrInfo(downstack, context);

    const { valid: branchesToMerge, stoppedAtFrozen } = validatePreconditions(
      downstack,
      context
    );

    if (stoppedAtFrozen) {
      context.splog.warn(
        `Stopped at frozen branch ${chalk.yellow(stoppedAtFrozen)}. ` +
          `Unfreeze with ${chalk.cyan(
            `gt branch unfreeze ${stoppedAtFrozen}`
          )} to continue.`
      );
    }

    if (branchesToMerge.length === 0) {
      context.splog.info('No branches to merge.');
      return;
    }

    const openPRs = branchesToMerge.filter((b) => b.prState === 'OPEN');

    if (openPRs.length === 0) {
      context.splog.info('All PRs in the stack are already merged.');
      return;
    }

    if (opts.dryRun) {
      printDryRun(openPRs, context.engine.trunk, context);
      return;
    }

    uncommittedTrackedChangesPrecondition();
    validateApprovals(openPRs);
    await mergeStack(openPRs, opts, context);
  });
};
