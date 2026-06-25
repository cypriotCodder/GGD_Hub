import { MyContext, MyConversation } from "../types";
import { createCommittee } from "../services/db";

export async function addCommitteeConversation(
  conversation: MyConversation,
  ctx: MyContext
) {
  await ctx.reply("What is the name of the new committee? (e.g. 'Design Team')\nType /cancel to abort.");
  
  const nameCtx = await conversation.wait();
  if (nameCtx.message?.text === "/cancel") {
    await nameCtx.reply("İptalled.");
    return;
  }
  const name = nameCtx.message?.text?.trim();
  if (!name) {
    await nameCtx.reply("Invalid name. İptalled.");
    return;
  }

  await nameCtx.reply(`Great! Now, what is the Telegram Sohbet ID for "${name}"?\n(Usually a negative number like -100123456789)`);
  
  const chatCtx = await conversation.wait();
  if (chatCtx.message?.text === "/cancel") {
    await chatCtx.reply("İptalled.");
    return;
  }
  
  const chatIdStr = chatCtx.message?.text?.trim();
  const chatId = Number(chatIdStr);
  
  if (!chatId || isNaN(chatId)) {
    await chatCtx.reply("Invalid chat ID. Must be a number. İptalled.");
    return;
  }
  
  try {
    const committee = await conversation.external(() => createCommittee({ name, chat_id: chatId }));
    await chatCtx.reply(
      `✅ Committee "<b>${committee.name}</b>" created successfully!\nID: <code>${committee.id}</code>`,
      { parse_mode: "HTML" }
    );
  } catch (error: any) {
    await chatCtx.reply(`❌ Failed to create committee: ${error.message}`);
  }
}
