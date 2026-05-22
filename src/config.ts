/**
 * Environment configuration — validates all required env vars at startup.
 * Fails fast with clear error messages if anything is missing.
 */

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optionalEnv(name: string, fallback: string = ""): string {
  return process.env[name] || fallback;
}

export const config = {
  /** Telegram bot token from @BotFather */
  BOT_TOKEN: requireEnv("BOT_TOKEN"),

  /** Supabase project URL */
  SUPABASE_URL: requireEnv("SUPABASE_URL"),

  /** Supabase service_role key (bypasses RLS) */
  SUPABASE_SERVICE_ROLE_KEY: requireEnv("SUPABASE_SERVICE_ROLE_KEY"),

  /** Secret for verifying Vercel cron requests */
  CRON_SECRET: optionalEnv("CRON_SECRET"),

  /** Secret token for Telegram webhook signature verification */
  WEBHOOK_SECRET: optionalEnv("WEBHOOK_SECRET"),

  /** Comma-separated Telegram user IDs with admin privileges */
  ADMIN_TELEGRAM_IDS: optionalEnv("ADMIN_TELEGRAM_IDS")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
    .map(Number),

  /** Day of week to send standups (0 = Sunday, 1 = Monday, ..., 6 = Saturday) */
  STANDUP_DAY: Number(optionalEnv("STANDUP_DAY", "1")), // Default: Monday
} as const;

/** Check if a Telegram user ID has admin privileges */
export function isAdmin(telegramId: number): boolean {
  return config.ADMIN_TELEGRAM_IDS.includes(telegramId);
}
