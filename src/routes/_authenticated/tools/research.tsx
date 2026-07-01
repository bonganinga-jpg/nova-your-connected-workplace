import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Markdown } from "@/components/markdown";
import { runResearch } from "@/lib/nova.functions";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/tools/research")({
  component: ResearchPage,
});

function ResearchPage() {
  const [title, setTitle] = useState("");
  const [mode, setMode] = useState<"text" | "url">("text");
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState<Awaited<ReturnType<typeof runResearch>> | null>(null);

  const run = async () => {
    setBusy(true);
    try {
      const r = await runResearch({ data: {
        title, source_type: mode,
        content: mode === "url" ? url : text,
      } });
      setOut(r);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Research failed"); }
    finally { setBusy(false); }
  };

  const ready = title.trim() && (mode === "text" ? text.trim().length > 20 : /^https?:\/\//.test(url));

  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <h1 className="font-display text-3xl">Research assistant</h1>
      <p className="mt-1 text-muted-foreground">Drop in a URL, article, or notes — get insights, keywords, and takeaways.</p>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card className="space-y-4 p-6">
          <div><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Vector databases overview" /></div>
          <Tabs value={mode} onValueChange={(v) => setMode(v as never)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="text">Paste text</TabsTrigger>
              <TabsTrigger value="url">Fetch URL</TabsTrigger>
            </TabsList>
            <TabsContent value="text"><Textarea rows={14} placeholder="Paste an article, report, or notes…" value={text} onChange={(e) => setText(e.target.value)} /></TabsContent>
            <TabsContent value="url"><Input placeholder="https://…" value={url} onChange={(e) => setUrl(e.target.value)} /></TabsContent>
          </Tabs>
          <Button className="w-full" onClick={run} disabled={busy || !ready}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            Analyze
          </Button>
        </Card>

        <Card className="p-6">
          {!out && !busy && <div className="flex h-full min-h-[300px] items-center justify-center text-muted-foreground">Insights will appear here.</div>}
          {busy && !out && <div className="flex h-full min-h-[300px] items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-[color:var(--nova)]" /></div>}
          {out && (
            <div className="space-y-5">
              <div>
                <p className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">In plain English</p>
                <p className="text-sm">{out.simplified}</p>
              </div>
              <div>
                <p className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Keywords</p>
                <div className="flex flex-wrap gap-1">{out.keywords.map((k) => <Badge key={k} variant="secondary">{k}</Badge>)}</div>
              </div>
              <div>
                <p className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Key insights</p>
                <ul className="list-disc space-y-1 pl-5 text-sm">{out.key_insights.map((i) => <li key={i}>{i}</li>)}</ul>
              </div>
              <div>
                <p className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Takeaways</p>
                <ul className="list-disc space-y-1 pl-5 text-sm">{out.takeaways.map((i) => <li key={i}>{i}</li>)}</ul>
              </div>
              <details><summary className="cursor-pointer text-xs uppercase tracking-wider text-muted-foreground">Full summary</summary>
                <div className="mt-3"><Markdown>{out.summary_md}</Markdown></div>
              </details>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
