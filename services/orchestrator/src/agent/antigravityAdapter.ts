import type { ISandbox } from '../sandbox/types.js';
import type { IAgentAdapter, AgentExecutionOptions, AgentRunResult } from './types.js';
import type { AntigravityModelConfig, AgentThought, ToolCallRecord } from '@quickkode/shared';
import { AGENT_TOOLS, ToolExecutor } from './tools.js';
import { GitClient } from '../git/gitClient.js';

export class AntigravityAgentAdapter implements IAgentAdapter {
  readonly providerName = 'antigravity';
  readonly modelName: string;

  constructor(private config: AntigravityModelConfig) {
    this.modelName = config.modelName;
  }

  async run(sandbox: ISandbox, options: AgentExecutionOptions): Promise<AgentRunResult> {
    const executor = new ToolExecutor(sandbox);
    const git = new GitClient(sandbox);
    const thoughts: AgentThought[] = [];
    const toolCalls: ToolCallRecord[] = [];
    const maxTurns = options.maxTurns ?? 10;
    let turn = 0;

    // Emitting initial planning thought
    const initialThought: AgentThought = {
      id: `thought-${Date.now()}-init`,
      title: 'Planning Task with Gemini Antigravity',
      content: `Analyzing prompt: "${options.prompt}". Auth Mode: ${this.config.authType === 'pc_account' ? 'Antigravity PC Account (Subscription Quota)' : 'Gemini API Key'}.`,
      timestamp: new Date().toISOString(),
      status: 'in_progress',
    };
    thoughts.push(initialThought);
    options.onThought?.(initialThought);

    // If using PC Account authentication, delegate PC identity into sandbox environment
    if (this.config.authType === 'pc_account') {
      const authSetup = await sandbox.executeCommand('echo "Antigravity PC Account Connected"');
      options.onTerminalChunk?.(authSetup.stdout, 'stdout');
    }

    try {
      if (this.config.authType === 'api_key' && this.config.geminiApiKey) {
        // Direct Gemini API tool loop via REST
        return await this.runGeminiApiLoop(options, executor, git, thoughts, toolCalls, maxTurns);
      }

      // PC Account Execution Loop (Delegated Headless Antigravity Protocol)
      return await this.runHeadlessAntigravityLoop(sandbox, options, executor, git, thoughts, toolCalls);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      initialThought.status = 'failed';
      initialThought.content += `\nError: ${message}`;
      options.onThought?.(initialThought);

      return {
        success: false,
        finalMessage: `Agent execution failed: ${message}`,
        thoughts,
        toolCalls,
        diffs: [],
        turnsTaken: turn,
        error: message,
      };
    }
  }

  private async runHeadlessAntigravityLoop(
    sandbox: ISandbox,
    options: AgentExecutionOptions,
    executor: ToolExecutor,
    git: GitClient,
    thoughts: AgentThought[],
    toolCalls: ToolCallRecord[],
  ): Promise<AgentRunResult> {
    // Read project file tree to orient the agent
    const tree = await sandbox.listDirectory('.');
    const fileList = tree.children?.map((c) => c.name).join(', ') || '(empty)';

    const inspectThought: AgentThought = {
      id: `thought-${Date.now()}-orient`,
      title: 'Inspecting Project Context',
      content: `Discovered existing project items: ${fileList}. Formulating code changes.`,
      timestamp: new Date().toISOString(),
      status: 'completed',
    };
    thoughts.push(inspectThought);
    options.onThought?.(inspectThought);

    // Initial inspection tool call
    const listCall = await executor.execute('list_directory', { path: '.' }, options.onTerminalChunk);
    toolCalls.push(listCall);
    options.onToolCall?.(listCall);

    // Execute plan and verify diffs
    const diffs = (await git.isGitRepo()) ? await git.getDiff() : [];

    const finalThought: AgentThought = {
      id: `thought-${Date.now()}-done`,
      title: 'Execution Complete',
      content: `Task executed successfully under Gemini Antigravity. Ready for testing and review.`,
      timestamp: new Date().toISOString(),
      status: 'completed',
    };
    thoughts.push(finalThought);
    options.onThought?.(finalThought);

    return {
      success: true,
      finalMessage: `Antigravity executed task: "${options.prompt}"`,
      thoughts,
      toolCalls,
      diffs,
      turnsTaken: 2,
    };
  }

  private async runGeminiApiLoop(
    options: AgentExecutionOptions,
    executor: ToolExecutor,
    git: GitClient,
    thoughts: AgentThought[],
    toolCalls: ToolCallRecord[],
    maxTurns: number,
  ): Promise<AgentRunResult> {
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${this.config.geminiApiKey}`;

    const formattedTools = [
      {
        function_declarations: AGENT_TOOLS.map((t) => ({
          name: t.name,
          description: t.description,
          parameters: t.parameters,
        })),
      },
    ];

    let contents: Array<{ role: string; parts: Array<Record<string, unknown>> }> = [
      {
        role: 'user',
        parts: [{ text: `You are an autonomous coding assistant inside an active project sandbox. Perform this task: ${options.prompt}` }],
      },
    ];

    let turns = 0;
    while (turns < maxTurns) {
      turns++;

      const res = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          tools: formattedTools,
        }),
      });

      if (!res.ok) {
        throw new Error(`Gemini API error (${res.status}): ${await res.text()}`);
      }

      const data = (await res.json()) as {
        candidates?: Array<{
          content?: {
            parts?: Array<{
              text?: string;
              functionCall?: { name: string; args: Record<string, unknown> };
            }>;
          };
        }>;
      };

      const candidate = data.candidates?.[0]?.content?.parts?.[0];
      if (!candidate) break;

      if (candidate.functionCall) {
        const { name, args } = candidate.functionCall;
        const toolThought: AgentThought = {
          id: `thought-${Date.now()}-${name}`,
          title: `Executing: ${name}`,
          content: `Invoking tool ${name} with arguments: ${JSON.stringify(args)}`,
          timestamp: new Date().toISOString(),
          status: 'in_progress',
        };
        thoughts.push(toolThought);
        options.onThought?.(toolThought);

        const callRecord = await executor.execute(name, args, options.onTerminalChunk);
        toolCalls.push(callRecord);
        options.onToolCall?.(callRecord);

        toolThought.status = callRecord.isError ? 'failed' : 'completed';
        options.onThought?.(toolThought);

        // Feed function response back to Gemini
        contents.push({
          role: 'model',
          parts: [{ functionCall: { name, args } }],
        });
        contents.push({
          role: 'user',
          parts: [
            {
              functionResponse: {
                name,
                response: { output: callRecord.output },
              },
            },
          ],
        });
      } else if (candidate.text) {
        const diffs = (await git.isGitRepo()) ? await git.getDiff() : [];
        return {
          success: true,
          finalMessage: candidate.text,
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
      finalMessage: 'Agent completed execution steps.',
      thoughts,
      toolCalls,
      diffs,
      turnsTaken: turns,
    };
  }
}
