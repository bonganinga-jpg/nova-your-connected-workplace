import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { listThreads, createThread, deleteThread, getThreadMessages, renameThread } from "@/lib/nova.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Markdown } from "@/components/markdown";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, Send, Sparkles, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";

const searchSchema = z.object({ thread: z.string().uuid().optional() });

export const Route = createFileRoute("/_authenticated/chat")({
  validateSearch: searchSchema,
  head: () => ({ meta: [{ title: "Chat — Nova" }, { name: "robots", content: "noindex" }] }),
  component: ChatPage,
});

const STARTERS = [
  "Draft a polite follow-up on last week's proposal",
  "Turn these rough notes into action items",
  "Explain OAuth 2.0 like I'm a smart PM",
  "Help me prep for a difficult 1:1",
];

function ChatPage() {
  const { thread: activeId } = useSearch({ from: "/_authenticated/chat" });
  const navigate = useNavigate();
  const qc = useQueryClient();

  const threads = useQuery({ queryKey: ["threads"], queryFn: () => listThreads() });
  const initial = useQuery({
    queryKey: ["thread", activeId],
    queryFn: () => getThreadMessages({ data: { threadId: activeId! } }),
    enabled: !!activeId,
  });

  const [token, setToken] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setToken(data.session?.access_token ?? null));
  }, []);

  const [input, setInput] = useState("");
  const { messages, sendMessage, status, setMessages } = useChat({
    id: activeId ?? "new",
    transport: new DefaultChatTransport({
      api: "/api/chat",
      headers: () => (token ? { Authorization: `Bearer ${token}` } : ({} as Record<string, string>)),
      body: () => ({ threadId: activeId }),
    }),
    onError: (e) => toast.error(e.message || "Nova hit an error."),
  });

  useEffect(() => {
    if (initial.data) {
      setMessages(initial.data.messages.map((m) => ({ id: m.id, role: m.role as "user" | "assistant", parts: m.parts as never })));
    } else if (!activeId) {
      setMessages([]);
    }
  }, [initial.data, activeId, setMessages]);

  const create = useMutation({
    mutationFn: () => createThread({ data: {} }),
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: ["threads"] });
      navigate({ to: "/chat", search: { thread: row.id } });
    },
  });
  const del = useMutation({
    mutationFn: (id: string) => deleteThread({ data: { id } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["threads"] }); if (activeId) navigate({ to: "/chat", search: {} }); },
  });

  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async (text: string) => {
    if (!text.trim() || !token) return;
    let id = activeId;
    if (!id) {
      const row = await createThread({ data: { title: text.slice(0, 60) } });
      qc.invalidateQueries({ queryKey: ["threads"] });
      id = row.id;
      navigate({ to: "/chat", search: { thread: id } });
    } else if (messages.length === 0) {
      renameThread({ data: { id, title: text.slice(0, 60) } }).then(() => qc.invalidateQueries({ queryKey: ["threads"] }));
    }
    setInput("");
    sendMessage({ text }, { body: { threadId: id } });
  };

  const busy = status === "streaming" || status === "submitted";

  return (
    <div className="flex h-screen">
      <h1 className="sr-only">Chat with Nova</h1>
      <div className="flex w-72 shrink-0 flex-col border-r border-border/60 bg-card/30 p-3">
        <Button onClick={() => create.mutate()} className="mb-3" size="sm"><Plus className="mr-2 h-4 w-4" />New chat</Button>
        <div className="flex-1 space-y-1 overflow-y-auto">
          {(threads.data ?? []).map((t) => (
            <div key={t.id} className={`group flex items-center gap-2 rounded-md px-2 py-2 text-sm ${activeId === t.id ? "bg-accent" : "hover:bg-accent/40"}`}>
              <button onClick={() => navigate({ to: "/chat", search: { thread: t.id } })} className="flex-1 truncate text-left">{t.title}</button>
              <button aria-label={`Delete conversation ${t.title}`} onClick={() => del.mutate(t.id)} className="opacity-0 group-hover:opacity-100"><Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" /></button>
            </div>
          ))}
          {(threads.data ?? []).length === 0 && <p className="px-2 py-4 text-xs text-muted-foreground">No conversations yet.</p>}
        </div>
      </div>

      <div className="flex flex-1 flex-col">
        <div className="flex-1 overflow-y-auto px-6 py-8">
          <div className="mx-auto max-w-3xl space-y-6">
            {messages.length === 0 && (
              <div className="pt-12 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl nova-gradient"><Sparkles className="h-6 w-6 text-white" /></div>
                <h2 className="font-display text-3xl">How can I help?</h2>
                <p className="mt-2 text-muted-foreground">Ask a question, drop in notes, or start with one of these.</p>
                <div className="mx-auto mt-6 grid max-w-2xl gap-2 sm:grid-cols-2">
                  {STARTERS.map((s) => (
                    <button key={s} onClick={() => send(s)} className="rounded-lg border border-border/60 bg-card/40 p-3 text-left text-sm hover:border-[color:var(--nova)]/40 hover:bg-card">{s}</button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m) => (
              <Card key={m.id} className={`p-4 ${m.role === "user" ? "bg-card/60" : "bg-transparent border-[color:var(--nova)]/20"}`}>
                <p className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">{m.role === "user" ? "You" : "Nova"}</p>
                {m.parts.map((p, i) => {
                  if (p.type === "text") return <Markdown key={i}>{p.text}</Markdown>;
                  return null;
                })}
              </Card>
            ))}
            {busy && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" />Nova is thinking…</div>}
            <div ref={bottomRef} />
          </div>
        </div>
        <div className="border-t border-border/60 p-4">
          <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="mx-auto flex max-w-3xl gap-2">
            <Textarea
              value={input} onChange={(e) => setInput(e.target.value)}
              placeholder="Message Nova…" rows={1}
              className="min-h-[44px] resize-none"
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
            />
            <Button type="submit" aria-label="Send message" disabled={busy || !input.trim() || !token} size="icon" className="h-11 w-11 shrink-0"><Send className="h-4 w-4" /></Button>
          </form>
        </div>
      </div>
    </div>
  );
}
