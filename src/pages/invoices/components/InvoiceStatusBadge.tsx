const config: Record<string, { label: string; color: string }> = {
  draft: { label: "Draft", color: "#64748B" },
  sent: { label: "Sent", color: "#3B82F6" },
  viewed: { label: "Viewed", color: "#8B5CF6" },
  unpaid: { label: "Unpaid", color: "#F59E0B" },
  overdue: { label: "Overdue", color: "#EF4444" },
  paid: { label: "Paid", color: "#10B981" },
  voided: { label: "Voided", color: "#94A3B8" },
};

interface InvoiceStatusBadgeProps {
  status: string;
  className?: string;
}

export default function InvoiceStatusBadge({ status, className = "" }: InvoiceStatusBadgeProps) {
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

export { config as invoiceStatusConfig };