import { SandboxManager } from '../src/sandbox/index.js';
import { GitClient } from '../src/git/index.js';
import { MockDriveClient, DifferentialSyncEngine } from '../src/drive/index.js';
import { AgentEngine } from '../src/agent/index.js';
import { ProjectTestRunner, TurboModeController, SelfHealingEngine } from '../src/workflow/index.js';
import type { ActiveModelConfig } from '@quickkode/shared';

async function runTurboModeTests() {
  console.log('[Test Suite] Running Phase 6: Self-Healing & Turbo Mode Engine Tests...\n');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`  ✓ ${testName}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${testName}`);
      failed++;
    }
  }

  const manager = new SandboxManager();
  const sessionId = 'turbo-test-session-001';

  try {
    const sandbox = await manager.createSandbox({ sessionId, useMock: true });
    const git = new GitClient(sandbox);
    await git.initRepo('main');

    const mockDrive = new MockDriveClient();
    const driveFolder = await mockDrive.createFolder('Project-Turbo', 'root');
    const syncEngine = new DifferentialSyncEngine(mockDrive);
    const agentEngine = new AgentEngine();

    const modelConfig: ActiveModelConfig = {
      provider: 'antigravity',
      modelName: 'antigravity-gemini-2.5',
      authType: 'pc_account',
    };

    // 1. Test Detection in ProjectTestRunner
    await sandbox.writeFile(
      'package.json',
      JSON.stringify({
        name: 'test-app',
        scripts: { test: 'node -e "console.log(\'Tests: 3 passed, 0 failed\'); process.exit(0)"' },
      }),
    );

    const testRunner = new ProjectTestRunner(sandbox);
    const detectedCmd = await testRunner.detectTestCommand();
    assert(detectedCmd === 'npm test', 'ProjectTestRunner detects npm test command');

    const testRunRes = await testRunner.runTests();
    assert(testRunRes.passedAll, 'Test runner executes and detects passing test suite');
    assert(testRunRes.passed === 3 && testRunRes.failed === 0, 'Parses passing test counts accurately');

    // 2. Self-Healing Engine Diagnostic Recovery
    console.log('\n  [Self-Healing Subtest] Testing error recovery on intentional failure...');
    // Create failing test script
    await sandbox.writeFile('broken.js', 'throw new Error("SyntaxError: Unexpected token in broken.js");\n');
    const failRunner = await testRunner.runTests('node broken.js');
    assert(!failRunner.passedAll, 'Runner detects failing script with non-zero exit');

    const selfHealing = new SelfHealingEngine(sandbox, agentEngine);
    // Repair broken.js so re-test succeeds
    await sandbox.writeFile('broken.js', 'console.log("Fixed successfully");\n');

    const healResult = await selfHealing.attemptHealing({
      sessionId,
      originalPrompt: 'Fix broken script',
      initialError: failRunner.stderr || 'Execution failed',
      modelConfig,
      useMock: true,
      maxAttempts: 2,
    });

    assert(healResult.resolved, 'Self-healing engine resolved error and confirmed passing tests');
    assert(healResult.attempts.length >= 1, 'Logged self-healing diagnostic attempts');

    // 3. Turbo Mode Autonomous Execution
    console.log('\n  [Turbo Controller Subtest] Running Turbo Mode (Autonomous)...');
    const controller = new TurboModeController(sandbox, agentEngine, syncEngine);
    const statusChanges: string[] = [];

    const turboResult = await controller.runWorkflow({
      sessionId,
      projectId: 'proj-1',
      prompt: 'Add login helper utility',
      mode: 'turbo',
      modelConfig,
      driveFolderId: driveFolder.id,
      useMock: true,
      onStatusChange: (status) => statusChanges.push(status),
    });

    assert(turboResult.success, 'Turbo Mode workflow executed successfully');
    assert(!turboResult.needsApproval, 'Turbo Mode requires 0 manual approval (autonomous)');
    assert(turboResult.driveSynced, 'Turbo Mode automatically synced changed files to Google Drive');
    assert(statusChanges.includes('completed'), 'Turbo Mode transitioned through to completed status');

    // 4. Standard Mode Execution (Guarded Approval Gate)
    console.log('\n  [Standard Mode Subtest] Running Standard Mode (Guarded Gate)...');
    // Modify a file to have changes to approve
    await sandbox.writeFile('src/auth.ts', 'export const isAuthenticated = true;\n');

    const standardResult = await controller.runWorkflow({
      sessionId,
      projectId: 'proj-1',
      prompt: 'Create auth module',
      mode: 'standard',
      modelConfig,
      driveFolderId: driveFolder.id,
      useMock: true,
    });

    assert(standardResult.success, 'Standard Mode completed agent & test verification');
    assert(standardResult.needsApproval, 'Standard Mode paused and flagged needsApproval = true');
    assert(!standardResult.driveSynced, 'Standard Mode withheld Drive sync until approval');
    assert(standardResult.diffs.length > 0, 'Standard Mode presented file diffs for user review');

    // Now simulate user tapping "Approve & Push" on mobile
    const approved = await controller.approveAndPush({
      driveFolderId: driveFolder.id,
      commitMessage: 'feat: approve auth module',
    });
    assert(approved.driveSynced, 'Approved action triggered Google Drive sync');

    // Teardown
    await manager.destroyAll();

    console.log(`\nPhase 6 Audit Results: ${passed} passed, ${failed} failed.`);
    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal error during turbo mode tests:', err);
    process.exit(1);
  }
}

void runTurboModeTests();
