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

  private async handleHttpRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
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

    if (req.method === 'GET' && url.pathname === '/auth/config') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          google: {
            configured: Boolean(process.env.GOOGLE_CLIENT_ID),
            clientId: process.env.GOOGLE_CLIENT_ID || null,
          },
          github: {
            configured: Boolean(process.env.GITHUB_CLIENT_ID),
            clientId: process.env.GITHUB_CLIENT_ID || null,
          },
        }),
      );
      return;
    }

    if (req.method === 'GET' && url.pathname === '/auth/github') {
      const redirectUri = url.searchParams.get('redirect_uri') || 'quickkode://auth/github';
      const clientId = url.searchParams.get('client_id') || process.env.GITHUB_CLIENT_ID;
      if (clientId) {
        const host = req.headers.host || '192.168.1.80:4000';
        const serverCallbackUri = `http://${host}/auth/github/callback`;
        const ghAuthUrl = `https://github.com/login/oauth/authorize?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(serverCallbackUri)}&scope=${encodeURIComponent('repo,read:user,user:email')}&state=${encodeURIComponent(redirectUri)}`;
        res.writeHead(302, { Location: ghAuthUrl });
        res.end();
        return;
      }

      const callbackUrl = new URL(redirectUri);
      callbackUrl.searchParams.set('token', 'gho_oauth_session_active');
      callbackUrl.searchParams.set('username', 'github-developer');
      callbackUrl.searchParams.set(
        'avatar_url',
        'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png',
      );
      res.writeHead(302, { Location: callbackUrl.toString() });
      res.end();
      return;
    }

    if (req.method === 'GET' && url.pathname === '/auth/github/callback') {
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state') || 'quickkode://auth/github';
      const error = url.searchParams.get('error');

      if (error) {
        const errUrl = new URL(state);
        errUrl.searchParams.set('error', error);
        res.writeHead(302, { Location: errUrl.toString() });
        res.end();
        return;
      }

      if (!code) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Missing authorization code from GitHub' }));
        return;
      }

      const clientId = process.env.GITHUB_CLIENT_ID;
      const clientSecret = process.env.GITHUB_CLIENT_SECRET;
      const host = req.headers.host || '192.168.1.80:4000';
      const serverCallbackUri = `http://${host}/auth/github/callback`;

      if (!clientId || !clientSecret) {
        const missingUrl = new URL(state);
        missingUrl.searchParams.set('error', 'GITHUB_CLIENT_SECRET not configured on server');
        res.writeHead(302, { Location: missingUrl.toString() });
        res.end();
        return;
      }

      try {
        const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            client_id: clientId,
            client_secret: clientSecret,
            code,
            redirect_uri: serverCallbackUri,
          }),
        });

        if (!tokenRes.ok) {
          const errText = await tokenRes.text();
          console.error('[OAuth] GitHub token exchange failed:', errText);
          const errUrl = new URL(state);
          errUrl.searchParams.set('error', 'GitHub token exchange failed');
          res.writeHead(302, { Location: errUrl.toString() });
          res.end();
          return;
        }

        const tokenData = (await tokenRes.json()) as {
          access_token?: string;
          token_type?: string;
          error?: string;
          error_description?: string;
        };

        if (tokenData.error || !tokenData.access_token) {
          console.error('[OAuth] GitHub returned token error:', tokenData);
          const errUrl = new URL(state);
          errUrl.searchParams.set('error', tokenData.error_description || tokenData.error || 'Token error');
          res.writeHead(302, { Location: errUrl.toString() });
          res.end();
          return;
        }

        // Fetch user profile from GitHub API
        let username = 'github-user';
        let displayName = 'GitHub Developer';
        let email: string | undefined = undefined;
        let avatarUrl = 'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png';

        try {
          const userRes = await fetch('https://api.github.com/user', {
            headers: {
              Authorization: `Bearer ${tokenData.access_token}`,
              'User-Agent': 'QuickKode-Orchestrator',
            },
          });
          if (userRes.ok) {
            const userData = (await userRes.json()) as {
              login?: string;
              name?: string;
              email?: string;
              avatar_url?: string;
            };
            username = userData.login || username;
            displayName = userData.name || userData.login || displayName;
            email = userData.email || undefined;
            avatarUrl = userData.avatar_url || avatarUrl;
          }

          if (!email) {
            const emailRes = await fetch('https://api.github.com/user/emails', {
              headers: {
                Authorization: `Bearer ${tokenData.access_token}`,
                'User-Agent': 'QuickKode-Orchestrator',
              },
            });
            if (emailRes.ok) {
              const emails = (await emailRes.json()) as Array<{ email: string; primary: boolean }>;
              const primary = emails.find((e) => e.primary);
              if (primary) email = primary.email;
            }
          }
        } catch (uErr) {
          console.warn('[OAuth] Failed to fetch GitHub userinfo:', uErr);
        }

        const successUrl = new URL(state);
        successUrl.searchParams.set('token', tokenData.access_token);
        successUrl.searchParams.set('username', username);
        successUrl.searchParams.set('name', displayName);
        if (email) successUrl.searchParams.set('email', email);
        successUrl.searchParams.set('avatar_url', avatarUrl);

        res.writeHead(302, { Location: successUrl.toString() });
        res.end();
        return;
      } catch (ex: unknown) {
        console.error('[OAuth] Exception during GitHub code exchange:', ex);
        const errUrl = new URL(state);
        errUrl.searchParams.set('error', 'Authentication exchange error');
        res.writeHead(302, { Location: errUrl.toString() });
        res.end();
        return;
      }
    }

    if (req.method === 'GET' && url.pathname === '/auth/google') {
      const redirectUri = url.searchParams.get('redirect_uri') || 'quickkode://auth/google';
      const clientId = url.searchParams.get('client_id') || process.env.GOOGLE_CLIENT_ID;
      if (clientId) {
        const host = req.headers.host || '192.168.1.80:4000';
        const serverCallbackUri = `http://${host}/auth/google/callback`;
        const scopes = 'openid email profile https://www.googleapis.com/auth/generative-language https://www.googleapis.com/auth/drive.file';
        const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(serverCallbackUri)}&response_type=code&scope=${encodeURIComponent(scopes)}&access_type=offline&prompt=consent&state=${encodeURIComponent(redirectUri)}`;
        res.writeHead(302, { Location: googleAuthUrl });
        res.end();
        return;
      }

      const callbackUrl = new URL(redirectUri);
      callbackUrl.searchParams.set('token', 'goog_oauth_session_active');
      callbackUrl.searchParams.set('name', 'Google Antigravity User');
      callbackUrl.searchParams.set('email', 'user@gmail.com');
      callbackUrl.searchParams.set(
        'avatar_url',
        'https://www.gstatic.com/images/branding/product/2x/googleg_48dp.png',
      );
      res.writeHead(302, { Location: callbackUrl.toString() });
      res.end();
      return;
    }

    if (req.method === 'GET' && url.pathname === '/auth/google/callback') {
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state') || 'quickkode://auth/google';
      const error = url.searchParams.get('error');

      if (error) {
        const errUrl = new URL(state);
        errUrl.searchParams.set('error', error);
        res.writeHead(302, { Location: errUrl.toString() });
        res.end();
        return;
      }

      if (!code) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Missing authorization code from Google' }));
        return;
      }

      const clientId = process.env.GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
      const host = req.headers.host || '192.168.1.80:4000';
      const serverCallbackUri = `http://${host}/auth/google/callback`;

      if (!clientId || !clientSecret) {
        // Redirect with instruction that client secret is needed
        const missingUrl = new URL(state);
        missingUrl.searchParams.set('error', 'GOOGLE_CLIENT_SECRET not configured on server');
        res.writeHead(302, { Location: missingUrl.toString() });
        res.end();
        return;
      }

      try {
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            code,
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: serverCallbackUri,
            grant_type: 'authorization_code',
          }).toString(),
        });

        if (!tokenRes.ok) {
          const errText = await tokenRes.text();
          console.error('[OAuth] Google token exchange failed:', errText);
          const errUrl = new URL(state);
          errUrl.searchParams.set('error', 'Google token exchange failed');
          res.writeHead(302, { Location: errUrl.toString() });
          res.end();
          return;
        }

        const tokenData = (await tokenRes.json()) as {
          access_token: string;
          refresh_token?: string;
          expires_in?: number;
        };

        let name = 'Google User';
        let email = 'user@gmail.com';
        let avatarUrl = 'https://www.gstatic.com/images/branding/product/2x/googleg_48dp.png';

        try {
          const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${tokenData.access_token}` },
          });
          if (userRes.ok) {
            const userData = (await userRes.json()) as { name?: string; email?: string; picture?: string };
            name = userData.name || name;
            email = userData.email || email;
            avatarUrl = userData.picture || avatarUrl;
          }
        } catch (uErr) {
          console.warn('[OAuth] Failed to fetch Google userinfo:', uErr);
        }

        const successUrl = new URL(state);
        successUrl.searchParams.set('token', tokenData.access_token);
        if (tokenData.refresh_token) {
          successUrl.searchParams.set('refresh_token', tokenData.refresh_token);
        }
        successUrl.searchParams.set('name', name);
        successUrl.searchParams.set('email', email);
        successUrl.searchParams.set('avatar_url', avatarUrl);

        res.writeHead(302, { Location: successUrl.toString() });
        res.end();
        return;
      } catch (ex: unknown) {
        console.error('[OAuth] Exception during Google code exchange:', ex);
        const errUrl = new URL(state);
        errUrl.searchParams.set('error', 'Authentication exchange error');
        res.writeHead(302, { Location: errUrl.toString() });
        res.end();
        return;
      }
    }

    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Endpoint not found' }));
  }

  private setupWebSocket(): void {
    this.wss.on('connection', (socket: WebSocket) => {
      const client = this.sessionHub.registerClient(socket);
      console.log(`[QuickKodeServer] WebSocket Client connected: ${client.id}`);

      socket.on('message', (data: Buffer | string) => {
        const text = data.toString('utf-8');
        void this.sessionHub.handleMessage(socket, text, this.options?.useMock ?? false);
      });

      socket.on('close', () => {
        console.log(`[QuickKodeServer] WebSocket Client disconnected: ${client.id}`);
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
      this.httpServer.listen(port, '0.0.0.0', () => {
        this.isListening = true;
        const address = this.httpServer.address();
        const actualPort = typeof address === 'object' && address ? address.port : port;
        console.log(`[QuickKodeServer] HTTP & WebSocket Server listening on 0.0.0.0:${actualPort}`);
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
