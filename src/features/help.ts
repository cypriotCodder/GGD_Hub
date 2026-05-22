/**
 * /help command — displays a formatted list of all available bot commands.
 */

import { Composer } from "grammy";
import type { MyContext } from "../types";

const composer = new Composer<MyContext>();

composer.command("help", async (ctx) => {
  try {
    await ctx.reply(
      `📖 <b>GGD Hub — Commands</b>\n\n` +
        `/start — Register &amp; join committees\n` +
        `/help — Show this help message\n` +
        `/needhelp — (Leaders) Broadcast a task\n` +
        `/done — Mark a claimed task complete\n` +
        `/leaderboard — View top contributors`,
      { parse_mode: "HTML" }
    );
  } catch (error) {
    console.error("Error in /help:", error);
    await ctx.reply("❌ Something went wrong. Please try again later.");
  }
});

/** /help command composer */
export default composer;
