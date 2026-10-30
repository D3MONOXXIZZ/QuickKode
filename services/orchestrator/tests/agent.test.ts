import { SandboxManager } from '../src/sandbox/index.js';
import { GitClient } from '../src/git/index.js';
import { ToolExecutor, AgentEngine, AntigravityAgentAdapter } from '../src/agent/index.js';
import type { AgentThought, ToolCallRecord, ActiveModelConfig } from '@quickkode/shared';

async function runAgentTests() {
  console.log('[Test Suite] Running Phase 5: Antigravity & OpenCode Dual-Agent Core Tests...\n');
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
  const sessionId = 'agent-test-session-001';

  try {
    const sandbox = await manager.createSandbox({ sessionId, useMock: true });
    const git = new GitClient(sandbox);
    await git.initRepo('main');

    // 1. ToolExecutor Core Functionality
    const executor = new ToolExecutor(sandbox);

    // Tool: write_file
    const writeResult = await executor.execute('write_file', {
      path: 'src/math.ts',
      content: 'export const calculate = (x: number) => x * 2;\n',
    });
    assert(!writeResult.isError, 'write_file tool executed successfully');

    // Tool: read_file
    const readResult = await executor.execute('read_file', { path: 'src/math.ts' });
    assert(!readResult.isError && readResult.output?.includes('calculate'), 'read_file returned written content');

    // Tool: edit_file
    const editResult = await executor.execute('edit_file', {
      path: 'src/math.ts',
      target: 'x * 2',
      replacement: 'x * 10',
    });
    assert(!editResult.isError, 'edit_file successfully replaced target code');

    const editedContent = await sandbox.readFile('src/math.ts');
    assert(editedContent.includes('x * 10'), 'File contents updated with replacement text');

    // Tool: edit_file with nonexistent target
    const failedEdit = await executor.execute('edit_file', {
      path: 'src/math.ts',
      target: 'non_existent_string_123',
      replacement: 'anything',
    });
    assert(failedEdit.isError, 'edit_file handles missing target gracefully with error');

    // Tool: run_command with streaming
    let streamedChunk = '';
    const cmdResult = await executor.execute(
      'run_command',
      { command: 'echo "Agent command streaming"' },
      (chunk) => {
        streamedChunk += chunk;
      },
    );
    assert(!cmdResult.isError && cmdResult.output?.includes('Agent command streaming'), 'run_command executed properly');
    assert(streamedChunk.includes('Agent command streaming'), 'run_command streamed output to callback');

    // Tool: list_directory
    const listResult = await executor.execute('list_directory', { path: '.' });
    assert(!listResult.isError && listResult.output?.includes('src'), 'list_directory listed src folder');

    // 2. Antigravity PC Account Adapter Execution (No API Key Required)
    const pcConfig: ActiveModelConfig = {
      provider: 'antigravity',
      modelName: 'antigravity-gemini-2.5',
      authType: 'pc_account',
    };

    const antigravityAdapter = new AntigravityAgentAdapter(pcConfig);
    assert(antigravityAdapter.providerName === 'antigravity', 'Antigravity adapter identifies provider');

    const thoughtsReceived: AgentThought[] = [];
    const toolsReceived: ToolCallRecord[] = [];

    const antigravityRun = await antigravityAdapter.run(sandbox, {
      sessionId,
      prompt: 'Inspect project structure and prepare configuration',
      modelConfig: pcConfig,
      onThought: (t) => thoughtsReceived.push(t),
      onToolCall: (tc) => toolsReceived.push(tc),
    });

    assert(antigravityRun.success, 'Antigravity PC Account run completed successfully without API key');
    assert(thoughtsReceived.length >= 2, 'Streamed multiple planning and execution thoughts');
    assert(toolsReceived.length >= 1, 'Streamed tool call records to callback');

    // 3. AgentEngine Model Routing & Mock Adapter
    const engine = new AgentEngine();

    const openCodeConfig: ActiveModelConfig = {
      provider: 'opencode',
      modelName: 'deepseek-coder-v2',
      apiKey: 'sk-mock-key-for-testing',
    };

    const openCodeAdapter = engine.getAdapter(openCodeConfig, false);
    assert(openCodeAdapter.providerName === 'opencode', 'Engine routes OpenCode model config correctly');

    // Execute through unified AgentEngine with mock mode
    const engineRun = await engine.executeTask(sandbox, {
      sessionId,
      prompt: 'Implement multiply function in src/calculator.ts and verify',
      modelConfig: openCodeConfig,
      useMock: true,
    });

    assert(engineRun.success, 'Engine executed task through mock adapter');
    assert(engineRun.thoughts.length >= 3, 'Recorded planning, write, and test thoughts');
    assert(engineRun.toolCalls.length >= 2, 'Executed write_file and run_command tools');

    // Verify file created by agent exists in sandbox
    const calcFile = await sandbox.readFile('src/calculator.ts');
    assert(calcFile.includes('multiply'), 'Agent successfully created target code file');

    // Verify git diffs were captured
    assert(engineRun.diffs.length >= 1, 'Captured file diffs from agent modifications');

    // Teardown
    await manager.destroyAll();

    console.log(`\nPhase 5 Audit Results: ${passed} passed, ${failed} failed.`);
    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal error during agent tests:', err);
    process.exit(1);
  }
}

void runAgentTests();
