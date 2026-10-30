import {
  PromptPayloadSchema,
  GitHubImportPayloadSchema,
  FileWritePayloadSchema,
  ExecutionModeSchema,
  AntigravityModelConfigSchema,
  OpenCodeModelConfigSchema,
} from '../src/index.js';

function runSchemaTests() {
  console.log('[Test Suite] Running Schema & Contract Audits...');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`  ✓ ${testName}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${testName}`);
      failed++;
    }
  }

  // 1. Test ExecutionMode
  assert(ExecutionModeSchema.safeParse('turbo').success, 'ExecutionMode allows "turbo"');
  assert(ExecutionModeSchema.safeParse('standard').success, 'ExecutionMode allows "standard"');
  assert(!ExecutionModeSchema.safeParse('invalid_mode').success, 'ExecutionMode rejects unknown mode');

  // 2. Test Antigravity PC Account Config
  const validAntigravityPC = AntigravityModelConfigSchema.safeParse({
    provider: 'antigravity',
    modelName: 'antigravity-gemini-2.5',
    authType: 'pc_account',
  });
  assert(validAntigravityPC.success, 'Antigravity PC Account config validates without API key');

  // 3. Test OpenCode Model Config with BYOK
  const validOpenCode = OpenCodeModelConfigSchema.safeParse({
    provider: 'opencode',
    modelName: 'deepseek-coder-v2',
    apiKey: 'sk-test-key-12345',
  });
  assert(validOpenCode.success, 'OpenCode model config validates with valid API key');

  const invalidOpenCode = OpenCodeModelConfigSchema.safeParse({
    provider: 'opencode',
    modelName: 'deepseek-coder-v2',
    apiKey: '', // Empty
  });
  assert(!invalidOpenCode.success, 'OpenCode model config rejects empty API key');

  // 4. Test Prompt Payload
  const validPrompt = PromptPayloadSchema.safeParse({
    sessionId: '123e4567-e89b-12d3-a456-426614174000',
    prompt: 'Fix the bug in auth.ts',
    mode: 'turbo',
    modelConfig: {
      provider: 'antigravity',
      modelName: 'antigravity-gemini-2.5',
      authType: 'pc_account',
    },
  });
  assert(validPrompt.success, 'Prompt payload validates with UUID and model config');

  // 5. Test GitHub Import Payload
  const validGitHub = GitHubImportPayloadSchema.safeParse({
    repoFullName: 'facebook/react',
    branch: 'main',
  });
  assert(validGitHub.success, 'GitHub repo name "owner/repo" validates successfully');

  const invalidGitHub = GitHubImportPayloadSchema.safeParse({
    repoFullName: 'just-repo-name-without-owner',
  });
  assert(!invalidGitHub.success, 'GitHub repo name rejects invalid format');

  // 6. Test File Write Payload
  const validFileWrite = FileWritePayloadSchema.safeParse({
    sessionId: '123e4567-e89b-12d3-a456-426614174000',
    path: 'src/components/Header.tsx',
    content: 'export const Header = () => <div>Header</div>;',
  });
  assert(validFileWrite.success, 'File write payload validates properly');

  console.log(`\nAudit Results: ${passed} passed, ${failed} failed.`);
  if (failed > 0) {
    process.exit(1);
  }
}

runSchemaTests();
