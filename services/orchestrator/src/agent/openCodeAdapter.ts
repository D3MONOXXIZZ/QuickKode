import type { ISandbox } from '../sandbox/types.js';
import type { IAgentAdapter, AgentExecutionOptions, AgentRunResult } from './types.js';
import type { OpenCodeModelConfig, AgentThought, ToolCallRecord } from '@quickkode/shared';
import { AGENT_TOOLS, ToolExecutor } from './tools.js';
import { GitClient } from '../git/gitClient.js';

export class OpenCodeAgentAdapter implements IAgentAdapter {
  readonly providerName = 'opencode';
  readonly modelName: string;
  private endpoint: string;

  constructor(private config: OpenCodeModelConfig) {
    this.modelName = config.modelName;
    this.endpoint = config.apiEndpoint ?? 'https://api.deepseek.com/v1';
  }

  async run(sandbox: ISandbox, options: AgentExecutionOptions): Promise<AgentRunResult> {
    const executor = new ToolExecutor(sandbox);
    const git = new GitClient(sandbox);
    const thoughts: AgentThought[] = [];
    const toolCalls: ToolCallRecord[] = [];
    const maxTurns = options.maxTurns ?? 10;

    const initialThought: AgentThought = {
      id: `thought-${Date.now()}-init`,
      title: `Starting OpenCode with ${this.modelName}`,
      content: `Received task: "${options.prompt}". Connecting to model endpoint with BYOK authentication.`,
      timestamp: new Date().toISOString(),
      status: 'in_progress',
    };
    thoughts.push(initialThought);
    options.onThought?.(initialThought);

    const formattedTools = AGENT_TOOLS.map((t) => ({
      type: 'function',
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      },
    }));

    const messages: Array<{
      role: 'system' | 'user' | 'assistant' | 'tool';
      content: string | null;
      tool_calls?: Array<{ id: string; type: string; function: { name: string; arguments: string } }>;
      tool_call_id?: string;
    }> = [
      {
        role: 'system',
        content: 'You are an expert autonomous software engineer working in a cloud sandbox. Use the provided tools to inspect files, edit code, and run tests. Once you verify your changes, summarize what you completed.',
      },
      {
        role: 'user',
        content: options.prompt,
      },
    ];

    let turns = 0;
    try {
      while (turns < maxTurns) {
        turns++;

        const response = await fetch(`${this.endpoint.replace(/\/$/, '')}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.config.apiKey}`,
          },
          body: JSON.stringify({
            model: this.modelName,
            messages,
            tools: formattedTools,
            tool_choice: 'auto',
          }),
        });

        if (!response.ok) {
          throw new Error(`OpenCode API request failed (${response.status}): ${await response.text()}`);
        }

        const data = (await response.json()) as {
          choices?: Array<{
            message: {
              role: string;
              content: string | null;
              tool_calls?: Array<{
                id: string;
                type: string;
                function: { name: string; arguments: string };
              }>;
            };
          }>;
        };

        const choice = data.choices?.[0]?.message;
        if (!choice) break;

        if (choice.tool_calls && choice.tool_calls.length > 0) {
          messages.push({
            role: 'assistant',
            content: choice.content,
            tool_calls: choice.tool_calls,
          });

          for (const tc of choice.tool_calls) {
            const toolName = tc.function.name;
            let args: Record<string, unknown> = {};
            try {
              args = JSON.parse(tc.function.arguments || '{}') as Record<string, unknown>;
            } catch {
              args = { raw: tc.function.arguments };
            }

            const stepThought: AgentThought = {
              id: `thought-${Date.now()}-${toolName}`,
              title: `OpenCode: Calling ${toolName}`,
              content: `Running tool ${toolName} with parameters: ${JSON.stringify(args)}`,
              timestamp: new Date().toISOString(),
              status: 'in_progress',
            };
            thoughts.push(stepThought);
            options.onThought?.(stepThought);

            const callResult = await executor.execute(toolName, args, options.onTerminalChunk);
            toolCalls.push(callResult);
            options.onToolCall?.(callResult);

            stepThought.status = callResult.isError ? 'failed' : 'completed';
            options.onThought?.(stepThought);

            messages.push({
              role: 'tool',
              tool_call_id: tc.id,
              content: callResult.output || '',
            });
          }
        } else {
          // Assistant provided final response
          initialThought.status = 'completed';
          const diffs = (await git.isGitRepo()) ? await git.getDiff() : [];

          return {
            success: true,
            finalMessage: choice.content || 'Task completed by OpenCode.',
            thoughts,
            toolCalls,
            diffs,
            turnsTaken: turns,
          };
        }
      }

      const diffs = (await git.isGitRepo()) ? await git.getDiff() : [];
      return {
        success: true,
        finalMessage: 'OpenCode reached maximum execution turns.',
        thoughts,
        toolCalls,
        diffs,
        turnsTaken: turns,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      initialThought.status = 'failed';
      initialThought.content += `\nError: ${message}`;
      options.onThought?.(initialThought);

      return {
        success: false,
        finalMessage: `OpenCode execution failed: ${message}`,
        thoughts,
        toolCalls,
        diffs: [],
        turnsTaken: turns,
        error: message,
      };
    }
  }
}
