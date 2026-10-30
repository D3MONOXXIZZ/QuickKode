import type { ExecutionMode, ActiveModelConfig, TestRunResult, FileDiff, AgentThought, ToolCallRecord } from '@quickkode/shared';

export interface WorkflowOptions {
  sessionId: string;
  projectId: string;
  prompt: string;
  mode: ExecutionMode;
  modelConfig: ActiveModelConfig;
  driveFolderId?: string;
  githubToken?: string;
  gitBranch?: string;
  maxSelfHealingAttempts?: number;
  useMock?: boolean;
  onThought?: (thought: AgentThought) => void;
  onToolCall?: (toolCall: ToolCallRecord) => void;
  onTerminalChunk?: (chunk: string, stream: 'stdout' | 'stderr') => void;
  onStatusChange?: (status: string, message?: string) => void;
}

export interface SelfHealingAttempt {
  attemptNumber: number;
  errorLog: string;
  actionsTaken: string[];
  resolved: boolean;
}

export interface WorkflowResult {
  success: boolean;
  mode: ExecutionMode;
  agentSummary: string;
  testResult?: TestRunResult;
  selfHealingAttempts: SelfHealingAttempt[];
  diffs: FileDiff[];
  gitPushed: boolean;
  driveSynced: boolean;
  needsApproval: boolean;
  error?: string;
}
