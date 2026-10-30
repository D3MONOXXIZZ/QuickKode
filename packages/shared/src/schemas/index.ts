import { z } from 'zod';

export const ExecutionModeSchema = z.enum(['standard', 'turbo']);

export const AntigravityAuthTypeSchema = z.enum(['pc_account', 'api_key', 'oauth']);

export const AntigravityModelConfigSchema = z.object({
  provider: z.literal('antigravity'),
  modelName: z.enum(['antigravity-gemini-2.5', 'antigravity-gemini-1.5-pro', 'antigravity-gemini-1.5-flash']),
  authType: AntigravityAuthTypeSchema,
  geminiApiKey: z.string().optional(),
  oauthToken: z.string().optional(),
});

export const OpenCodeModelNameSchema = z.enum([
  'deepseek-coder-v2',
  'deepseek-r1',
  'claude-3-5-sonnet',
  'gpt-4o',
  'llama-3.1-405b',
  'qwen-2.5-coder',
]);

export const OpenCodeModelConfigSchema = z.object({
  provider: z.literal('opencode'),
  modelName: OpenCodeModelNameSchema,
  apiEndpoint: z.string().url().optional(),
  apiKey: z.string().min(1, 'API key required for OpenCode provider'),
});

export const ActiveModelConfigSchema = z.discriminatedUnion('provider', [
  AntigravityModelConfigSchema,
  OpenCodeModelConfigSchema,
]);

export const BYOKConfigSchema = z.object({
  antigravityAuthType: AntigravityAuthTypeSchema.default('pc_account'),
  googleOAuthToken: z.string().optional(),
  googleClientId: z.string().optional(),
  googleClientSecret: z.string().optional(),
  geminiApiKey: z.string().optional(),
  githubToken: z.string().optional(),
  githubClientId: z.string().optional(),
  githubClientSecret: z.string().optional(),
  openAiApiKey: z.string().optional(),
  anthropicApiKey: z.string().optional(),
  deepseekApiKey: z.string().optional(),
  customEndpoint: z.string().url().optional(),
  e2bApiKey: z.string().optional(),
  googleDriveFolderId: z.string().optional(),
  orchestratorServerUrl: z.string().optional(),
});

export const PromptPayloadSchema = z.object({
  sessionId: z.string().min(1, 'Session ID required'),
  prompt: z.string().min(1, 'Prompt cannot be empty'),
  mode: ExecutionModeSchema.default('standard'),
  modelConfig: ActiveModelConfigSchema,
  byok: BYOKConfigSchema.optional(),
});

export const GitHubImportPayloadSchema = z.object({
  repoFullName: z.string().regex(/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/, 'Must be formatted as owner/repo'),
  branch: z.string().optional(),
});

export const FileWritePayloadSchema = z.object({
  sessionId: z.string().min(1, 'Session ID required'),
  path: z.string().min(1, 'File path required'),
  content: z.string(),
});

export const ApprovePushPayloadSchema = z.object({
  sessionId: z.string().min(1, 'Session ID required'),
  commitMessage: z.string().optional(),
});
