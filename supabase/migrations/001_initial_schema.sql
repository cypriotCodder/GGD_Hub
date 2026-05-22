-- =============================================
-- GGD Hub — Initial Database Schema
-- Run this in the Supabase SQL Editor
-- =============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================
-- 1. Users table
-- =============================================
CREATE TABLE public.users (
  telegram_id BIGINT PRIMARY KEY,
  username TEXT,
  first_name TEXT,
  points INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.users IS 'Telegram users registered with the bot';

-- =============================================
-- 2. Committees table
-- =============================================
CREATE TABLE public.committees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  chat_id BIGINT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.committees ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.committees IS 'Committee groups linked to Telegram group chats';

-- =============================================
-- 3. User-Committees junction table
-- =============================================
CREATE TABLE public.user_committees (
  user_id BIGINT NOT NULL REFERENCES public.users(telegram_id) ON DELETE CASCADE,
  committee_id UUID NOT NULL REFERENCES public.committees(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  PRIMARY KEY (user_id, committee_id)
);

ALTER TABLE public.user_committees ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.user_committees IS 'Many-to-many relationship between users and committees';

CREATE INDEX idx_user_committees_user_id ON public.user_committees(user_id);
CREATE INDEX idx_user_committees_committee_id ON public.user_committees(committee_id);

-- =============================================
-- 4. Tasks table
-- =============================================
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  assigned_to BIGINT REFERENCES public.users(telegram_id) ON DELETE SET NULL,
  committee_id UUID NOT NULL REFERENCES public.committees(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  point_value INTEGER NOT NULL DEFAULT 5,
  created_by BIGINT NOT NULL REFERENCES public.users(telegram_id) ON DELETE RESTRICT,
  message_id BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.tasks IS 'Tasks assigned within committees';

CREATE INDEX idx_tasks_committee_id ON public.tasks(committee_id);
CREATE INDEX idx_tasks_assigned_to ON public.tasks(assigned_to);
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_tasks_created_by ON public.tasks(created_by);

-- =============================================
-- 5. Standups table
-- =============================================
CREATE TABLE public.standups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id BIGINT NOT NULL REFERENCES public.users(telegram_id) ON DELETE CASCADE,
  committee_id UUID NOT NULL REFERENCES public.committees(id) ON DELETE CASCADE,
  completed TEXT,
  next TEXT,
  blockers TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.standups ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.standups IS 'Weekly standup reports from committee members';

CREATE INDEX idx_standups_user_id ON public.standups(user_id);
CREATE INDEX idx_standups_committee_id ON public.standups(committee_id);
CREATE INDEX idx_standups_created_at ON public.standups(created_at DESC);

-- =============================================
-- 6. Conversation sessions (grammY state persistence)
-- =============================================
CREATE TABLE public.conversation_sessions (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL
);

ALTER TABLE public.conversation_sessions ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.conversation_sessions IS 'grammY bot conversation/session state persistence';

-- =============================================
-- 7. Helper function: Increment user points atomically
-- =============================================
CREATE OR REPLACE FUNCTION public.increment_points(
  user_telegram_id BIGINT,
  amount INTEGER
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.users
  SET points = points + amount
  WHERE telegram_id = user_telegram_id;
END;
$$;

-- =============================================
-- 8. Helper function: Get leaderboard
-- =============================================
CREATE OR REPLACE FUNCTION public.get_leaderboard(
  p_committee_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  telegram_id BIGINT,
  username TEXT,
  first_name TEXT,
  points INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_committee_id IS NOT NULL THEN
    RETURN QUERY
      SELECT u.telegram_id, u.username, u.first_name, u.points
      FROM public.users u
      INNER JOIN public.user_committees uc ON u.telegram_id = uc.user_id
      WHERE uc.committee_id = p_committee_id
      ORDER BY u.points DESC
      LIMIT p_limit;
  ELSE
    RETURN QUERY
      SELECT u.telegram_id, u.username, u.first_name, u.points
      FROM public.users u
      ORDER BY u.points DESC
      LIMIT p_limit;
  END IF;
END;
$$;
