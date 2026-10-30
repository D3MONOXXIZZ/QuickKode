/**
 * WebSocket Real-time Messaging Contracts
 */

import type { ExecutionMode, SessionStatus } from './session.js';
import type { ActiveModelConfig, BYOKConfig } from './model.js';
import type { FileDiff, FileTreeNode } from './agent.js';
import type { ActivePreview, TestRunResult } from './testing.js';

export interface ClientToServerEvents {
  // Session lifecycle
  'session:join': (payload: { sessionId: string }) => void;
  'session:leave': (payload: { sessionId: string }) => void;
  
  // Prompt & Agent commands
  'agent:prompt': (payload: {
    sessionId: string;
    prompt: string;
    mode: ExecutionMode;
    modelConfig: ActiveModelConfig;
    byok?: BYOKConfig;
  }) => void;
  'agent:cancel': (payload: { sessionId: string }) => void;
  'agent:approve_push': (payload: { sessionId: string; commitMessage?: string }) => void;
  
  // File operations (Virtual File Tree & Mobile Code Editor)
  'file:list': (payload: { sessionId: string; path?: string }) => void;
  'file:read': (payload: { sessionId: string; path: string }) => void;
  'file:write': (payload: { sessionId: string; path: string; content: string }) => void;
  
  // Project / Git import
  'project:import_github': (payload: { repoFullName: string; branch?: string }) => void;
}

export interface ServerToClientEvents {
  // Session status changes
  'session:status': (payload: { sessionId: string; status: SessionStatus; message?: string }) => void;
  'session:error': (payload: { sessionId: string; error: string; code?: string }) => void;
  
  // Realtime streaming
  'agent:thought': (payload: { sessionId: string; thoughtId: string; title: string; content: string; isComplete: boolean }) => void;
  'agent:terminal_log': (payload: { sessionId: string; chunk: string; stream: 'stdout' | 'stderr' }) => void;
  'agent:diff_ready': (payload: { sessionId: string; diffs: FileDiff[] }) => void;
  'agent:test_completed': (payload: { sessionId: string; result: TestRunResult }) => void;
  'agent:completed': (payload: { sessionId: string; summary: string; gitPushed: boolean; driveSynced: boolean }) => void;
  
  // File tree & editor responses
  'file:tree': (payload: { sessionId: string; root: FileTreeNode }) => void;
  'file:content': (payload: { sessionId: string; path: string; content: string }) => void;
  'file:saved': (payload: { sessionId: string; path: string; success: boolean }) => void;
  
  // Live preview endpoints
  'preview:ready': (payload: { sessionId: string; preview: ActivePreview }) => void;
}
