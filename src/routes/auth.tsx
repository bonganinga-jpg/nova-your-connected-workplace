import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { toast } from "sonner";
import { ArrowLeft, Sparkles } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in — Nova" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: `${window.location.origin}/dashboard`, data: { full_name: displayName } },
        });
        if (error) throw error;
        toast.success("Welcome to Nova.");
        navigate({ to: "/dashboard", replace: true });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/dashboard", replace: true });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally { setLoading(false); }
  };

  const googleSignIn = async () => {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) { toast.error("Google sign-in failed"); setLoading(false); return; }
    if (result.redirected) return;
    navigate({ to: "/dashboard", replace: true });
  };

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-6xl px-6 py-6">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
      </div>
      <div className="mx-auto flex max-w-md flex-col px-6 py-10">
        <div className="mb-8 flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg nova-gradient" />
          <span className="font-display text-2xl font-semibold">Nova</span>
        </div>
        <h1 className="font-display text-3xl font-semibold">
          {mode === "signin" ? "Welcome back." : "Meet Nova."}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {mode === "signin" ? "Sign in to continue where you left off." : "Create your account. Nova will take it from there."}
        </p>

        <button
          onClick={googleSignIn}
          disabled={loading}
          className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-md border border-border/70 bg-card/60 px-4 py-2.5 text-sm font-medium hover:bg-accent disabled:opacity-60"
        >
          <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#EA4335" d="M12 5.4c1.7 0 3.2.6 4.4 1.7l3.3-3.3C17.7 1.9 15 1 12 1 7.4 1 3.5 3.6 1.6 7.5l3.8 3C6.4 7.5 8.9 5.4 12 5.4z"/><path fill="#4285F4" d="M23 12.2c0-.8-.1-1.5-.2-2.2H12v4.2h6.2c-.3 1.4-1.1 2.6-2.3 3.4l3.7 2.9c2.2-2 3.4-4.9 3.4-8.3z"/><path fill="#FBBC05" d="M5.4 14.5c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2l-3.8-3C.6 9.2 0 11 0 13s.6 3.8 1.6 5.5l3.8-3z"/><path fill="#34A853" d="M12 25c3.2 0 5.9-1.1 7.9-2.9l-3.7-2.9c-1 .7-2.4 1.2-4.2 1.2-3.1 0-5.7-2.1-6.6-4.9l-3.8 3C3.5 22.4 7.4 25 12 25z"/></svg>
          Continue with Google
        </button>

        <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
          <div className="h-px flex-1 bg-border/60" /> or <div className="h-px flex-1 bg-border/60" />
        </div>

        <form onSubmit={submit} className="space-y-3">
          {mode === "signup" && (
            <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} required placeholder="What should Nova call you?"
              className="w-full rounded-md border border-input bg-card/40 px-3 py-2.5 text-sm outline-none focus:border-[color:var(--nova)]" />
          )}
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@work.com"
            className="w-full rounded-md border border-input bg-card/40 px-3 py-2.5 text-sm outline-none focus:border-[color:var(--nova)]" />
          <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password"
            className="w-full rounded-md border border-input bg-card/40 px-3 py-2.5 text-sm outline-none focus:border-[color:var(--nova)]" />
          <button type="submit" disabled={loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md nova-gradient px-4 py-2.5 text-sm font-medium text-black hover:opacity-90 disabled:opacity-60">
            <Sparkles className="h-4 w-4" /> {loading ? "Working…" : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>

        <button onClick={() => setMode(mode === "signin" ? "signup" : "signin")} className="mt-6 text-center text-sm text-muted-foreground hover:text-foreground">
          {mode === "signin" ? "New here? Create an account" : "Already have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}
