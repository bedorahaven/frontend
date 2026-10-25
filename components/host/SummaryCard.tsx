import type { LucideIcon } from "lucide-react";

interface SummaryCardProps {
  label: string;
  value: number | string;
  detail: string;
  icon: LucideIcon;
  accent: "blue" | "green" | "violet" | "amber";
}

export function SummaryCard({
  label,
  value,
  detail,
  icon: Icon,
  accent,
}: SummaryCardProps) {
  const accentStyles = {
    blue: "bg-accent/10 text-accent",
    green: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    violet: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
    amber: "bg-amber-500/10 text-amber-800 dark:text-amber-300",
  }[accent];

  return (
    <article className="group relative overflow-hidden rounded-2xl border border-border/70 bg-card p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-accent/50 hover:shadow-lg">
      <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-primary via-accent to-primary opacity-60 transition-opacity group-hover:opacity-100" />

      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <div
          className={`rounded-xl p-2.5 transition-transform duration-300 group-hover:scale-110 ${accentStyles}`}
        >
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
      </div>

      <div className="mt-5">
        <div className="text-3xl font-extrabold tracking-tight text-foreground">
          {typeof value === "number" ? value.toLocaleString() : value}
        </div>
        <p className="mt-1.5 text-xs text-muted-foreground">{detail}</p>
      </div>
    </article>
  );
}
