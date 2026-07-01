import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { createClient } from "@supabase/supabase-js";

const SYSTEM_PROMPT = `You are Nova — an intelligent, warm, and proactive workplace assistant.

Personality:
- Calm, thoughtful, a trusted colleague. Never sycophantic. Never "As an AI...".
- Concise by default, expansive when the user wants depth.
- Use markdown for structure. No emoji unless the user uses them first.

Capabilities you can help with directly in this chat:
- Draft or refine emails
- Summarize meeting notes / transcripts
- Turn a mess of tasks into a plan
- Research any topic and pull out insights
- Suggest useful docs, tutorials, or resources when it clearly helps
- Prep the user for meetings (agenda, talking points, questions)
- Recommend focus techniques when workload sounds heavy

When a request would be better served by one of Nova's dedicated tools (Email Generator, Meeting Summarizer, Task Planner, Research Assistant, Focus Mode), you can point the user there.

Care about the human. If the user sounds stretched, gently note it. If they just finished something big, celebrate briefly. Never nag.`;

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authHeader = request.headers.get("authorization");
        const token = authHeader?.replace(/^Bearer\s+/i, "");
        if (!token) return new Response("Unauthorized", { status: 401 });

        const url = process.env.SUPABASE_URL!;
        const anon = process.env.SUPABASE_PUBLISHABLE_KEY!;
        const supabase = createClient(url, anon, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data: userRes, error: userErr } = await supabase.auth.getUser();
        if (userErr || !userRes.user) return new Response("Unauthorized", { status: 401 });
        const userId = userRes.user.id;

        const body = (await request.json()) as { messages: UIMessage[]; threadId?: string };
        if (!Array.isArray(body.messages)) return new Response("Bad request", { status: 400 });

        let threadId = body.threadId;
        if (threadId) {
          const { data: t } = await supabase.from("chat_threads").select("id,user_id").eq("id", threadId).single();
          if (!t || t.user_id !== userId) return new Response("Forbidden", { status: 403 });
        }

        // Persist the newest user message
        const lastUser = [...body.messages].reverse().find((m) => m.role === "user");
        if (lastUser && threadId) {
          await supabase.from("chat_messages").insert({
            thread_id: threadId, user_id: userId, role: "user", parts: lastUser.parts,
          });
        }

        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Nova AI is not configured.", { status: 500 });
        const gateway = createLovableAiGatewayProvider(key);

        const result = streamText({
          model: gateway("google/gemini-3-flash-preview"),
          system: SYSTEM_PROMPT,
          messages: await convertToModelMessages(body.messages),
        });

        return result.toUIMessageStreamResponse({
          originalMessages: body.messages,
          onFinish: async ({ messages }) => {
            const assistant = [...messages].reverse().find((m) => m.role === "assistant");
            if (assistant && threadId) {
              await supabase.from("chat_messages").insert({
                thread_id: threadId, user_id: userId, role: "assistant", parts: assistant.parts,
              });
              await supabase.from("chat_threads").update({ updated_at: new Date().toISOString() })
                .eq("id", threadId).eq("user_id", userId);
            }
          },
        });
      },
    },
  },
});
