import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import { generateText, Output } from "ai";

const MODEL = "google/gemini-3-flash-preview";

function getGateway() {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Nova AI is not configured yet.");
  return createLovableAiGatewayProvider(key);
}

/* ---------------- Chat threads ---------------- */

export const listThreads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("chat_threads").select("id,title,updated_at,created_at")
      .eq("user_id", context.userId).order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ title: z.string().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase.from("chat_threads")
      .insert({ user_id: context.userId, title: data.title ?? "New conversation" })
      .select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("chat_threads").delete().eq("id", data.id).eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const renameThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), title: z.string().min(1).max(120) }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("chat_threads").update({ title: data.title, updated_at: new Date().toISOString() })
      .eq("id", data.id).eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getThreadMessages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ threadId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: thread } = await context.supabase.from("chat_threads").select("id,title,user_id").eq("id", data.threadId).single();
    if (!thread || thread.user_id !== context.userId) throw new Error("Thread not found");
    const { data: msgs, error } = await context.supabase.from("chat_messages")
      .select("id,role,parts,created_at").eq("thread_id", data.threadId).order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return {
      thread: { id: thread.id, title: thread.title },
      messages: (msgs ?? []).map((m) => ({ id: m.id, role: m.role, parts: m.parts })),
    };
  });

/* ---------------- Tasks ---------------- */

const TaskInput = z.object({
  title: z.string().min(1).max(240),
  notes: z.string().max(4000).optional().nullable(),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  due_at: z.string().nullable().optional(),
  estimated_minutes: z.number().int().positive().nullable().optional(),
  source: z.string().default("manual"),
});

export const listTasks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from("tasks")
      .select("*").eq("user_id", context.userId).order("status", { ascending: true }).order("due_at", { ascending: true, nullsFirst: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => TaskInput.parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase.from("tasks")
      .insert({ ...data, user_id: context.userId }).select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid(),
    patch: z.object({
      title: z.string().optional(),
      notes: z.string().nullable().optional(),
      priority: z.enum(["low", "medium", "high"]).optional(),
      status: z.enum(["open", "in_progress", "done"]).optional(),
      due_at: z.string().nullable().optional(),
      estimated_minutes: z.number().int().positive().nullable().optional(),
    }),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const patch = { ...data.patch } as typeof data.patch & { completed_at?: string | null };
    if (data.patch.status === "done") patch.completed_at = new Date().toISOString();
    if (data.patch.status && data.patch.status !== "done") patch.completed_at = null;
    const { data: row, error } = await context.supabase.from("tasks").update(patch)
      .eq("id", data.id).eq("user_id", context.userId).select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("tasks").delete().eq("id", data.id).eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ---------------- Email generator ---------------- */

export const generateEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    purpose: z.string().min(1),
    recipient_type: z.enum(["client", "manager", "colleague", "supplier", "other"]),
    tone: z.enum(["formal", "friendly", "persuasive", "concise"]),
    key_points: z.string().default(""),
    prior_thread: z.string().default(""),
    variation: z.string().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const gateway = getGateway();
    const { output } = await generateText({
      model: gateway(MODEL),
      output: Output.object({ schema: z.object({ subject: z.string(), body: z.string() }) }),
      prompt: `You are Nova, drafting an email on behalf of the user.

Purpose: ${data.purpose}
Recipient type: ${data.recipient_type}
Tone: ${data.tone}
Key points to include:
${data.key_points || "(none provided)"}

Prior thread (may be empty):
${data.prior_thread || "(none)"}

${data.variation ? `Additional instruction: ${data.variation}\n` : ""}
Write a complete, ready-to-send email. Keep the tone genuine, avoid clichés, and no filler like "I hope this email finds you well". Return a subject line and a body only.`,
    });
    const { data: saved } = await context.supabase.from("email_drafts").insert({
      user_id: context.userId, purpose: data.purpose, recipient_type: data.recipient_type,
      tone: data.tone, subject: output.subject, body: output.body,
    }).select().single();
    return { subject: output.subject, body: output.body, id: saved?.id };
  });

/* ---------------- Meeting summarizer ---------------- */

const ActionItem = z.object({
  title: z.string(),
  owner: z.string().nullable(),
  deadline: z.string().nullable(),
});

export const summarizeMeeting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    title: z.string().min(1),
    notes: z.string().min(10),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const gateway = getGateway();
    const { output } = await generateText({
      model: gateway(MODEL),
      output: Output.object({
        schema: z.object({
          summary_md: z.string(),
          action_items: z.array(ActionItem),
        }),
      }),
      prompt: `You are Nova, summarizing meeting notes.

Meeting: ${data.title}
Raw notes / transcript:
"""
${data.notes}
"""

Return:
- summary_md: markdown with these sections in this order:
  ## Executive summary
  ## Key discussion points (bulleted)
  ## Decisions made (bulleted)
  ## Follow-up recommendations (bulleted)
- action_items: a JSON array of concrete action items, each with title, owner (string or null), deadline (ISO date string or null).

Only include what is clearly implied by the notes. Do not invent owners or deadlines.`,
    });
    const { data: saved } = await context.supabase.from("meeting_summaries").insert({
      user_id: context.userId, title: data.title, raw_notes: data.notes,
      summary_md: output.summary_md, action_items: output.action_items,
    }).select().single();
    return { id: saved?.id, summary_md: output.summary_md, action_items: output.action_items };
  });

export const importActionItems = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    items: z.array(z.object({ title: z.string(), deadline: z.string().nullable() })),
  }).parse(d))
  .handler(async ({ data, context }) => {
    if (!data.items.length) return { inserted: 0 };
    const rows = data.items.map((i) => ({
      user_id: context.userId, title: i.title, priority: "medium",
      due_at: i.deadline, source: "meeting",
    }));
    const { error } = await context.supabase.from("tasks").insert(rows);
    if (error) throw new Error(error.message);
    return { inserted: rows.length };
  });

/* ---------------- Research ---------------- */

export const runResearch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    title: z.string().min(1),
    source_type: z.enum(["text", "url"]),
    content: z.string().min(20),
    source_ref: z.string().optional().nullable(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    let body = data.content;
    if (data.source_type === "url") {
      try {
        const res = await fetch(data.content, { headers: { "user-agent": "Nova/1.0" } });
        const html = await res.text();
        body = html.replace(/<script[\s\S]*?<\/script>/gi, "")
          .replace(/<style[\s\S]*?<\/style>/gi, "")
          .replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 20000);
      } catch { throw new Error("Could not fetch that URL."); }
    }
    const gateway = getGateway();
    const { output } = await generateText({
      model: gateway(MODEL),
      output: Output.object({
        schema: z.object({
          summary_md: z.string(),
          key_insights: z.array(z.string()),
          keywords: z.array(z.string()),
          takeaways: z.array(z.string()),
          simplified: z.string(),
        }),
      }),
      prompt: `You are Nova, a research assistant. Read the material below and return:
- summary_md: concise markdown summary
- key_insights: 3-6 non-obvious insights
- keywords: 5-10 salient keywords/phrases
- takeaways: 3-5 concrete, actionable takeaways
- simplified: a 2-3 sentence plain-English explanation for a smart person unfamiliar with the topic.

Material:
"""
${body.slice(0, 18000)}
"""`,
    });
    const { data: saved } = await context.supabase.from("research_items").insert({
      user_id: context.userId, title: data.title, source_type: data.source_type,
      source_ref: data.source_type === "url" ? data.content : data.source_ref ?? null,
      summary_md: output.summary_md,
      insights: { key_insights: output.key_insights, takeaways: output.takeaways, simplified: output.simplified },
      keywords: output.keywords,
    }).select().single();
    return { id: saved?.id, ...output };
  });

/* ---------------- Focus sessions ---------------- */

export const startFocusSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ preset: z.string() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase.from("focus_sessions")
      .insert({ user_id: context.userId, preset: data.preset }).select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const endFocusSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), duration_seconds: z.number().int().positive() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("focus_sessions")
      .update({ ended_at: new Date().toISOString(), duration_seconds: data.duration_seconds })
      .eq("id", data.id).eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ---------------- Profile ---------------- */

export const getProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from("profiles")
      .select("*").eq("id", context.userId).maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) {
      const { data: created } = await context.supabase.from("profiles")
        .insert({ id: context.userId }).select().single();
      return created;
    }
    return data;
  });

export const updateProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    display_name: z.string().min(1).max(120).optional(),
    timezone: z.string().optional(),
    focus_preset: z.string().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase.from("profiles")
      .update(data).eq("id", context.userId).select().single();
    if (error) throw new Error(error.message);
    return row;
  });

/* ---------------- Caring Engine ---------------- */

const NudgeSchema = z.object({
  kind: z.string(),
  title: z.string(),
  body: z.string(),
  cta: z.string().nullable(),
});

export const runCaringEngine = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const today = new Date().toISOString().slice(0, 10);
    const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0);

    const { data: sessions } = await context.supabase.from("focus_sessions")
      .select("duration_seconds").eq("user_id", context.userId)
      .gte("started_at", dayStart.toISOString());
    const focusedMinutes = (sessions ?? []).reduce((a, s) => a + Math.round((s.duration_seconds ?? 0) / 60), 0);

    const { data: tasks } = await context.supabase.from("tasks")
      .select("id,due_at,status")
      .eq("user_id", context.userId).neq("status", "done");
    const soon = (tasks ?? []).filter((t) => {
      if (!t.due_at) return false;
      const diff = new Date(t.due_at).getTime() - Date.now();
      return diff > 0 && diff < 1000 * 60 * 60 * 24;
    });

    const nudges: z.infer<typeof NudgeSchema>[] = [];
    if (focusedMinutes >= 90) nudges.push({
      kind: "break_reminder", title: "You've been heads-down for a while",
      body: `About ${focusedMinutes} minutes of focus today. A 5-minute break makes the next block sharper.`, cta: "Start a break",
    });
    if (soon.length) nudges.push({
      kind: "deadline_soon", title: `${soon.length} deadline${soon.length > 1 ? "s" : ""} in the next 24 hours`,
      body: "Want Nova to help draft a plan so nothing slips?", cta: "Plan my day",
    });

    // Dedupe by (kind, day)
    const shown: z.infer<typeof NudgeSchema>[] = [];
    for (const n of nudges) {
      const { data: existing } = await context.supabase.from("caring_events")
        .select("id,dismissed").eq("user_id", context.userId).eq("kind", n.kind).eq("day", today).maybeSingle();
      if (existing?.dismissed) continue;
      if (!existing) {
        await context.supabase.from("caring_events").insert({
          user_id: context.userId, kind: n.kind, day: today, payload: n,
        });
      }
      shown.push(n);
    }
    return { nudges: shown };
  });

export const dismissNudge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ kind: z.string() }).parse(d))
  .handler(async ({ data, context }) => {
    const today = new Date().toISOString().slice(0, 10);
    await context.supabase.from("caring_events").update({ dismissed: true })
      .eq("user_id", context.userId).eq("kind", data.kind).eq("day", today);
    return { ok: true };
  });

/* ---------------- "Plan my day" structured schedule ---------------- */

const Block = z.object({
  start: z.string(),
  end: z.string(),
  title: z.string(),
  kind: z.enum(["task", "meeting", "break", "focus"]),
  reason: z.string(),
});

export const planMyDay = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ start_hour: z.number().min(0).max(23).default(9), end_hour: z.number().min(1).max(24).default(18) }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: tasks } = await context.supabase.from("tasks")
      .select("id,title,priority,estimated_minutes,due_at").eq("user_id", context.userId).neq("status", "done");
    const gateway = getGateway();
    const { output } = await generateText({
      model: gateway(MODEL),
      output: Output.object({ schema: z.object({ blocks: z.array(Block), summary: z.string() }) }),
      prompt: `You are Nova, planning the user's day.

Working hours today: ${data.start_hour}:00 to ${data.end_hour}:00 (local time).
Open tasks (JSON):
${JSON.stringify(tasks ?? [])}

Build a realistic, humane schedule. Include:
- deep focus blocks for high-priority work (45-90 min)
- short breaks between blocks
- buffer for shallow work

For each block set start/end as HH:MM strings, a task or activity title, kind, and a short reason. Return a one-sentence 'summary'.`,
    });
    return output;
  });

/* ---------------- Meeting prep ---------------- */

export const prepForMeeting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ title: z.string(), description: z.string().default("") }).parse(d))
  .handler(async ({ data }) => {
    const gateway = getGateway();
    const { text } = await generateText({
      model: gateway(MODEL),
      prompt: `You are Nova. Prep the user for this meeting in a warm, useful markdown briefing.

Meeting: ${data.title}
Description: ${data.description || "(none)"}

Include: likely agenda, 3-5 talking points, 3 sharp questions to ask, and one thing to watch out for. Keep it short.`,
    });
    return { markdown: text };
  });
