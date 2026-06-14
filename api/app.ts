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
  getAvailableTasksForUser,
  getUserActiveTasks,
  claimTask,
  completeTask,
  saveStandup,
  getUser,
  supabase,
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
      return res.status(401).json({ error: "Unauthorized / Invalid initData: " + e.message });
    }

    // Extract user from initData
    const params = new URLSearchParams(initData);
    const userStr = params.get("user");
    if (!userStr) {
      return res.status(401).json({ error: "No user found in initData" });
    }

    const tgUser = JSON.parse(decodeURIComponent(userStr));
    const isUserAdmin = isAdmin(tgUser.id);
    const role = isUserAdmin ? "admin" : "member";

    // Initialize bot info once
    const botInfo = await bot.api.getMe();

    // ────────────────────────────────────────────────
    // GET Requests
    // ────────────────────────────────────────────────
    if (req.method === "GET") {
      const settings = {
        standupDays: config.STANDUP_DAYS,
        standupHour: config.STANDUP_HOUR,
        cronSecured: !!config.CRON_SECRET,
        botUsername: botInfo.username,
      };

      if (isUserAdmin) {
        const [committees, users, leaderboard, tasks, standups] = await Promise.all([
          getCommittees(),
          getAllUsersWithMemberships(),
          getLeaderboard(undefined, 25),
          getAllTasks(),
          getAllStandups(50),
        ]);
        return res.status(200).json({ role, committees, users, leaderboard, tasks, standups, settings });
      } else {
        const [availableTasks, activeTasks, userDb, leaderboard] = await Promise.all([
          getAvailableTasksForUser(tgUser.id),
          getUserActiveTasks(tgUser.id),
          getUser(tgUser.id),
          getLeaderboard(undefined, 25),
        ]);
        return res.status(200).json({ 
          role, 
          availableTasks, 
          activeTasks, 
          user: userDb,
          leaderboard,
          settings 
        });
      }
    }

    // ────────────────────────────────────────────────
    // POST Requests
    // ────────────────────────────────────────────────
    if (req.method === "POST") {
      const { action, payload } = req.body;

      // ==========================================
      // Member Actions
      // ==========================================
      if (action === "CLAIM_TASK") {
        const task = await claimTask(payload.taskId, tgUser.id);
        if (!task) return res.status(400).json({ error: "Task not available" });
        return res.status(200).json({ success: true, task });
      }

      if (action === "COMPLETE_TASK") {
        const task = await completeTask(payload.taskId);
        if (!task) return res.status(400).json({ error: "Task could not be completed" });
        return res.status(200).json({ success: true, task });
      }

      if (action === "SUBMIT_STANDUP") {
        const { completed, next, blockers } = payload;
        
        // Save standup for all committees the user is a member of
        const memberships = await getCommitteeMembers("dummy").catch(() => []); // this is wrong, let's use a query
        const { data: userCommittees } = await supabase
          .from("user_committees")
          .select("committee_id")
          .eq("user_id", tgUser.id);
          
        if (userCommittees) {
          for (const uc of userCommittees) {
            await saveStandup({
              user_id: tgUser.id,
              committee_id: uc.committee_id,
              completed: completed || "None",
              next: next || "None",
              blockers: blockers || "None",
            });
          }
        }
        return res.status(200).json({ success: true });
      }

      // ==========================================
      // Admin Actions
      // ==========================================
      if (!isUserAdmin) {
        return res.status(403).json({ error: "Forbidden: Not an admin" });
      }

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
    console.error("API error:", error);
    return res.status(500).json({ error: error.message });
  }
}
