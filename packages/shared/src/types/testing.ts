/**
 * Tri-Mode Live Mobile Testing Types (Web, Mobile/Expo, Backend API)
 */

export type PreviewMode = 'web' | 'expo' | 'api';

export interface WebPreviewConfig {
  mode: 'web';
  localPort: number;
  tunnelUrl?: string;
  isReady: boolean;
  serverType?: 'vite' | 'nextjs' | 'cra' | 'static' | 'custom';
}

export interface ExpoPreviewConfig {
  mode: 'expo';
  expoPort: number;
  tunnelUrl?: string;
  deepLinkUrl?: string; // exp://...
  qrCodeDataUrl?: string;
  isReady: boolean;
}

export interface ApiEndpointParam {
  name: string;
  type: string;
  required: boolean;
  description?: string;
}

export interface ApiEndpoint {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  summary?: string;
  params?: ApiEndpointParam[];
}

export interface ApiPreviewConfig {
  mode: 'api';
  localPort: number;
  tunnelUrl?: string;
  swaggerUrl?: string;
  endpoints?: ApiEndpoint[];
  isReady: boolean;
}

export type ActivePreview = WebPreviewConfig | ExpoPreviewConfig | ApiPreviewConfig;

export interface TestRunResult {
  suiteName: string;
  totalTests: number;
  passed: number;
  failed: number;
  durationMs: number;
  stdout: string;
  stderr: string;
  passedAll: boolean;
}
