import type { Banknote, LucideIcon } from "lucide-react";

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
}: {
  label: string;
  value: string;
  detail: string;
  icon: typeof Banknote;
  accent: "green" | "blue" | "violet" | "amber";
}) {
  const accentStyles = {
    green: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    blue: "bg-accent/10 text-accent",
    violet: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
    amber: "bg-amber-500/10 text-amber-800 dark:text-amber-300",
  }[accent];

  return (
    <article className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="mt-3 truncate text-2xl font-bold tracking-tight text-foreground">
            {value}
          </p>
          <p className="mt-1 truncate text-xs text-muted-foreground">{detail}</p>
        </div>
        <span className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${accentStyles}`}>
          <Icon className="size-5" aria-hidden="true" />
        </span>
      </div>
      <div className="absolute -bottom-8 -right-6 size-24 rounded-full bg-current opacity-[0.03]" />
    </article>
  );
}
