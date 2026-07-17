const config: Record<string, { label: string; color: string }> = {
  draft: { label: "Draft", color: "#64748B" },
  sent: { label: "Sent", color: "#3B82F6" },
  viewed: { label: "Viewed", color: "#8B5CF6" },
  accepted: { label: "Accepted", color: "#10B981" },
  declined: { label: "Declined", color: "#EF4444" },
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export default function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  const cfg = config[status] || config.draft;
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${className}`}
      style={{ backgroundColor: cfg.color + "15", color: cfg.color }}
    >
      {cfg.label}
    </span>
  );
}

export { config as proposalStatusConfig };