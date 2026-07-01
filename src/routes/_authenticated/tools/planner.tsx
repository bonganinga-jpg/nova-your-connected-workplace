import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listTasks, createTask, updateTask, deleteTask, planMyDay } from "@/lib/nova.functions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus, Sparkles, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/tools/planner")({
  component: PlannerPage,
});

function PlannerPage() {
  const qc = useQueryClient();
  const tasks = useQuery({ queryKey: ["tasks"], queryFn: () => listTasks() });

  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [due, setDue] = useState("");
  const [estimate, setEstimate] = useState("");

  const add = useMutation({
    mutationFn: () => createTask({ data: {
      title, notes: notes || null, priority,
      due_at: due ? new Date(due).toISOString() : null,
      estimated_minutes: estimate ? Number(estimate) : null,
      source: "manual",
    } }),
    onSuccess: () => {
      setTitle(""); setNotes(""); setDue(""); setEstimate(""); setPriority("medium");
      qc.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Task added");
    },
  });

  const upd = useMutation({
    mutationFn: (v: { id: string; patch: { status?: "open" | "in_progress" | "done" } }) => updateTask({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });
  const del = useMutation({
    mutationFn: (id: string) => deleteTask({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const [plan, setPlan] = useState<Awaited<ReturnType<typeof planMyDay>> | null>(null);
  const [planning, setPlanning] = useState(false);
  const doPlan = async () => {
    setPlanning(true);
    try { setPlan(await planMyDay({ data: { start_hour: 9, end_hour: 18 } })); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Couldn't plan"); }
    finally { setPlanning(false); }
  };

  const groups = useMemo(() => {
    const list = tasks.data ?? [];
    const bucket = { high: [] as typeof list, medium: [] as typeof list, low: [] as typeof list, done: [] as typeof list };
    for (const t of list) {
      if (t.status === "done") bucket.done.push(t);
      else bucket[t.priority as "high" | "medium" | "low"].push(t);
    }
    return bucket;
  }, [tasks.data]);

  return (
    <div className="mx-auto max-w-6xl px-8 py-10">
      <header className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl">Task planner</h1>
          <p className="mt-1 text-muted-foreground">Capture the work. Let Nova arrange the day.</p>
        </div>
        <Button onClick={doPlan} disabled={planning || !(tasks.data ?? []).some((t) => t.status !== "done")}>
          {planning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
          Plan my day
        </Button>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-1">
          <h2 className="mb-3 font-medium">Add a task</h2>
          <div className="space-y-3">
            <Input placeholder="What needs doing?" value={title} onChange={(e) => setTitle(e.target.value)} />
            <Textarea placeholder="Notes (optional)" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
            <div className="grid grid-cols-2 gap-2">
              <Select value={priority} onValueChange={(v) => setPriority(v as never)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
              <Input type="number" placeholder="Est. min" value={estimate} onChange={(e) => setEstimate(e.target.value)} />
            </div>
            <Input type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} />
            <Button className="w-full" onClick={() => add.mutate()} disabled={!title.trim() || add.isPending}>
              <Plus className="mr-2 h-4 w-4" />Add task
            </Button>
          </div>

          {plan && (
            <div className="mt-6 rounded-lg border border-[color:var(--nova)]/30 p-3">
              <p className="mb-2 text-sm">{plan.summary}</p>
              <ul className="space-y-2">
                {plan.blocks.map((b, i) => (
                  <li key={i} className="text-sm">
                    <span className="font-mono text-xs text-muted-foreground">{b.start}–{b.end}</span>{" "}
                    <b>{b.title}</b>
                    <p className="text-xs text-muted-foreground">{b.reason}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>

        <div className="lg:col-span-2 space-y-4">
          {(["high", "medium", "low", "done"] as const).map((k) => (
            <Card key={k} className="p-5">
              <h3 className="mb-3 flex items-center gap-2 font-medium capitalize">
                {k === "done" ? "Recently completed" : `${k} priority`}
                <Badge variant="outline" className="text-xs">{groups[k].length}</Badge>
              </h3>
              {groups[k].length === 0 ? (
                <p className="text-sm text-muted-foreground">Nothing here.</p>
              ) : (
                <ul className="space-y-2">
                  {groups[k].map((t) => (
                    <li key={t.id} className="group flex items-start gap-3 rounded-lg border border-border/60 bg-card/40 p-3">
                      <Checkbox className="mt-1" checked={t.status === "done"} onCheckedChange={() => upd.mutate({ id: t.id, patch: { status: t.status === "done" ? "open" : "done" } })} />
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm ${t.status === "done" ? "text-muted-foreground line-through" : ""}`}>{t.title}</p>
                        {t.notes && <p className="mt-1 text-xs text-muted-foreground whitespace-pre-wrap">{t.notes}</p>}
                        <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                          {t.due_at && <span>Due {new Date(t.due_at).toLocaleString()}</span>}
                          {t.estimated_minutes && <span>· ~{t.estimated_minutes} min</span>}
                          {t.source && t.source !== "manual" && <Badge variant="secondary" className="text-[10px]">from {t.source}</Badge>}
                        </div>
                      </div>
                      <button onClick={() => del.mutate(t.id)} className="opacity-0 group-hover:opacity-100"><Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" /></button>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
