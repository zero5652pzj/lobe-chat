import { LobeSessions } from './agentSession';

export type SessionGroupId = string;

export enum SessionDefaultGroup {
  Default = 'default',
  Pinned = 'pinned',
}

export interface SessionGroupItem {
  createdAt: Date;
  id: string;
  name: string;
  sort?: number | null;
  updatedAt: Date;
}

export type SessionGroups = SessionGroupItem[];

export interface CustomSessionGroup extends SessionGroupItem {
  children: LobeSessions;
}

export type LobeSessionGroups = SessionGroupItem[];
