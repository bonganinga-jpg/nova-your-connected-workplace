import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function Markdown({ children }: { children: string }) {
  return (
    <div className="prose prose-sm prose-invert max-w-none prose-headings:font-display prose-headings:text-foreground prose-p:text-foreground/90 prose-strong:text-foreground prose-a:text-[color:var(--nova)] prose-code:text-[color:var(--nova-2)] prose-code:before:content-none prose-code:after:content-none prose-pre:bg-background/60 prose-pre:border prose-pre:border-border/60">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
}
