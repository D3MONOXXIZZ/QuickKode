import type { ISandbox } from '../sandbox/types.js';
import type { TestRunResult } from '@quickkode/shared';

export class ProjectTestRunner {
  constructor(private sandbox: ISandbox) {}

  async detectTestCommand(): Promise<string | null> {
    try {
      const packageJsonStr = await this.sandbox.readFile('package.json');
      const pkg = JSON.parse(packageJsonStr) as { scripts?: Record<string, string> };
      const testScript = pkg.scripts?.test;

      if (testScript && !testScript.includes('no test specified')) {
        return 'npm test';
      }
    } catch {
      // package.json doesn't exist
    }

    // Check for Python pytest
    try {
      const tree = await this.sandbox.listDirectory('.');
      const hasPythonTest = tree.children?.some(
        (c) => c.name === 'tests' || c.name === 'test' || c.name === 'pytest.ini' || c.name === 'pyproject.toml',
      );
      if (hasPythonTest) {
        return 'pytest';
      }
    } catch {
      // list failed
    }

    return null;
  }

  async runTests(
    customCommand?: string,
    onTerminalChunk?: (chunk: string, stream: 'stdout' | 'stderr') => void,
  ): Promise<TestRunResult> {
    const startTime = Date.now();
    const command = customCommand ?? (await this.detectTestCommand()) ?? 'echo "No tests configured"';

    const execResult = await this.sandbox.executeCommand(command, {
      onStdout: (chunk) => onTerminalChunk?.(chunk, 'stdout'),
      onStderr: (chunk) => onTerminalChunk?.(chunk, 'stderr'),
    });

    const durationMs = Date.now() - startTime;
    const stdout = execResult.stdout;
    const stderr = execResult.stderr;
    const exitCode = execResult.exitCode;

    // Parse counts if available
    let passed = 0;
    let failed = 0;

    // Pattern 1: Jest / Vitest: Tests: 5 passed, 1 failed, 6 total
    const jestMatch = stdout.match(/Tests:\s+(?:(\d+)\s+passed)?(?:,\s*)?(?:(\d+)\s+failed)?/i);
    if (jestMatch) {
      if (jestMatch[1]) passed = parseInt(jestMatch[1], 10);
      if (jestMatch[2]) failed = parseInt(jestMatch[2], 10);
    } else {
      // Pattern 2: Pytest: 5 passed, 1 failed in 0.12s
      const pyMatch = stdout.match(/(?:(\d+)\s+passed)?(?:,\s*)?(?:(\d+)\s+failed)?/i);
      if (pyMatch && (pyMatch[1] || pyMatch[2])) {
        if (pyMatch[1]) passed = parseInt(pyMatch[1], 10);
        if (pyMatch[2]) failed = parseInt(pyMatch[2], 10);
      } else {
        if (exitCode === 0) passed = 1;
        else failed = 1;
      }
    }

    const passedAll = exitCode === 0 && failed === 0;

    return {
      suiteName: command,
      totalTests: passed + failed,
      passed,
      failed,
      durationMs,
      stdout,
      stderr,
      passedAll,
    };
  }
}
