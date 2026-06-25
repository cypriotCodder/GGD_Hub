/**
 * Standup conversation — a multi-step guided flow that collects
 * weekly progress from volunteers via DM.
 *
 * Flow:
 * 1. Ask what was completed
 * 2. Ask what's next
 * 3. Ask about blockers (with skip option)
 * 4. Save to DB and post summary to committee group chat
 */

import type { MyContext, MyConversation } from "../types";
import * as db from "../services/db";

/**
 * Escape special characters for Telegram's HTML parse mode.
 * Only &, <, > need escaping in HTML mode.
 */
function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Wait for a text message from the user, ignoring non-text updates.
 * Returns the text content.
 */
async function waitForText(
  conversation: MyConversation,
  ctx: MyContext
): Promise<string> {
  const response = await conversation.waitFor("message:text");
  return response.message.text;
}

/**
 * The main standup conversation function.
 * Registered with grammY's conversations plugin.
 */
export async function standupConversation(
  conversation: MyConversation,
  ctx: MyContext
): Promise<void> {
  const userId = ctx.from?.id;
  if (!userId) return;

  // Get user's committees to know where to post the summary
  const userCommittees = await conversation.external(() =>
    db.getUserCommittees(userId)
  );

  if (userCommittees.length === 0) {
    await ctx.reply(
      "⚠️ Henüz herhangi bir komitenin parçası değilsiniz. Birine katılmak için /start'ı kullanın!"
    );
    return;
  }

  // --- Question 1: Tamamlandı ---
  await ctx.reply(
    "📋 <b>Haftalık Standup</b>\n\n" +
      "Şimdi adım adım güncellemeni alalım.\n\n" +
      "1️⃣ <b>Bu hafta neleri tamamladın?</b>\n\n" +
      "<i>Cevabınızı aşağıya yazın:</i>",
    { parse_mode: "HTML" }
  );

  const completed = await waitForText(conversation, ctx);

  // --- Question 2: Next ---
  await ctx.reply(
    "2️⃣ <b>Sırada üzerinde çalışacağın ne var?</b>\n\n" +
      "<i>Cevabınızı aşağıya yazın:</i>",
    { parse_mode: "HTML" }
  );

  const next = await waitForText(conversation, ctx);

  // --- Question 3: Blockers ---
  await ctx.reply(
    "3️⃣ <b>Herhangi bir engel var mı veya yardıma ihtiyacın var mı?</b>\n\n" +
      '<i>Cevabınızı yazın veya sorun yoksa "yok" yazın:</i>',
    { parse_mode: "HTML" }
  );

  const blockersRaw = await waitForText(conversation, ctx);
  const blockers =
    blockersRaw.toLowerCase() === "none" ? "Engel yok ✨" : blockersRaw;

  // --- Summary & Save ---
  const displayName = ctx.from?.username
    ? `@${ctx.from.username}`
    : ctx.from?.first_name || "Unknown";

  const summaryForUser =
    "✅ <b>Standup Tamamlandı!</b>\n\n" +
    `<b>Tamamlandı:</b> ${escapeHtml(completed)}\n` +
    `<b>Sırada:</b> ${escapeHtml(next)}\n` +
    `<b>Engeller:</b> ${escapeHtml(blockers)}\n\n` +
    "Güncellemeniz komite sohbetlerinde paylaşıldı. 🚀";

  await ctx.reply(summaryForUser, { parse_mode: "HTML" });

  // Save standup to DB and post to each committee's group chat
  for (const uc of userCommittees) {
    const committee = uc.committees;

    // Save to database
    await conversation.external(() =>
      db.saveStandup({
        user_id: userId,
        committee_id: committee.id,
        completed,
        next,
        blockers,
      })
    );

    // Post formatted summary to committee group chat
    const groupSummary =
      `📋 <b>Haftalık Standup — ${escapeHtml(displayName)}</b>\n\n` +
      `✅ <b>Tamamlandı:</b>\n${escapeHtml(completed)}\n\n` +
      `🔜 <b>Sırada:</b>\n${escapeHtml(next)}\n\n` +
      `🚧 <b>Engeller:</b>\n${escapeHtml(blockers)}`;

    await conversation.external(async () => {
      try {
        await ctx.api.sendMessage(committee.chat_id, groupSummary, {
          parse_mode: "HTML",
        });
      } catch (error) {
        console.error(
          `[Standup] Failed to post to committee ${committee.name} (chat_id: ${committee.chat_id}):`,
          error
        );
      }

      // Notify liders via DM
      try {
        const liders = await db.getCommitteeLeaders(committee.id);
        for (const lider of liders) {
          if (lider.user_id !== userId) {
            await ctx.api.sendMessage(
              lider.user_id,
              `📝 <b>New Standup from @${escapeHtml(displayName)}</b>\n\n` +
              `✅ <b>Tamamlandı:</b>\n${escapeHtml(completed)}\n\n` +
              `⏭️ <b>Sırada:</b>\n${escapeHtml(next)}\n\n` +
              `🚧 <b>Engeller:</b>\n${escapeHtml(blockers)}`,
              { parse_mode: "HTML" }
            );
          }
        }
      } catch (error) {
        console.error("Failed to notify liders of standup:", error);
      }
    });
  }
}
