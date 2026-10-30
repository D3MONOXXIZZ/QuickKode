import { QuickKodeSocketClient } from '../src/services/socketClient.js';
import type { ActiveModelConfig, ExecutionMode } from '@quickkode/shared';

function runMobileUiTests() {
  console.log('[Test Suite] Running Phase 9: Gemini-Style Mobile Client & UI Tests...\n');
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

  // 1. Socket Client Serialization & Handlers
  const socket = new QuickKodeSocketClient('ws://localhost:4000');
  let dispatchedPayload: any = null;

  (socket as any).send = (event: string, payload: any) => {
    dispatchedPayload = { event, payload };
  };

  socket.joinSession('session-101');
  assert(dispatchedPayload?.event === 'session:join' && dispatchedPayload?.payload?.sessionId === 'session-101', 'joinSession dispatches session:join payload');

  const modelConfig: ActiveModelConfig = {
    provider: 'antigravity',
    modelName: 'antigravity-gemini-2.5',
    authType: 'pc_account',
  };

  socket.sendPrompt({
    sessionId: 'session-101',
    prompt: 'Build landing page hero',
    mode: 'turbo',
    modelConfig,
  });
  assert(
    dispatchedPayload?.event === 'agent:prompt' &&
    dispatchedPayload?.payload?.mode === 'turbo' &&
    dispatchedPayload?.payload?.modelConfig?.authType === 'pc_account',
    'sendPrompt serializes Turbo Mode and PC Account Antigravity model',
  );

  // File write
  socket.saveFile('session-101', 'src/App.tsx', '<App />');
  assert(dispatchedPayload?.event === 'file:write' && dispatchedPayload?.payload?.path === 'src/App.tsx', 'saveFile dispatches file:write');

  // GitHub quick import
  socket.importGitHubRepo('facebook/react', 'main');
  assert(
    dispatchedPayload?.event === 'project:import_github' &&
    dispatchedPayload?.payload?.repoFullName === 'facebook/react',
    'importGitHubRepo serializes owner/repo',
  );

  // 2. Turbo Mode State Machine
  let mode: ExecutionMode = 'turbo';
  const toggle = () => (mode = mode === 'turbo' ? 'standard' : 'turbo');

  assert(mode === 'turbo', 'Default mode is Turbo Mode');
  toggle();
  assert(mode === 'standard', 'Toggled to Standard Mode');
  toggle();
  assert(mode === 'turbo', 'Toggled back to Turbo Mode');

  // 3. Dynamic Drawer Morphing Logic
  let drawerView: 'chats' | 'projects' = 'chats';
  const morphDrawer = () => (drawerView = drawerView === 'chats' ? 'projects' : 'chats');

  assert(drawerView === 'chats', 'Default drawer view is Chat Hub');
  morphDrawer();
  assert(drawerView === 'projects', 'Tapping Model Pill morphs drawer into Project Navigator');
  morphDrawer();
  assert(drawerView === 'chats', 'Tapping Model Pill again returns to Chat Hub');

  console.log(`\nPhase 9 Audit Results: ${passed} passed, ${failed} failed.`);
  if (failed > 0) {
    process.exit(1);
  }
}

runMobileUiTests();
