import type { VercelRequest, VercelResponse } from "@vercel/node";
import crypto from "crypto";
import { config, isAdmin } from "../src/config";
import {
  getCommittees,
  getAllUsers,
  createCommittee,
  joinCommittee,
} from "../src/services/db";

// Validate Telegram WebApp initData
function validateInitData(initData: string, botToken: string): boolean {
  const urlParams = new URLSearchParams(initData);
  const hash = urlParams.get("hash");
  if (!hash) return false;
  urlParams.delete("hash");

  const dataCheckString = Array.from(urlParams.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  const secretKey = crypto
    .createHmac("sha256", "WebAppData")
    .update(botToken)
    .digest();
  const calculatedHash = crypto
    .createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  return calculatedHash === hash;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const initData = req.headers["x-telegram-init-data"] as string;
    if (!initData || !validateInitData(initData, config.BOT_TOKEN)) {
      return res.status(401).json({ error: "Unauthorized / Invalid initData" });
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
      const committees = await getCommittees();
      const users = await getAllUsers();
      return res.status(200).json({ committees, users });
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

      if (action === "PROMOTE_LEADER") {
        await joinCommittee(
          Number(payload.telegram_id),
          payload.committee_id,
          "leader"
        );
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
