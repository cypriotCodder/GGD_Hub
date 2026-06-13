import { InlineKeyboard } from "grammy";
import { MyContext, MyConversation } from "../types";
import { getCommittees, getUser, joinCommittee } from "../services/db";

export async function promoteLeaderConversation(
  conversation: MyConversation,
  ctx: MyContext
) {
  await ctx.reply("Please send the user's numeric Telegram ID, or simply forward a message from them here.\nType /cancel to abort.");
  
  const userCtx = await conversation.wait();
  if (userCtx.message?.text === "/cancel") {
    await userCtx.reply("Cancelled.");
    return;
  }
  
  let telegramId: number | undefined;
  
  const msg = userCtx.message;
  if (msg?.forward_origin?.type === "user") {
    telegramId = msg.forward_origin.sender_user.id;
  } else if (msg?.text) {
    telegramId = Number(msg.text.trim());
  }

  if (!telegramId || isNaN(telegramId)) {
    await userCtx.reply("Could not determine Telegram ID. Make sure the forwarded message is from a user without privacy restrictions, or just paste their numeric ID. Cancelled.");
    return;
  }
  
  const user = await conversation.external(() => getUser(telegramId!));
  if (!user) {
    await userCtx.reply(`User ${telegramId} is not registered in the database. They must send /start to the bot first.`);
    return;
  }

  const committees = await conversation.external(() => getCommittees());
  if (committees.length === 0) {
    await userCtx.reply("There are no committees created yet.");
    return;
  }
  
  const keyboard = new InlineKeyboard();
  for (const c of committees) {
    keyboard.text(c.name, `promote_${c.id}`).row();
  }
  
  await userCtx.reply(`User found: <b>${user.first_name}</b>.\nWhich committee should they lead?`, { parse_mode: "HTML", reply_markup: keyboard });
  
  const cbCtx = await conversation.waitForCallbackQuery(/^promote_/);
  await cbCtx.answerCallbackQuery();
  
  const committeeId = cbCtx.callbackQuery.data.replace("promote_", "");
  
  try {
    await conversation.external(() => joinCommittee(telegramId!, committeeId, "leader"));
    const selectedCommittee = committees.find(c => c.id === committeeId);
    await cbCtx.editMessageText(`✅ <b>${user.first_name}</b> is now a leader of <b>${selectedCommittee?.name}</b>!`, { parse_mode: "HTML" });
  } catch (err: any) {
    await cbCtx.editMessageText(`❌ Failed to promote: ${err.message}`);
  }
}
