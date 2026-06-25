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
import { supabase, claimTask, completeTask } from "./services/db";
import { createSupabaseStorage } from "./storage/supabase-adapter";
import { completeTaskKeyboard } from "./keyboards";

// Feature Composers
import startFeature from "./features/start";
import helpFeature from "./features/help";
import tasksFeature from "./features/tasks";
import doneFeature from "./features/done";
import leaderboardFeature from "./features/leaderboard";
import adminFeature from "./features/admin";

// Conversations
import { standupConversation } from "./conversations/standup";
import { addCommitteeConversation } from "./conversations/admin_add_committee";
import { promoteLeaderConversation } from "./conversations/admin_promote";

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
bot.use(createConversation(addCommitteeConversation, "addCommittee"));
bot.use(createConversation(promoteLeaderConversation, "promoteLeader"));

// 4. Handle the "Standup'a Başla" button from cron DMs
bot.callbackQuery("start_standup", async (ctx) => {
  await ctx.answerCallbackQuery();

  try {
    // Edit the cron message to indicate the standup is in progress
    await ctx.editMessageText(
      "📝 <b>Standup in progress…</b>\n\nAnswer the questions below.",
      { parse_mode: "HTML" }
    );
  } catch {
    // Mesaj may have already been edited
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

// 6. Report chat ID when added to a new group
bot.on("my_chat_member", async (ctx) => {
  const newStatus = ctx.myChatMember.new_chat_member.status;
  if (newStatus === "üye" || newStatus === "yöneticiistrator") {
    const chat = ctx.chat;
    try {
      await ctx.api.sendMessage(
        chat.id,
        `👋 <b>Merhaba! Beni eklediğiniz için teşekkürler.</b>\n\n` +
        `My Sohbet ID for this group is: <code>${chat.id}</code>\n\n` +
        `Bu komiteyi kaydetmek için bu ID'yi Web Dashboard'da kullanın.`,
        { parse_mode: "HTML" }
      );
    } catch (e) {
      console.error("Failed to send welcome message to new group:", e);
    }
  }
});

// 7. Inline Görevi Al Handler
bot.callbackQuery(/^claim_task:(.+)$/, async (ctx) => {
  const taskId = ctx.match[1];
  try {
    const task = await claimTask(taskId, ctx.from.id);
    if (!task) {
      await ctx.answerCallbackQuery("⚠️ Görev zaten alınmış veya bulunamadı.");
      return;
    }
    await ctx.answerCallbackQuery("✅ Görev Alındı!");
    await ctx.editMessageText(
      `🎯 <b>Görev Alındı:</b> ${task.title}\n\nYou are now assigned to this task. Tap 'Tamamlandı Olarak İşaretle' when finished to earn +${task.point_value} puan.`,
      {
        parse_mode: "HTML",
        reply_markup: completeTaskKeyboard(task.id)
      }
    );
  } catch (e: any) {
    await ctx.answerCallbackQuery("⚠️ Error claiming task: " + e.message);
  }
});

// 8. Inline Complete Task Handler
bot.callbackQuery(/^complete_task:(.+)$/, async (ctx) => {
  const taskId = ctx.match[1];
  try {
    const task = await completeTask(taskId);
    if (!task) {
      await ctx.answerCallbackQuery("⚠️ Görev tamamlanamadı.");
      return;
    }
    await ctx.answerCallbackQuery("🎉 Task Tamamlandı!");
    await ctx.editMessageText(
      `✅ <b>Task Tamamlandı:</b> ${task.title}\n\nHarika iş! Kazandığınız puan: +${task.point_value} puan.`,
      {
        parse_mode: "HTML"
      }
    );
  } catch (e: any) {
    await ctx.answerCallbackQuery("⚠️ Error completing task: " + e.message);
  }
});

// 9. Catch-all for unhandled callback queries (prevents loading spinners)
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
    .reply("❌ Beklenmeyen bir hata oluştu. Lütfen daha sonra tekrar deneyin.")
    .catch(() => {
      // If even this fails, just log it
      console.error("[Bot] Failed to send error message to user");
    });
});

export default bot;
