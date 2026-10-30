import { EventEmitter } from 'node:events';
import type { SandboxManager } from './manager.js';

export interface ReaperOptions {
  /** Maximum idle time before a sandbox is automatically destroyed (default: 10 mins) */
  idleTimeoutMs?: number;
  /** Frequency at which active sandboxes are evaluated (default: 30 secs) */
  checkIntervalMs?: number;
  /** Time after which an idle warning is emitted (default: 8 mins) */
  warningThresholdMs?: number;
}

export class IdleReaper extends EventEmitter {
  private timer: NodeJS.Timeout | null = null;
  private warnedSessions = new Set<string>();
  readonly idleTimeoutMs: number;
  readonly checkIntervalMs: number;
  readonly warningThresholdMs: number;

  constructor(
    private manager: SandboxManager,
    options?: ReaperOptions,
  ) {
    super();
    this.idleTimeoutMs = options?.idleTimeoutMs ?? 10 * 60 * 1000; // 10 minutes
    this.checkIntervalMs = options?.checkIntervalMs ?? 30 * 1000; // 30 seconds
    this.warningThresholdMs = options?.warningThresholdMs ?? 8 * 60 * 1000; // 8 minutes

    // Reset warning tracking whenever user activity occurs
    this.manager.on('sandbox:activity', (sessionId: string) => {
      this.warnedSessions.delete(sessionId);
    });

    this.manager.on('sandbox:destroyed', (sessionId: string) => {
      this.warnedSessions.delete(sessionId);
    });
  }

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => {
      void this.checkSandboxes();
    }, this.checkIntervalMs);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async checkSandboxes(): Promise<{ reaped: string[]; warned: string[] }> {
    const now = Date.now();
    const activeSessions = this.manager.getActiveSessions();
    const reaped: string[] = [];
    const warned: string[] = [];

    for (const session of activeSessions) {
      const idleTime = now - session.lastActiveAt.getTime();

      // Check for timeout
      if (idleTime >= this.idleTimeoutMs) {
        reaped.push(session.sessionId);
        this.emit('sandbox:reaped', {
          sessionId: session.sessionId,
          sandboxId: session.id,
          idleTimeMs: idleTime,
          timestamp: new Date(),
        });
        await this.manager.destroySandbox(session.sessionId);
      } 
      // Check for warning threshold
      else if (idleTime >= this.warningThresholdMs && !this.warnedSessions.has(session.sessionId)) {
        warned.push(session.sessionId);
        this.warnedSessions.add(session.sessionId);
        const remainingMs = this.idleTimeoutMs - idleTime;
        this.emit('sandbox:warning', {
          sessionId: session.sessionId,
          sandboxId: session.id,
          remainingMs,
          timestamp: new Date(),
        });
      }
    }

    return { reaped, warned };
  }
}
