import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { startFocusSession, endFocusSession } from "@/lib/nova.functions";
import { Play, Pause, Square, Coffee } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/focus")({
  component: FocusPage,
});

const PRESETS = [
  { id: "deep", label: "Deep Focus", minutes: 50, tip: "Cave mode. No inputs. One outcome." },
  { id: "creative", label: "Creative Work", minutes: 45, tip: "Loose thinking. Sketch, wander, revise." },
  { id: "reading", label: "Reading", minutes: 30, tip: "One doc, one pen. Highlight sparingly." },
  { id: "writing", label: "Writing", minutes: 45, tip: "Draft first, edit later." },
  { id: "research", label: "Research", minutes: 40, tip: "Follow the thread. Cite as you go." },
  { id: "design", label: "Design", minutes: 60, tip: "Explore three options before you narrow." },
  { id: "coding", label: "Coding", minutes: 50, tip: "Small commits. Tests along the way." },
];

function fmt(s: number) {
  const m = Math.floor(s / 60), r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

function FocusPage() {
  const [preset, setPreset] = useState(PRESETS[0]);
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [break_, setBreak] = useState(false);
  const iv = useRef<number | null>(null);

  const total = (break_ ? 5 : preset.minutes) * 60;
  const remaining = Math.max(0, total - elapsed);

  useEffect(() => {
    if (!running) return;
    iv.current = window.setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => { if (iv.current) window.clearInterval(iv.current); };
  }, [running]);

  useEffect(() => {
    if (elapsed >= total && running) {
      setRunning(false);
      if (!break_) {
        toast.success(`${preset.label} session complete. Nice work.`);
        if (sessionId) endFocusSession({ data: { id: sessionId, duration_seconds: elapsed } }).catch(() => {});
        setSessionId(null);
      } else {
        toast("Break's over — ready for another block?");
      }
    }
  }, [elapsed, total, running, preset.label, break_, sessionId]);

  const start = async () => {
    setElapsed(0); setBreak(false);
    const s = await startFocusSession({ data: { preset: preset.id } });
    setSessionId(s.id);
    setRunning(true);
  };
  const stop = async () => {
    setRunning(false);
    if (sessionId && !break_) {
      await endFocusSession({ data: { id: sessionId, duration_seconds: elapsed || 1 } });
      setSessionId(null);
    }
    setElapsed(0);
  };
  const takeBreak = () => { setBreak(true); setElapsed(0); setRunning(true); };

  const pct = total ? (elapsed / total) * 100 : 0;

  return (
    <div className="mx-auto flex min-h-screen max-w-4xl flex-col items-center px-8 py-12">
      <h1 className="font-display text-3xl">Focus mode</h1>
      <p className="mt-1 text-muted-foreground">{break_ ? "5-minute breather." : preset.tip}</p>

      <div className="relative my-12 flex h-72 w-72 items-center justify-center">
        <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90">
          <circle cx="50" cy="50" r="46" fill="none" stroke="hsl(var(--muted))" strokeWidth="3" />
          <circle cx="50" cy="50" r="46" fill="none" stroke="url(#g)" strokeWidth="3" strokeLinecap="round"
            strokeDasharray={`${(pct / 100) * 289} 289`} />
          <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--nova)" /><stop offset="100%" stopColor="var(--nova-2)" />
          </linearGradient></defs>
        </svg>
        <div className="text-center">
          <p className="font-display text-6xl tabular-nums">{fmt(remaining)}</p>
          <p className="mt-2 text-sm text-muted-foreground">{break_ ? "Break" : preset.label}</p>
        </div>
      </div>

      <div className="mb-8 flex gap-2">
        {!running && <Button size="lg" onClick={start}><Play className="mr-2 h-4 w-4" />{elapsed > 0 ? "Restart" : "Start"}</Button>}
        {running && <Button size="lg" variant="secondary" onClick={() => setRunning(false)}><Pause className="mr-2 h-4 w-4" />Pause</Button>}
        {running && <Button size="lg" variant="ghost" onClick={stop}><Square className="mr-2 h-4 w-4" />End</Button>}
        {!running && elapsed === 0 && <Button size="lg" variant="secondary" onClick={takeBreak}><Coffee className="mr-2 h-4 w-4" />Just a break</Button>}
      </div>

      <Card className="w-full p-4">
        <p className="mb-3 text-sm text-muted-foreground">Work style</p>
        <div className="grid gap-2 sm:grid-cols-3 md:grid-cols-4">
          {PRESETS.map((p) => (
            <button key={p.id} onClick={() => { if (!running) setPreset(p); }} disabled={running}
              className={`rounded-lg border p-3 text-left text-sm transition-colors ${preset.id === p.id ? "border-[color:var(--nova)] bg-[color:var(--nova)]/10" : "border-border/60 hover:border-border"} ${running ? "opacity-50" : ""}`}>
              <p className="font-medium">{p.label}</p>
              <p className="text-xs text-muted-foreground">{p.minutes} min</p>
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}
