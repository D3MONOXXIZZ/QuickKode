/**
 * Agent Events, File Diffing and Virtual File Tree Types
 */

export type AgentEventType = 
  | 'thought_start'
  | 'thought_update'
  | 'thought_done'
  | 'tool_start'
  | 'tool_output'
  | 'file_modified'
  | 'test_run'
  | 'diff_ready'
  | 'error'
  | 'status_change';

export interface FileDiffLine {
  type: 'add' | 'delete' | 'context';
  content: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

export interface FileDiff {
  path: string;
  oldPath?: string;
  changeType: 'created' | 'modified' | 'deleted' | 'renamed';
  additions: number;
  deletions: number;
  diffHunks: string;
  lines?: FileDiffLine[];
}

export interface FileTreeNode {
  name: string;
  path: string;
  isDirectory: boolean;
  size?: number;
  lastModified?: string;
  changeStatus?: 'clean' | 'modified' | 'added' | 'deleted';
  children?: FileTreeNode[];
}

export interface AgentEvent {
  id: string;
  sessionId: string;
  type: AgentEventType;
  timestamp: string;
  payload: Record<string, unknown>;
}
