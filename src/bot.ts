/**
 * Bot instance — central middleware chain and feature registration.
 *
 * This module creates the grammY Bot, wires up session storage,
 * conversations, all feature Composers, and error handling.
 *
 * Imported by api/bot.ts (webhook) and api/cron.ts (proactive messages).
 */

import { Bot, session } from "grammy";
import { conversations, createConversation } from "@grammyjs/conversations";
import { config } from "./config";
import type { MyContext, SessionData } from "./types";
import { supabase } from "./services/db";
import { createSupabaseStorage } from "./storage/supabase-adapter";

// Feature Composers
import startFeature from "./features/start";
import helpFeature from "./features/help";
import tasksFeature from "./features/tasks";
import doneFeature from "./features/done";
import leaderboardFeature from "./features/leaderboard";
import adminFeature from "./features/admin";

// Conversations
import { standupConversation } from "./conversations/standup";

// ============================================================
// Bot Instance (module scope — reused across warm invocations)
// ============================================================

const bot = new Bot<MyContext>(config.BOT_TOKEN);

// ============================================================
// Middleware Chain (order matters!)
// ============================================================

// 1. Session middleware — persists per-user state to Supabase
bot.use(
  session<SessionData, MyContext>({
    initial: (): SessionData => ({}),
    storage: createSupabaseStorage<SessionData>(supabase),
  })
);

// 2. Conversations middleware — manages multi-step flows
bot.use(
  conversations<MyContext, MyContext>()
);

// 3. Register conversation definitions
bot.use(createConversation(standupConversation, "standup"));

// 4. Handle the "Start Standup" button from cron DMs
bot.callbackQuery("start_standup", async (ctx) => {
  await ctx.answerCallbackQuery();

  try {
    // Edit the cron message to indicate the standup is in progress
    await ctx.editMessageText(
      "📝 <b>Standup in progress…</b>\n\nAnswer the questions below.",
      { parse_mode: "HTML" }
    );
  } catch {
    // Message may have already been edited
  }

  await ctx.conversation.enter("standup");
});

// 5. Mount feature Composers
bot.use(startFeature);
bot.use(helpFeature);
bot.use(tasksFeature);
bot.use(doneFeature);
bot.use(leaderboardFeature);
bot.use(adminFeature);

// 6. Catch-all for unhandled callback queries (prevents loading spinners)
bot.on("callback_query:data", async (ctx) => {
  console.warn(`[Bot] Unhandled callback query: ${ctx.callbackQuery.data}`);
  await ctx.answerCallbackQuery();
});

// ============================================================
// Error Handling
// ============================================================

bot.catch((err) => {
  const ctx = err.ctx;
  console.error(
    `[Bot] Error while handling update ${ctx.update.update_id}:`,
    err.error
  );

  // Try to notify the user (best-effort)
  ctx
    .reply("❌ An unexpected error occurred. Please try again later.")
    .catch(() => {
      // If even this fails, just log it
      console.error("[Bot] Failed to send error message to user");
    });
});

export default bot;
