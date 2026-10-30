export interface GitConfigOpts {
  userName?: string;
  userEmail?: string;
  githubToken?: string;
}

export interface GitStatusResult {
  branch: string;
  isClean: boolean;
  modified: string[];
  added: string[];
  deleted: string[];
  untracked: string[];
}

export interface GitCommitResult {
  commitHash: string;
  branch: string;
  message: string;
  filesChanged: number;
}

export interface CloneOptions {
  repoFullName: string; // e.g. "octocat/Hello-World"
  targetDir?: string;
  branch?: string;
  token?: string;
  depth?: number;
}

export interface CloneResult {
  success: boolean;
  repoFullName: string;
  branch: string;
  commitHash?: string;
  targetDir: string;
  error?: string;
}

export interface CommitLogEntry {
  hash: string;
  author: string;
  date: string;
  message: string;
}
