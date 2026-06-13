/**
 * Cron endpoint — triggered by Vercel Cron on a schedule.
 * Sends standup reminder DMs to all active volunteers.
 *
 * Schedule: daily at ~9 AM UTC (configured in vercel.json).
 * Day-of-week filtering is done in code for Hobby plan compatibility.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Bot } from "grammy";
import { config } from "../src/config";
import * as db from "../src/services/db";
import { standupStartKeyboard } from "../src/keyboards";

// Reuse bot instance across warm invocations (for API calls only, not middleware)
const bot = new Bot(config.BOT_TOKEN);

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  // --- Security: verify the request is from Vercel's cron scheduler ---
  const authHeader = req.headers["authorization"];
  if (config.CRON_SECRET && authHeader !== `Bearer ${config.CRON_SECRET}`) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  // --- Day-of-week check (Hobby plan can only schedule daily) ---
  const today = new Date().getUTCDay(); // 0 = Sunday, 1 = Monday, ...
  if (!config.STANDUP_DAYS.includes(today)) {
    res.status(200).json({
      skipped: true,
      reason: `Today is day ${today}, standups run on days [${config.STANDUP_DAYS.join(", ")}]`,
    });
    return;
  }

  try {
    // --- Fetch all active users with their committees ---
    const usersWithCommittees = await db.getAllActiveUsersWithCommittees();

    const results = {
      total: usersWithCommittees.length,
      sent: 0,
      failed: 0,
      errors: [] as string[],
    };

    // --- Send standup reminders ---
    for (const { user } of usersWithCommittees) {
      try {
        await bot.api.sendMessage(
          user.telegram_id,
          "🔔 <b>Standup Time!</b>\n\n" +
            "It's time for your weekly update. " +
            "Tap the button below to share what you've been working on.\n\n" +
            "<i>This only takes a minute!</i>",
          {
            parse_mode: "HTML",
            reply_markup: standupStartKeyboard(),
          }
        );
        results.sent++;
      } catch (error: any) {
        results.failed++;
        const errMsg = error?.description || error?.message || "Unknown error";
        results.errors.push(
          `User ${user.telegram_id} (${user.username || "no username"}): ${errMsg}`
        );
        // Common: 403 Forbidden = user blocked the bot or never started it
        console.error(
          `[Cron] Failed to send standup to ${user.telegram_id}:`,
          errMsg
        );
      }
    }

    console.log(
      `[Cron] Standup reminders sent: ${results.sent}/${results.total}, failed: ${results.failed}`
    );

    res.status(200).json(results);
  } catch (error: any) {
    console.error("[Cron] Fatal error:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
}
