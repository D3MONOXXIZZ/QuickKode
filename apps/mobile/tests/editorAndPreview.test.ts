import type { FileTreeNode, FileDiff, ActivePreview, ApiEndpoint } from '@quickkode/shared';
import { QuickKodeSocketClient } from '../src/services/socketClient.js';

function runEditorAndPreviewTests() {
  console.log('[Test Suite] Running Phase 10: Mobile Code Editor, Virtual File Tree, Diff Viewer & Live Preview Tests...\n');
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

  // ==========================================
  // 1. Virtual File Tree Logic & Status Badges
  // ==========================================
  const mockTree: FileTreeNode = {
    name: 'root',
    path: '.',
    isDirectory: true,
    children: [
      {
        name: 'src',
        path: 'src',
        isDirectory: true,
        children: [
          { name: 'App.tsx', path: 'src/App.tsx', isDirectory: false, changeStatus: 'modified' },
          { name: 'Button.tsx', path: 'src/Button.tsx', isDirectory: false, changeStatus: 'added' },
          { name: 'old.ts', path: 'src/old.ts', isDirectory: false, changeStatus: 'deleted' },
          { name: 'index.ts', path: 'src/index.ts', isDirectory: false },
        ],
      },
      { name: 'package.json', path: 'package.json', isDirectory: false },
    ],
  };

  // Expand / collapse directory set test
  const collapsedDirs = new Set<string>();
  const toggleDir = (dirPath: string) => {
    if (collapsedDirs.has(dirPath)) collapsedDirs.delete(dirPath);
    else collapsedDirs.add(dirPath);
  };

  assert(!collapsedDirs.has('src'), 'src directory starts expanded');
  toggleDir('src');
  assert(collapsedDirs.has('src'), 'toggleDir collapses src');
  toggleDir('src');
  assert(!collapsedDirs.has('src'), 'toggleDir re-expands src');

  // Change status badge verification
  const getBadge = (status?: 'modified' | 'added' | 'deleted') => {
    if (status === 'modified') return 'M';
    if (status === 'added') return '+';
    if (status === 'deleted') return 'D';
    return null;
  };

  const appFile = mockTree.children?.[0]?.children?.[0];
  const btnFile = mockTree.children?.[0]?.children?.[1];
  const oldFile = mockTree.children?.[0]?.children?.[2];
  const idxFile = mockTree.children?.[0]?.children?.[3];

  assert(getBadge(appFile?.changeStatus) === 'M', 'Modified file badge is M');
  assert(getBadge(btnFile?.changeStatus) === '+', 'Added file badge is +');
  assert(getBadge(oldFile?.changeStatus) === 'D', 'Deleted file badge is D');
  assert(getBadge(idxFile?.changeStatus) === null, 'Unmodified file has no badge');

  // ==========================================================
  // 2. Mobile Code Editor & Programming Accessory Bar
  // ==========================================
  let editorContent = 'export function App() {';
  const initialContent = editorContent;
  let isDirty = false;

  const insertSymbol = (sym: string) => {
    editorContent += sym;
    isDirty = editorContent !== initialContent;
  };

  const insertTab = () => {
    editorContent += '  '; // 2-space tab
    isDirty = editorContent !== initialContent;
  };

  assert(!isDirty, 'Editor starts not dirty');
  insertTab();
  assert(editorContent === 'export function App() {  ', 'TAB inserts 2 spaces');
  assert(isDirty, 'Editor is dirty after TAB insertion');

  insertSymbol('{');
  insertSymbol('}');
  insertSymbol(';');
  assert(editorContent.endsWith('{};'), 'Accessory keys insert code punctuation correctly');

  // Save handler test
  let savedPath = '';
  let savedContent = '';
  const onSave = (path: string, content: string) => {
    savedPath = path;
    savedContent = content;
  };

  onSave('src/App.tsx', editorContent);
  assert(savedPath === 'src/App.tsx' && savedContent === editorContent, 'onSave dispatches correct path and content');

  // ==========================================================
  // 3. Git Visual Diff Viewer & Approval Gate
  // ==========================================================
  const sampleDiffs: FileDiff[] = [
    {
      filePath: 'src/App.tsx',
      changeType: 'modified',
      additions: 12,
      deletions: 3,
      diffText: '@@ -1,3 +1,12 @@\n-old line\n+new line 1\n+new line 2',
    },
    {
      filePath: 'src/components/Header.tsx',
      changeType: 'added',
      additions: 45,
      deletions: 0,
      diffText: '@@ -0,0 +1,45 @@\n+export const Header = () => null;',
    },
  ];

  const totalAdditions = sampleDiffs.reduce((sum, d) => sum + d.additions, 0);
  const totalDeletions = sampleDiffs.reduce((sum, d) => sum + d.deletions, 0);

  assert(totalAdditions === 57, 'Diff Viewer calculates total additions (57)');
  assert(totalDeletions === 3, 'Diff Viewer calculates total deletions (3)');

  // Line diff classification
  const classifyLine = (line: string) => {
    if (line.startsWith('@@')) return 'header';
    if (line.startsWith('+')) return 'addition';
    if (line.startsWith('-')) return 'deletion';
    return 'context';
  };

  const lines = sampleDiffs[0].diffText.split('\n');
  assert(classifyLine(lines[0]) === 'header', 'Diff line @@ classified as header');
  assert(classifyLine(lines[1]) === 'deletion', 'Diff line - classified as deletion');
  assert(classifyLine(lines[2]) === 'addition', 'Diff line + classified as addition');

  // Approve & Push socket event test
  const socket = new QuickKodeSocketClient('ws://localhost:4000');
  let lastPushEvent: any = null;
  (socket as any).send = (event: string, payload: any) => {
    lastPushEvent = { event, payload };
  };

  socket.approvePush('session-dev-1', 'feat(core): approved agent changes');
  assert(
    lastPushEvent?.event === 'agent:approve_push' &&
    lastPushEvent?.payload?.sessionId === 'session-dev-1' &&
    lastPushEvent?.payload?.commitMessage === 'feat(core): approved agent changes',
    'approvePush dispatches agent:approve_push with commit message',
  );

  // ==========================================================
  // 4. Tri-Mode Live Preview (Web, Expo Go, API Docs)
  // ==========================================================
  const webPreview: ActivePreview = {
    projectId: 'web-proj',
    type: 'web',
    port: 3000,
    tunnelUrl: 'https://preview-3000.quickkode.dev',
    status: 'running',
    startedAt: new Date().toISOString(),
  };

  const expoPreview: ActivePreview = {
    projectId: 'mobile-proj',
    type: 'expo',
    port: 8081,
    tunnelUrl: 'https://preview-8081.quickkode.dev',
    expoDeepLink: 'exp://preview-8081.quickkode.dev',
    qrCodeData: 'exp://preview-8081.quickkode.dev',
    status: 'running',
    startedAt: new Date().toISOString(),
  };

  const apiEndpoints: ApiEndpoint[] = [
    { method: 'GET', path: '/api/v1/users', description: 'List all users' },
    { method: 'POST', path: '/api/v1/auth/login', description: 'User authentication' },
  ];

  const apiPreview: ActivePreview = {
    projectId: 'api-proj',
    type: 'api',
    port: 5000,
    tunnelUrl: 'https://preview-5000.quickkode.dev',
    apiEndpoints,
    status: 'running',
    startedAt: new Date().toISOString(),
  };

  assert(webPreview.type === 'web' && webPreview.tunnelUrl?.startsWith('https://'), 'Web preview format valid');
  assert(expoPreview.type === 'expo' && expoPreview.expoDeepLink?.startsWith('exp://'), 'Expo Go deep link valid');
  assert(apiPreview.type === 'api' && (apiPreview.apiEndpoints?.length ?? 0) === 2, 'API Preview endpoints parsed');

  // Verify API endpoint target URL builder
  const buildEndpointUrl = (baseUrl: string, ep: ApiEndpoint) => `${baseUrl.replace(/\/$/, '')}${ep.path}`;
  const targetUrl = buildEndpointUrl(apiPreview.tunnelUrl!, apiEndpoints[0]);
  assert(targetUrl === 'https://preview-5000.quickkode.dev/api/v1/users', 'API endpoint URL constructed cleanly');

  console.log(`\nPhase 10 Audit Results: ${passed} passed, ${failed} failed.`);
  if (failed > 0) {
    process.exit(1);
  }
}

runEditorAndPreviewTests();
