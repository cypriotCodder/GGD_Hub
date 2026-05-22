/**
 * Database service layer — typed wrapper around Supabase client.
 * All database operations go through this module.
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { config } from "../config";
import type {
  User,
  UserInsert,
  Committee,
  CommitteeInsert,
  UserCommittee,
  Task,
  TaskInsert,
  Standup,
  StandupInsert,
  LeaderboardEntry,
} from "../types";

// Initialize Supabase client at module scope for warm reuse.
// service_role key bypasses RLS — safe because this is a trusted server-side bot.
const supabase: SupabaseClient = createClient(
  config.SUPABASE_URL,
  config.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  }
);

/** Export raw client for the storage adapter and direct access */
export { supabase };

// ============================================================
// Users
// ============================================================

/** Create or update a user (idempotent — safe to call on every /start) */
export async function upsertUser(
  telegramId: number,
  username: string | null,
  firstName: string | null
): Promise<User> {
  const { data, error } = await supabase
    .from("users")
    .upsert(
      {
        telegram_id: telegramId,
        username,
        first_name: firstName,
      } satisfies UserInsert,
      { onConflict: "telegram_id" }
    )
    .select()
    .single();

  if (error) throw new Error(`Failed to upsert user: ${error.message}`);
  return data as User;
}

/** Get a user by Telegram ID, or null if not registered */
export async function getUser(telegramId: number): Promise<User | null> {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("telegram_id", telegramId)
    .maybeSingle();

  if (error) throw new Error(`Failed to get user: ${error.message}`);
  return data as User | null;
}

// ============================================================
// Committees
// ============================================================

/** Get all committees */
export async function getCommittees(): Promise<Committee[]> {
  const { data, error } = await supabase
    .from("committees")
    .select("*")
    .order("name");

  if (error) throw new Error(`Failed to get committees: ${error.message}`);
  return (data as Committee[]) || [];
}

/** Get a single committee by ID */
export async function getCommittee(
  committeeId: string
): Promise<Committee | null> {
  const { data, error } = await supabase
    .from("committees")
    .select("*")
    .eq("id", committeeId)
    .maybeSingle();

  if (error) throw new Error(`Failed to get committee: ${error.message}`);
  return data as Committee | null;
}

/** Find a committee by its Telegram group chat_id */
export async function getCommitteeByChatId(
  chatId: number
): Promise<Committee | null> {
  const { data, error } = await supabase
    .from("committees")
    .select("*")
    .eq("chat_id", chatId)
    .maybeSingle();

  if (error)
    throw new Error(`Failed to get committee by chat_id: ${error.message}`);
  return data as Committee | null;
}

/** Create a new committee */
export async function createCommittee(
  input: CommitteeInsert
): Promise<Committee> {
  const { data, error } = await supabase
    .from("committees")
    .insert(input)
    .select()
    .single();

  if (error) throw new Error(`Failed to create committee: ${error.message}`);
  return data as Committee;
}

// ============================================================
// User ↔ Committee Membership
// ============================================================

/** Get all committees a user belongs to */
export async function getUserCommittees(
  telegramId: number
): Promise<(UserCommittee & { committees: Committee })[]> {
  const { data, error } = await supabase
    .from("user_committees")
    .select("*, committees(*)")
    .eq("user_id", telegramId);

  if (error)
    throw new Error(`Failed to get user committees: ${error.message}`);
  return (data as any[]) || [];
}

/** Get all members of a committee */
export async function getCommitteeMembers(
  committeeId: string
): Promise<(UserCommittee & { users: User })[]> {
  const { data, error } = await supabase
    .from("user_committees")
    .select("*, users(*)")
    .eq("committee_id", committeeId);

  if (error)
    throw new Error(`Failed to get committee members: ${error.message}`);
  return (data as any[]) || [];
}

/** Add a user to a committee */
export async function joinCommittee(
  telegramId: number,
  committeeId: string,
  role: string = "member"
): Promise<void> {
  const { error } = await supabase.from("user_committees").upsert(
    {
      user_id: telegramId,
      committee_id: committeeId,
      role,
    },
    { onConflict: "user_id,committee_id" }
  );

  if (error) throw new Error(`Failed to join committee: ${error.message}`);
}

/** Check if a user is a leader of a specific committee */
export async function isLeader(
  telegramId: number,
  committeeId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("user_committees")
    .select("role")
    .eq("user_id", telegramId)
    .eq("committee_id", committeeId)
    .maybeSingle();

  if (error) return false;
  return data?.role === "leader";
}

/** Check if a user is a leader of ANY committee */
export async function isAnyLeader(telegramId: number): Promise<boolean> {
  const { data, error } = await supabase
    .from("user_committees")
    .select("role")
    .eq("user_id", telegramId)
    .eq("role", "leader")
    .limit(1);

  if (error) return false;
  return (data?.length ?? 0) > 0;
}

/** Get committees where a user is a leader */
export async function getLeaderCommittees(
  telegramId: number
): Promise<(UserCommittee & { committees: Committee })[]> {
  const { data, error } = await supabase
    .from("user_committees")
    .select("*, committees(*)")
    .eq("user_id", telegramId)
    .eq("role", "leader");

  if (error)
    throw new Error(`Failed to get leader committees: ${error.message}`);
  return (data as any[]) || [];
}

// ============================================================
// Tasks
// ============================================================

/** Create a new task */
export async function createTask(input: TaskInsert): Promise<Task> {
  const { data, error } = await supabase
    .from("tasks")
    .insert(input)
    .select()
    .single();

  if (error) throw new Error(`Failed to create task: ${error.message}`);
  return data as Task;
}

/** Claim a task — assigns it to a user and sets status to in_progress */
export async function claimTask(
  taskId: string,
  telegramId: number
): Promise<Task | null> {
  // Only claim if still pending (prevents double-claims)
  const { data, error } = await supabase
    .from("tasks")
    .update({ assigned_to: telegramId, status: "in_progress" })
    .eq("id", taskId)
    .eq("status", "pending")
    .select()
    .maybeSingle();

  if (error) throw new Error(`Failed to claim task: ${error.message}`);
  return data as Task | null;
}

/** Mark a task as completed */
export async function completeTask(taskId: string): Promise<Task | null> {
  const { data, error } = await supabase
    .from("tasks")
    .update({ status: "completed" })
    .eq("id", taskId)
    .eq("status", "in_progress")
    .select()
    .maybeSingle();

  if (error) throw new Error(`Failed to complete task: ${error.message}`);
  return data as Task | null;
}

/** Get a single task by ID */
export async function getTask(taskId: string): Promise<Task | null> {
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("id", taskId)
    .maybeSingle();

  if (error) throw new Error(`Failed to get task: ${error.message}`);
  return data as Task | null;
}

/** Get all active (in_progress) tasks assigned to a user */
export async function getUserActiveTasks(telegramId: number): Promise<Task[]> {
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("assigned_to", telegramId)
    .eq("status", "in_progress")
    .order("created_at", { ascending: false });

  if (error)
    throw new Error(`Failed to get user active tasks: ${error.message}`);
  return (data as Task[]) || [];
}

/** Update the message_id on a task (used after broadcasting to a group) */
export async function updateTaskMessageId(
  taskId: string,
  messageId: number
): Promise<void> {
  const { error } = await supabase
    .from("tasks")
    .update({ message_id: messageId })
    .eq("id", taskId);

  if (error)
    throw new Error(`Failed to update task message_id: ${error.message}`);
}

/** Get all registered users (for admin broadcast) */
export async function getAllUsers(): Promise<User[]> {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .order("created_at");

  if (error) throw new Error(`Failed to get all users: ${error.message}`);
  return (data as User[]) || [];
}

// ============================================================
// Standups
// ============================================================

/** Save a standup report */
export async function saveStandup(input: StandupInsert): Promise<Standup> {
  const { data, error } = await supabase
    .from("standups")
    .insert(input)
    .select()
    .single();

  if (error) throw new Error(`Failed to save standup: ${error.message}`);
  return data as Standup;
}

// ============================================================
// Gamification
// ============================================================

/** Add points to a user atomically */
export async function addPoints(
  telegramId: number,
  amount: number
): Promise<void> {
  const { error } = await supabase.rpc("increment_points", {
    user_telegram_id: telegramId,
    amount,
  });

  if (error) throw new Error(`Failed to add points: ${error.message}`);
}

/** Get the leaderboard, optionally filtered by committee */
export async function getLeaderboard(
  committeeId?: string,
  limit: number = 10
): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabase.rpc("get_leaderboard", {
    p_committee_id: committeeId || null,
    p_limit: limit,
  });

  if (error) throw new Error(`Failed to get leaderboard: ${error.message}`);
  return (data as LeaderboardEntry[]) || [];
}

// ============================================================
// Bulk queries (for cron)
// ============================================================

/** Get all users with their committee memberships (for standup cron) */
export async function getAllActiveUsersWithCommittees(): Promise<
  { user: User; committees: Committee[] }[]
> {
  const { data, error } = await supabase
    .from("users")
    .select("*, user_committees(*, committees(*))");

  if (error)
    throw new Error(
      `Failed to get active users with committees: ${error.message}`
    );

  return ((data as any[]) || [])
    .map((row) => ({
      user: {
        telegram_id: row.telegram_id,
        username: row.username,
        first_name: row.first_name,
        points: row.points,
        created_at: row.created_at,
      } as User,
      committees: (row.user_committees || []).map(
        (uc: any) => uc.committees as Committee
      ),
    }))
    .filter((entry) => entry.committees.length > 0); // Only users in at least one committee
}
