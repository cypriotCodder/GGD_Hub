/**
 * Reusable inline keyboard builders.
 * Centralizes all keyboard construction to avoid scattered InlineKeyboard usage.
 */

import { InlineKeyboard } from "grammy";
import type { Committee } from "../types";

/**
 * Grid of committee selection buttons for onboarding.
 * Each button's callback data is `select_committee:<committee_id>`.
 */
export function committeeSelectionKeyboard(
  committees: Committee[]
): InlineKeyboard {
  const keyboard = new InlineKeyboard();

  committees.forEach((committee, index) => {
    keyboard.text(committee.name, `select_committee:${committee.id}`);
    // 2 buttons per row
    if (index % 2 === 1 && index < committees.length - 1) {
      keyboard.row();
    }
  });

  keyboard.row().text("✅ I'm Done", "onboarding_done");

  return keyboard;
}

/**
 * "Claim Task" button for task broadcasting.
 * Callback data: `claim_task:<task_id>`
 */
export function taskClaimKeyboard(taskId: string): InlineKeyboard {
  return new InlineKeyboard().text("🙋 Claim Task", `claim_task:${taskId}`);
}

/**
 * "Start Standup" button sent via cron DM.
 * Callback data: `start_standup`
 */
export function standupStartKeyboard(): InlineKeyboard {
  return new InlineKeyboard().text("📝 Start Standup", "start_standup");
}

/**
 * Select which task to mark as done.
 * Callback data: `done_task:<task_id>`
 */
export function taskSelectKeyboard(
  tasks: { id: string; title: string }[]
): InlineKeyboard {
  const keyboard = new InlineKeyboard();

  tasks.forEach((task) => {
    keyboard.text(`📌 ${task.title}`, `done_task:${task.id}`).row();
  });

  return keyboard;
}

/**
 * Committee selection for leaders posting tasks.
 * Callback data: `post_task_to:<committee_id>`
 */
export function leaderCommitteeKeyboard(
  committees: { id: string; name: string }[]
): InlineKeyboard {
  const keyboard = new InlineKeyboard();

  committees.forEach((committee) => {
    keyboard
      .text(committee.name, `post_task_to:${committee.id}`)
      .row();
  });

  return keyboard;
}

/**
 * "Skip" / "None" button for optional standup fields.
 * Callback data: `standup_skip`
 */
export function standupSkipKeyboard(): InlineKeyboard {
  return new InlineKeyboard().text("No blockers ✨", "standup_skip");
}
