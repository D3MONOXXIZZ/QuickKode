import type { ActiveModelConfig, ExecutionMode, ChatMessage, SyncStatus } from '@quickkode/shared';

export interface ClientProject {
  id: string;
  name: string;
  source: 'google_drive' | 'github' | 'scratchpad';
  syncStatus: SyncStatus;
  activeBranch?: string;
  lastSyncedAt?: string;
}

export interface ChatThread {
  id: string;
  sessionId: string;
  projectId: string;
  title: string;
  modelConfig: ActiveModelConfig;
  mode: ExecutionMode;
  lastMessageAt: string;
  messages: ChatMessage[];
}

export type DrawerViewMode = 'chats' | 'projects';
