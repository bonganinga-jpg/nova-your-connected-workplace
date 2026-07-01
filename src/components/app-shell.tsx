import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, MessagesSquare, Mail, ClipboardList, Calendar, Brain, Focus, Settings, LogOut, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/chat", label: "Chat with Nova", icon: MessagesSquare },
  { to: "/tools/planner", label: "Task Planner", icon: ClipboardList },
  { to: "/tools/email", label: "Email Generator", icon: Mail },
  { to: "/tools/meeting", label: "Meeting Summarizer", icon: Calendar },
  { to: "/tools/research", label: "Research Assistant", icon: Brain },
  { to: "/focus", label: "Focus Mode", icon: Focus },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [email, setEmail] = useState<string>("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
  }, []);

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r border-border/60 bg-sidebar px-4 py-6">
        <Link to="/dashboard" className="mb-8 flex items-center gap-2 px-2">
          <div className="h-8 w-8 rounded-lg nova-gradient" />
          <span className="font-display text-xl font-semibold">Nova</span>
        </Link>
        <nav className="flex-1 space-y-1">
          {nav.map((item) => {
            const active = pathname === item.to || pathname.startsWith(item.to + "/");
            const Icon = item.icon;
            return (
              <Link key={item.to} to={item.to}
                className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                  active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                }`}>
                <Icon className={`h-4 w-4 ${active ? "text-[color:var(--nova)]" : ""}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-4 space-y-1 border-t border-sidebar-border pt-4">
          <Link to="/settings" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent/60">
            <Settings className="h-4 w-4" /> Settings
          </Link>
          <button onClick={signOut} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent/60">
            <LogOut className="h-4 w-4" /> Sign out
          </button>
          <div className="mt-3 flex items-center gap-2 px-3 text-xs text-muted-foreground">
            <Sparkles className="h-3 w-3 text-[color:var(--nova)]" />
            <span className="truncate">{email}</span>
          </div>
        </div>
      </aside>
      <main className="flex-1 overflow-x-hidden">{children}</main>
    </div>
  );
}
