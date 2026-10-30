import type { ISandbox } from '../sandbox/types.js';
import type { IAgentAdapter, AgentExecutionOptions, AgentRunResult } from './types.js';
import type { ActiveModelConfig } from '@quickkode/shared';
import { AntigravityAgentAdapter } from './antigravityAdapter.js';
import { OpenCodeAgentAdapter } from './openCodeAdapter.js';
import { MockAgentAdapter } from './mockAgentAdapter.js';

export class AgentEngine {
  getAdapter(modelConfig: ActiveModelConfig, useMock = false): IAgentAdapter {
    if (useMock) {
      return new MockAgentAdapter(modelConfig.provider, modelConfig.modelName);
    }

    if (modelConfig.provider === 'antigravity') {
      return new AntigravityAgentAdapter(modelConfig);
    }

    if (modelConfig.provider === 'opencode') {
      return new OpenCodeAgentAdapter(modelConfig);
    }

    throw new Error(`Unsupported model provider: ${(modelConfig as { provider?: string }).provider}`);
  }

  async executeTask(
    sandbox: ISandbox,
    options: AgentExecutionOptions & { useMock?: boolean },
  ): Promise<AgentRunResult> {
    const adapter = this.getAdapter(options.modelConfig, options.useMock);
    return adapter.run(sandbox, options);
  }
}
