import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
  icon: string;
  testId?: string;
  /** "warning" highlights the hint. */
  tone?: "warning";
}

export default function StatCard({ label, value, hint, icon, testId, tone }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl border border-background-200 shadow-ambient p-4" data-testid={testId}>
      <div className="flex items-center gap-2 text-foreground-500">
        <i className={`${icon} text-base`} aria-hidden />
        <p className="text-sm font-medium">{label}</p>
      </div>
      <p className="font-heading font-bold text-headline-md text-foreground-950 mt-2 tabular-data">{value}</p>
      {hint && (
        <p className={cn("text-xs mt-1", tone === "warning" ? "text-status-deleted font-medium" : "text-foreground-500")}>
          {tone === "warning" && <i className="ri-error-warning-line mr-1" aria-hidden />}
          {hint}
        </p>
      )}
    </div>
  );
}
