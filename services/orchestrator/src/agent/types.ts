import type { ISandbox } from '../sandbox/types.js';
import type { ActiveModelConfig, AgentThought, ToolCallRecord, FileDiff } from '@quickkode/shared';

export interface AgentToolParamSchema {
  type: string;
  description: string;
  required?: boolean;
}

export interface AgentToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, AgentToolParamSchema>;
    required: string[];
  };
}

export interface AgentExecutionOptions {
  sessionId: string;
  prompt: string;
  modelConfig: ActiveModelConfig;
  maxTurns?: number;
  onThought?: (thought: AgentThought) => void;
  onToolCall?: (toolCall: ToolCallRecord) => void;
  onTerminalChunk?: (chunk: string, stream: 'stdout' | 'stderr') => void;
}

export interface AgentRunResult {
  success: boolean;
  finalMessage: string;
  thoughts: AgentThought[];
  toolCalls: ToolCallRecord[];
  diffs: FileDiff[];
  turnsTaken: number;
  error?: string;
}

export interface IAgentAdapter {
  readonly providerName: string;
  readonly modelName: string;

  /** Run the agent loop with tool-calling inside the sandbox */
  run(sandbox: ISandbox, options: AgentExecutionOptions): Promise<AgentRunResult>;
}
