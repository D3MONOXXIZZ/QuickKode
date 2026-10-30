import type { ISandbox } from '../sandbox/types.js';
import type { AgentToolDefinition } from './types.js';
import type { ToolCallRecord } from '@quickkode/shared';

export const AGENT_TOOLS: AgentToolDefinition[] = [
  {
    name: 'run_command',
    description: 'Execute a bash or shell command inside the project sandbox (e.g. running tests, linters, dev server, git).',
    parameters: {
      type: 'object',
      properties: {
        command: { type: 'string', description: 'The exact shell command to execute.' },
        cwd: { type: 'string', description: 'Optional working directory relative to sandbox root.' },
      },
      required: ['command'],
    },
  },
  {
    name: 'read_file',
    description: 'Read the contents of a file in the project.',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'File path relative to project root.' },
      },
      required: ['path'],
    },
  },
  {
    name: 'write_file',
    description: 'Create a new file or completely overwrite an existing file with new content.',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'File path relative to project root.' },
        content: { type: 'string', description: 'Full file content to write.' },
      },
      required: ['path', 'content'],
    },
  },
  {
    name: 'edit_file',
    description: 'Replace a single contiguous target string in an existing file with replacement text.',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'File path relative to project root.' },
        target: { type: 'string', description: 'The exact string to be replaced.' },
        replacement: { type: 'string', description: 'The replacement string.' },
      },
      required: ['path', 'target', 'replacement'],
    },
  },
  {
    name: 'list_directory',
    description: 'List the files and folders inside a project directory.',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Optional directory path relative to project root.' },
      },
      required: [],
    },
  },
];

export class ToolExecutor {
  constructor(private sandbox: ISandbox) {}

  async execute(
    name: string,
    params: Record<string, unknown>,
    onTerminalChunk?: (chunk: string, stream: 'stdout' | 'stderr') => void,
  ): Promise<ToolCallRecord> {
    const id = `call-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const startTime = Date.now();

    try {
      let output = '';

      switch (name) {
        case 'run_command': {
          const command = String(params.command ?? '');
          const cwd = params.cwd ? String(params.cwd) : undefined;
          const result = await this.sandbox.executeCommand(command, {
            cwd,
            onStdout: (chunk) => onTerminalChunk?.(chunk, 'stdout'),
            onStderr: (chunk) => onTerminalChunk?.(chunk, 'stderr'),
          });
          output = result.exitCode === 0
            ? (result.stdout || '(command succeeded with no output)')
            : `[Exit Code ${result.exitCode}]\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`;
          
          return {
            id,
            name,
            parameters: params,
            output,
            isError: result.exitCode !== 0,
            durationMs: Date.now() - startTime,
          };
        }

        case 'read_file': {
          const path = String(params.path ?? '');
          output = await this.sandbox.readFile(path);
          return {
            id,
            name,
            parameters: params,
            output,
            isError: false,
            durationMs: Date.now() - startTime,
          };
        }

        case 'write_file': {
          const path = String(params.path ?? '');
          const content = String(params.content ?? '');
          await this.sandbox.writeFile(path, content);
          output = `Successfully wrote ${Buffer.byteLength(content, 'utf-8')} bytes to ${path}`;
          return {
            id,
            name,
            parameters: params,
            output,
            isError: false,
            durationMs: Date.now() - startTime,
          };
        }

        case 'edit_file': {
          const path = String(params.path ?? '');
          const target = String(params.target ?? '');
          const replacement = String(params.replacement ?? '');

          const existingContent = await this.sandbox.readFile(path);
          if (!existingContent.includes(target)) {
            throw new Error(`Target text to replace was not found in ${path}`);
          }

          const updated = existingContent.replace(target, replacement);
          await this.sandbox.writeFile(path, updated);
          output = `Successfully replaced target in ${path}`;
          return {
            id,
            name,
            parameters: params,
            output,
            isError: false,
            durationMs: Date.now() - startTime,
          };
        }

        case 'list_directory': {
          const dirPath = params.path ? String(params.path) : '.';
          const tree = await this.sandbox.listDirectory(dirPath);
          const entries = tree.children?.map((c) => `${c.isDirectory ? '[DIR]' : '[FILE]'} ${c.name}`) ?? [];
          output = entries.join('\n') || '(empty directory)';
          return {
            id,
            name,
            parameters: params,
            output,
            isError: false,
            durationMs: Date.now() - startTime,
          };
        }

        default:
          throw new Error(`Unknown tool name: ${name}`);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        id,
        name,
        parameters: params,
        output: `Error executing tool ${name}: ${message}`,
        isError: true,
        durationMs: Date.now() - startTime,
      };
    }
  }
}
