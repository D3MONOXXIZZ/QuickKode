import type { ISandbox } from '../sandbox/types.js';
import type { IAgentAdapter, AgentExecutionOptions, AgentRunResult } from './types.js';
import type { AgentThought, ToolCallRecord } from '@quickkode/shared';
import { ToolExecutor } from './tools.js';
import { GitClient } from '../git/gitClient.js';

export class MockAgentAdapter implements IAgentAdapter {
  readonly providerName: string;
  readonly modelName: string;

  constructor(providerName = 'mock', modelName = 'mock-agent-v1') {
    this.providerName = providerName;
    this.modelName = modelName;
  }

  async run(sandbox: ISandbox, options: AgentExecutionOptions): Promise<AgentRunResult> {
    const executor = new ToolExecutor(sandbox);
    const git = new GitClient(sandbox);
    const thoughts: AgentThought[] = [];
    const toolCalls: ToolCallRecord[] = [];

    // Step 1: Planning Thought
    const planThought: AgentThought = {
      id: `thought-${Date.now()}-plan`,
      title: 'Formulating Implementation Strategy',
      content: `Planning solution for: "${options.prompt}". Identifying affected files.`,
      timestamp: new Date().toISOString(),
      status: 'completed',
    };
    thoughts.push(planThought);
    options.onThought?.(planThought);

    // Step 2: Write File Tool Call
    const writeToolThought: AgentThought = {
      id: `thought-${Date.now()}-write`,
      title: 'Writing Source Code',
      content: 'Creating src/calculator.ts with arithmetic functions.',
      timestamp: new Date().toISOString(),
      status: 'in_progress',
    };
    thoughts.push(writeToolThought);
    options.onThought?.(writeToolThought);

    const writeCall = await executor.execute(
      'write_file',
      {
        path: 'src/calculator.ts',
        content: 'export const multiply = (a: number, b: number): number => a * b;\n',
      },
      options.onTerminalChunk,
    );
    toolCalls.push(writeCall);
    options.onToolCall?.(writeCall);
    writeToolThought.status = 'completed';
    options.onThought?.(writeToolThought);

    // Step 3: Run Validation Command
    const testToolThought: AgentThought = {
      id: `thought-${Date.now()}-test`,
      title: 'Running Validation Checks',
      content: 'Verifying syntax and exports.',
      timestamp: new Date().toISOString(),
      status: 'in_progress',
    };
    thoughts.push(testToolThought);
    options.onThought?.(testToolThought);

    const cmdCall = await executor.execute(
      'run_command',
      { command: 'echo "Verification Succeeded"' },
      options.onTerminalChunk,
    );
    toolCalls.push(cmdCall);
    options.onToolCall?.(cmdCall);
    testToolThought.status = 'completed';
    options.onThought?.(testToolThought);

    // Step 4: Extract diffs if inside a git repo
    const isGit = await git.isGitRepo();
    const diffs = isGit ? await git.getDiff() : [];

    return {
      success: true,
      finalMessage: `Mock Agent successfully completed task: "${options.prompt}"`,
      thoughts,
      toolCalls,
      diffs,
      turnsTaken: 2,
    };
  }
}
