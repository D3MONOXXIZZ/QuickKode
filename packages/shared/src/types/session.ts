/**
 * Session, Chat, and Execution State Definitions
 */

export type ExecutionMode = 'standard' | 'turbo';

export type SessionStatus = 
  | 'idle'
  | 'starting_sandbox'
  | 'syncing_from_drive'
  | 'agent_thinking'
  | 'agent_executing'
  | 'running_tests'
  | 'syncing_to_drive'
  | 'pushing_to_git'
  | 'awaiting_approval'
  | 'completed'
  | 'failed';

export type MessageRole = 'user' | 'assistant' | 'system';

export interface ToolCallRecord {
  id: string;
  name: string;
  parameters: Record<string, unknown>;
  output?: string;
  isError?: boolean;
  durationMs?: number;
}

export interface AgentThought {
  id: string;
  title: string;
  content: string;
  timestamp: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  toolCalls?: ToolCallRecord[];
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: MessageRole;
  content: string;
  timestamp: string;
  thoughts?: AgentThought[];
  modelUsed?: string;
  turboModeActive?: boolean;
}

export interface Session {
  id: string;
  projectId: string;
  title: string;
  mode: ExecutionMode;
  status: SessionStatus;
  createdAt: string;
  updatedAt: string;
  sandboxId?: string;
  activeModel: string;
  lastError?: string;
}
