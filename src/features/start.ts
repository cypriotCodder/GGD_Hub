/**
 * /start command and committee selection onboarding flow.
 *
 * Handles:
 * - `/start` — upserts user, shows committee selection or welcome back
 * - `select_committee:<id>` — joins user to a committee
 * - `onboarding_done` — finalises onboarding with a welcome message
 */

import { Composer } from "grammy";
import type { MyContext } from "../types";
import {
  upsertUser,
  getUserCommittees,
  getCommittees,
  joinCommittee,
  getCommittee,
} from "../services/db";
import { committeeSelectionKeyboard } from "../keyboards";

const composer = new Composer<MyContext>();

// ────────────────────────────────────────────────
// /start command
// ────────────────────────────────────────────────

composer.command("start", async (ctx) => {
  try {
    const from = ctx.from!;

    // Upsert user on every /start (idempotent)
    await upsertUser(from.id, from.username ?? null, from.first_name ?? null);

    // Deep link handling: /start join_<committee_id>
    const payload = ctx.match;
    if (payload && typeof payload === "string" && payload.startsWith("join_")) {
      const committeeId = payload.replace("join_", "");
      try {
        await joinCommittee(from.id, committeeId);
        const committee = await getCommittee(committeeId);
        await ctx.reply(
          `🎉 <b>You've joined ${committee?.name ?? "the committee"}!</b>\n\n` +
          `Tap the menu button to open the Member Portal and view your tasks.`,
          { parse_mode: "HTML" }
        );
        return;
      } catch (err) {
        console.error("Deep link join failed:", err);
        await ctx.reply("❌ Invalid invite link or an error occurred.");
      }
    }

    // Check if user already belongs to any committees
    const üyeships = await getUserCommittees(from.id);

    if (üyeships.length > 0) {
      const committeeList = üyeships
        .map((m) => `• ${m.committees.name}`)
        .join("\n");

      await ctx.reply(
        `👋 <b>Welcome back!</b>\n\n` +
          `You're a üye of:\n${committeeList}\n\n` +
          `Use /help to see available commands.`,
        { parse_mode: "HTML" }
      );
      return;
    }

    // New user — show committee selection
    const committees = await getCommittees();

    if (committees.length === 0) {
      await ctx.reply(
        "👋 Welcome! No committees have been created yet. Ask an yönetici to set one up."
      );
      return;
    }

    await ctx.reply(
      "👋 <b>Welcome to GGD Hub!</b>\n\n" +
        "Select the committees you'd like to join:",
      {
        parse_mode: "HTML",
        reply_markup: committeeSelectionKeyboard(committees),
      }
    );
  } catch (error) {
    console.error("Error in /start:", error);
    await ctx.reply("❌ Something went wrong. Please try again later.");
  }
});

// ────────────────────────────────────────────────
// select_committee:<id> callback
// ────────────────────────────────────────────────

composer.callbackQuery(/^select_committee:(.+)$/, async (ctx) => {
  try {
    const committeeId = ctx.match[1];
    const from = ctx.from!;

    await joinCommittee(from.id, committeeId);

    const committee = await getCommittee(committeeId);
    await ctx.answerCallbackQuery({
      text: `✅ Joined ${committee?.name ?? "committee"}!`,
    });

    // Refresh: show updated üyeship list + keyboard for more selections
    const üyeships = await getUserCommittees(from.id);
    const committeeList = üyeships
      .map((m) => `• ${m.committees.name}`)
      .join("\n");

    const allCommittees = await getCommittees();

    await ctx.editMessageText(
      `👋 <b>Welcome to GGD Hub!</b>\n\n` +
        `Your committees:\n${committeeList}\n\n` +
        `Select more or tap <b>Bitirdim</b>:`,
      {
        parse_mode: "HTML",
        reply_markup: committeeSelectionKeyboard(allCommittees),
      }
    );
  } catch (error) {
    console.error("Error in select_committee callback:", error);
    await ctx.answerCallbackQuery({
      text: "❌ Failed to join. Try again.",
    });
  }
});

// ────────────────────────────────────────────────
// onboarding_done callback
// ────────────────────────────────────────────────

composer.callbackQuery("onboarding_done", async (ctx) => {
  try {
    await ctx.answerCallbackQuery({ text: "🎉 You're all set!" });

    await ctx.editMessageText(
      `🎉 <b>You're all set!</b>\n\n` +
        `Here's what you can do:\n` +
        `/help — See all commands\n` +
        `/liderboard — View top contributors\n` +
        `/done — Mark a claimed task as complete\n\n` +
        `Your committee liders will broadcast tasks — stay tuned!`,
      { parse_mode: "HTML" }
    );
  } catch (error) {
    console.error("Error in onboarding_done callback:", error);
    await ctx.answerCallbackQuery({
      text: "❌ Something went wrong.",
    });
  }
});

/** /start command and onboarding flow composer */
export default composer;
