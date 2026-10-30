import type { ISandbox } from '../sandbox/types.js';
import type { GitStatusResult, GitCommitResult, CommitLogEntry } from './types.js';
import type { FileDiff, FileDiffLine } from '@quickkode/shared';

export class GitClient {
  constructor(
    private sandbox: ISandbox,
    private workingDir: string = '.',
  ) {}

  private async run(cmd: string): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    return this.sandbox.executeCommand(cmd, { cwd: this.workingDir });
  }

  async configureUser(name = 'QuickKode Agent', email = 'agent@quickkode.dev'): Promise<void> {
    await this.run(`git config user.name "${name.replace(/"/g, '\\"')}"`);
    await this.run(`git config user.email "${email.replace(/"/g, '\\"')}"`);
  }

  async initRepo(defaultBranch = 'main'): Promise<void> {
    await this.run(`git init -b ${defaultBranch}`);
    await this.configureUser();
  }

  async isGitRepo(): Promise<boolean> {
    const res = await this.run('git rev-parse --is-inside-work-tree');
    return res.exitCode === 0 && res.stdout.trim() === 'true';
  }

  async getCurrentBranch(): Promise<string> {
    const res = await this.run('git rev-parse --abbrev-ref HEAD');
    if (res.exitCode !== 0) return 'main';
    return res.stdout.trim();
  }

  async status(): Promise<GitStatusResult> {
    const branchRes = await this.run('git rev-parse --abbrev-ref HEAD');
    const branch = branchRes.exitCode === 0 ? branchRes.stdout.trim() : 'HEAD';

    const statusRes = await this.run('git status --porcelain=v1 -uall');
    const lines = statusRes.stdout.split('\n').filter((l) => l.trim().length > 0);

    const modified: string[] = [];
    const added: string[] = [];
    const deleted: string[] = [];
    const untracked: string[] = [];

    for (const line of lines) {
      const code = line.slice(0, 2);
      const filePath = line.slice(3).trim().replace(/\\/g, '/');

      if (code.includes('M')) modified.push(filePath);
      else if (code.includes('A')) added.push(filePath);
      else if (code.includes('D')) deleted.push(filePath);
      else if (code === '??') untracked.push(filePath);
    }

    return {
      branch,
      isClean: lines.length === 0,
      modified,
      added,
      deleted,
      untracked,
    };
  }

  async createAndCheckoutBranch(branchName: string): Promise<void> {
    const cleanBranch = branchName.replace(/[^a-zA-Z0-9_\-./]/g, '-');
    const res = await this.run(`git checkout -b "${cleanBranch}"`);
    if (res.exitCode !== 0) {
      throw new Error(`Failed to create branch ${branchName}: ${res.stderr}`);
    }
  }

  async checkout(branchName: string): Promise<void> {
    const res = await this.run(`git checkout "${branchName}"`);
    if (res.exitCode !== 0) {
      throw new Error(`Failed to checkout branch ${branchName}: ${res.stderr}`);
    }
  }

  async commit(message: string, stageAll = true): Promise<GitCommitResult> {
    if (stageAll) {
      const addRes = await this.run('git add -A');
      if (addRes.exitCode !== 0) {
        throw new Error(`Git add failed: ${addRes.stderr}`);
      }
    }

    // Escape commit message safely
    const escapedMsg = message.replace(/"/g, '\\"');
    const commitRes = await this.run(`git commit -m "${escapedMsg}"`);
    if (commitRes.exitCode !== 0) {
      throw new Error(`Git commit failed: ${commitRes.stderr}`);
    }

    const hashRes = await this.run('git rev-parse HEAD');
    const commitHash = hashRes.stdout.trim();
    const branch = await this.getCurrentBranch();

    // Parse files changed count
    const countMatch = commitRes.stdout.match(/(\d+)\s+file[s]?\s+changed/);
    const filesChanged = countMatch && countMatch[1] ? parseInt(countMatch[1], 10) : 1;

    return {
      commitHash,
      branch,
      message,
      filesChanged,
    };
  }

  async getDiff(): Promise<FileDiff[]> {
    // Stage untracked files temporarily into index intent to diff them
    await this.run('git add -N .');
    const hasHead = (await this.run('git rev-parse --verify HEAD')).exitCode === 0;
    const diffRes = await this.run(hasHead ? 'git diff HEAD' : 'git diff');

    const rawDiff = diffRes.stdout;
    if (!rawDiff.trim()) return [];

    const fileDiffs: FileDiff[] = [];
    const fileChunks = rawDiff.split(/^diff --git /m).filter(Boolean);

    for (const chunk of fileChunks) {
      const headerMatch = chunk.match(/^a\/(\S+)\s+b\/(\S+)/);
      if (!headerMatch) continue;

      const path = headerMatch[2] ?? headerMatch[1] ?? 'unknown';
      let additions = 0;
      let deletions = 0;
      const lines: FileDiffLine[] = [];

      const chunkLines = chunk.split('\n');
      for (const line of chunkLines) {
        if (line.startsWith('+++') || line.startsWith('---') || line.startsWith('@@')) continue;
        if (line.startsWith('+')) {
          additions++;
          lines.push({ type: 'add', content: line.slice(1) });
        } else if (line.startsWith('-')) {
          deletions++;
          lines.push({ type: 'delete', content: line.slice(1) });
        } else if (line.startsWith(' ')) {
          lines.push({ type: 'context', content: line.slice(1) });
        }
      }

      let changeType: FileDiff['changeType'] = 'modified';
      if (chunk.includes('new file mode')) changeType = 'created';
      else if (chunk.includes('deleted file mode')) changeType = 'deleted';

      fileDiffs.push({
        path,
        changeType,
        additions,
        deletions,
        diffHunks: chunk,
        lines,
      });
    }

    return fileDiffs;
  }

  async push(remoteBranch?: string, options?: { remote?: string; force?: boolean; token?: string }): Promise<void> {
    const branch = remoteBranch ?? (await this.getCurrentBranch());
    const remote = options?.remote ?? 'origin';

    if (options?.token) {
      // Configure remote with authenticated token
      const getRemoteRes = await this.run(`git remote get-url ${remote}`);
      if (getRemoteRes.exitCode === 0) {
        const rawUrl = getRemoteRes.stdout.trim();
        const authedUrl = rawUrl.replace(
          /https:\/\/(.*@)?github\.com\//,
          `https://x-access-token:${options.token}@github.com/`,
        );
        await this.run(`git remote set-url ${remote} "${authedUrl}"`);
      }
    }

    const forceFlag = options?.force ? '--force' : '';
    const pushRes = await this.run(`git push -u ${remote} "${branch}" ${forceFlag}`);
    if (pushRes.exitCode !== 0) {
      throw new Error(`Git push failed: ${pushRes.stderr || pushRes.stdout}`);
    }
  }

  async getCommitLog(limit = 10): Promise<CommitLogEntry[]> {
    const res = await this.run(`git log -n ${limit} --pretty=format:"%H|%an|%ad|%s"`);
    if (res.exitCode !== 0 || !res.stdout.trim()) return [];

    return res.stdout
      .split('\n')
      .filter((l) => l.trim().length > 0)
      .map((line) => {
        const [hash, author, date, message] = line.split('|');
        return {
          hash: hash ?? '',
          author: author ?? '',
          date: date ?? '',
          message: message ?? '',
        };
      });
  }
}
