import { Link } from "react-router-dom";

interface Invoice {
  id: string;
  client_id: string;
  project_id: string | null;
  invoice_number: string;
  amount: number;
  status: string;
  due_date: string;
  sent_at: string | null;
  paid_at: string | null;
}

interface ClientInvoicesTableProps {
  invoices: Invoice[];
}

const statusConfig: Record<string, { label: string; bg: string; color: string }> = {
  draft: { label: "Draft", bg: "#64748B15", color: "#64748B" },
  sent: { label: "Sent", bg: "#3B82F615", color: "#3B82F6" },
  unpaid: { label: "Unpaid", bg: "#F59E0B15", color: "#F59E0B" },
  paid: { label: "Paid", bg: "#10B98115", color: "#10B981" },
  voided: { label: "Voided", bg: "#94A3B815", color: "#94A3B8" },
  overdue: { label: "Overdue", bg: "#EF444415", color: "#EF4444" },
};

function isOverdue(inv: Invoice): boolean {
  if (inv.status === "paid" || inv.status === "voided" || inv.status === "draft") return false;
  return new Date(inv.due_date) < new Date();
}

export default function ClientInvoicesTable({ invoices }: ClientInvoicesTableProps) {
  const sorted = [...invoices].sort(
    (a, b) => new Date(b.due_date).getTime() - new Date(a.due_date).getTime()
  );

  if (invoices.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-background-200 shadow-ambient p-5">
        <h3 className="font-heading font-semibold text-lg text-foreground-900 mb-4">Invoices</h3>
        <div className="text-center py-8">
          <span className="w-10 h-10 rounded-full bg-background-100 flex items-center justify-center mx-auto mb-2">
            <i className="ri-file-list-3-line text-xl text-foreground-400" />
          </span>
          <p className="text-sm text-foreground-500">No invoices for this client</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-background-200 shadow-ambient overflow-hidden">
      <div className="p-5 pb-3 flex items-center justify-between">
        <h3 className="font-heading font-semibold text-lg text-foreground-900">Invoices</h3>
        <span className="text-xs text-foreground-400">{invoices.length} total</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-t border-background-200">
              <th className="text-left px-5 py-2.5 text-xs font-semibold text-foreground-500 uppercase tracking-wider">Invoice</th>
              <th className="text-left px-5 py-2.5 text-xs font-semibold text-foreground-500 uppercase tracking-wider">Status</th>
              <th className="text-right px-5 py-2.5 text-xs font-semibold text-foreground-500 uppercase tracking-wider">Amount</th>
              <th className="text-left px-5 py-2.5 text-xs font-semibold text-foreground-500 uppercase tracking-wider">Due Date</th>
              <th className="px-5 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {sorted.map((inv) => {
              const overdue = isOverdue(inv);
              const displayStatus = overdue ? "overdue" : inv.status;
              const sc = statusConfig[displayStatus] || statusConfig.draft;
              return (
                <tr key={inv.id} className="border-t border-background-100 hover:bg-background-50 transition-colors">
                  <td className="px-5 py-3">
                    <Link
                      to={`/invoices/${inv.id}`}
                      className="text-sm font-medium text-foreground-900 hover:text-secondary-500"
                    >
                      {inv.invoice_number}
                    </Link>
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold"
                      style={{ backgroundColor: sc.bg, color: sc.color }}
                    >
                      {sc.label}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-sm font-medium text-foreground-800 text-right tabular-nums">
                    ${inv.amount.toLocaleString()}
                  </td>
                  <td className="px-5 py-3 text-sm text-foreground-500 whitespace-nowrap">
                    {new Date(inv.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </td>
                  <td className="px-5 py-3">
                    <Link
                      to={`/invoices/${inv.id}`}
                      className="text-xs text-secondary-500 hover:text-secondary-600 font-medium whitespace-nowrap"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}