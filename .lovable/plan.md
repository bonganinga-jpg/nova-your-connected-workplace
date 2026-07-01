
# Nova v1 — Your Intelligent Workplace Assistant

A dashboard-first productivity hub. Nova greets the user, shows today's agenda from Google Calendar, surfaces tasks and deadlines, and exposes four AI tools plus a threaded chat companion — all backed by a real account.

## Product scope for v1

**In:** auth, personalized dashboard, 4 AI tools, threaded chat, Google Calendar integration, Focus Mode, rule-based Caring Engine, settings/profile.
**Out (future):** Gmail/Outlook/Slack/Notion/Teams/Spotify integrations, Nova Study/Business/Design verticals, mobile app, team workspaces.

## Design direction

Nova should feel like a calm, premium colleague — not a chatbot. Think Linear × Notion × Things 3.

- **Palette:** deep off-black canvas (`oklch(0.16 0.02 265)`), soft warm cards, a single Nova accent — a luminous cyan/violet gradient (`#7C9FFF → #B48CFF`) used sparingly for the Nova mark, active states, and the greeting.
- **Typography:** Inter Tight for UI, Fraunces (semibold) for the greeting and section headers to give warmth. Generous whitespace, 14–15px body, tight line-height on headings.
- **Motion:** subtle. Fade + 4px rise on mount, spring on hover, a slow shimmer on the Nova avatar when "thinking".
- **Layout:** left rail (Nova logo, primary nav, focus mode toggle, user), main canvas, right-side context panel on tool pages.

## User surfaces (routes)

```text
/                          → marketing landing (Nova pitch, CTA to sign in)
/auth                      → email + password + Google sign-in
/_authenticated/dashboard  → greeting, agenda, tasks, deadlines, weekly progress, caring nudges
/_authenticated/chat       → thread list + redirect to newest / new thread
/_authenticated/chat/$threadId → conversation with Nova
/_authenticated/tools/email      → Smart Email Generator
/_authenticated/tools/meeting    → Meeting Notes Summarizer
/_authenticated/tools/planner    → Intelligent Task Planner
/_authenticated/tools/research   → Research Assistant
/_authenticated/focus            → Focus Mode timer + work-style presets
/_authenticated/settings         → profile, integrations (Google Calendar), preferences
/api/chat                        → AI SDK streaming endpoint
```

## Features

### 1. Personalized dashboard
- Time-aware greeting using `profile.display_name`: "Good morning, Bongani."
- **Today** card: next event from Google Calendar + count of remaining events.
- **Priority tasks** (top 3 by priority + due date) with quick-complete.
- **Upcoming deadlines** (next 7 days).
- **Weekly progress**: % of tasks completed this week with a soft progress ring.
- **Caring nudges** slot (see Caring Engine).
- **Quick actions**: "Draft an email", "Summarize a meeting", "Plan my day", "Ask Nova" → deep-link to tools/chat.

### 2. Smart Email Generator
Form: purpose, recipient type (client/manager/colleague/supplier), tone (formal/friendly/persuasive/concise), key points, optional prior thread. Output: subject + body, streamed. Buttons: copy, regenerate, "make shorter/warmer/more formal", generate follow-up.

### 3. Meeting Notes Summarizer
Paste raw notes / transcript. Output structured markdown: executive summary, key discussion points, decisions, action items (with owner + deadline), follow-ups. Action items get a "Send to Task Planner" button that inserts rows into `tasks`.

### 4. Intelligent Task Planner
- Task CRUD (title, notes, priority low/med/high, due date, estimated minutes, status).
- Daily and weekly views with priority matrix (Eisenhower quadrants).
- "Plan my day" — Nova takes today's tasks + calendar events and returns time-blocked schedule as JSON (structured output), rendered as a timeline. Deadline reminders shown on dashboard.

### 5. Research Assistant
Input modes: paste text, paste URL (fetched server-side and stripped to readable text), or upload PDF (parsed with `document--parse_document` equivalent — use `pdf-parse`/AI SDK file part). Output: concise summary, key insights, keywords, simplified explanation, actionable takeaways, suggested resources.

### 6. Conversational Nova (threaded chat)
- Sidebar of threads, "New chat" button, per-thread URL `/chat/$threadId`.
- Streaming via AI SDK `useChat` + `/api/chat` server route.
- System prompt makes Nova proactive: it can suggest using a tool ("Want me to open the Task Planner?"), surface docs/tutorial links, and recall today's agenda when relevant.
- Session-only memory is TanStack Query-cached UIMessages per thread; persisted to DB in `onFinish`.

### 7. Google Calendar integration
- Connect flow in `/settings` using the Lovable `google_calendar` connector.
- Server function `getUpcomingEvents({ days })` powers dashboard, planner, chat context, and meeting prep.
- "Prep me for this meeting" action on any event → Nova generates a briefing (agenda, talking points, questions to ask) using event title + description.

### 8. Focus Mode
- Presets: Deep Focus, Creative, Reading, Writing, Research, Design, Coding.
- Pomodoro-style timer (25/5, 50/10, 90/15 configurable).
- Starting a session records to `focus_sessions`; ending after ≥45min triggers a Caring nudge.

### 9. Caring Engine (rule-based v1)
Runs on the dashboard mount + after each focus session/task completion. Rules:
- ≥ 3 focus sessions or ≥ 90 min focused today with no break logged → "You've been heads-down for a while. Take 5 minutes?"
- Calendar day with ≥ 6 hours of meetings → "Tomorrow looks packed — want me to block 90 min of protected focus?"
- Task completed that finishes a weekly goal → celebration toast.
- Deadline within 24h and task not started → gentle nudge with "Draft a plan" CTA.
- All rules deduped per day per user in `caring_events`.

## Data model (Lovable Cloud / Supabase)

All tables have `GRANT`s for `authenticated` + `service_role`, RLS enabled, policies scoped to `auth.uid()`. Roles live in a separate `user_roles` table with `app_role` enum (`admin`, `user`) and `has_role()` SECURITY DEFINER function per the standard pattern.

```text
profiles(id uuid pk → auth.users, display_name, timezone, focus_preset, created_at)
  ↳ auto-created via on_auth_user_created trigger

user_roles(id, user_id → auth.users, role app_role, unique(user_id, role))

chat_threads(id uuid pk, user_id, title, updated_at, created_at)
chat_messages(id uuid pk, thread_id → chat_threads, role, parts jsonb, created_at)
  ↳ parts stores AI SDK UIMessage.parts

tasks(id, user_id, title, notes, priority, status, due_at, estimated_minutes,
      source text /* manual|meeting|planner */, created_at, completed_at)

meeting_summaries(id, user_id, title, raw_notes, summary_md, action_items jsonb, created_at)

research_items(id, user_id, source_type, source_ref, summary_md, insights jsonb, keywords text[], created_at)

email_drafts(id, user_id, purpose, recipient_type, tone, subject, body, created_at)

focus_sessions(id, user_id, preset, started_at, ended_at, duration_seconds)

caring_events(id, user_id, kind, payload jsonb, day date, unique(user_id, kind, day))
```

## Technical details

- **Stack:** TanStack Start (already scaffolded), Lovable Cloud (Supabase), Lovable AI Gateway via AI SDK, shadcn/ui, Tailwind v4.
- **Auth:** email/password + Google via Lovable Cloud broker (`lovable.auth.signInWithOAuth('google', ...)`), managed `_authenticated` layout. Ask users if they need profile data → yes (display name, timezone, focus preset) → `profiles` table + `on_auth_user_created` trigger.
- **Model:** `google/gemini-3-flash-preview` default for chat and generation. Structured output (`Output.object`) for planner schedule and meeting action items.
- **Chat route:** `src/routes/api/chat.ts` with `streamText` + `toUIMessageStreamResponse({ originalMessages, onFinish })` persisting the assistant message to `chat_messages`. Uses `requireSupabaseAuth` via bearer middleware (already wired in `src/start.ts`); thread ownership verified server-side.
- **Server functions** in `src/lib/*.functions.ts` for: `listThreads`, `createThread`, `deleteThread`, `renameThread`, `getThreadMessages`, task CRUD, meeting summarizer, email generator, research, `getUpcomingEvents`, `runCaringEngine`.
- **Google Calendar:** via `standard_connectors--connect` for `google_calendar`, called through the gateway URL from a server function; token refresh handled by the gateway. Store connection status per-user in `profiles.calendar_connected`.
- **Streaming markdown:** render assistant + tool outputs with `react-markdown` + `remark-gfm` in a shared `<Markdown>` component.
- **Fonts:** `@fontsource-variable/inter` and `@fontsource/fraunces` installed via bun and imported in `src/routes/__root.tsx` head.
- **Focus mode timer** lives entirely client-side; only session records hit the DB.
- **SEO:** landing page has full head metadata + og:image; authenticated routes just set titles.

## Delivery order

1. Cloud enable + auth (email/password + Google), profiles table + trigger, managed `_authenticated` layout, landing page.
2. Design system tokens (colors, fonts, `<AppShell>` with left rail).
3. Threaded chat: DB tables, server functions, `/api/chat` route, `/chat` and `/chat/$threadId` pages with `useChat`.
4. Task Planner (CRUD + views + "Plan my day" structured-output action).
5. Google Calendar connector + `getUpcomingEvents` + dashboard wiring.
6. Dashboard (greeting, agenda, priority tasks, deadlines, progress, quick actions).
7. Smart Email Generator, Meeting Summarizer, Research Assistant.
8. Focus Mode + `focus_sessions`.
9. Caring Engine rules + `caring_events` dedupe + dashboard nudge slot.
10. Settings page (profile, calendar connection, focus preferences), polish pass, publish CTA.

Ready to build on approval.
