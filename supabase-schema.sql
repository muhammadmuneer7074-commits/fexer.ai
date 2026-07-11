-- ══════════════════════════════════════════
--  FEXER AI — SUPABASE SCHEMA
--  Supabase SQL Editor mein run karo
-- ══════════════════════════════════════════

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── PROFILES TABLE ──
CREATE TABLE IF NOT EXISTS public.profiles (
  id                               UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email                            TEXT,
  full_name                        TEXT,
  avatar_url                       TEXT,
  plan                             TEXT DEFAULT 'free' CHECK (plan IN ('free','pro','max')),
  lemonsqueezy_customer_id         TEXT,
  lemonsqueezy_subscription_id     TEXT,
  lemonsqueezy_subscription_status TEXT,
  lemonsqueezy_customer_portal_url TEXT,
  created_at                       TIMESTAMPTZ DEFAULT NOW(),
  updated_at                       TIMESTAMPTZ DEFAULT NOW()
);

-- ── USER CREDITS TABLE ──
CREATE TABLE IF NOT EXISTS public.user_credits (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  plan              TEXT DEFAULT 'free' CHECK (plan IN ('free','pro','max')),
  credits_remaining INTEGER DEFAULT 5,
  credits_daily     INTEGER DEFAULT 5,
  last_reset        TIMESTAMPTZ DEFAULT NOW(),
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ── CHATS TABLE ──
CREATE TABLE IF NOT EXISTS public.chats (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title      TEXT DEFAULT 'New Chat',
  starred    BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── MESSAGES TABLE ──
CREATE TABLE IF NOT EXISTS public.messages (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id    UUID REFERENCES public.chats(id) ON DELETE CASCADE,
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role       TEXT CHECK (role IN ('user','assistant','system')),
  content    TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── AGENTS TABLE ──
CREATE TABLE IF NOT EXISTS public.agents (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  description  TEXT,
  prompt       TEXT,
  workflow_id  TEXT,
  workflow_url TEXT,
  active       BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── ACTIVITY LOGS TABLE ──
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  action       TEXT,
  credits_used INTEGER DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════
--  ROW LEVEL SECURITY (RLS)
-- ══════════════════════════════════════════

ALTER TABLE public.profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_credits  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agents        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- User credits policies
CREATE POLICY "Users can view own credits"
  ON public.user_credits FOR SELECT USING (auth.uid() = user_id);

-- Chats policies
CREATE POLICY "Users can manage own chats"
  ON public.chats FOR ALL USING (auth.uid() = user_id);

-- Messages policies
CREATE POLICY "Users can manage own messages"
  ON public.messages FOR ALL USING (auth.uid() = user_id);

-- Agents policies
CREATE POLICY "Users can manage own agents"
  ON public.agents FOR ALL USING (auth.uid() = user_id);

-- Activity logs policies
CREATE POLICY "Users can view own activity"
  ON public.activity_logs FOR SELECT USING (auth.uid() = user_id);

-- ══════════════════════════════════════════
--  AUTO-CREATE PROFILE + CREDITS ON SIGNUP
-- ══════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;

  -- Create credits (free plan = 5/day)
  INSERT INTO public.user_credits (user_id, plan, credits_remaining, credits_daily, last_reset)
  VALUES (NEW.id, 'free', 5, 5, NOW())
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: run function when new user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ══════════════════════════════════════════
--  INDEXES (performance ke liye)
-- ══════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_chats_user_id    ON public.chats(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON public.messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON public.messages(user_id);
CREATE INDEX IF NOT EXISTS idx_agents_user_id   ON public.agents(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_user_id ON public.activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_credits_user_id  ON public.user_credits(user_id);