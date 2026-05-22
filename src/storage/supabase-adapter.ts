/**
 * Custom grammY StorageAdapter backed by Supabase.
 * Used for both session storage and conversation state persistence.
 *
 * Stores data in the `conversation_sessions` table (key TEXT PK, value JSONB).
 */

import type { StorageAdapter } from "grammy";
import type { SupabaseClient } from "@supabase/supabase-js";

export function createSupabaseStorage<T>(
  supabase: SupabaseClient
): StorageAdapter<T> {
  return {
    async read(key: string): Promise<T | undefined> {
      const { data, error } = await supabase
        .from("conversation_sessions")
        .select("value")
        .eq("key", key)
        .maybeSingle();

      if (error) {
        console.error(`[Storage] Read error for key "${key}":`, error.message);
        return undefined;
      }

      if (!data) return undefined;
      return data.value as T;
    },

    async write(key: string, value: T): Promise<void> {
      const { error } = await supabase
        .from("conversation_sessions")
        .upsert({ key, value: value as any }, { onConflict: "key" });

      if (error) {
        console.error(`[Storage] Write error for key "${key}":`, error.message);
        throw error;
      }
    },

    async delete(key: string): Promise<void> {
      const { error } = await supabase
        .from("conversation_sessions")
        .delete()
        .eq("key", key);

      if (error) {
        console.error(
          `[Storage] Delete error for key "${key}":`,
          error.message
        );
        throw error;
      }
    },
  };
}
