import type {
  ActiveModelConfig,
  ExecutionMode,
} from '@quickkode/shared';

export type SocketEventHandler = (payload: any) => void;

export class QuickKodeSocketClient {
  private ws: WebSocket | null = null;
  private listeners = new Map<string, Set<SocketEventHandler>>();
  private serverUrl: string;
  private isConnected = false;

  constructor(serverUrl = 'ws://localhost:4000') {
    this.serverUrl = serverUrl;
  }

  get connected(): boolean {
    return this.isConnected;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.serverUrl);

        this.ws.onopen = () => {
          this.isConnected = true;
          this.emit('connection:open', {});
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data) as { event: string; payload: unknown };
            this.emit(data.event, data.payload);
          } catch (err) {
            console.error('[SocketClient] Failed to parse message:', err);
          }
        };

        this.ws.onclose = () => {
          this.isConnected = false;
          this.emit('connection:close', {});
        };

        this.ws.onerror = (err) => {
          this.emit('connection:error', err);
          reject(err);
        };
      } catch (err) {
        reject(err);
      }
    });
  }

  on(event: string, handler: SocketEventHandler): () => void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(handler);
    return () => set?.delete(handler);
  }

  private emit(event: string, payload: unknown): void {
    const set = this.listeners.get(event);
    if (set) {
      for (const handler of set) {
        handler(payload);
      }
    }
  }

  send(event: string, payload: unknown): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ event, payload }));
    } else {
      console.warn('[SocketClient] Cannot send, socket not open:', event);
    }
  }

  joinSession(sessionId: string): void {
    this.send('session:join', { sessionId });
  }

  leaveSession(sessionId: string): void {
    this.send('session:leave', { sessionId });
  }

  sendPrompt(options: {
    sessionId: string;
    prompt: string;
    mode: ExecutionMode;
    modelConfig: ActiveModelConfig;
  }): void {
    this.send('agent:prompt', options);
  }

  approvePush(sessionId: string, commitMessage?: string): void {
    this.send('agent:approve_push', { sessionId, commitMessage });
  }

  requestFileList(sessionId: string, path = '.'): void {
    this.send('file:list', { sessionId, path });
  }

  requestFileRead(sessionId: string, path: string): void {
    this.send('file:read', { sessionId, path });
  }

  saveFile(sessionId: string, path: string, content: string): void {
    this.send('file:write', { sessionId, path, content });
  }

  importGitHubRepo(repoFullName: string, branch?: string): void {
    this.send('project:import_github', { repoFullName, branch });
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.listeners.clear();
  }
}
