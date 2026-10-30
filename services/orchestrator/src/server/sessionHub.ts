import type { WebSocket } from 'ws';
import type { SocketClientInfo, ActiveSessionContext, InboundMessage } from './types.js';
import type { SandboxManager } from '../sandbox/manager.js';
import type { AgentEngine } from '../agent/agentEngine.js';
import type { DifferentialSyncEngine } from '../drive/syncEngine.js';
import { TurboModeController } from '../workflow/turboController.js';
import { GitHubImporter } from '../git/githubImporter.js';
import { PreviewManager } from '../preview/previewManager.js';
import {
  PromptPayloadSchema,
  FileWritePayloadSchema,
  GitHubImportPayloadSchema,
  ApprovePushPayloadSchema,
  type Session,
  type Project,
  type AgentThought,
} from '@quickkode/shared';

export class SessionHub {
  private clients = new Map<string, SocketClientInfo>();
  private sessionRooms = new Map<string, Set<WebSocket>>();
  private activeContexts = new Map<string, ActiveSessionContext>();
  private controllers = new Map<string, TurboModeController>();

  constructor(
    private sandboxManager: SandboxManager,
    private agentEngine: AgentEngine,
    private syncEngine?: DifferentialSyncEngine,
  ) {}

  registerClient(socket: WebSocket): SocketClientInfo {
    const id = `client-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const info: SocketClientInfo = {
      id,
      socket,
      subscribedSessions: new Set<string>(),
      connectedAt: new Date(),
    };
    this.clients.set(id, info);
    return info;
  }

  unregisterClient(clientId: string): void {
    const info = this.clients.get(clientId);
    if (!info) return;

    for (const sessionId of info.subscribedSessions) {
      this.leaveSession(info.socket, sessionId);
    }
    this.clients.delete(clientId);
  }

  joinSession(socket: WebSocket, sessionId: string): void {
    let room = this.sessionRooms.get(sessionId);
    if (!room) {
      room = new Set<WebSocket>();
      this.sessionRooms.set(sessionId, room);
    }
    room.add(socket);

    // Send current status if session exists
    const ctx = this.activeContexts.get(sessionId);
    if (ctx) {
      this.sendToSocket(socket, 'session:status', {
        sessionId,
        status: ctx.session.status,
      });
    }
  }

  leaveSession(socket: WebSocket, sessionId: string): void {
    const room = this.sessionRooms.get(sessionId);
    if (room) {
      room.delete(socket);
      if (room.size === 0) {
        this.sessionRooms.delete(sessionId);
      }
    }
  }

  broadcast<T>(sessionId: string, event: string, payload: T): void {
    const room = this.sessionRooms.get(sessionId);
    if (!room) return;

    const message = JSON.stringify({ event, payload });
    for (const client of room) {
      if (client.readyState === 1) { // 1 = OPEN
        client.send(message);
      }
    }
  }

  sendToSocket<T>(socket: WebSocket, event: string, payload: T): void {
    if (socket.readyState === 1) {
      socket.send(JSON.stringify({ event, payload }));
    }
  }

  async ensureSessionContext(
    sessionId: string,
    projectId: string,
    useMock = false,
    e2bApiKey?: string,
  ): Promise<ActiveSessionContext> {
    let ctx = this.activeContexts.get(sessionId);
    if (!ctx) {
      const sandbox = await this.sandboxManager.createSandbox({
        sessionId,
        useMock,
        apiKey: e2bApiKey,
      });
      const session: Session = {
        id: sessionId,
        projectId,
        title: 'Active Coding Session',
        mode: 'turbo',
        status: 'idle',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        activeModel: 'antigravity-gemini-2.5',
      };
      const project: Project = {
        id: projectId,
        name: projectId,
        source: 'scratchpad',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        activeSessionId: sessionId,
      };

      ctx = { session, project, sandbox };
      this.activeContexts.set(sessionId, ctx);
      this.controllers.set(sessionId, new TurboModeController(sandbox, this.agentEngine, this.syncEngine));
    }
    return ctx;
  }

  async handleMessage(socket: WebSocket, rawData: string, useMock = false): Promise<void> {
    try {
      const parsed = JSON.parse(rawData) as InboundMessage;
      const { event, payload } = parsed;
      console.log(`[SessionHub] Inbound event: ${event}`, payload);

      switch (event) {
        case 'session:join': {
          const { sessionId } = payload as { sessionId: string };
          this.joinSession(socket, sessionId);
          console.log(`[SessionHub] Client joined room: ${sessionId}`);
          break;
        }

        case 'session:leave': {
          const { sessionId } = payload as { sessionId: string };
          this.leaveSession(socket, sessionId);
          break;
        }

        case 'agent:prompt': {
          const validation = PromptPayloadSchema.safeParse(payload);
          if (!validation.success) {
            console.error('[SessionHub] Prompt validation failed:', validation.error.format());
            this.sendToSocket(socket, 'session:error', {
              error: `Invalid prompt request: ${validation.error.message}`,
            });
            return;
          }

          const { sessionId, prompt, mode, modelConfig, byok } = validation.data;
          const ctx = await this.ensureSessionContext(sessionId, 'default-project', useMock, byok?.e2bApiKey);
          if (byok?.googleDriveFolderId) {
            ctx.driveFolderId = byok.googleDriveFolderId;
          }

          // If user configured Gemini API key in-app, use it
          const activeModelConfig = { ...modelConfig };
          if (activeModelConfig.provider === 'antigravity' && byok?.geminiApiKey) {
            activeModelConfig.authType = 'api_key';
            activeModelConfig.geminiApiKey = byok.geminiApiKey;
          }

          const controller =
            this.controllers.get(sessionId) ??
            new TurboModeController(ctx.sandbox, this.agentEngine, this.syncEngine);

          // Run workflow asynchronously in background
          void (async () => {
            try {
              const result = await controller.runWorkflow({
                sessionId,
                projectId: ctx.project.id,
                prompt,
                mode,
                modelConfig: activeModelConfig,
                driveFolderId: ctx.driveFolderId,
                useMock,
                onThought: (thought: AgentThought) => {
                  this.broadcast(sessionId, 'agent:thought', {
                    sessionId,
                    thoughtId: thought.id,
                    title: thought.title,
                    content: thought.content,
                    isComplete: thought.status === 'completed',
                  });
                },
                onTerminalChunk: (chunk: string, stream: 'stdout' | 'stderr') => {
                  this.broadcast(sessionId, 'agent:terminal_log', {
                    sessionId,
                    chunk,
                    stream,
                  });
                },
                onStatusChange: (status: string, message?: string) => {
                  ctx.session.status = status as Session['status'];
                  this.broadcast(sessionId, 'session:status', {
                    sessionId,
                    status,
                    message,
                  });
                },
              });

              if (result.diffs.length > 0) {
                this.broadcast(sessionId, 'agent:diff_ready', {
                  sessionId,
                  diffs: result.diffs,
                });
              }

              // Broadcast updated virtual file tree to mobile client
              try {
                const tree = await ctx.sandbox.listDirectory('.');
                this.broadcast(sessionId, 'file:tree', {
                  sessionId,
                  tree,
                });
              } catch {
                // ignore if listing fails
              }

              if (result.testResult) {
                this.broadcast(sessionId, 'agent:test_completed', {
                  sessionId,
                  result: result.testResult,
                });
              }

              // Check if dev server is ready for preview
              const previewManager = new PreviewManager(ctx.sandbox);
              const preview = await previewManager.startPreview({ sessionId });
              this.broadcast(sessionId, 'preview:ready', {
                sessionId,
                preview,
              });

              this.broadcast(sessionId, 'agent:completed', {
                sessionId,
                summary: result.agentSummary,
                gitPushed: result.gitPushed,
                driveSynced: result.driveSynced,
              });
            } catch (workflowErr: unknown) {
              const msg = workflowErr instanceof Error ? workflowErr.message : String(workflowErr);
              this.broadcast(sessionId, 'session:error', {
                sessionId,
                error: msg,
              });
            }
          })();

          break;
        }

        case 'agent:approve_push': {
          const validation = ApprovePushPayloadSchema.safeParse(payload);
          if (!validation.success) return;

          const { sessionId, commitMessage } = validation.data;
          const controller = this.controllers.get(sessionId);
          const ctx = this.activeContexts.get(sessionId);

          if (controller && ctx) {
            this.broadcast(sessionId, 'session:status', {
              sessionId,
              status: 'pushing_to_git',
              message: 'Approved: committing and pushing changes...',
            });

            const res = await controller.approveAndPush({
              driveFolderId: ctx.driveFolderId,
              commitMessage,
            });

            this.broadcast(sessionId, 'agent:completed', {
              sessionId,
              summary: 'Approved changes successfully committed and synced.',
              gitPushed: res.gitPushed,
              driveSynced: res.driveSynced,
            });
          }
          break;
        }

        case 'file:list': {
          const { sessionId, path: dirPath } = payload as { sessionId: string; path?: string };
          const ctx = await this.ensureSessionContext(sessionId, 'default-project', useMock);
          const root = await ctx.sandbox.listDirectory(dirPath ?? '.');
          this.sendToSocket(socket, 'file:tree', { sessionId, root });
          break;
        }

        case 'file:read': {
          const { sessionId, path: filePath } = payload as { sessionId: string; path: string };
          const ctx = await this.ensureSessionContext(sessionId, 'default-project', useMock);
          const content = await ctx.sandbox.readFile(filePath);
          this.sendToSocket(socket, 'file:content', { sessionId, path: filePath, content });
          break;
        }

        case 'file:write': {
          const validation = FileWritePayloadSchema.safeParse(payload);
          if (!validation.success) return;

          const { sessionId, path: filePath, content } = validation.data;
          const ctx = await this.ensureSessionContext(sessionId, 'default-project', useMock);
          await ctx.sandbox.writeFile(filePath, content);
          this.sendToSocket(socket, 'file:saved', { sessionId, path: filePath, success: true });
          break;
        }

        case 'project:import_github': {
          const validation = GitHubImportPayloadSchema.safeParse(payload);
          if (!validation.success) {
            this.sendToSocket(socket, 'session:error', {
              error: `Invalid GitHub import: ${validation.error.message}`,
            });
            return;
          }

          const { repoFullName, branch } = validation.data;
          const newSessionId = `session-${Date.now()}`;
          const ctx = await this.ensureSessionContext(newSessionId, repoFullName, useMock);

          this.joinSession(socket, newSessionId);
          this.broadcast(newSessionId, 'session:status', {
            sessionId: newSessionId,
            status: 'starting_sandbox',
            message: `Cloning GitHub repository "${repoFullName}"...`,
          });

          const importer = new GitHubImporter(ctx.sandbox);
          const cloneRes = await importer.clone({ repoFullName, branch });

          if (cloneRes.success) {
            this.broadcast(newSessionId, 'session:status', {
              sessionId: newSessionId,
              status: 'idle',
              message: `Successfully cloned ${repoFullName} on branch ${cloneRes.branch}. Ready.`,
            });
          } else {
            this.broadcast(newSessionId, 'session:error', {
              sessionId: newSessionId,
              error: cloneRes.error ?? 'Clone failed',
            });
          }
          break;
        }

        default:
          break;
      }
    } catch (parseErr: unknown) {
      const msg = parseErr instanceof Error ? parseErr.message : String(parseErr);
      this.sendToSocket(socket, 'session:error', { error: `Malformed message: ${msg}` });
    }
  }

  getActiveSessionsCount(): number {
    return this.activeContexts.size;
  }

  getSessionContext(sessionId: string): ActiveSessionContext | undefined {
    return this.activeContexts.get(sessionId);
  }
}
