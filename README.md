# Fexer AI

Production-ready AI SaaS platform — chat, voice, image generation, web search, and an AI Agent Builder powered by n8n. Payments via Lemon Squeezy (Merchant of Record — no LLC/business registration required).

## Stack
- Frontend: Vanilla HTML/CSS/JS
- Hosting: Netlify (static + serverless functions)
- Database/Auth: Supabase (PostgreSQL + Auth)
- Payments: Lemon Squeezy (Free / Pro $20 / Max $75) — Merchant of Record, supports Saudi Arabia bank payouts
- AI: OpenAI (gpt-4o-mini, DALL·E, Whisper, TTS)
- Search: Tavily API
- Automation: n8n on Railway

## Setup order
1. Supabase: create project, run supabase-schema.sql in SQL Editor, copy URL + anon key + service role key.
2. OpenAI: get API key from platform.openai.com.
3. Tavily: get API key from tavily.com.
4. n8n on Railway: deploy n8n, generate API key from Settings > API.
5. Lemon Squeezy: sign up free at lemonsqueezy.com, create a Store, create two subscription Products (Pro $20/mo, Max $75/mo), copy Store ID and both Variant IDs, generate API key from Settings > API, create a Webhook pointing to /.netlify/functions/lemonsqueezy-webhook with a custom signing secret, select events: order_created, subscription_created, subscription_updated, subscription_cancelled, subscription_expired.
6. Replace placeholders in auth.js and script.js: SUPABASE_URL and SUPABASE_ANON_KEY.
7. Netlify dashboard: add all environment variables listed below.
8. Deploy to Netlify (connect Git repo, build settings auto-detected via netlify.toml).
9. Point fexer.it.com (Namecheap) to Netlify via CNAME/ALIAS.

## File structure
fexer-ai/
- auth.html, auth.css, auth.js — Login, signup, forgot password
- index.html, style.css, script.js — Main app (chat + agents)
- supabase-schema.sql — Database schema
- package.json, netlify.toml — Project + deploy config
- .env.example — Environment variable template
- netlify/functions/
  - _supabaseAdmin.js — Shared auth helper (not a public endpoint)
  - chat.js — AI chat (OpenAI + Tavily), supports edit/regenerate
  - speak.js — Text-to-speech
  - transcribe.js — Speech-to-text
  - generate-image.js — AI image generation
  - agent-plan.js — Agent Builder: prompt to plan
  - agent-deploy.js — Agent Builder: deploy to n8n
  - agent-status.js — Agent Builder: status/dashboard
  - credits-get.js — Fetch remaining credits
  - credits-use.js — Deduct credit before AI action
  - lemonsqueezy-checkout.js — Create checkout URL
  - lemonsqueezy-portal.js — Fetch customer portal URL
  - lemonsqueezy-webhook.js — Sync subscription status

## Chat UI features
- Markdown rendering (headings, bold, italics, links, lists)
- Syntax-highlighted code blocks (highlight.js) with per-block copy button
- Copy button on every message
- Edit message (resends conversation from that point)
- Regenerate response
- Simulated typing/streaming effect for AI replies
- Message timestamps

## All required environment variables
Set these in Netlify Dashboard > Site settings > Environment variables:
OPENAI_API_KEY
TAVILY_API_KEY
N8N_URL
N8N_API_KEY
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
LEMONSQUEEZY_API_KEY
LEMONSQUEEZY_STORE_ID
LEMONSQUEEZY_WEBHOOK_SECRET
LEMONSQUEEZY_PRO_VARIANT_ID
LEMONSQUEEZY_MAX_VARIANT_ID
SITE_URL