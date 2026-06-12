/**
 * Vercel serverless webhook endpoint for the Telegram bot.
 *
 * Receives all Telegram updates via POST and routes them through
 * the grammY bot middleware chain.
 */

import { webhookCallback } from "grammy";
import bot from "../src/bot";
import { config } from "../src/config";

export default webhookCallback(bot, "next-js", {
  secretToken: config.WEBHOOK_SECRET || undefined,
});
