export * from './sandbox/index.js';
export * from './git/index.js';
export * from './drive/index.js';
export * from './agent/index.js';
export * from './workflow/index.js';
export * from './preview/index.js';
export * from './server/index.js';

import { SandboxManager } from './sandbox/manager.js';
import { IdleReaper } from './sandbox/reaper.js';
import { AgentEngine } from './agent/agentEngine.js';
import { SessionHub } from './server/sessionHub.js';
import { QuickKodeServer } from './server/httpServer.js';

export function initializeOrchestrator(port = 4000) {
  console.log('[Orchestrator] Initializing Core Services...');
  const sandboxManager = new SandboxManager();
  const reaper = new IdleReaper(sandboxManager);
  const agentEngine = new AgentEngine();
  reaper.start();

  const sessionHub = new SessionHub(sandboxManager, agentEngine);
  const server = new QuickKodeServer(sessionHub);

  return { sandboxManager, reaper, agentEngine, sessionHub, server, start: () => server.start(port) };
}

if (process.env.NODE_ENV !== 'test' && !process.env.VITEST) {
  const orchestrator = initializeOrchestrator(Number(process.env.PORT) || 4000);
  void orchestrator.start();
}
