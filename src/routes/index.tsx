import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Sparkles, Calendar, Mail, Brain, Focus, HeartPulse, MessagesSquare } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Nova — AI Workplace Assistant That Cares" },
      { name: "description", content: "Nova drafts your emails, summarizes meetings, plans your day, and quietly looks out for you. Meet your new AI colleague." },
      { property: "og:title", content: "Nova — AI Workplace Assistant That Cares" },
      { property: "og:description", content: "Nova drafts your emails, summarizes meetings, plans your day, and quietly looks out for you." },
      { property: "og:url", content: "https://nova-caring-companion.lovable.app/" },
    ],
    links: [{ rel: "canonical", href: "https://nova-caring-companion.lovable.app/" }],
  }),
  component: Landing,
});

function Feature({ icon: Icon, title, body }: { icon: React.ComponentType<{ className?: string }>; title: string; body: string }) {
  return (
    <div className="group rounded-2xl border border-border/60 bg-card/60 p-6 card-glow transition-all hover:border-border">
      <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl nova-gradient text-black">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="font-display text-lg font-semibold text-foreground">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}

function Landing() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg nova-gradient" />
          <span className="font-display text-xl font-semibold">Nova</span>
        </div>
        <Link to="/auth" className="inline-flex items-center gap-2 rounded-md border border-border/70 bg-card/60 px-4 py-2 text-sm font-medium hover:bg-accent">
          Sign in <ArrowRight className="h-4 w-4" />
        </Link>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-6 pt-16 pb-24">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/60 px-3 py-1 text-xs text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-[color:var(--nova)]" /> An intelligent workplace companion
            </div>
            <h1 className="font-display text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
              Meet <span className="nova-text">Nova</span>.<br />
              The workday, quietly organized.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Nova drafts your emails, summarizes your meetings, plans your day, and pulls insights from anything you read — then reminds you to take a break. It's not another chatbot. It's a colleague who cares.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link to="/auth" className="inline-flex items-center gap-2 rounded-md nova-gradient px-5 py-2.5 text-sm font-medium text-black transition-opacity hover:opacity-90">
                Get started free <ArrowRight className="h-4 w-4" />
              </Link>
              <a href="#features" className="inline-flex items-center gap-2 rounded-md border border-border/60 bg-card/60 px-5 py-2.5 text-sm font-medium hover:bg-accent">
                Explore what Nova does
              </a>
            </div>
          </div>

          <div className="relative mx-auto mt-20 max-w-4xl">
            <div className="rounded-3xl border border-border/60 bg-card/60 p-8 card-glow">
              <div className="mb-6 flex items-center gap-3">
                <div className="h-9 w-9 rounded-full nova-gradient" />
                <div>
                  <p className="font-display text-lg">Good morning, Bongani.</p>
                  <p className="text-xs text-muted-foreground">1 meeting today · 2 priority tasks · 1 upcoming deadline</p>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-border/50 bg-background/60 p-4">
                  <p className="text-xs text-muted-foreground">Next up</p>
                  <p className="mt-1 text-sm font-medium">Design review with Amara</p>
                  <p className="text-xs text-muted-foreground">in 42 minutes</p>
                </div>
                <div className="rounded-xl border border-border/50 bg-background/60 p-4">
                  <p className="text-xs text-muted-foreground">Focus this week</p>
                  <p className="mt-1 text-sm font-medium">72% through your goals</p>
                  <p className="text-xs text-muted-foreground">two big wins away</p>
                </div>
                <div className="rounded-xl border border-border/50 bg-background/60 p-4">
                  <p className="text-xs text-muted-foreground">Nova suggests</p>
                  <p className="mt-1 text-sm font-medium">Block 90 min for the proposal</p>
                  <p className="text-xs text-muted-foreground">tomorrow looks packed</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="mx-auto max-w-6xl px-6 pb-24">
          <div className="mb-10 max-w-2xl">
            <h2 className="font-display text-3xl font-semibold sm:text-4xl">Everything you keep meaning to automate.</h2>
            <p className="mt-3 text-muted-foreground">Nova connects the dots between your calendar, your inbox, your notes and your thinking — so more of your day is yours.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Feature icon={Mail} title="Smart Email Generator" body="Write the perfect note in seconds — right tone for the right audience, with follow-ups and subject lines that land." />
            <Feature icon={MessagesSquare} title="Meeting Summarizer" body="Paste raw notes. Get an executive summary, decisions, action items and owners — ready to send." />
            <Feature icon={Calendar} title="Intelligent Task Planner" body="Nova blends your tasks with your calendar and builds a realistic day. Priorities shift; the plan follows." />
            <Feature icon={Brain} title="Research Assistant" body="Drop in a link, PDF or long note. Nova extracts the point, the insights, and what to do next." />
            <Feature icon={Focus} title="Focus Mode" body="Choose your work style — deep focus, writing, coding, research — and enter flow with a proper timer." />
            <Feature icon={HeartPulse} title="A Caring Engine" body="Nova notices when you've been heads-down too long, when tomorrow looks brutal, and when to celebrate a win." />
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-6 pb-24 text-center">
          <h2 className="font-display text-3xl font-semibold sm:text-4xl">Technology should help you achieve more without losing yourself.</h2>
          <p className="mt-4 text-muted-foreground">Nova is built on one belief — that a great day of work leaves room for thinking, creativity, collaboration and life. Let's make more of those.</p>
          <div className="mt-8">
            <Link to="/auth" className="inline-flex items-center gap-2 rounded-md nova-gradient px-6 py-3 text-sm font-medium text-black hover:opacity-90">
              Sign in to Nova <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/60 py-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} Nova</span>
          <span>Network · Office · Virtual · Assistant</span>
        </div>
      </footer>
    </div>
  );
}
