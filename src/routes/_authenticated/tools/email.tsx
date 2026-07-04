import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { generateEmail } from "@/lib/nova.functions";
import { Sparkles, Loader2, Copy } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/tools/email")({
  head: () => ({ meta: [{ title: "Smart Email — Nova" }, { name: "robots", content: "noindex" }] }),
  component: EmailPage,
});

function EmailPage() {
  const [purpose, setPurpose] = useState("");
  const [recipient, setRecipient] = useState<"client" | "manager" | "colleague" | "supplier" | "other">("client");
  const [tone, setTone] = useState<"formal" | "friendly" | "persuasive" | "concise">("friendly");
  const [keyPoints, setKeyPoints] = useState("");
  const [thread, setThread] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ subject: string; body: string } | null>(null);

  const run = async (variation?: string) => {
    if (!purpose.trim()) return;
    setBusy(true);
    try {
      const r = await generateEmail({ data: { purpose, recipient_type: recipient, tone, key_points: keyPoints, prior_thread: thread, variation } });
      setResult({ subject: r.subject, body: r.body });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Couldn't draft"); }
    finally { setBusy(false); }
  };

  const copy = (text: string) => { navigator.clipboard.writeText(text); toast.success("Copied"); };

  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <h1 className="font-display text-3xl">Smart email</h1>
      <p className="mt-1 text-muted-foreground">Tell Nova the intent — get a polished draft.</p>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card className="space-y-4 p-6">
          <div><Label>Purpose</Label>
            <Textarea rows={3} placeholder="e.g. Follow up with Priya about the Q4 pricing proposal we sent last Tuesday."
              value={purpose} onChange={(e) => setPurpose(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Recipient</Label>
              <Select value={recipient} onValueChange={(v) => setRecipient(v as never)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["client","manager","colleague","supplier","other"].map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Tone</Label>
              <Select value={tone} onValueChange={(v) => setTone(v as never)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["formal","friendly","persuasive","concise"].map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div><Label>Key points (optional)</Label>
            <Textarea rows={3} placeholder="One per line" value={keyPoints} onChange={(e) => setKeyPoints(e.target.value)} />
          </div>
          <div><Label>Prior email thread (optional)</Label>
            <Textarea rows={4} placeholder="Paste the last message you're replying to" value={thread} onChange={(e) => setThread(e.target.value)} />
          </div>
          <Button onClick={() => run()} disabled={busy || !purpose.trim()} className="w-full">
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            Draft email
          </Button>
        </Card>

        <Card className="p-6">
          {!result && !busy && <div className="flex h-full min-h-[300px] items-center justify-center text-center text-muted-foreground">Your draft will appear here.</div>}
          {busy && !result && <div className="flex h-full min-h-[300px] items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-[color:var(--nova)]" /></div>}
          {result && (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Subject</Label>
                  <p className="font-medium">{result.subject}</p>
                </div>
                <Button variant="ghost" size="icon" aria-label="Copy email to clipboard" onClick={() => copy(`Subject: ${result.subject}\n\n${result.body}`)}><Copy className="h-4 w-4" /></Button>
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Body</Label>
                <div className="mt-1 whitespace-pre-wrap rounded-lg border border-border/60 bg-background/40 p-4 text-sm">{result.body}</div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" onClick={() => run("Make it shorter.")}>Shorter</Button>
                <Button size="sm" variant="secondary" onClick={() => run("Make it warmer and more personal.")}>Warmer</Button>
                <Button size="sm" variant="secondary" onClick={() => run("Make it more direct and confident.")}>More direct</Button>
                <Button size="sm" variant="secondary" onClick={() => run("Suggest 3 alternate subject lines and pick the best.")}>Better subject</Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
