import * as http from 'node:http';
import { WebSocketServer, type WebSocket } from 'ws';
import type { SessionHub } from './sessionHub.js';

export interface ServerOptions {
  port?: number;
  useMock?: boolean;
}

export class QuickKodeServer {
  private httpServer: http.Server;
  private wss: WebSocketServer;
  private isListening = false;

  constructor(
    private sessionHub: SessionHub,
    private options?: ServerOptions,
  ) {
    this.httpServer = http.createServer((req, res) => {
      this.handleHttpRequest(req, res);
    });

    this.wss = new WebSocketServer({ server: this.httpServer });
    this.setupWebSocket();
  }

  private handleHttpRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    if (req.method === 'GET' && url.pathname === '/health') {
      res.writeHead(200);
      res.end(
        JSON.stringify({
          status: 'ok',
          service: 'quickkode-orchestrator',
          activeSessions: this.sessionHub.getActiveSessionsCount(),
          timestamp: new Date().toISOString(),
        }),
      );
      return;
    }

    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Endpoint not found' }));
  }

  private setupWebSocket(): void {
    this.wss.on('connection', (socket: WebSocket) => {
      const client = this.sessionHub.registerClient(socket);

      socket.on('message', (data: Buffer | string) => {
        const text = data.toString('utf-8');
        void this.sessionHub.handleMessage(socket, text, this.options?.useMock ?? false);
      });

      socket.on('close', () => {
        this.sessionHub.unregisterClient(client.id);
      });

      socket.on('error', (err) => {
        console.error(`[WebSocket Client ${client.id}] Error:`, err);
        this.sessionHub.unregisterClient(client.id);
      });
    });
  }

  async start(port = 4000): Promise<number> {
    return new Promise((resolve) => {
      this.httpServer.listen(port, () => {
        this.isListening = true;
        const address = this.httpServer.address();
        const actualPort = typeof address === 'object' && address ? address.port : port;
        console.log(`[QuickKodeServer] HTTP & WebSocket Server listening on port ${actualPort}`);
        resolve(actualPort);
      });
    });
  }

  async stop(): Promise<void> {
    if (!this.isListening) return;

    return new Promise((resolve, reject) => {
      this.wss.close((wsErr) => {
        if (wsErr) {
          reject(wsErr);
          return;
        }
        this.httpServer.close((httpErr) => {
          this.isListening = false;
          if (httpErr) reject(httpErr);
          else resolve();
        });
      });
    });
  }

  getHttpServer(): http.Server {
    return this.httpServer;
  }
}
