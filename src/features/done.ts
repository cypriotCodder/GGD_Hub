/**
 * Task completion feature.
 *
 * Members mark their active tasks as done via /done.
 * Points are awarded and a completion announcement is posted
 * to the committee group chat.
 */

import { Composer } from "grammy";
import type { MyContext } from "../types";
import type { Task } from "../types";
import {
  getUserActiveTasks,
  completeTask,
  addPoints,
  getCommittee,
  getCommitteeLeaders,
} from "../services/db";
import { taskSelectKeyboard } from "../keyboards";

const composer = new Composer<MyContext>();

// ──────────────────────────────────────────────
// /done — complete an active task
// ──────────────────────────────────────────────

composer.command("done", async (ctx) => {
  try {
    const userId = ctx.from?.id;
    if (!userId) return;

    const activeTasks = await getUserActiveTasks(userId);

    if (activeTasks.length === 0) {
      await ctx.reply(
        "📭 You have no active tasks. Claim one first with the 🙋 Claim Task button!"
      );
      return;
    }

    if (activeTasks.length === 1) {
      // Only one active task — complete it directly
      await handleTaskCompletion(ctx, activeTasks[0], userId);
    } else {
      // Multiple active tasks — let the user pick
      await ctx.reply("Which task did you complete?", {
        reply_markup: taskSelectKeyboard(activeTasks),
      });
    }
  } catch (err) {
    console.error("Error in /done:", err);
    await ctx.reply("❌ Something went wrong. Please try again.");
  }
});

// ──────────────────────────────────────────────
// done_task:<task_id> callback
// ──────────────────────────────────────────────

composer.callbackQuery(/^done_task:(.+)$/, async (ctx) => {
  try {
    const taskId = ctx.match[1];
    const userId = ctx.from.id;

    // Fetch the task to verify ownership
    const activeTasks = await getUserActiveTasks(userId);
    const task = activeTasks.find((t) => t.id === taskId);

    if (!task) {
      await ctx.answerCallbackQuery({
        text: "This task is no longer active or doesn't belong to you.",
        show_alert: true,
      });
      return;
    }

    await handleTaskCompletion(ctx, task, userId);

    // Clean up the selection message
    try {
      await ctx.editMessageText("✅ Task completed! See below for details.");
    } catch {
      // Message may have been deleted
    }

    await ctx.answerCallbackQuery({ text: "🎉 Task completed!" });
  } catch (err) {
    console.error("Error in done_task callback:", err);
    await ctx.answerCallbackQuery({
      text: "❌ Failed to complete task. Please try again.",
      show_alert: true,
    });
  }
});

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

/**
 * Complete a task: update status, award points, notify user and committee.
 */
async function handleTaskCompletion(
  ctx: MyContext,
  task: Task,
  userId: number
): Promise<void> {
  const completed = await completeTask(task.id);

  if (!completed) {
    await ctx.reply("⚠️ This task could not be completed — it may already be done.");
    return;
  }

  // Award points
  await addPoints(userId, task.point_value);

  const username = ctx.from?.username ?? ctx.from?.first_name ?? "Someone";

  // Notify the user
  await ctx.reply(
    `🎉 <b>Task completed!</b>\n` +
      `📌 ${escapeHtml(task.title)}\n` +
      `🏆 <b>+${task.point_value} points</b> earned!`,
    { parse_mode: "HTML" }
  );

  // Announce in the committee group chat
  try {
    const committee = await getCommittee(task.committee_id);
    if (committee) {
      await ctx.api.sendMessage(
        committee.chat_id,
        `🎉 @${escapeHtml(username)} completed "<b>${escapeHtml(task.title)}</b>"! (+${task.point_value} pts)`,
        { parse_mode: "HTML" }
      );
    }
  } catch {
    // Group chat may be unavailable — don't block the user flow
  }

  // Notify leaders
  try {
    const leaders = await getCommitteeLeaders(task.committee_id);
    for (const leader of leaders) {
      if (leader.user_id !== userId) {
        await ctx.api.sendMessage(
          leader.user_id,
          `✅ <b>Task Completed</b>\n\n@${escapeHtml(username)} just finished "<b>${escapeHtml(task.title)}</b>" and earned ${task.point_value} points!`,
          { parse_mode: "HTML" }
        );
      }
    }
  } catch (err) {
    console.error("Failed to notify leaders:", err);
  }
}

/** Escape HTML special characters for Telegram HTML parse mode */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Default export — the done Composer */
export default composer;
