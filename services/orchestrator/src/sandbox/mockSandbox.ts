import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { exec } from 'node:child_process';
import type { ISandbox, CommandOptions, CommandResult } from './types.js';
import type { FileTreeNode } from '@quickkode/shared';

export class MockSandbox implements ISandbox {
  readonly id: string;
  readonly sessionId: string;
  readonly isMock = true;
  private rootDir: string;
  private isDestroyed = false;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
    this.id = `mock-sbx-${sessionId.slice(0, 8)}-${Date.now()}`;
    this.rootDir = path.join(os.tmpdir(), 'quickkode-mock-sandboxes', this.id);
  }

  async init(): Promise<void> {
    await fs.mkdir(this.rootDir, { recursive: true });
    // Write a sample initial structure
    await fs.writeFile(path.join(this.rootDir, 'README.md'), '# QuickKode Sandbox Workspace\n');
  }

  private resolvePath(relativePath: string): string {
    const cleanPath = relativePath.startsWith('/') ? relativePath.slice(1) : relativePath;
    const resolved = path.resolve(this.rootDir, cleanPath);
    if (!resolved.startsWith(this.rootDir)) {
      throw new Error(`Access denied: path traverses outside sandbox: ${relativePath}`);
    }
    return resolved;
  }

  async executeCommand(command: string, options?: CommandOptions): Promise<CommandResult> {
    if (this.isDestroyed) {
      throw new Error(`Sandbox ${this.id} is already destroyed.`);
    }

    const workingDir = options?.cwd ? this.resolvePath(options.cwd) : this.rootDir;
    
    return new Promise((resolve) => {
      const child = exec(command, {
        cwd: workingDir,
        timeout: options?.timeoutMs || 30000,
        env: { ...process.env, ...options?.env },
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        const text = data.toString();
        stdout += text;
        options?.onStdout?.(text);
      });

      child.stderr?.on('data', (data) => {
        const text = data.toString();
        stderr += text;
        options?.onStderr?.(text);
      });

      child.on('close', (code) => {
        resolve({
          stdout,
          stderr,
          exitCode: code ?? 0,
        });
      });

      child.on('error', (err) => {
        stderr += err.message;
        resolve({
          stdout,
          stderr,
          exitCode: 1,
        });
      });
    });
  }

  async readFile(filePath: string): Promise<string> {
    if (this.isDestroyed) throw new Error(`Sandbox ${this.id} is destroyed.`);
    const target = this.resolvePath(filePath);
    return fs.readFile(target, 'utf-8');
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    if (this.isDestroyed) throw new Error(`Sandbox ${this.id} is destroyed.`);
    const target = this.resolvePath(filePath);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, content, 'utf-8');
  }

  async listDirectory(dirPath = '.'): Promise<FileTreeNode> {
    if (this.isDestroyed) throw new Error(`Sandbox ${this.id} is destroyed.`);
    const target = this.resolvePath(dirPath);
    return this.buildTreeNode(target, dirPath);
  }

  private async buildTreeNode(absolutePath: string, relativePath: string): Promise<FileTreeNode> {
    const stat = await fs.stat(absolutePath);
    const name = path.basename(absolutePath) || 'root';

    if (!stat.isDirectory()) {
      return {
        name,
        path: relativePath,
        isDirectory: false,
        size: stat.size,
        lastModified: stat.mtime.toISOString(),
        changeStatus: 'clean',
      };
    }

    const entries = await fs.readdir(absolutePath);
    const children: FileTreeNode[] = [];

    for (const entry of entries) {
      if (entry === '.git' || entry === 'node_modules') continue;
      const childAbs = path.join(absolutePath, entry);
      const childRel = path.join(relativePath === '.' ? '' : relativePath, entry).replace(/\\/g, '/');
      children.push(await this.buildTreeNode(childAbs, childRel));
    }

    return {
      name,
      path: relativePath,
      isDirectory: true,
      lastModified: stat.mtime.toISOString(),
      changeStatus: 'clean',
      children,
    };
  }

  getTunnelUrl(port: number): string {
    return `https://${this.id}-${port}.mock-preview.quickkode.dev`;
  }

  async destroy(): Promise<void> {
    if (this.isDestroyed) return;
    this.isDestroyed = true;
    try {
      await fs.rm(this.rootDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors on temp dir
    }
  }
}
