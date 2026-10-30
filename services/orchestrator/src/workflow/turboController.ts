import type { ISandbox } from '../sandbox/types.js';
import type { AgentEngine } from '../agent/agentEngine.js';
import type { DifferentialSyncEngine } from '../drive/syncEngine.js';
import { GitClient } from '../git/gitClient.js';
import { ProjectTestRunner } from './testRunner.js';
import { SelfHealingEngine } from './selfHealing.js';
import type { WorkflowOptions, WorkflowResult, SelfHealingAttempt } from './types.js';
import type { FileDiff, TestRunResult } from '@quickkode/shared';

export class TurboModeController {
  constructor(
    private sandbox: ISandbox,
    private agentEngine: AgentEngine,
    private syncEngine?: DifferentialSyncEngine,
  ) {}

  async runWorkflow(options: WorkflowOptions): Promise<WorkflowResult> {
    const git = new GitClient(this.sandbox);
    const testRunner = new ProjectTestRunner(this.sandbox);
    const selfHealing = new SelfHealingEngine(this.sandbox, this.agentEngine);
    const healingAttempts: SelfHealingAttempt[] = [];

    // Step 1: Initial Agent Execution
    options.onStatusChange?.('agent_executing', 'Agent writing code changes...');
    const agentResult = await this.agentEngine.executeTask(this.sandbox, {
      sessionId: options.sessionId,
      prompt: options.prompt,
      modelConfig: options.modelConfig,
      useMock: options.useMock,
      onThought: options.onThought,
      onToolCall: options.onToolCall,
      onTerminalChunk: options.onTerminalChunk,
    });

    if (!agentResult.success) {
      return {
        success: false,
        mode: options.mode,
        agentSummary: agentResult.finalMessage,
        selfHealingAttempts: [],
        diffs: [],
        gitPushed: false,
        driveSynced: false,
        needsApproval: false,
        error: agentResult.error ?? 'Agent execution failed',
      };
    }

    // Step 2: Automated Build & Test Run
    options.onStatusChange?.('running_tests', 'Running automated test verification...');
    let testResult: TestRunResult = await testRunner.runTests(undefined, options.onTerminalChunk);

    // Step 3: Self-Healing Loop if Tests Failed
    if (!testResult.passedAll) {
      options.onStatusChange?.('agent_thinking', 'Tests failed. Initiating autonomous self-healing...');
      const errorMsg = testResult.stderr || testResult.stdout || 'Tests returned non-zero exit code';

      const healResult = await selfHealing.attemptHealing({
        sessionId: options.sessionId,
        originalPrompt: options.prompt,
        initialError: errorMsg,
        modelConfig: options.modelConfig,
        maxAttempts: options.maxSelfHealingAttempts ?? 3,
        useMock: options.useMock,
        onThought: options.onThought,
        onToolCall: options.onToolCall,
        onTerminalChunk: options.onTerminalChunk,
      });

      healingAttempts.push(...healResult.attempts);
      testResult = healResult.finalTestResult;

      if (!healResult.resolved) {
        return {
          success: false,
          mode: options.mode,
          agentSummary: 'Self-healing failed to resolve verification errors.',
          testResult,
          selfHealingAttempts: healingAttempts,
          diffs: (await git.isGitRepo()) ? await git.getDiff() : [],
          gitPushed: false,
          driveSynced: false,
          needsApproval: false,
          error: 'Verification checks failed after maximum self-healing attempts.',
        };
      }
    }

    // Capture final diffs
    const isGit = await git.isGitRepo();
    const diffs: FileDiff[] = isGit ? await git.getDiff() : [];

    // Step 4: Turbo Mode vs Standard Mode Branching
    if (options.mode === 'turbo') {
      let driveSynced = false;
      let gitPushed = false;

      // 4A: Sync to Google Drive
      if (options.driveFolderId && this.syncEngine) {
        options.onStatusChange?.('syncing_to_drive', 'Turbo Mode: Syncing source changes to Google Drive...');
        const driveRes = await this.syncEngine.push(options.driveFolderId, this.sandbox);
        driveSynced = driveRes.success;
      }

      // 4B: Push to GitHub
      if (isGit && diffs.length > 0) {
        options.onStatusChange?.('pushing_to_git', 'Turbo Mode: Committing & pushing to GitHub...');
        const branch = options.gitBranch ?? 'main';
        await git.commit(`feat(agent): ${options.prompt.slice(0, 50)}`);
        if (options.githubToken) {
          try {
            await git.push(branch, { token: options.githubToken });
            gitPushed = true;
          } catch (err) {
            console.warn('[TurboController] Git push skipped/failed:', err);
          }
        }
      }

      options.onStatusChange?.('completed', 'Task completed and verified in Turbo Mode.');
      return {
        success: true,
        mode: 'turbo',
        agentSummary: agentResult.finalMessage,
        testResult,
        selfHealingAttempts: healingAttempts,
        diffs,
        gitPushed,
        driveSynced,
        needsApproval: false,
      };
    }

    // Standard Mode: Halt and wait for user approval
    options.onStatusChange?.('awaiting_approval', 'Tests passed. Awaiting user approval to commit and push.');
    return {
      success: true,
      mode: 'standard',
      agentSummary: agentResult.finalMessage,
      testResult,
      selfHealingAttempts: healingAttempts,
      diffs,
      gitPushed: false,
      driveSynced: false,
      needsApproval: true,
    };
  }

  async approveAndPush(options: {
    driveFolderId?: string;
    commitMessage?: string;
    githubToken?: string;
    gitBranch?: string;
  }): Promise<{ gitPushed: boolean; driveSynced: boolean }> {
    let driveSynced = false;
    let gitPushed = false;
    const git = new GitClient(this.sandbox);

    if (options.driveFolderId && this.syncEngine) {
      const driveRes = await this.syncEngine.push(options.driveFolderId, this.sandbox);
      driveSynced = driveRes.success;
    }

    if (await git.isGitRepo()) {
      const status = await git.status();
      if (!status.isClean) {
        const msg = options.commitMessage ?? 'feat: apply approved agent changes';
        await git.commit(msg);
      }
      if (options.githubToken) {
        const branch = options.gitBranch ?? (await git.getCurrentBranch());
        await git.push(branch, { token: options.githubToken });
        gitPushed = true;
      }
    }

    return { gitPushed, driveSynced };
  }
}
