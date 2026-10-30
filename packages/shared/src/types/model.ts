/**
 * AI Model, Authentication and BYOK Configurations
 */

export type ModelProvider = 'antigravity' | 'opencode';

export type AntigravityAuthType = 'pc_account' | 'api_key' | 'oauth';

export interface AntigravityModelConfig {
  provider: 'antigravity';
  modelName: 'antigravity-gemini-2.5' | 'antigravity-gemini-1.5-pro' | 'antigravity-gemini-1.5-flash';
  authType: AntigravityAuthType;
  /** Present only if authType === 'api_key' */
  geminiApiKey?: string;
  /** Present if authType === 'oauth' or authType === 'pc_account' */
  oauthToken?: string;
}

export type OpenCodeModelName = 
  | 'deepseek-coder-v2'
  | 'deepseek-r1'
  | 'claude-3-5-sonnet'
  | 'gpt-4o'
  | 'llama-3.1-405b'
  | 'qwen-2.5-coder';

export interface OpenCodeModelConfig {
  provider: 'opencode';
  modelName: OpenCodeModelName;
  apiEndpoint?: string;
  apiKey: string;
}

export type ActiveModelConfig = AntigravityModelConfig | OpenCodeModelConfig;

export interface BYOKConfig {
  antigravityAuthType: AntigravityAuthType;
  googleOAuthToken?: string;
  googleClientId?: string;
  googleClientSecret?: string;
  geminiApiKey?: string;
  githubToken?: string;
  openAiApiKey?: string;
  anthropicApiKey?: string;
  deepseekApiKey?: string;
  customEndpoint?: string;
  e2bApiKey?: string;
  googleDriveFolderId?: string;
  orchestratorServerUrl?: string;
}
