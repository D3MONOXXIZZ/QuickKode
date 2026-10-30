export interface DriveFileMetadata {
  id: string;
  name: string;
  mimeType: string;
  parents?: string[];
  size?: number;
  md5Checksum?: string;
  modifiedTime?: string;
}

export interface SyncStats {
  uploaded: number;
  downloaded: number;
  deleted: number;
  skipped: number;
  durationMs: number;
  totalBytes: number;
}

export interface SyncResult {
  success: boolean;
  stats: SyncStats;
  syncedFiles: string[];
  error?: string;
}

export interface IDriveClient {
  /** Create a folder in Google Drive */
  createFolder(name: string, parentId?: string): Promise<DriveFileMetadata>;

  /** List files/folders within a parent folder */
  listFiles(folderId: string): Promise<DriveFileMetadata[]>;

  /** Upload or overwrite a file in Google Drive */
  uploadFile(name: string, content: string, parentId: string, fileId?: string): Promise<DriveFileMetadata>;

  /** Download file contents from Google Drive */
  downloadFile(fileId: string): Promise<string>;

  /** Delete a file or folder from Google Drive */
  deleteFile(fileId: string): Promise<void>;

  /** Find a child item by name in a parent folder */
  findChildByName(name: string, parentId: string): Promise<DriveFileMetadata | null>;
}
