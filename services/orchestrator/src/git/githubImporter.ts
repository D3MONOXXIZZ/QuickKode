import type { ISandbox } from '../sandbox/types.js';
import type { CloneOptions, CloneResult } from './types.js';
import { GitClient } from './gitClient.js';

export class GitHubImporter {
  constructor(private sandbox: ISandbox) {}

  async clone(options: CloneOptions): Promise<CloneResult> {
    const { repoFullName, targetDir = '.', branch, token, depth = 1 } = options;

    // Validate format
    if (!/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(repoFullName)) {
      return {
        success: false,
        repoFullName,
        branch: branch ?? 'main',
        targetDir,
        error: `Invalid repository name: "${repoFullName}". Expected format: "owner/repo"`,
      };
    }

    // Build clone URL
    const cloneUrl = token
      ? `https://x-access-token:${token}@github.com/${repoFullName}.git`
      : `https://github.com/${repoFullName}.git`;

    const branchFlag = branch ? `--branch "${branch}"` : '';
    const depthFlag = depth > 0 ? `--depth ${depth}` : '';
    const targetFlag = targetDir === '.' ? '.' : `"${targetDir}"`;

    const cloneCmd = `git clone ${depthFlag} ${branchFlag} "${cloneUrl}" ${targetFlag}`.replace(/\s+/g, ' ');

    const res = await this.sandbox.executeCommand(cloneCmd);
    if (res.exitCode !== 0) {
      let friendlyError = res.stderr;
      if (res.stderr.includes('Repository not found')) {
        friendlyError = `Repository "${repoFullName}" not found or requires authentication.`;
      } else if (res.stderr.includes('Authentication failed')) {
        friendlyError = `GitHub authentication failed. Check your Personal Access Token.`;
      }

      return {
        success: false,
        repoFullName,
        branch: branch ?? 'main',
        targetDir,
        error: friendlyError,
      };
    }

    // Read cloned repo details
    const gitClient = new GitClient(this.sandbox, targetDir);
    const activeBranch = await gitClient.getCurrentBranch();

    let commitHash: string | undefined;
    const logRes = await this.sandbox.executeCommand('git rev-parse HEAD', { cwd: targetDir });
    if (logRes.exitCode === 0) {
      commitHash = logRes.stdout.trim();
    }

    // Configure default agent user so subsequent commits work immediately
    await gitClient.configureUser();

    return {
      success: true,
      repoFullName,
      branch: activeBranch,
      commitHash,
      targetDir,
    };
  }
}
