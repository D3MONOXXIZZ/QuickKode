import type { PreviewMode, ActivePreview } from '@quickkode/shared';

export interface DetectedProjectType {
  mode: PreviewMode;
  framework: 'nextjs' | 'vite' | 'cra' | 'expo' | 'flutter' | 'fastapi' | 'express' | 'generic';
  defaultPort: number;
  startCommand: string;
}

export interface PreviewOptions {
  sessionId: string;
  targetPort?: number;
  customStartCommand?: string;
  forceMode?: PreviewMode;
}

export interface RunningServerInfo {
  pid?: number;
  port: number;
  startCommand: string;
  tunnelUrl: string;
  preview: ActivePreview;
  startedAt: Date;
}
