import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listTasks, updateTask, getProfile, runCaringEngine, dismissNudge, planMyDay } from "@/lib/nova.functions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Sparkles, ArrowRight, X, Clock, TrendingUp, Flame } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
});

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function DashboardPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const profile = useQuery({ queryKey: ["profile"], queryFn: () => getProfile() });
  const tasks = useQuery({ queryKey: ["tasks"], queryFn: () => listTasks() });
  const nudges = useQuery({ queryKey: ["nudges"], queryFn: () => runCaringEngine(), staleTime: 60_000 });
  const [plan, setPlan] = useState<{ blocks: { start: string; end: string; title: string; kind: string; reason: string }[]; summary: string } | null>(null);
  const [planning, setPlanning] = useState(false);

  const toggle = useMutation({
    mutationFn: (t: { id: string; status: string }) =>
      updateTask({ data: { id: t.id, patch: { status: t.status === "done" ? "open" : "done" } } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const dismiss = useMutation({
    mutationFn: (kind: string) => dismissNudge({ data: { kind } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["nudges"] }),
  });

  const priority = useMemo(() =>
    (tasks.data ?? []).filter((t) => t.status !== "done" && t.priority === "high").slice(0, 5), [tasks.data]);
  const open = (tasks.data ?? []).filter((t) => t.status !== "done").length;
  const doneThisWeek = useMemo(() => {
    const weekAgo = Date.now() - 7 * 864e5;
    return (tasks.data ?? []).filter((t) => t.status === "done" && t.completed_at && new Date(t.completed_at).getTime() > weekAgo).length;
  }, [tasks.data]);
  const totalThisWeek = open + doneThisWeek;
  const pct = totalThisWeek ? Math.round((doneThisWeek / totalThisWeek) * 100) : 0;

  const name = profile.data?.display_name?.split(" ")[0] || "there";
  const soon = (tasks.data ?? []).filter((t) => {
    if (!t.due_at) return false;
    const diff = new Date(t.due_at).getTime() - Date.now();
    return diff > 0 && diff < 1000 * 60 * 60 * 24 * 2;
  });

  const doPlan = async () => {
    setPlanning(true);
    try { setPlan(await planMyDay({ data: { start_hour: 9, end_hour: 18 } })); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Nova couldn't plan your day."); }
    finally { setPlanning(false); }
  };

  return (
    <div className="mx-auto max-w-6xl px-8 py-10">
      <header className="mb-8">
        <p className="text-sm text-muted-foreground">{new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</p>
        <h1 className="mt-2 font-display text-4xl">
          {greeting()}, <span className="nova-text">{name}</span>.
        </h1>
        <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
          You have <b className="text-foreground">{open}</b> open task{open === 1 ? "" : "s"}
          {soon.length ? <>, <b className="text-foreground">{soon.length}</b> with a deadline in the next 48h</> : null}.
          You're <b className="nova-text">{pct}%</b> through this week's goals.
        </p>
      </header>

      {(nudges.data?.nudges ?? []).length > 0 && (
        <div className="mb-6 space-y-3">
          {(nudges.data?.nudges ?? []).map((n) => (
            <Card key={n.kind} className="flex items-start justify-between gap-4 border-[color:var(--nova)]/30 bg-gradient-to-br from-[color:var(--nova)]/10 to-transparent p-4">
              <div className="flex gap-3">
                <Sparkles className="mt-1 h-4 w-4 text-[color:var(--nova)]" />
                <div>
                  <p className="font-medium">{n.title}</p>
                  <p className="text-sm text-muted-foreground">{n.body}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {n.cta && n.kind === "deadline_soon" && (
                  <Button size="sm" onClick={doPlan} disabled={planning}>{planning ? "Planning…" : n.cta}</Button>
                )}
                {n.cta && n.kind === "break_reminder" && (
                  <Button size="sm" variant="secondary" onClick={() => navigate({ to: "/focus" })}>{n.cta}</Button>
                )}
                <Button size="icon" variant="ghost" onClick={() => dismiss.mutate(n.kind)}><X className="h-4 w-4" /></Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-xl">Priority today</h2>
            <Button size="sm" variant="ghost" onClick={doPlan} disabled={planning}>
              {planning ? "Planning…" : "Plan my day"} <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
          {priority.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border/60 p-8 text-center">
              <p className="text-muted-foreground">No high-priority tasks. Enjoy the calm — or <Link to="/tools/planner" className="text-[color:var(--nova)] underline">add one</Link>.</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {priority.map((t) => (
                <li key={t.id} className="flex items-center gap-3 rounded-lg border border-border/60 bg-card/40 p-3">
                  <Checkbox checked={t.status === "done"} onCheckedChange={() => toggle.mutate({ id: t.id, status: t.status })} />
                  <div className="min-w-0 flex-1">
                    <p className={`truncate text-sm ${t.status === "done" ? "text-muted-foreground line-through" : ""}`}>{t.title}</p>
                    {t.due_at && <p className="text-xs text-muted-foreground">Due {new Date(t.due_at).toLocaleString()}</p>}
                  </div>
                  <Badge variant="outline" className="border-[color:var(--nova)]/40 text-[color:var(--nova)]">high</Badge>
                </li>
              ))}
            </ul>
          )}

          {plan && (
            <div className="mt-6 rounded-lg border border-[color:var(--nova)]/30 bg-background/40 p-4">
              <p className="mb-3 text-sm text-muted-foreground">{plan.summary}</p>
              <ul className="space-y-2">
                {plan.blocks.map((b, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm">
                    <span className="w-24 shrink-0 font-mono text-xs text-muted-foreground">{b.start}–{b.end}</span>
                    <div>
                      <p><b>{b.title}</b> <Badge variant="secondary" className="ml-1 text-[10px]">{b.kind}</Badge></p>
                      <p className="text-xs text-muted-foreground">{b.reason}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>

        <div className="space-y-6">
          <Card className="p-6">
            <div className="mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-[color:var(--nova)]" />
              <h3 className="font-medium">This week</h3>
            </div>
            <div className="mb-2 flex items-end gap-2">
              <span className="font-display text-4xl">{pct}%</span>
              <span className="mb-1 text-sm text-muted-foreground">complete</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full nova-gradient" style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-3 text-xs text-muted-foreground">{doneThisWeek} done · {open} open</p>
          </Card>

          <Card className="p-6">
            <div className="mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4 text-[color:var(--nova)]" />
              <h3 className="font-medium">Quick actions</h3>
            </div>
            <div className="grid gap-2">
              <Button variant="secondary" asChild><Link to="/chat"><Sparkles className="mr-2 h-4 w-4" />Ask Nova anything</Link></Button>
              <Button variant="secondary" asChild><Link to="/tools/email">Draft an email</Link></Button>
              <Button variant="secondary" asChild><Link to="/tools/meeting">Summarize a meeting</Link></Button>
              <Button variant="secondary" asChild><Link to="/focus"><Flame className="mr-2 h-4 w-4" />Enter focus mode</Link></Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
