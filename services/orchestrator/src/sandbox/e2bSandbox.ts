import { Sandbox } from '@e2b/code-interpreter';
import type { ISandbox, CommandOptions, CommandResult } from './types.js';
import type { FileTreeNode } from '@quickkode/shared';

export class E2BSandbox implements ISandbox {
  readonly id: string;
  readonly sessionId: string;
  readonly isMock = false;
  private sandbox: Sandbox;
  private isDestroyed = false;

  constructor(sessionId: string, sandbox: Sandbox) {
    this.sessionId = sessionId;
    this.sandbox = sandbox;
    this.id = sandbox.sandboxId;
  }

  static async create(sessionId: string, options?: { apiKey?: string; timeoutMs?: number; template?: string }): Promise<E2BSandbox> {
    const sandbox = await Sandbox.create(options?.template ?? 'base', {
      apiKey: options?.apiKey ?? process.env.E2B_API_KEY,
      timeoutMs: options?.timeoutMs ?? 600000, // 10 minutes default
    });
    return new E2BSandbox(sessionId, sandbox);
  }

  async executeCommand(command: string, options?: CommandOptions): Promise<CommandResult> {
    if (this.isDestroyed) {
      throw new Error(`Sandbox ${this.id} is already destroyed.`);
    }

    try {
      const result = await this.sandbox.commands.run(command, {
        cwd: options?.cwd,
        envs: options?.env,
        timeoutMs: options?.timeoutMs,
        onStdout: options?.onStdout ? (data) => options.onStdout?.(data.toString()) : undefined,
        onStderr: options?.onStderr ? (data) => options.onStderr?.(data.toString()) : undefined,
      });

      return {
        stdout: result.stdout ?? '',
        stderr: result.stderr ?? '',
        exitCode: result.exitCode ?? 0,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        stdout: '',
        stderr: message,
        exitCode: 1,
      };
    }
  }

  async readFile(filePath: string): Promise<string> {
    if (this.isDestroyed) throw new Error(`Sandbox ${this.id} is destroyed.`);
    return this.sandbox.files.read(filePath);
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    if (this.isDestroyed) throw new Error(`Sandbox ${this.id} is destroyed.`);
    await this.sandbox.files.write(filePath, content);
  }

  async listDirectory(dirPath = '/home/user'): Promise<FileTreeNode> {
    if (this.isDestroyed) throw new Error(`Sandbox ${this.id} is destroyed.`);
    return this.buildTreeNode(dirPath);
  }

  private async buildTreeNode(targetPath: string): Promise<FileTreeNode> {
    const name = targetPath.split('/').pop() || 'root';
    const entries = await this.sandbox.files.list(targetPath);

    const children: FileTreeNode[] = [];
    for (const entry of entries) {
      if (entry.name === '.git' || entry.name === 'node_modules') continue;

      const fullChildPath = `${targetPath.replace(/\/$/, '')}/${entry.name}`;
      if (entry.type === 'dir') {
        children.push(await this.buildTreeNode(fullChildPath));
      } else {
        children.push({
          name: entry.name,
          path: fullChildPath,
          isDirectory: false,
          changeStatus: 'clean',
        });
      }
    }

    return {
      name,
      path: targetPath,
      isDirectory: true,
      changeStatus: 'clean',
      children,
    };
  }

  getTunnelUrl(port: number): string {
    return `https://${this.sandbox.getHost(port)}`;
  }

  async destroy(): Promise<void> {
    if (this.isDestroyed) return;
    this.isDestroyed = true;
    try {
      await this.sandbox.kill();
    } catch {
      // Ignore if sandbox was already killed by timeout
    }
  }
}
