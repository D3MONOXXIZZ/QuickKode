import { WebSocket } from 'ws';
import { SandboxManager } from '../src/sandbox/index.js';
import { AgentEngine } from '../src/agent/index.js';
import { SessionHub } from '../src/server/sessionHub.js';
import { QuickKodeServer } from '../src/server/httpServer.js';
import type { InboundMessage } from '../src/server/types.js';

async function runSocketHubTests() {
  console.log('[Test Suite] Running Phase 8: Multi-Session WebSocket Hub Tests...\n');
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

  const sandboxManager = new SandboxManager();
  const agentEngine = new AgentEngine();
  const sessionHub = new SessionHub(sandboxManager, agentEngine);
  const server = new QuickKodeServer(sessionHub, { useMock: true });

  const port = await server.start(0); // Random free port

  try {
    // 1. Test HTTP Health Check Endpoint
    const healthRes = await fetch(`http://localhost:${port}/health`);
    assert(healthRes.status === 200, 'HTTP /health endpoint returns 200 OK');
    const healthData = (await healthRes.json()) as { status: string; service: string };
    assert(healthData.status === 'ok' && healthData.service === 'quickkode-orchestrator', 'Health check returns valid JSON schema');

    // 2. Multi-Session WebSocket Isolation Setup
    const sessionA = '00000000-0000-0000-0000-000000000001';
    const sessionB = '00000000-0000-0000-0000-000000000002';

    const client1 = new WebSocket(`ws://localhost:${port}`);
    const client2 = new WebSocket(`ws://localhost:${port}`);

    await Promise.all([
      new Promise((res) => client1.on('open', res)),
      new Promise((res) => client2.on('open', res)),
    ]);
    assert(true, 'Two concurrent WebSocket clients connected');

    const client1Messages: InboundMessage[] = [];
    const client2Messages: InboundMessage[] = [];

    client1.on('message', (d) => client1Messages.push(JSON.parse(d.toString())));
    client2.on('message', (d) => client2Messages.push(JSON.parse(d.toString())));

    // Client 1 joins Session A, Client 2 joins Session B
    client1.send(JSON.stringify({ event: 'session:join', payload: { sessionId: sessionA } }));
    client2.send(JSON.stringify({ event: 'session:join', payload: { sessionId: sessionB } }));

    await new Promise((r) => setTimeout(r, 50));

    // Broadcast specifically to Session A
    sessionHub.broadcast(sessionA, 'session:status', { sessionId: sessionA, status: 'agent_thinking' });
    await new Promise((r) => setTimeout(r, 50));

    assert(client1Messages.some((m) => m.event === 'session:status'), 'Client 1 received Session A broadcast');
    assert(!client2Messages.some((m) => m.event === 'session:status'), 'Client 2 isolated: zero message leakage from Session A');

    // 3. Virtual File Operations over WebSocket (Mobile Code Editor protocol)
    client1.send(
      JSON.stringify({
        event: 'file:write',
        payload: {
          sessionId: sessionA,
          path: 'src/main.ts',
          content: 'export const status = "connected";\n',
        },
      }),
    );
    await new Promise((r) => setTimeout(r, 80));
    assert(client1Messages.some((m) => m.event === 'file:saved'), 'Received file:saved confirmation');

    client1.send(
      JSON.stringify({
        event: 'file:read',
        payload: {
          sessionId: sessionA,
          path: 'src/main.ts',
        },
      }),
    );
    await new Promise((r) => setTimeout(r, 80));
    const contentMsg = client1Messages.find((m) => m.event === 'file:content');
    assert(
      contentMsg !== undefined && (contentMsg.payload as { content: string }).content.includes('connected'),
      'Received file:content with written code',
    );

    client1.send(
      JSON.stringify({
        event: 'file:list',
        payload: {
          sessionId: sessionA,
          path: '.',
        },
      }),
    );
    await new Promise((r) => setTimeout(r, 80));
    assert(client1Messages.some((m) => m.event === 'file:tree'), 'Received file:tree virtual file hierarchy');

    // 4. Agent Prompt Dispatch & Real-Time Event Streaming
    client1.send(
      JSON.stringify({
        event: 'agent:prompt',
        payload: {
          sessionId: sessionA,
          prompt: 'Implement auth token validator',
          mode: 'turbo',
          modelConfig: {
            provider: 'antigravity',
            modelName: 'antigravity-gemini-2.5',
            authType: 'pc_account',
          },
        },
      }),
    );

    // Wait for agent execution, thoughts, and completion events
    await new Promise((r) => setTimeout(r, 400));

    assert(client1Messages.some((m) => m.event === 'agent:thought'), 'Streamed agent:thought records over WebSocket');
    assert(client1Messages.some((m) => m.event === 'agent:completed'), 'Streamed agent:completed completion signal');
    assert(client1Messages.some((m) => m.event === 'preview:ready'), 'Streamed preview:ready endpoint configuration');

    // 5. Clean Teardown
    client1.close();
    client2.close();
    await server.stop();
    await sandboxManager.destroyAll();
    assert(true, 'Server and WebSocket clients cleanly shut down');

    console.log(`\nPhase 8 Audit Results: ${passed} passed, ${failed} failed.`);
    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal error during socket hub tests:', err);
    process.exit(1);
  }
}

void runSocketHubTests();
