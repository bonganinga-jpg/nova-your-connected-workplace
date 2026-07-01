import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Markdown } from "@/components/markdown";
import { summarizeMeeting, importActionItems } from "@/lib/nova.functions";
import { Sparkles, Loader2, ClipboardCheck } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/tools/meeting")({
  component: MeetingPage,
});

type Item = { title: string; owner: string | null; deadline: string | null };

function MeetingPage() {
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState<{ summary_md: string; action_items: Item[] } | null>(null);
  const [picked, setPicked] = useState<Set<number>>(new Set());

  const run = async () => {
    setBusy(true);
    try {
      const r = await summarizeMeeting({ data: { title, notes } });
      setOut({ summary_md: r.summary_md, action_items: r.action_items });
      setPicked(new Set(r.action_items.map((_, i) => i)));
    } catch (e) { toast.error(e instanceof Error ? e.message : "Couldn't summarize"); }
    finally { setBusy(false); }
  };

  const importItems = async () => {
    if (!out) return;
    const items = out.action_items.filter((_, i) => picked.has(i)).map((i) => ({ title: i.title, deadline: i.deadline }));
    const { inserted } = await importActionItems({ data: { items } });
    toast.success(`Added ${inserted} task${inserted === 1 ? "" : "s"} to your planner`);
  };

  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <h1 className="font-display text-3xl">Meeting summarizer</h1>
      <p className="mt-1 text-muted-foreground">Paste raw notes or a transcript — get an executive summary and action items.</p>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card className="space-y-4 p-6">
          <div><Label>Meeting</Label>
            <Input placeholder="e.g. Q4 roadmap review" value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div><Label>Notes or transcript</Label>
            <Textarea rows={16} placeholder="Paste everything here…" value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
          <Button onClick={run} disabled={busy || !title.trim() || notes.trim().length < 20} className="w-full">
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            Summarize
          </Button>
        </Card>

        <Card className="p-6">
          {!out && !busy && <div className="flex h-full min-h-[300px] items-center justify-center text-muted-foreground">Summary will appear here.</div>}
          {busy && !out && <div className="flex h-full min-h-[300px] items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-[color:var(--nova)]" /></div>}
          {out && (
            <div className="space-y-6">
              <Markdown>{out.summary_md}</Markdown>
              {out.action_items.length > 0 && (
                <div>
                  <h3 className="mb-3 font-display text-lg">Action items</h3>
                  <ul className="space-y-2">
                    {out.action_items.map((a, i) => (
                      <li key={i} className="flex items-start gap-3 rounded-lg border border-border/60 bg-card/40 p-3">
                        <Checkbox className="mt-1" checked={picked.has(i)} onCheckedChange={(v) => {
                          const n = new Set(picked); v ? n.add(i) : n.delete(i); setPicked(n);
                        }} />
                        <div className="min-w-0 flex-1 text-sm">
                          <p>{a.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {a.owner ? `Owner: ${a.owner}` : "Owner: unassigned"}
                            {a.deadline ? ` · Due ${new Date(a.deadline).toLocaleDateString()}` : ""}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <Button className="mt-4" onClick={importItems} disabled={picked.size === 0}>
                    <ClipboardCheck className="mr-2 h-4 w-4" />Add {picked.size} to planner
                  </Button>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
