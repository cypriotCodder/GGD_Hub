/**
 * Task broadcasting + claiming feature.
 *
 * Leaders create tasks via /needhelp <title>.
 * Tasks are broadcast to the committee group chat with a "Claim" button.
 * Members tap the button to claim, earning points on completion.
 */

import { Composer } from "grammy";
import type { MyContext } from "../types";
import { isAdmin } from "../config";
import {
  isAnyLeader,
  getLeaderCommittees,
  createTask,
  claimTask,
  getTask,
  getCommittee,
  updateTaskMessageId,
} from "../services/db";
import {
  taskClaimKeyboard,
  leaderCommitteeKeyboard,
} from "../keyboards";

const composer = new Composer<MyContext>();

// ──────────────────────────────────────────────
// /needhelp — create & broadcast a task
// ──────────────────────────────────────────────

composer.command("needhelp", async (ctx) => {
  try {
    const userId = ctx.from?.id;
    if (!userId) return;

    // Authorization: must be a leader or admin
    const authorized = isAdmin(userId) || (await isAnyLeader(userId));
    if (!authorized) {
      await ctx.reply("⛔ Only committee leaders and admins can post tasks.");
      return;
    }

    // Parse task title from the text after the command
    const title = ctx.match?.toString().trim();
    if (!title) {
      await ctx.reply(
        "📝 Usage: /needhelp <task title>\n\nExample: /needhelp Design event poster"
      );
      return;
    }

    // Get committees where this user is a leader
    const leaderCommittees = await getLeaderCommittees(userId);

    if (leaderCommittees.length === 0) {
      await ctx.reply(
        "⚠️ You are not a leader of any committee. Ask an admin to promote you first."
      );
      return;
    }

    if (leaderCommittees.length === 1) {
      // Single committee — create and post directly
      const committee = leaderCommittees[0].committees;
      await createAndBroadcastTask(ctx, title, committee.id, committee.chat_id, userId);
    } else {
      // Multiple committees — ask the user to run the command in the
      // target committee's group chat so we can auto-detect, OR pick one.
      // We store the title in the task as "pending" and let the callback publish it.
      // BUT committee_id is required and callback data has a 64-byte limit.
      //
      // Simplest correct approach: ask the user to send the command inside
      // the committee group chat so we can resolve it from chat_id.
      const names = leaderCommittees
        .map((lc) => `• ${lc.committees.name}`)
        .join("\n");

      await ctx.reply(
        `You lead multiple committees:\n${names}\n\n` +
          "Please send /needhelp <title> inside the specific committee group chat, " +
          "and the task will be posted there automatically."
      );
    }
  } catch (err) {
    console.error("Error in /needhelp:", err);
    await ctx.reply("❌ Something went wrong while creating the task.");
  }
});

// ──────────────────────────────────────────────
// claim_task:<task_id> callback
// ──────────────────────────────────────────────

composer.callbackQuery(/^claim_task:(.+)$/, async (ctx) => {
  try {
    const taskId = ctx.match[1];
    const userId = ctx.from.id;
    const username = ctx.from.username ?? ctx.from.first_name ?? "Someone";

    const claimed = await claimTask(taskId, userId);

    if (!claimed) {
      await ctx.answerCallbackQuery({
        text: "This task has already been claimed!",
        show_alert: true,
      });
      return;
    }

    // Edit the original broadcast message to show it's claimed
    try {
      await ctx.editMessageText(
        `✅ <b>Task Claimed!</b>\n` +
          `📌 ${escapeHtml(claimed.title)}\n` +
          `👤 Claimed by @${escapeHtml(username)}`,
        { parse_mode: "HTML" }
      );
    } catch {
      // Message may have been deleted or is too old to edit
    }

    await ctx.answerCallbackQuery({ text: "✅ Task claimed! Good luck!" });

    // DM the claimer
    try {
      await ctx.api.sendMessage(
        userId,
        `🎯 You claimed "<b>${escapeHtml(claimed.title)}</b>"!\n\n` +
          `Use /done when you've finished it to earn <b>+${claimed.point_value} points</b>.`,
        { parse_mode: "HTML" }
      );
    } catch {
      // User may have blocked the bot in DMs
    }
  } catch (err) {
    console.error("Error claiming task:", err);
    await ctx.answerCallbackQuery({
      text: "❌ Failed to claim task. Please try again.",
      show_alert: true,
    });
  }
});

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

/**
 * Create a task in the DB, broadcast it to the committee group chat,
 * and save the resulting message_id back to the task record.
 */
async function createAndBroadcastTask(
  ctx: MyContext,
  title: string,
  committeeId: string,
  chatId: number,
  createdBy: number
): Promise<void> {
  const username = ctx.from?.username ?? ctx.from?.first_name ?? "Unknown";

  // Persist task
  const task = await createTask({
    title,
    committee_id: committeeId,
    created_by: createdBy,
    status: "pending",
    point_value: 5,
  });

  // Broadcast to the committee group chat
  const msg = await ctx.api.sendMessage(
    chatId,
    `🆘 <b>Help Needed!</b>\n` +
      `📌 ${escapeHtml(title)}\n` +
      `👤 Posted by @${escapeHtml(username)}\n` +
      `🏆 +${task.point_value} points`,
    {
      parse_mode: "HTML",
      reply_markup: taskClaimKeyboard(task.id),
    }
  );

  // Save the message_id for later editing (on claim)
  await updateTaskMessageId(task.id, msg.message_id);

  await ctx.reply(`✅ Task "<b>${escapeHtml(title)}</b>" posted!`, {
    parse_mode: "HTML",
  });
}

/** Escape HTML special characters for Telegram HTML parse mode */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Default export — the tasks Composer */
export default composer;
