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
      "⚠️ You're not part of any committee yet. Use /start to join one first!"
    );
    return;
  }

  // --- Question 1: Completed ---
  await ctx.reply(
    "📋 <b>Weekly Standup</b>\n\n" +
      "Let's go through your update step by step.\n\n" +
      "1️⃣ <b>What did you complete this week?</b>\n\n" +
      "<i>Type your answer below:</i>",
    { parse_mode: "HTML" }
  );

  const completed = await waitForText(conversation, ctx);

  // --- Question 2: Next ---
  await ctx.reply(
    "2️⃣ <b>What are you working on next?</b>\n\n" +
      "<i>Type your answer below:</i>",
    { parse_mode: "HTML" }
  );

  const next = await waitForText(conversation, ctx);

  // --- Question 3: Blockers ---
  await ctx.reply(
    "3️⃣ <b>Any blockers or help needed?</b>\n\n" +
      '<i>Type your answer, or send "none" if all clear:</i>',
    { parse_mode: "HTML" }
  );

  const blockersRaw = await waitForText(conversation, ctx);
  const blockers =
    blockersRaw.toLowerCase() === "none" ? "No blockers ✨" : blockersRaw;

  // --- Summary & Save ---
  const displayName = ctx.from?.username
    ? `@${ctx.from.username}`
    : ctx.from?.first_name || "Unknown";

  const summaryForUser =
    "✅ <b>Standup Complete!</b>\n\n" +
    `<b>Completed:</b> ${escapeHtml(completed)}\n` +
    `<b>Next:</b> ${escapeHtml(next)}\n` +
    `<b>Blockers:</b> ${escapeHtml(blockers)}\n\n` +
    "Your update has been posted to your committee chats. 🚀";

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
      `📋 <b>Weekly Standup — ${escapeHtml(displayName)}</b>\n\n` +
      `✅ <b>Completed:</b>\n${escapeHtml(completed)}\n\n` +
      `🔜 <b>Next:</b>\n${escapeHtml(next)}\n\n` +
      `🚧 <b>Blockers:</b>\n${escapeHtml(blockers)}`;

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
    });
  }
}
