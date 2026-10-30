import * as crypto from 'node:crypto';
import type { IDriveClient, DriveFileMetadata } from './types.js';

interface StoredDriveItem {
  id: string;
  name: string;
  mimeType: string;
  parentId: string;
  content?: string;
  size: number;
  md5Checksum: string;
  modifiedTime: string;
}

export class MockDriveClient implements IDriveClient {
  private items = new Map<string, StoredDriveItem>();
  private idCounter = 1000;

  constructor() {
    // Root folder
    this.items.set('root', {
      id: 'root',
      name: 'root',
      mimeType: 'application/vnd.google-apps.folder',
      parentId: '',
      size: 0,
      md5Checksum: '',
      modifiedTime: new Date().toISOString(),
    });
  }

  private generateId(): string {
    return `drive-item-${++this.idCounter}`;
  }

  private calcMd5(content: string): string {
    return crypto.createHash('md5').update(content).digest('hex');
  }

  async createFolder(name: string, parentId = 'root'): Promise<DriveFileMetadata> {
    const id = this.generateId();
    const item: StoredDriveItem = {
      id,
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parentId,
      size: 0,
      md5Checksum: '',
      modifiedTime: new Date().toISOString(),
    };
    this.items.set(id, item);
    return { ...item };
  }

  async listFiles(folderId: string): Promise<DriveFileMetadata[]> {
    const result: DriveFileMetadata[] = [];
    for (const item of this.items.values()) {
      if (item.parentId === folderId) {
        result.push({
          id: item.id,
          name: item.name,
          mimeType: item.mimeType,
          parents: [item.parentId],
          size: item.size,
          md5Checksum: item.md5Checksum,
          modifiedTime: item.modifiedTime,
        });
      }
    }
    return result;
  }

  async uploadFile(name: string, content: string, parentId: string, fileId?: string): Promise<DriveFileMetadata> {
    const id = fileId ?? this.generateId();
    const md5Checksum = this.calcMd5(content);
    const size = Buffer.byteLength(content, 'utf-8');

    const item: StoredDriveItem = {
      id,
      name,
      mimeType: 'text/plain',
      parentId,
      content,
      size,
      md5Checksum,
      modifiedTime: new Date().toISOString(),
    };

    this.items.set(id, item);
    return {
      id: item.id,
      name: item.name,
      mimeType: item.mimeType,
      parents: [parentId],
      size: item.size,
      md5Checksum: item.md5Checksum,
      modifiedTime: item.modifiedTime,
    };
  }

  async downloadFile(fileId: string): Promise<string> {
    const item = this.items.get(fileId);
    if (!item) {
      throw new Error(`Drive file not found: ${fileId}`);
    }
    return item.content ?? '';
  }

  async deleteFile(fileId: string): Promise<void> {
    this.items.delete(fileId);
  }

  async findChildByName(name: string, parentId: string): Promise<DriveFileMetadata | null> {
    for (const item of this.items.values()) {
      if (item.parentId === parentId && item.name === name) {
        return {
          id: item.id,
          name: item.name,
          mimeType: item.mimeType,
          parents: [item.parentId],
          size: item.size,
          md5Checksum: item.md5Checksum,
          modifiedTime: item.modifiedTime,
        };
      }
    }
    return null;
  }
}
