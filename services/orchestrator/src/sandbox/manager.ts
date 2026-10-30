import { EventEmitter } from 'node:events';
import type { ISandbox, SandboxCreationOptions, SandboxMetadata } from './types.js';
import { MockSandbox } from './mockSandbox.js';
import { E2BSandbox } from './e2bSandbox.js';

export interface SandboxManagerEvents {
  'sandbox:created': (meta: SandboxMetadata) => void;
  'sandbox:destroyed': (sessionId: string, id: string) => void;
  'sandbox:activity': (sessionId: string, timestamp: Date) => void;
}

export class SandboxManager extends EventEmitter {
  private instances = new Map<string, { sandbox: ISandbox; meta: SandboxMetadata }>();

  async createSandbox(options: SandboxCreationOptions): Promise<ISandbox> {
    const existing = this.instances.get(options.sessionId);
    if (existing && existing.meta.status === 'active') {
      this.touchSession(options.sessionId);
      return existing.sandbox;
    }

    const shouldUseMock = options.useMock || (!process.env.E2B_API_KEY && !options.apiKey);
    let sandbox: ISandbox;

    if (shouldUseMock) {
      const mock = new MockSandbox(options.sessionId);
      await mock.init();
      sandbox = mock;
    } else {
      sandbox = await E2BSandbox.create(options.sessionId, {
        apiKey: options.apiKey,
        timeoutMs: options.timeoutMs,
        template: options.template,
      });
    }

    const meta: SandboxMetadata = {
      id: sandbox.id,
      sessionId: options.sessionId,
      createdAt: new Date(),
      lastActiveAt: new Date(),
      status: 'active',
      template: options.template,
      isMock: sandbox.isMock,
    };

    this.instances.set(options.sessionId, { sandbox, meta });
    this.emit('sandbox:created', meta);

    return sandbox;
  }

  getSandbox(sessionId: string): ISandbox | null {
    const item = this.instances.get(sessionId);
    if (!item || item.meta.status !== 'active') {
      return null;
    }
    this.touchSession(sessionId);
    return item.sandbox;
  }

  getMetadata(sessionId: string): SandboxMetadata | null {
    return this.instances.get(sessionId)?.meta ?? null;
  }

  touchSession(sessionId: string): void {
    const item = this.instances.get(sessionId);
    if (item && item.meta.status === 'active') {
      item.meta.lastActiveAt = new Date();
      this.emit('sandbox:activity', sessionId, item.meta.lastActiveAt);
    }
  }

  async destroySandbox(sessionId: string): Promise<boolean> {
    const item = this.instances.get(sessionId);
    if (!item) return false;

    item.meta.status = 'destroyed';
    await item.sandbox.destroy();
    this.instances.delete(sessionId);
    this.emit('sandbox:destroyed', sessionId, item.meta.id);
    return true;
  }

  async destroyAll(): Promise<void> {
    const sessions = Array.from(this.instances.keys());
    await Promise.all(sessions.map((sessionId) => this.destroySandbox(sessionId)));
  }

  getActiveSessions(): SandboxMetadata[] {
    return Array.from(this.instances.values())
      .filter((entry) => entry.meta.status === 'active')
      .map((entry) => ({ ...entry.meta }));
  }

  hasActiveSession(sessionId: string): boolean {
    const item = this.instances.get(sessionId);
    return item !== undefined && item.meta.status === 'active';
  }
}
