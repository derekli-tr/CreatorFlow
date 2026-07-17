interface ClientKPICardsProps {
  lifetimeRevenue: number;
  outstandingBalance: number;
  projectCount: number;
  activeProjectCount: number;
  invoiceCount: number;
  unpaidInvoiceCount: number;
}

export default function ClientKPICards({
  lifetimeRevenue,
  outstandingBalance,
  projectCount,
  activeProjectCount,
  invoiceCount,
  unpaidInvoiceCount,
}: ClientKPICardsProps) {
  const cards = [
    {
      label: "Lifetime Revenue",
      value: `$${lifetimeRevenue.toLocaleString()}`,
      icon: "ri-money-dollar-circle-line",
      color: "#10B981",
      bg: "#10B9810F",
    },
    {
      label: "Outstanding",
      value: `$${outstandingBalance.toLocaleString()}`,
      icon: "ri-time-line",
      color: outstandingBalance > 0 ? "#F59E0B" : "#64748B",
      bg: outstandingBalance > 0 ? "#F59E0B0F" : "#64748B0F",
      attention: outstandingBalance > 0,
    },
    {
      label: "Active Projects",
      value: `${activeProjectCount} of ${projectCount}`,
      icon: "ri-folder-line",
      color: "#3B82F6",
      bg: "#3B82F60F",
    },
    {
      label: "Unpaid Invoices",
      value: `${unpaidInvoiceCount} of ${invoiceCount}`,
      icon: "ri-file-list-3-line",
      color: unpaidInvoiceCount > 0 ? "#EF4444" : "#10B981",
      bg: unpaidInvoiceCount > 0 ? "#EF44440F" : "#10B9810F",
      attention: unpaidInvoiceCount > 0,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((card) => (
        <div
          key={card.label}
          className="bg-white rounded-xl border border-background-200 shadow-ambient p-4 flex flex-col gap-2"
        >
          <div className="flex items-center gap-2">
            <span
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ backgroundColor: card.bg }}
            >
              <i className={card.icon} style={{ color: card.color, fontSize: "16px" }} />
            </span>
            <span className="text-xs font-medium text-foreground-500 whitespace-nowrap">{card.label}</span>
          </div>
          <span className="text-lg font-bold text-foreground-900 tabular-nums">
            {card.value}
          </span>
          {card.attention && (
            <span className="h-1 w-full rounded-full" style={{ backgroundColor: card.color, opacity: 0.2 }} />
          )}
        </div>
      ))}
    </div>
  );
}