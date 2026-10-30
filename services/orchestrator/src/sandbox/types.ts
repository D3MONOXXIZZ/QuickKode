import type { FileTreeNode } from '@quickkode/shared';

export interface CommandOptions {
  cwd?: string;
  timeoutMs?: number;
  env?: Record<string, string>;
  onStdout?: (data: string) => void;
  onStderr?: (data: string) => void;
}

export interface CommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface SandboxCreationOptions {
  sessionId: string;
  apiKey?: string;
  timeoutMs?: number;
  template?: string;
  useMock?: boolean;
}

export interface SandboxMetadata {
  id: string;
  sessionId: string;
  createdAt: Date;
  lastActiveAt: Date;
  status: 'initializing' | 'active' | 'reaped' | 'destroyed';
  template?: string;
  isMock: boolean;
}

export interface ISandbox {
  readonly id: string;
  readonly sessionId: string;
  readonly isMock: boolean;

  /** Execute a shell command inside the sandbox */
  executeCommand(command: string, options?: CommandOptions): Promise<CommandResult>;

  /** Read a text file from the sandbox */
  readFile(path: string): Promise<string>;

  /** Write content to a text file in the sandbox */
  writeFile(path: string, content: string): Promise<void>;

  /** List directory contents as a virtual file tree node */
  listDirectory(path?: string): Promise<FileTreeNode>;

  /** Get public preview URL for a given port */
  getTunnelUrl(port: number): string;

  /** Terminate the sandbox instance */
  destroy(): Promise<void>;
}
