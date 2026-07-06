-- ============================================================
-- FEXER AI - SUPABASE DATABASE SCHEMA
-- Run this in Supabase SQL Editor (Project > SQL Editor > New Query)
-- ============================================================

-- ------------------------------------------------------------
-- 1. PROFILES TABLE (extends Supabase auth.users)
-- ------------------------------------------------------------
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  full_name text,
  plan text not null default 'free' check (plan in ('free', 'pro', 'max')),
  lemonsqueezy_customer_id text,
  lemonsqueezy_subscription_id text,
  lemonsqueezy_customer_portal_url text,
  subscription_status text default 'inactive',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- ------------------------------------------------------------
-- 2. CREDITS TABLE (daily usage tracking)
-- ------------------------------------------------------------
create table if not exists public.credits (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  date date not null default current_date,
  used integer not null default 0,
  created_at timestamptz default now(),
  unique(user_id, date)
);

alter table public.credits enable row level security;

create policy "Users can view own credits"
  on public.credits for select
  using (auth.uid() = user_id);

create policy "Users can insert own credits"
  on public.credits for insert
  with check (auth.uid() = user_id);

create policy "Users can update own credits"
  on public.credits for update
  using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 3. CHATS TABLE
-- ------------------------------------------------------------
create table if not exists public.chats (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null default 'New Chat',
  is_starred boolean default false,
  is_draft boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.chats enable row level security;

create policy "Users can manage own chats"
  on public.chats for all
  using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 4. MESSAGES TABLE
-- ------------------------------------------------------------
create table if not exists public.messages (
  id uuid default gen_random_uuid() primary key,
  chat_id uuid references public.chats(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  attachments jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);

alter table public.messages enable row level security;

create policy "Users can manage own messages"
  on public.messages for all
  using (auth.uid() = user_id);

create index if not exists messages_chat_id_idx on public.messages(chat_id);

-- ------------------------------------------------------------
-- 5. AGENTS TABLE (AI Agent Builder)
-- ------------------------------------------------------------
create table if not exists public.agents (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  prompt text not null,
  plan jsonb,
  credentials jsonb default '{}'::jsonb,
  n8n_workflow_id text,
  status text not null default 'draft' check (status in ('draft', 'planning', 'deploying', 'active', 'failed', 'paused')),
  dashboard_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.agents enable row level security;

create policy "Users can manage own agents"
  on public.agents for all
  using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 6. AUTO-CREATE PROFILE ON SIGNUP (trigger)
-- ------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ------------------------------------------------------------
-- 7. AUTO-UPDATE updated_at TIMESTAMP
-- ------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

drop trigger if exists set_chats_updated_at on public.chats;
create trigger set_chats_updated_at
  before update on public.chats
  for each row execute procedure public.set_updated_at();

drop trigger if exists set_agents_updated_at on public.agents;
create trigger set_agents_updated_at
  before update on public.agents
  for each row execute procedure public.set_updated_at();

-- ------------------------------------------------------------
-- DONE. Tables created: profiles, credits, chats, messages, agents
-- ------------------------------------------------------------