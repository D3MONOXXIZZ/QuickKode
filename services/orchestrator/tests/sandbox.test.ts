import { SandboxManager, IdleReaper } from '../src/sandbox/index.js';

async function runSandboxTests() {
  console.log('[Test Suite] Running Phase 2: Sandbox Engine & Lifecycle Reaper Tests...\n');
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
  const testSessionId = 'test-session-001';

  try {
    // 1. Sandbox Creation & Metadata
    const sandbox = await manager.createSandbox({
      sessionId: testSessionId,
      useMock: true,
    });
    assert(sandbox !== null, 'Sandbox created successfully');
    assert(manager.hasActiveSession(testSessionId), 'Manager tracks active session');

    const meta = manager.getMetadata(testSessionId);
    assert(meta?.status === 'active' && meta.isMock === true, 'Sandbox metadata has active status and mock flag');

    // 2. Command Execution & Output Streaming
    let streamedStdout = '';
    const echoResult = await sandbox.executeCommand('echo "QuickKode Active"', {
      onStdout: (chunk) => {
        streamedStdout += chunk;
      },
    });
    assert(echoResult.exitCode === 0, 'Command exited with code 0');
    assert(echoResult.stdout.includes('QuickKode Active'), 'Command returned expected stdout');
    assert(streamedStdout.includes('QuickKode Active'), 'Command streamed stdout through callback');

    // 3. File I/O Primitives
    const testContent = 'export const add = (a: number, b: number) => a + b;\n';
    await sandbox.writeFile('src/math.ts', testContent);
    const readContent = await sandbox.readFile('src/math.ts');
    assert(readContent === testContent, 'File written and read back with exact contents');

    // Path traversal safety
    let traversalBlocked = false;
    try {
      await sandbox.readFile('../outside.txt');
    } catch {
      traversalBlocked = true;
    }
    assert(traversalBlocked, 'Directory traversal path outside sandbox is blocked');

    // 4. Directory Listing / Virtual File Tree
    const tree = await sandbox.listDirectory();
    assert(tree.isDirectory === true, 'Root node is directory');
    const hasSrc = tree.children?.some((c) => c.name === 'src' && c.isDirectory);
    assert(hasSrc === true, 'Virtual file tree accurately lists created nested directories');

    // 5. Tunnel URL Preview
    const tunnelUrl = sandbox.getTunnelUrl(3000);
    assert(tunnelUrl.includes('3000') && tunnelUrl.startsWith('https://'), 'Generated valid tunnel URL format');

    // 6. Idle Reaper Lifecycle (Fast Simulation)
    console.log('\n  [Reaper Subtest] Testing automatic idle detection & reaping...');
    const reaperManager = new SandboxManager();
    const reaperSessionId = 'reap-session-002';
    await reaperManager.createSandbox({ sessionId: reaperSessionId, useMock: true });

    let warningReceived = false;
    let reapedReceived = false;

    // Set 120ms timeout, 50ms warning threshold, 30ms check interval
    const testReaper = new IdleReaper(reaperManager, {
      idleTimeoutMs: 120,
      warningThresholdMs: 50,
      checkIntervalMs: 25,
    });

    testReaper.on('sandbox:warning', (evt) => {
      if (evt.sessionId === reaperSessionId) warningReceived = true;
    });

    testReaper.on('sandbox:reaped', (evt) => {
      if (evt.sessionId === reaperSessionId) reapedReceived = true;
    });

    testReaper.start();

    // Wait 180ms to let both warning and reap thresholds fire
    await new Promise((resolve) => setTimeout(resolve, 180));
    testReaper.stop();

    assert(warningReceived, 'Idle Reaper emitted warning threshold notification');
    assert(reapedReceived, 'Idle Reaper emitted reaped notification upon timeout');
    assert(!reaperManager.hasActiveSession(reaperSessionId), 'Reaped sandbox automatically destroyed from active pool');

    // 7. Clean Teardown
    await manager.destroyAll();
    assert(!manager.hasActiveSession(testSessionId), 'destroyAll() cleaned up all active sandbox instances');

    console.log(`\nPhase 2 Audit Results: ${passed} passed, ${failed} failed.`);
    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal error during sandbox tests:', err);
    process.exit(1);
  }
}

void runSandboxTests();
