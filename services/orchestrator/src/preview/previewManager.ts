import type { ISandbox } from '../sandbox/types.js';
import type { ActivePreview, WebPreviewConfig, ExpoPreviewConfig, ApiPreviewConfig } from '@quickkode/shared';
import { ProjectTypeDetector } from './detector.js';
import { ApiScanner } from './apiScanner.js';
import type { PreviewOptions, RunningServerInfo } from './types.js';

export class PreviewManager {
  private activeServers = new Map<string, RunningServerInfo>();

  constructor(private sandbox: ISandbox) {}

  async startPreview(options: PreviewOptions): Promise<ActivePreview> {
    const detector = new ProjectTypeDetector(this.sandbox);
    const detected = await detector.detect();

    const mode = options.forceMode ?? detected.mode;
    const port = options.targetPort ?? detected.defaultPort;
    const startCmd = options.customStartCommand ?? detected.startCommand;

    // Start dev server in the background inside the sandbox
    void this.sandbox.executeCommand(startCmd);

    const tunnelUrl = this.sandbox.getTunnelUrl(port);
    let preview: ActivePreview;

    switch (mode) {
      case 'expo': {
        // Build Expo Go deep-link URL (exp://...)
        const tunnelHost = tunnelUrl.replace(/^https?:\/\//, '');
        const deepLinkUrl = `exp://${tunnelHost}`;

        const expoConfig: ExpoPreviewConfig = {
          mode: 'expo',
          expoPort: port,
          tunnelUrl,
          deepLinkUrl,
          isReady: true,
        };
        preview = expoConfig;
        break;
      }

      case 'api': {
        const scanner = new ApiScanner(this.sandbox);
        const endpoints = await scanner.scanEndpoints();

        const apiConfig: ApiPreviewConfig = {
          mode: 'api',
          localPort: port,
          tunnelUrl,
          swaggerUrl: `${tunnelUrl}/docs`,
          endpoints,
          isReady: true,
        };
        preview = apiConfig;
        break;
      }

      case 'web':
      default: {
        const serverType = (['nextjs', 'vite', 'cra'].includes(detected.framework)
          ? detected.framework
          : 'custom') as WebPreviewConfig['serverType'];

        const webConfig: WebPreviewConfig = {
          mode: 'web',
          localPort: port,
          tunnelUrl,
          isReady: true,
          serverType,
        };
        preview = webConfig;
        break;
      }
    }

    const serverInfo: RunningServerInfo = {
      port,
      startCommand: startCmd,
      tunnelUrl,
      preview,
      startedAt: new Date(),
    };
    this.activeServers.set(options.sessionId, serverInfo);

    return preview;
  }

  getRunningPreview(sessionId: string): ActivePreview | null {
    return this.activeServers.get(sessionId)?.preview ?? null;
  }

  async stopPreview(sessionId: string): Promise<void> {
    const server = this.activeServers.get(sessionId);
    if (!server) return;

    // Kill any dev server running on that port
    await this.sandbox.executeCommand(`npx kill-port ${server.port}`).catch(() => void 0);
    this.activeServers.delete(sessionId);
  }
}
