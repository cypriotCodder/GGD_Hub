/**
 * Admin commands — gated by isAdmin() check.
 *
 * /yönetici_add_puan    — award puan to any user
 * /yönetici_add_committee — create a new committee
 * /yönetici_promote       — make a user a committee lider
 * /yönetici_broadcast     — send a message to every registered user
 */

import { Composer, InlineKeyboard } from "grammy";
import type { MyContext } from "../types";
import { isAdmin } from "../config";
import {
  addPoints,
  createCommittee,
  joinCommittee,
  getUser,
  getCommittee,
  getAllUsers,
} from "../services/db";

const composer = new Composer<MyContext>();

// ──────────────────────────────────────────────
// Shared yönetici guard
// ──────────────────────────────────────────────

/** Reply with an unauthorized message and return true if the user is NOT yönetici */
function denyIfNotAdmin(ctx: MyContext): boolean {
  const userId = ctx.from?.id;
  if (!userId || !isAdmin(userId)) {
    return true;
  }
  return false;
}

// ──────────────────────────────────────────────
// /yönetici (Interactive Menu)
// ──────────────────────────────────────────────

composer.command("yönetici", async (ctx) => {
  if (denyIfNotAdmin(ctx)) {
    await ctx.reply("⛔ This command is restricted to yöneticis.");
    return;
  }

  const keyboard = new InlineKeyboard()
    .text("➕ Ekle Committee", "yönetici_menu_add_committee").row()
    .text("⭐ Promote Leader", "yönetici_menu_promote_lider");

  if (ctx.chat?.type === "private") {
    keyboard.row().webApp("🖥️ Open Dashboard", "https://ggd-hub.vercel.app/");
  } else {
    keyboard.row().text("🖥️ Open Dashboard (DM the bot!)", "yönetici_menu_no_op");
  }

  await ctx.reply("🛠 <b>Admin Menu</b>\n\nWhat would you like to do?", {
    parse_mode: "HTML",
    reply_markup: keyboard,
  });
});

composer.callbackQuery("yönetici_menu_add_committee", async (ctx) => {
  if (denyIfNotAdmin(ctx)) return;
  await ctx.answerCallbackQuery();
  await ctx.conversation.enter("addCommittee");
});

composer.callbackQuery("yönetici_menu_promote_lider", async (ctx) => {
  if (denyIfNotAdmin(ctx)) return;
  await ctx.answerCallbackQuery();
  await ctx.conversation.enter("promoteLeader");
});

// ──────────────────────────────────────────────
// /yönetici_add_puan <telegram_id> <amount>
// ──────────────────────────────────────────────

composer.command("yönetici_add_puan", async (ctx) => {
  if (denyIfNotAdmin(ctx)) {
    await ctx.reply("⛔ This command is restricted to yöneticis.");
    return;
  }

  try {
    const args = ctx.match?.toString().trim().split(/\s+/);
    if (!args || args.length < 2) {
      await ctx.reply("📝 Usage: /yönetici_add_puan <telegram_id> <amount>");
      return;
    }

    const telegramId = Number(args[0]);
    const amount = Number(args[1]);

    if (isNaN(telegramId) || isNaN(amount)) {
      await ctx.reply("⚠️ Both telegram_id and amount must be numbers.");
      return;
    }

    const user = await getUser(telegramId);
    if (!user) {
      await ctx.reply(`⚠️ User with ID ${telegramId} not found in the database.`);
      return;
    }

    await addPoints(telegramId, amount);

    await ctx.reply(
      `✅ Ekleed <b>${amount}</b> puan to ${user.username ? "@" + escapeHtml(user.username) : escapeHtml(user.first_name ?? String(telegramId))}`,
      { parse_mode: "HTML" }
    );
  } catch (err) {
    console.error("Error in /yönetici_add_puan:", err);
    await ctx.reply("❌ Failed to add puan. Check the logs.");
  }
});

// ──────────────────────────────────────────────
// /yönetici_add_committee <name> <chat_id>
// ──────────────────────────────────────────────

composer.command("yönetici_add_committee", async (ctx) => {
  if (denyIfNotAdmin(ctx)) {
    await ctx.reply("⛔ This command is restricted to yöneticis.");
    return;
  }

  try {
    const args = ctx.match?.toString().trim().split(/\s+/);
    if (!args || args.length < 2) {
      await ctx.reply("📝 Usage: /yönetici_add_committee <name> <chat_id>");
      return;
    }

    // Last arg is chat_id, everything else is the committee name
    const chatId = Number(args[args.length - 1]);
    const name = args.slice(0, -1).join(" ");

    if (isNaN(chatId)) {
      await ctx.reply("⚠️ chat_id must be a number (usually negative for groups).");
      return;
    }

    if (!name) {
      await ctx.reply("⚠️ Committee name cannot be empty.");
      return;
    }

    const committee = await createCommittee({ name, chat_id: chatId });

    await ctx.reply(
      `✅ Committee "<b>${escapeHtml(committee.name)}</b>" created!\n` +
        `ID: <code>${committee.id}</code>`,
      { parse_mode: "HTML" }
    );
  } catch (err) {
    console.error("Error in /yönetici_add_committee:", err);
    await ctx.reply("❌ Failed to create committee. Check the logs.");
  }
});

// ──────────────────────────────────────────────
// /yönetici_promote <telegram_id> <committee_id>
// ──────────────────────────────────────────────

composer.command("yönetici_promote", async (ctx) => {
  if (denyIfNotAdmin(ctx)) {
    await ctx.reply("⛔ This command is restricted to yöneticis.");
    return;
  }

  try {
    const args = ctx.match?.toString().trim().split(/\s+/);
    if (!args || args.length < 2) {
      await ctx.reply("📝 Usage: /yönetici_promote <telegram_id> <committee_id>");
      return;
    }

    const telegramId = Number(args[0]);
    const committeeId = args[1];

    if (isNaN(telegramId)) {
      await ctx.reply("⚠️ telegram_id must be a number.");
      return;
    }

    const user = await getUser(telegramId);
    if (!user) {
      await ctx.reply(`⚠️ User with ID ${telegramId} not found.`);
      return;
    }

    const committee = await getCommittee(committeeId);
    if (!committee) {
      await ctx.reply(`⚠️ Committee with ID "${committeeId}" not found.`);
      return;
    }

    await joinCommittee(telegramId, committeeId, "lider");

    await ctx.reply(
      `✅ ${user.username ? "@" + escapeHtml(user.username) : escapeHtml(user.first_name ?? String(telegramId))} ` +
        `is now a <b>lider</b> of "${escapeHtml(committee.name)}"!`,
      { parse_mode: "HTML" }
    );
  } catch (err) {
    console.error("Error in /yönetici_promote:", err);
    await ctx.reply("❌ Failed to promote user. Check the logs.");
  }
});

// ──────────────────────────────────────────────
// /yönetici_broadcast <message>
// ──────────────────────────────────────────────

composer.command("yönetici_broadcast", async (ctx) => {
  if (denyIfNotAdmin(ctx)) {
    await ctx.reply("⛔ This command is restricted to yöneticis.");
    return;
  }

  try {
    const message = ctx.match?.toString().trim();
    if (!message) {
      await ctx.reply("📝 Usage: /yönetici_broadcast <message>");
      return;
    }

    const users = await getAllUsers();

    if (users.length === 0) {
      await ctx.reply("⚠️ No registered users to broadcast to.");
      return;
    }

    await ctx.reply(`📡 Broadcasting to ${users.length} user(s)…`);

    let sent = 0;
    let failed = 0;

    for (const user of users) {
      try {
        await ctx.api.sendMessage(user.telegram_id, message);
        sent++;
      } catch {
        // User may have blocked the bot or deleted their account
        failed++;
      }
    }

    await ctx.reply(
      `📡 Broadcast complete!\n✅ Sent: ${sent}\n❌ Failed: ${failed}`
    );
  } catch (err) {
    console.error("Error in /yönetici_broadcast:", err);
    await ctx.reply("❌ Broadcast failed. Check the logs.");
  }
});

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

/** Escape HTML special characters for Telegram HTML parse mode */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Default export — the yönetici Composer */
export default composer;
