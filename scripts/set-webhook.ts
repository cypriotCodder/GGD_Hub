/**
 * Webhook registration script — run once after deploying to Vercel.
 *
 * Usage:
 *   BOT_TOKEN=xxx WEBHOOK_URL=https://your-app.vercel.app/api/bot npx tsx scripts/set-webhook.ts
 *
 * Or with .env:
 *   npx tsx scripts/set-webhook.ts
 */

import { Bot } from "grammy";

const token = process.env.BOT_TOKEN;
if (!token) {
  console.error("❌ BOT_TOKEN environment variable is required");
  process.exit(1);
}

const webhookUrl = process.env.WEBHOOK_URL;
if (!webhookUrl) {
  console.error("❌ WEBHOOK_URL environment variable is required");
  console.error("   Example: https://your-app.vercel.app/api/bot");
  process.exit(1);
}

const webhookSecret = process.env.WEBHOOK_SECRET;

const bot = new Bot(token);

async function main() {
  console.log("🔄 Deleting existing webhook...");
  await bot.api.deleteWebhook();

  console.log(`🔗 Setting webhook to: ${webhookUrl}`);
  await bot.api.setWebhook(webhookUrl!, {
    secret_token: webhookSecret || undefined,
    allowed_updates: ["message", "callback_query"],
  });

  console.log("✅ Webhook set successfully!\n");

  const info = await bot.api.getWebhookInfo();
  console.log("📊 Webhook Info:");
  console.log(`   URL: ${info.url}`);
  console.log(`   Pending updates: ${info.pending_update_count}`);
  console.log(
    `   Allowed updates: ${(info.allowed_updates || []).join(", ")}`
  );

  if (info.last_error_message) {
    console.log(`   ⚠️  Last error: ${info.last_error_message}`);
    console.log(`   ⚠️  Error date: ${info.last_error_date}`);
  }
}

main().catch((error) => {
  console.error("❌ Failed to set webhook:", error);
  process.exit(1);
});
