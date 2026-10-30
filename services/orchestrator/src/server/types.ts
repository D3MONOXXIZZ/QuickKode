import type { WebSocket } from 'ws';
import type { Session, Project } from '@quickkode/shared';
import type { ISandbox } from '../sandbox/types.js';

export interface SocketClientInfo {
  id: string;
  socket: WebSocket;
  subscribedSessions: Set<string>;
  connectedAt: Date;
}

export interface ActiveSessionContext {
  session: Session;
  project: Project;
  sandbox: ISandbox;
  driveFolderId?: string;
}

export interface InboundMessage<T = unknown> {
  event: string;
  payload: T;
}

export interface OutboundMessage<T = unknown> {
  event: string;
  payload: T;
}
