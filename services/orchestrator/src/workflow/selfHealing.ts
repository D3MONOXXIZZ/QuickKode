import type { ISandbox } from '../sandbox/types.js';
import type { AgentEngine } from '../agent/agentEngine.js';
import { ProjectTestRunner } from './testRunner.js';
import type { SelfHealingAttempt } from './types.js';
import type { ActiveModelConfig, AgentThought, ToolCallRecord, TestRunResult } from '@quickkode/shared';

export interface SelfHealingOptions {
  sessionId: string;
  originalPrompt: string;
  initialError: string;
  modelConfig: ActiveModelConfig;
  maxAttempts?: number;
  useMock?: boolean;
  onThought?: (thought: AgentThought) => void;
  onToolCall?: (toolCall: ToolCallRecord) => void;
  onTerminalChunk?: (chunk: string, stream: 'stdout' | 'stderr') => void;
}

export interface SelfHealingResult {
  resolved: boolean;
  attempts: SelfHealingAttempt[];
  finalTestResult: TestRunResult;
}

export class SelfHealingEngine {
  constructor(
    private sandbox: ISandbox,
    private agentEngine: AgentEngine,
  ) {}

  async attemptHealing(options: SelfHealingOptions): Promise<SelfHealingResult> {
    const maxAttempts = options.maxAttempts ?? 3;
    const runner = new ProjectTestRunner(this.sandbox);
    const attempts: SelfHealingAttempt[] = [];
    let currentError = options.initialError;

    for (let i = 1; i <= maxAttempts; i++) {
      const healingThought: AgentThought = {
        id: `thought-${Date.now()}-heal-${i}`,
        title: `Self-Healing Attempt ${i}/${maxAttempts}`,
        content: `Diagnosing test failure:\n${currentError.slice(0, 300)}... Formulating code repair.`,
        timestamp: new Date().toISOString(),
        status: 'in_progress',
      };
      options.onThought?.(healingThought);

      const fixPrompt = `Verification failed with this error:\n\`\`\`\n${currentError}\n\`\`\`\nFix the code so the tests pass. Original goal: ${options.originalPrompt}`;

      const runResult = await this.agentEngine.executeTask(this.sandbox, {
        sessionId: options.sessionId,
        prompt: fixPrompt,
        modelConfig: options.modelConfig,
        useMock: options.useMock,
        onThought: options.onThought,
        onToolCall: options.onToolCall,
        onTerminalChunk: options.onTerminalChunk,
      });

      // Re-run test suite to verify repair
      const retest = await runner.runTests(undefined, options.onTerminalChunk);

      const attemptRecord: SelfHealingAttempt = {
        attemptNumber: i,
        errorLog: currentError,
        actionsTaken: runResult.toolCalls.map((t) => `${t.name}(${JSON.stringify(t.parameters)})`),
        resolved: retest.passedAll,
      };
      attempts.push(attemptRecord);

      if (retest.passedAll) {
        healingThought.status = 'completed';
        healingThought.content = `Self-healing succeeded on attempt ${i}. All tests passing.`;
        options.onThought?.(healingThought);

        return {
          resolved: true,
          attempts,
          finalTestResult: retest,
        };
      }

      currentError = retest.stderr || retest.stdout || 'Tests failed with non-zero exit code';
      healingThought.status = 'failed';
      healingThought.content = `Attempt ${i} did not pass tests. Error: ${currentError.slice(0, 200)}...`;
      options.onThought?.(healingThought);
    }

    const finalTestResult = await runner.runTests(undefined, options.onTerminalChunk);
    return {
      resolved: false,
      attempts,
      finalTestResult,
    };
  }
}
