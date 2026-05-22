/**
 * /leaderboard command — displays point rankings.
 *
 * Context-aware:
 * - In a group/supergroup: shows the committee-specific leaderboard
 * - In a DM (or if committee not found): shows the global leaderboard
 */

import { Composer } from "grammy";
import type { MyContext } from "../types";
import { getCommitteeByChatId, getLeaderboard } from "../services/db";

const MEDALS = ["🥇", "🥈", "🥉"] as const;

const composer = new Composer<MyContext>();

composer.command("leaderboard", async (ctx) => {
  try {
    let committeeId: string | undefined;
    let title = "Global";

    // In group chats, try to scope to the committee
    const chatType = ctx.chat?.type;
    if (chatType === "group" || chatType === "supergroup") {
      const committee = await getCommitteeByChatId(ctx.chat!.id);
      if (committee) {
        committeeId = committee.id;
        title = committee.name;
      }
    }

    const entries = await getLeaderboard(committeeId, 10);

    if (entries.length === 0) {
      await ctx.reply("🏆 No contributors yet. Be the first!");
      return;
    }

    const lines = entries.map((entry, index) => {
      const rank = index + 1;
      const medal = rank <= 3 ? `${MEDALS[index]} ` : "";
      const name = entry.first_name || entry.username || "Anonymous";
      return `${rank}. ${medal}${name} — ${entry.points} pts`;
    });

    await ctx.reply(
      `🏆 <b>Leaderboard — ${title}</b>\n\n${lines.join("\n")}`,
      { parse_mode: "HTML" }
    );
  } catch (error) {
    console.error("Error in /leaderboard:", error);
    await ctx.reply("❌ Failed to load leaderboard. Please try again later.");
  }
});

/** /leaderboard command composer */
export default composer;
