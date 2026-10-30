import * as crypto from 'node:crypto';
import type { ISandbox } from '../sandbox/types.js';
import type { IDriveClient, SyncResult, SyncStats, DriveFileMetadata } from './types.js';
import { DriveFilter } from './driveFilter.js';

interface FileSnapshot {
  relativePath: string;
  driveId: string;
  md5: string;
}

export class DifferentialSyncEngine {
  private filter: DriveFilter;
  // Snapshot map: relativePath -> FileSnapshot
  private snapshot = new Map<string, FileSnapshot>();

  constructor(
    private driveClient: IDriveClient,
    customIgnoreContent?: string,
  ) {
    this.filter = new DriveFilter(customIgnoreContent);
  }

  private calcMd5(content: string): string {
    return crypto.createHash('md5').update(content).digest('hex');
  }

  /**
   * Pull files from Google Drive into the sandbox working directory
   */
  async pull(rootFolderId: string, sandbox: ISandbox, targetDir = '.'): Promise<SyncResult> {
    const startTime = Date.now();
    const stats: SyncStats = {
      uploaded: 0,
      downloaded: 0,
      deleted: 0,
      skipped: 0,
      durationMs: 0,
      totalBytes: 0,
    };
    const syncedFiles: string[] = [];

    try {
      await this.pullFolderRecursive(rootFolderId, '', targetDir, sandbox, stats, syncedFiles);
      stats.durationMs = Date.now() - startTime;
      return { success: true, stats, syncedFiles };
    } catch (err: unknown) {
      stats.durationMs = Date.now() - startTime;
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, stats, syncedFiles, error: message };
    }
  }

  private async pullFolderRecursive(
    folderId: string,
    relativeDirPath: string,
    targetDir: string,
    sandbox: ISandbox,
    stats: SyncStats,
    syncedFiles: string[],
  ): Promise<void> {
    const items = await this.driveClient.listFiles(folderId);

    for (const item of items) {
      const itemRelPath = relativeDirPath ? `${relativeDirPath}/${item.name}` : item.name;

      if (this.filter.isIgnored(itemRelPath)) {
        stats.skipped++;
        continue;
      }

      if (item.mimeType === 'application/vnd.google-apps.folder') {
        await this.pullFolderRecursive(item.id, itemRelPath, targetDir, sandbox, stats, syncedFiles);
      } else {
        const localPath = targetDir === '.' ? itemRelPath : `${targetDir}/${itemRelPath}`;
        const prev = this.snapshot.get(itemRelPath);

        // If checksum matches, skip downloading
        if (prev && prev.md5 === item.md5Checksum) {
          stats.skipped++;
          continue;
        }

        const content = await this.driveClient.downloadFile(item.id);
        await sandbox.writeFile(localPath, content);

        const md5 = item.md5Checksum || this.calcMd5(content);
        this.snapshot.set(itemRelPath, {
          relativePath: itemRelPath,
          driveId: item.id,
          md5,
        });

        stats.downloaded++;
        stats.totalBytes += Buffer.byteLength(content, 'utf-8');
        syncedFiles.push(itemRelPath);
      }
    }
  }

  /**
   * Push modified and created files from sandbox to Google Drive
   */
  async push(rootFolderId: string, sandbox: ISandbox, sourceDir = '.'): Promise<SyncResult> {
    const startTime = Date.now();
    const stats: SyncStats = {
      uploaded: 0,
      downloaded: 0,
      deleted: 0,
      skipped: 0,
      durationMs: 0,
      totalBytes: 0,
    };
    const syncedFiles: string[] = [];
    const activePaths = new Set<string>();

    try {
      // Step 1: Scan sandbox and upload modified/created source files
      await this.pushDirectoryRecursive(sourceDir, '', rootFolderId, sandbox, stats, syncedFiles, activePaths);

      // Step 2: Detect deleted files that exist in snapshot but not in sandbox
      for (const [snapPath, snapItem] of this.snapshot.entries()) {
        if (!activePaths.has(snapPath)) {
          await this.driveClient.deleteFile(snapItem.driveId);
          this.snapshot.delete(snapPath);
          stats.deleted++;
        }
      }

      stats.durationMs = Date.now() - startTime;
      return { success: true, stats, syncedFiles };
    } catch (err: unknown) {
      stats.durationMs = Date.now() - startTime;
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, stats, syncedFiles, error: message };
    }
  }

  private async pushDirectoryRecursive(
    currentDir: string,
    relativeDirPath: string,
    parentDriveFolderId: string,
    sandbox: ISandbox,
    stats: SyncStats,
    syncedFiles: string[],
    activePaths: Set<string>,
  ): Promise<void> {
    const tree = await sandbox.listDirectory(currentDir);
    if (!tree.children) return;

    for (const child of tree.children) {
      const childRelPath = relativeDirPath ? `${relativeDirPath}/${child.name}` : child.name;

      if (this.filter.isIgnored(childRelPath)) {
        stats.skipped++;
        continue;
      }

      if (child.isDirectory) {
        // Ensure folder exists in Drive
        let driveFolder = await this.driveClient.findChildByName(child.name, parentDriveFolderId);
        if (!driveFolder) {
          driveFolder = await this.driveClient.createFolder(child.name, parentDriveFolderId);
        }

        const nextSourceDir = currentDir === '.' ? child.name : `${currentDir}/${child.name}`;
        await this.pushDirectoryRecursive(
          nextSourceDir,
          childRelPath,
          driveFolder.id,
          sandbox,
          stats,
          syncedFiles,
          activePaths,
        );
      } else {
        activePaths.add(childRelPath);
        const childLocalPath = currentDir === '.' ? child.name : `${currentDir}/${child.name}`;
        const content = await sandbox.readFile(childLocalPath);
        const md5 = this.calcMd5(content);
        const prev = this.snapshot.get(childRelPath);

        // Skip unchanged files
        if (prev && prev.md5 === md5) {
          stats.skipped++;
          continue;
        }

        // Upload new or modified file
        const driveItem: DriveFileMetadata = await this.driveClient.uploadFile(
          child.name,
          content,
          parentDriveFolderId,
          prev?.driveId,
        );

        this.snapshot.set(childRelPath, {
          relativePath: childRelPath,
          driveId: driveItem.id,
          md5,
        });

        stats.uploaded++;
        stats.totalBytes += Buffer.byteLength(content, 'utf-8');
        syncedFiles.push(childRelPath);
      }
    }
  }

  getSnapshotFiles(): string[] {
    return Array.from(this.snapshot.keys());
  }

  getSnapshotCount(): number {
    return this.snapshot.size;
  }
}
