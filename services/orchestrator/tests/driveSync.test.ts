import { SandboxManager } from '../src/sandbox/index.js';
import { MockDriveClient, DriveFilter, DifferentialSyncEngine } from '../src/drive/index.js';

async function runDriveSyncTests() {
  console.log('[Test Suite] Running Phase 4: Google Drive Differential Sync Tests...\n');
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

  try {
    // 1. DriveFilter Rules Audit
    const filter = new DriveFilter();
    assert(filter.isIgnored('node_modules/react/index.js'), 'Ignores node_modules');
    assert(filter.isIgnored('.git/config'), 'Ignores .git folder');
    assert(filter.isIgnored('.next/cache/webpack.pack'), 'Ignores .next folder');
    assert(filter.isIgnored('.expo/settings.json'), 'Ignores .expo folder');
    assert(filter.isIgnored('dist/index.js'), 'Ignores dist build folder');
    assert(filter.isIgnored('error.log'), 'Ignores *.log files');
    assert(!filter.isIgnored('src/App.tsx'), 'Allows src/App.tsx');
    assert(!filter.isIgnored('package.json'), 'Allows package.json');
    assert(!filter.isIgnored('public/index.html'), 'Allows public/index.html');

    // Custom ignore rule
    const customFilter = new DriveFilter('secrets/*\n*.key');
    assert(customFilter.isIgnored('secrets/api.pem'), 'Custom filter blocks secrets/*');
    assert(customFilter.isIgnored('server.key'), 'Custom filter blocks *.key');

    // 2. Setup Sandbox and Mock Drive
    const manager = new SandboxManager();
    const sandbox = await manager.createSandbox({ sessionId: 'drive-test-session', useMock: true });
    const mockDrive = new MockDriveClient();
    const projectFolder = await mockDrive.createFolder('My-Project', 'root');

    // Seed mock drive with initial source files and one ignored node_modules file
    const srcFolder = await mockDrive.createFolder('src', projectFolder.id);
    await mockDrive.uploadFile('index.ts', 'console.log("Drive initial code");\n', srcFolder.id);
    await mockDrive.uploadFile('package.json', '{"name": "drive-app"}\n', projectFolder.id);

    const ignoredNodeModules = await mockDrive.createFolder('node_modules', projectFolder.id);
    await mockDrive.uploadFile('dummy.js', 'console.log("ignored");', ignoredNodeModules.id);

    // 3. Test Pull
    const syncEngine = new DifferentialSyncEngine(mockDrive);
    const pullResult = await syncEngine.pull(projectFolder.id, sandbox);

    assert(pullResult.success, 'Pull operation completed successfully');
    assert(pullResult.stats.downloaded === 2, 'Downloaded exact 2 source files');
    assert(pullResult.stats.skipped >= 1, 'Skipped ignored node_modules folder during pull');

    const localIndex = await sandbox.readFile('src/index.ts');
    assert(localIndex.includes('Drive initial code'), 'Source file hydrated into sandbox');

    // 4. Test Push (New & Modified Files)
    await sandbox.writeFile('src/components/Button.tsx', 'export const Button = () => <button>Click</button>;\n');
    await sandbox.writeFile('package.json', '{"name": "drive-app", "version": "1.1.0"}\n');

    // Create a local node_modules folder in sandbox to verify push ignore
    await sandbox.writeFile('node_modules/react/index.js', 'module.exports = {};\n');

    const pushResult1 = await syncEngine.push(projectFolder.id, sandbox);
    assert(pushResult1.success, 'Push operation completed successfully');
    assert(
      pushResult1.syncedFiles.includes('src/components/Button.tsx') && pushResult1.syncedFiles.includes('package.json'),
      'Uploaded modified and created source files',
    );

    // Verify node_modules did NOT get uploaded to Drive
    const driveChildren = await mockDrive.listFiles(projectFolder.id);
    const uploadedNodeModules = driveChildren.find((c) => c.name === 'react');
    assert(uploadedNodeModules === undefined, 'Zero node_modules files uploaded to Google Drive');

    // 5. Test Differential Skip (Zero-upload unchanged pass)
    const pushResult2 = await syncEngine.push(projectFolder.id, sandbox);
    assert(pushResult2.success, 'Second push succeeded');
    assert(pushResult2.stats.uploaded === 0, 'Zero files uploaded on unchanged pass (MD5 match)');
    assert(pushResult2.stats.skipped > 0, 'Unchanged files skipped based on MD5 checksum');

    // 6. Test Deletion Sync
    // Delete Button.tsx from sandbox
    await sandbox.executeCommand('node -e "require(\'fs\').unlinkSync(\'src/components/Button.tsx\')"');
    const pushResult3 = await syncEngine.push(projectFolder.id, sandbox);
    assert(pushResult3.success, 'Deletion push succeeded');
    assert(pushResult3.stats.deleted === 1, 'Detected and synced 1 deleted file to Google Drive');

    // Teardown
    await manager.destroyAll();

    console.log(`\nPhase 4 Audit Results: ${passed} passed, ${failed} failed.`);
    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal error during drive sync tests:', err);
    process.exit(1);
  }
}

void runDriveSyncTests();
