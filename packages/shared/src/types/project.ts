/**
 * Project and Storage Definitions
 */

export type ProjectSource = 'google_drive' | 'github' | 'scratchpad';

export type SyncStatus = 'in_sync' | 'syncing' | 'pending_changes' | 'conflict' | 'error';

export interface DriveConfig {
  folderId: string;
  folderName: string;
  lastSyncedAt?: string;
  syncStatus: SyncStatus;
  ignoredPatterns: string[];
}

export interface GitRepoConfig {
  owner: string;
  repo: string;
  defaultBranch: string;
  activeBranch: string;
  remoteUrl: string;
  lastCommitHash?: string;
  lastCommitMessage?: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  source: ProjectSource;
  driveConfig?: DriveConfig;
  gitConfig?: GitRepoConfig;
  createdAt: string;
  updatedAt: string;
  activeSessionId?: string;
}

export interface GitHubRepoSummary {
  fullName: string;
  name: string;
  owner: string;
  description?: string;
  isPrivate: boolean;
  defaultBranch: string;
  htmlUrl: string;
}
