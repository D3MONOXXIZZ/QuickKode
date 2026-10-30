import type { IDriveClient, DriveFileMetadata } from './types.js';

export class GoogleDriveClient implements IDriveClient {
  private baseUrl = 'https://www.googleapis.com/drive/v3';
  private uploadUrl = 'https://www.googleapis.com/upload/drive/v3';

  constructor(private accessToken: string) {}

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const res = await fetch(endpoint, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        ...(options?.headers ?? {}),
      },
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Google Drive API error (${res.status}): ${errText}`);
    }

    if (res.status === 204) {
      return {} as T;
    }

    return res.json() as Promise<T>;
  }

  async createFolder(name: string, parentId?: string): Promise<DriveFileMetadata> {
    const body = {
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: parentId ? [parentId] : undefined,
    };

    return this.request<DriveFileMetadata>(`${this.baseUrl}/files`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  async listFiles(folderId: string): Promise<DriveFileMetadata[]> {
    const query = `'${folderId}' in parents and trashed = false`;
    const url = `${this.baseUrl}/files?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType,parents,size,md5Checksum,modifiedTime)`;

    const res = await this.request<{ files: DriveFileMetadata[] }>(url);
    return res.files ?? [];
  }

  async uploadFile(name: string, content: string, parentId: string, fileId?: string): Promise<DriveFileMetadata> {
    if (fileId) {
      // Overwrite existing file
      return this.request<DriveFileMetadata>(`${this.uploadUrl}/files/${fileId}?uploadType=media`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'text/plain' },
        body: content,
      });
    }

    // Multipart create file
    const boundary = '-------QuickKodeSyncBoundary' + Date.now();
    const metadata = JSON.stringify({ name, parents: [parentId] });

    const multipartBody =
      `--${boundary}\r\n` +
      `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
      `${metadata}\r\n` +
      `--${boundary}\r\n` +
      `Content-Type: text/plain\r\n\r\n` +
      `${content}\r\n` +
      `--${boundary}--`;

    return this.request<DriveFileMetadata>(`${this.uploadUrl}/files?uploadType=multipart`, {
      method: 'POST',
      headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
      body: multipartBody,
    });
  }

  async downloadFile(fileId: string): Promise<string> {
    const res = await fetch(`${this.baseUrl}/files/${fileId}?alt=media`, {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });

    if (!res.ok) {
      throw new Error(`Failed to download Drive file ${fileId}: ${res.statusText}`);
    }

    return res.text();
  }

  async deleteFile(fileId: string): Promise<void> {
    await this.request<void>(`${this.baseUrl}/files/${fileId}`, {
      method: 'DELETE',
    });
  }

  async findChildByName(name: string, parentId: string): Promise<DriveFileMetadata | null> {
    const query = `'${parentId}' in parents and name = '${name.replace(/'/g, "\\'")}' and trashed = false`;
    const url = `${this.baseUrl}/files?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType,parents,size,md5Checksum,modifiedTime)`;

    const res = await this.request<{ files: DriveFileMetadata[] }>(url);
    return res.files?.[0] ?? null;
  }
}
