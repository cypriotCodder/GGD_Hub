import type { VercelRequest, VercelResponse } from "@vercel/node";
import { validate } from "@tma.js/init-data-node";
import { Bot } from "grammy";
import { config, isAdmin } from "../src/config";
import {
  getCommittees,
  getAllUsers,
  createCommittee,
  updateCommittee,
  deleteCommittee,
  joinCommittee,
  getLeaderboard,
  getCommitteeMembers,
  getAllUsersWithMemberships,
  removeFromCommittee,
  getAllTasks,
  deleteTask,
  createTask,
  getAllStandups,
} from "../src/services/db";

const bot = new Bot(config.BOT_TOKEN);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const initData = req.headers["x-telegram-init-data"] as string;
    if (!initData) {
      return res.status(401).json({ error: "Missing initData" });
    }

    try {
      validate(initData, config.BOT_TOKEN);
    } catch (e: any) {
      console.error("InitData Validation Failed. Error:", e.message);
      console.error("InitData received:", initData);
      console.error("Bot Token prefix:", config.BOT_TOKEN.substring(0, 10));
      return res.status(401).json({ error: "Unauthorized / Invalid initData: " + e.message });
    }

    // Extract user from initData
    const params = new URLSearchParams(initData);
    const userStr = params.get("user");
    if (!userStr) {
      return res.status(401).json({ error: "No user found in initData" });
    }

    const tgUser = JSON.parse(decodeURIComponent(userStr));
    if (!isAdmin(tgUser.id)) {
      return res.status(403).json({ error: "Forbidden: Not an admin" });
    }

    // Handle GET: Fetch all dashboard data
    if (req.method === "GET") {
      const [committees, users, leaderboard, tasks, standups] = await Promise.all([
        getCommittees(),
        getAllUsersWithMemberships(),
        getLeaderboard(undefined, 25),
        getAllTasks(),
        getAllStandups(50),
      ]);
      const settings = {
        standupDays: config.STANDUP_DAYS,
        standupHour: config.STANDUP_HOUR,
        cronSecured: !!config.CRON_SECRET,
      };
      return res.status(200).json({ committees, users, leaderboard, tasks, standups, settings });
    }

    // Handle POST: Actions
    if (req.method === "POST") {
      const { action, payload } = req.body;

      if (action === "CREATE_COMMITTEE") {
        const c = await createCommittee({
          name: payload.name,
          chat_id: Number(payload.chat_id),
        });
        return res.status(200).json({ success: true, committee: c });
      }

      if (action === "ADD_MEMBER") {
        await joinCommittee(
          Number(payload.telegram_id),
          payload.committee_id,
          payload.role || "member"
        );
        return res.status(200).json({ success: true });
      }

      if (action === "EDIT_COMMITTEE") {
        const c = await updateCommittee(payload.id, {
          name: payload.name,
          chat_id: Number(payload.chat_id),
        });
        return res.status(200).json({ success: true, committee: c });
      }

      if (action === "DELETE_COMMITTEE") {
        await deleteCommittee(payload.id);
        return res.status(200).json({ success: true });
      }

      if (action === "DELETE_TASK") {
        await deleteTask(payload.id);
        return res.status(200).json({ success: true });
      }

      if (action === "CREATE_TASK") {
        const { title, description, points, committee_id, assigned_to } = payload;
        
        const task = await createTask({
          title,
          description: description || null,
          point_value: Number(points) || 5,
          committee_id,
          created_by: tgUser.id,
          assigned_to: assigned_to ? Number(assigned_to) : null,
          status: assigned_to ? "in_progress" : "pending"
        });

        if (assigned_to) {
          try {
            await bot.api.sendMessage(
              Number(assigned_to),
              `🎯 An admin has assigned you a new task: <b>${title}</b>\n\nYou will earn <b>+${task.point_value} points</b> upon completion.`,
              { parse_mode: "HTML" }
            );
          } catch (e) {
            console.error("Failed to send task assignment DM:", e);
          }
        }

        return res.status(200).json({ success: true, task });
      }

      if (action === "BROADCAST") {
        const { message, committeeId } = payload;
        if (!message || !message.trim()) {
          return res.status(400).json({ error: "Message is required" });
        }

        // Determine recipients
        let recipients: { telegram_id: number }[] = [];
        if (committeeId) {
          const members = await getCommitteeMembers(committeeId);
          recipients = members.map((m: any) => ({ telegram_id: m.user_id }));
        } else {
          recipients = await getAllUsers();
        }

        let sent = 0;
        let failed = 0;
        for (const user of recipients) {
          try {
            await bot.api.sendMessage(
              user.telegram_id,
              `📢 <b>Duyuru / Announcement</b>\n\n${message.trim()}`,
              { parse_mode: "HTML" }
            );
            sent++;
          } catch (e: any) {
            failed++;
            console.error(
              `[Broadcast] Failed to send to ${user.telegram_id}:`,
              e?.description || e?.message
            );
          }
        }
        return res.status(200).json({ success: true, sent, failed });
      }

      if (action === "REMOVE_MEMBER") {
        await removeFromCommittee(Number(payload.telegram_id), payload.committee_id);
        return res.status(200).json({ success: true });
      }

      if (action === "CHANGE_ROLE") {
        await joinCommittee(Number(payload.telegram_id), payload.committee_id, payload.role);
        return res.status(200).json({ success: true });
      }

      return res.status(400).json({ error: "Unknown action" });
    }

    return res.status(405).json({ error: "Method Not Allowed" });
  } catch (error: any) {
    console.error("Admin API error:", error);
    return res.status(500).json({ error: error.message });
  }
}
