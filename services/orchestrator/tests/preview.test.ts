import { SandboxManager } from '../src/sandbox/index.js';
import { ProjectTypeDetector, ApiScanner, PreviewManager } from '../src/preview/index.js';
import type { WebPreviewConfig, ExpoPreviewConfig, ApiPreviewConfig } from '@quickkode/shared';

async function runPreviewTests() {
  console.log('[Test Suite] Running Phase 7: Tri-Mode Mobile Testing & Tunnels Tests...\n');
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
  const sessionId = 'preview-test-session-001';

  try {
    const sandbox = await manager.createSandbox({ sessionId, useMock: true });
    const detector = new ProjectTypeDetector(sandbox);

    // 1. Detection: Next.js Web App
    await sandbox.writeFile(
      'package.json',
      JSON.stringify({
        name: 'next-app',
        dependencies: { next: '^14.0.0', react: '^18.0.0' },
      }),
    );
    const nextDetected = await detector.detect();
    assert(nextDetected.mode === 'web' && nextDetected.framework === 'nextjs', 'Detects Next.js Web application');
    assert(nextDetected.defaultPort === 3000, 'Next.js default port is 3000');

    // 2. Detection: Expo / React Native App
    await sandbox.writeFile(
      'package.json',
      JSON.stringify({
        name: 'expo-mobile-app',
        dependencies: { expo: '^51.0.0', 'react-native': '0.74.0' },
      }),
    );
    const expoDetected = await detector.detect();
    assert(expoDetected.mode === 'expo' && expoDetected.framework === 'expo', 'Detects Expo Mobile application');
    assert(expoDetected.defaultPort === 8081, 'Expo default port is 8081');
    assert(expoDetected.startCommand.includes('--tunnel'), 'Expo command uses --tunnel flag');

    // 3. Detection: Backend Express API
    await sandbox.writeFile(
      'package.json',
      JSON.stringify({
        name: 'express-api',
        dependencies: { express: '^4.19.0' },
      }),
    );
    const expressDetected = await detector.detect();
    assert(expressDetected.mode === 'api' && expressDetected.framework === 'express', 'Detects Express Backend API');

    // 4. ApiScanner: Route Parsing
    await sandbox.writeFile(
      'src/routes.js',
      `
      app.get('/api/users', (req, res) => res.json([]));
      app.post('/api/auth/login', (req, res) => res.json({ token: 'abc' }));
      router.delete('/api/items/:id', (req, res) => res.sendStatus(204));
      `,
    );

    const apiScanner = new ApiScanner(sandbox);
    const endpoints = await apiScanner.scanEndpoints();
    assert(endpoints.length >= 3, 'Scanned multiple endpoints from source code');
    assert(endpoints.some((e) => e.path === '/api/users' && e.method === 'GET'), 'Extracted GET /api/users');
    assert(endpoints.some((e) => e.path === '/api/auth/login' && e.method === 'POST'), 'Extracted POST /api/auth/login');
    assert(endpoints.some((e) => e.path === '/api/items/:id' && e.method === 'DELETE'), 'Extracted DELETE /api/items/:id');

    // 5. PreviewManager Tri-Mode Testing
    const previewManager = new PreviewManager(sandbox);

    // Mode A: Web Preview Generation
    const webPreview = (await previewManager.startPreview({
      sessionId,
      forceMode: 'web',
      targetPort: 3000,
    })) as WebPreviewConfig;

    assert(webPreview.mode === 'web', 'Generated WebPreviewConfig');
    assert(webPreview.isReady, 'Web preview marked ready');
    assert(webPreview.tunnelUrl?.startsWith('https://'), 'Generated secure HTTPS tunnel URL');
    assert(webPreview.localPort === 3000, 'Web preview targeted port 3000');

    // Mode B: Expo Mobile Preview Generation
    const expoPreview = (await previewManager.startPreview({
      sessionId,
      forceMode: 'expo',
      targetPort: 8081,
    })) as ExpoPreviewConfig;

    assert(expoPreview.mode === 'expo', 'Generated ExpoPreviewConfig');
    assert(expoPreview.deepLinkUrl?.startsWith('exp://'), 'Generated valid exp:// Expo Go deep-link URL');
    assert(expoPreview.expoPort === 8081, 'Targeted Expo port 8081');

    // Mode C: API Backend Preview Generation
    const apiPreview = (await previewManager.startPreview({
      sessionId,
      forceMode: 'api',
      targetPort: 5000,
    })) as ApiPreviewConfig;

    assert(apiPreview.mode === 'api', 'Generated ApiPreviewConfig');
    assert(apiPreview.swaggerUrl?.includes('/docs'), 'Includes Swagger /docs UI endpoint');
    assert((apiPreview.endpoints?.length ?? 0) > 0, 'Includes scanned API endpoints for interactive mobile runner');

    // Stop preview
    await previewManager.stopPreview(sessionId);
    assert(previewManager.getRunningPreview(sessionId) === null, 'Preview successfully stopped and cleaned up');

    // Teardown
    await manager.destroyAll();

    console.log(`\nPhase 7 Audit Results: ${passed} passed, ${failed} failed.`);
    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal error during preview tests:', err);
    process.exit(1);
  }
}

void runPreviewTests();
