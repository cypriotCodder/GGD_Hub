/**
 * Type definitions for the GGD Hub bot.
 * Includes database row types, custom grammY context, and Supabase schema.
 */

import type { Context, SessionFlavor } from "grammy";
import type {
  Conversation,
  ConversationFlavor,
} from "@grammyjs/conversations";

// ============================================================
// Session Data
// ============================================================

/** Data stored in the user's session (persisted to Supabase) */
export interface SessionData {
  /** Track whether the user has completed onboarding */
  onboarded?: boolean;
}

// ============================================================
// Custom Context
// ============================================================

/** Base context before adding conversation flavor */
export type BaseContext = Context & SessionFlavor<SessionData>;

/** Extended grammY context with session and conversation support */
export type MyContext = ConversationFlavor<BaseContext>;

/** Conversation type parameterized with our custom context */
export type MyConversation = Conversation<MyContext, MyContext>;

// ============================================================
// Database Row Types
// ============================================================

export interface User {
  telegram_id: number;
  username: string | null;
  first_name: string | null;
  points: number;
  created_at: string;
}

export interface UserInsert {
  telegram_id: number;
  username?: string | null;
  first_name?: string | null;
  points?: number;
  created_at?: string;
}

export interface Committee {
  id: string;
  name: string;
  chat_id: number;
  created_at: string;
}

export interface CommitteeInsert {
  id?: string;
  name: string;
  chat_id: number;
  created_at?: string;
}

export interface UserCommittee {
  user_id: number;
  committee_id: string;
  role: string;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  assigned_to: number | null;
  committee_id: string;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  point_value: number;
  created_by: number;
  message_id: number | null;
  created_at: string;
}

export interface TaskInsert {
  id?: string;
  title: string;
  description?: string | null;
  assigned_to?: number | null;
  committee_id: string;
  status?: string;
  point_value?: number;
  created_by: number;
  message_id?: number | null;
  created_at?: string;
}

export interface Standup {
  id: string;
  user_id: number;
  committee_id: string;
  completed: string | null;
  next: string | null;
  blockers: string | null;
  created_at: string;
}

export interface StandupInsert {
  id?: string;
  user_id: number;
  committee_id: string;
  completed?: string | null;
  next?: string | null;
  blockers?: string | null;
  created_at?: string;
}

export interface ConversationSession {
  key: string;
  value: Record<string, unknown>;
}

export interface LeaderboardEntry {
  telegram_id: number;
  username: string | null;
  first_name: string | null;
  points: number;
}

// ============================================================
// Supabase Database Type (mirrors generated type structure)
// ============================================================

export interface Database {
  public: {
    Tables: {
      users: {
        Row: User;
        Insert: UserInsert;
        Update: Partial<UserInsert>;
      };
      committees: {
        Row: Committee;
        Insert: CommitteeInsert;
        Update: Partial<CommitteeInsert>;
      };
      user_committees: {
        Row: UserCommittee;
        Insert: UserCommittee;
        Update: Partial<UserCommittee>;
      };
      tasks: {
        Row: Task;
        Insert: TaskInsert;
        Update: Partial<TaskInsert>;
      };
      standups: {
        Row: Standup;
        Insert: StandupInsert;
        Update: Partial<StandupInsert>;
      };
      conversation_sessions: {
        Row: ConversationSession;
        Insert: ConversationSession;
        Update: Partial<ConversationSession>;
      };
    };
  };
}
