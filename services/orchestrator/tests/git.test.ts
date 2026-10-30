import { SandboxManager } from '../src/sandbox/index.js';
import { GitClient, GitHubImporter } from '../src/git/index.js';

async function runGitTests() {
  console.log('[Test Suite] Running Phase 3: Git Client & GitHub Quick Import Tests...\n');
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
  const sessionId = 'git-test-session-001';

  try {
    const sandbox = await manager.createSandbox({ sessionId, useMock: true });
    const git = new GitClient(sandbox);

    // 1. Repo Initialization & Config
    assert(!(await git.isGitRepo()), 'Initially not a git repository');
    await git.initRepo('main');
    assert(await git.isGitRepo(), 'Initialized repository successfully');
    assert((await git.getCurrentBranch()) === 'main', 'Default branch is main');

    await git.configureUser('Antigravity Agent', 'agent@quickkode.dev');

    // 2. Status with Untracked Files
    await sandbox.writeFile('src/app.ts', 'console.log("App initialized");\n');
    const status1 = await git.status();
    assert(!status1.isClean, 'Repository status is dirty');
    assert(status1.untracked.includes('src/app.ts'), 'Detects untracked src/app.ts');

    // 3. Commit
    const commitResult = await git.commit('feat: initialize app');
    assert(commitResult.commitHash.length === 40, 'Generated valid 40-character commit hash');
    assert(commitResult.branch === 'main', 'Committed on main branch');
    const status2 = await git.status();
    assert(status2.isClean, 'Repository status is clean after commit');

    // 4. File Diffs Generation
    await sandbox.writeFile('src/app.ts', 'console.log("App initialized");\nconsole.log("Feature added");\n');
    await sandbox.writeFile('src/utils.ts', 'export const helper = () => true;\n');

    const diffs = await git.getDiff();
    assert(diffs.length >= 2, 'Generated diffs for modified and newly added files');

    const appDiff = diffs.find((d) => d.path.includes('app.ts'));
    assert(appDiff !== undefined && appDiff.changeType === 'modified', 'Detects app.ts as modified changeType');
    assert((appDiff?.additions ?? 0) > 0, 'Detects additions in modified file');

    const utilsDiff = diffs.find((d) => d.path.includes('utils.ts'));
    assert(utilsDiff !== undefined && utilsDiff.changeType === 'created', 'Detects utils.ts as created changeType');

    // Commit diffs
    await git.commit('feat: add helper utils');

    // 5. Branch Creation & Switching
    const featureBranch = 'agent/stripe-integration';
    await git.createAndCheckoutBranch(featureBranch);
    assert((await git.getCurrentBranch()) === featureBranch, `Switched to feature branch ${featureBranch}`);

    await git.checkout('main');
    assert((await git.getCurrentBranch()) === 'main', 'Switched back to main branch');

    // 6. Commit Log History
    const history = await git.getCommitLog(5);
    assert(history.length >= 2, 'Retrieved commit history list');
    assert(history[0]?.message.includes('add helper utils'), 'Most recent commit message matches');
    assert(history[0]?.author === 'Antigravity Agent', 'Commit author matches configured name');

    // 7. GitHub Importer Validations
    const importer = new GitHubImporter(sandbox);
    const invalidResult = await importer.clone({ repoFullName: 'invalid-repo-without-slash' });
    assert(!invalidResult.success, 'Importer rejects invalid repo name format');
    assert(invalidResult.error?.includes('Expected format: "owner/repo"'), 'Returns clear formatting error message');

    // Clean teardown
    await manager.destroyAll();

    console.log(`\nPhase 3 Audit Results: ${passed} passed, ${failed} failed.`);
    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal error during git tests:', err);
    process.exit(1);
  }
}

void runGitTests();
