# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start dev server (localhost:3000)
npm run build      # Production build
npm run lint       # ESLint
npx tsc --noEmit   # TypeScript check only
```

## Tech Stack

- **Next.js 16** (App Router, Turbopack) — no webpack config; use `turbopack:{}` in next.config.ts
- **TypeScript** — strict mode
- **Tailwind CSS v4** — config via `@theme inline` in globals.css, NOT tailwind.config.js
- **Supabase** (`@supabase/ssr`) — browser client in `lib/supabase.ts`, server client in `lib/supabase-server.ts`
- **Framer Motion v12** — ease arrays must be cast as `[number, number, number, number]`
- **DnD Kit** — drag-and-drop on Kanban board
- **Mapbox GL JS** — customer map (requires `NEXT_PUBLIC_MAPBOX_TOKEN`)
- **Nodemailer + Twilio** — email/SMS campaign delivery in API routes

## Project Structure

```
app/
  (app)/             # Authenticated route group — layout.tsx guards auth + renders Sidebar
    page.tsx         # Dashboard
    crm/page.tsx     # Lead list view
    kanban/page.tsx  # Drag-and-drop pipeline board
    campaigns/page.tsx
    map/page.tsx
    calendar/page.tsx
    settings/page.tsx
  auth/login/page.tsx  # Public login (glass card design)
  book/[rep]/page.tsx  # Public booking page per rep
  api/
    campaigns/send/route.ts  # Sends next campaign step (email or SMS)
    sms/send/route.ts
components/
  ui/              # GlassCard, Button, Badge, Input, Modal, Drawer, Avatar, AmbientBackground
  layout/          # Sidebar, MobileNav, PageHeader
  dashboard/       # DashboardClient (server data → client display)
  crm/             # CRMClient, LeadDrawer, LeadFormModal
  kanban/          # KanbanClient, KanbanColumn, KanbanCard
  campaigns/       # CampaignsClient
  map/             # MapClient
  calendar/        # CalendarClient
  settings/        # SettingsClient
lib/
  supabase.ts           # createClient() — browser (defensive: uses placeholder URL if env not set)
  supabase-server.ts    # createServerSupabaseClient() — server
  utils.ts              # cn(), formatDate(), isOverdue(), PIPELINE_STAGES, REPS constants
types/index.ts          # All TypeScript types
proxy.ts                # Auth middleware (Next.js 16: "proxy" not "middleware", exports `proxy` fn)
supabase/migrations/
  001_initial_schema.sql   # Full DB schema with RLS
  002_campaign_seed.sql    # All 6 campaign sequences with real email copy
```

## Key Architecture Decisions

**Server → Client data flow**: Pages are async server components that fetch from Supabase, then pass data to `*Client` components that handle interactivity. Never call Supabase directly from inside event handlers in server components.

**Route group `(app)`**: The `(app)/layout.tsx` handles auth redirect + renders the shell (Sidebar + AmbientBackground). Mark `export const dynamic = 'force-dynamic'` on all pages in this group.

**Supabase client initialization**: The browser client (`createClient()`) must be called lazily — inside event handlers or useCallback — not at component top level, to avoid SSR prerender errors when env vars are placeholders during build.

**Design system**: All glass cards use `.glass` / `.glass-strong` CSS classes defined in globals.css. Ambient orbs are in `AmbientBackground`. Color palette is in CSS custom properties under `:root` in globals.css. Dark background `#080b12`.

**Role-based access**: Three roles — `owner`, `vp_operations` (both see all reps' data), `salesperson` (own leads only). Enforced both in RLS policies and by filtering queries when `!isAdmin`.

**Campaigns**: 6 pre-built sequences (cold prospect, 6 warm POS-specific, onboarding, renewal, re-engagement, referral ask) seeded in `002_campaign_seed.sql`. The `/api/campaigns/send` route sends the current step and advances `current_step` in `campaign_enrollments`.

## Environment Variables Required

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_MAPBOX_TOKEN
TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN
TWILIO_DEFAULT_NUMBER
```

## Supabase Setup

1. Create project at supabase.com
2. Run migrations in order: `001_initial_schema.sql` then `002_campaign_seed.sql`
3. Create 3 auth users (Shanon, Doug, Hardip) in Supabase Auth dashboard
4. Insert rows in `public.users` table with their auth UUIDs and roles (`owner`, `vp_operations`, `salesperson`)
5. Enable Supabase Storage bucket named `documents` for file uploads
