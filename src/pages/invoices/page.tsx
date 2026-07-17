import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useInvoices } from "@/hooks/useInvoices";
import { useClients } from "@/hooks/useClients";
import InvoiceStatusBadge from "@/pages/invoices/components/InvoiceStatusBadge";

type InvoiceStatus = "all" | "draft" | "sent" | "unpaid" | "overdue" | "paid" | "voided";
type SortKey = "date" | "amount" | "client" | "status";

const filterTabs: { key: InvoiceStatus; label: string; icon: string }[] = [
  { key: "all", label: "All", icon: "ri-file-list-3-line" },
  { key: "draft", label: "Drafts", icon: "ri-draft-line" },
  { key: "sent", label: "Sent", icon: "ri-send-plane-line" },
  { key: "unpaid", label: "Unpaid", icon: "ri-time-line" },
  { key: "overdue", label: "Overdue", icon: "ri-error-warning-line" },
  { key: "paid", label: "Paid", icon: "ri-check-line" },
  { key: "voided", label: "Voided", icon: "ri-close-circle-line" },
];

export default function InvoicesPage() {
  const { invoices, isLoading, error, fetchInvoices } = useInvoices();
  const { clients } = useClients();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus>("all");
  const [sortBy, setSortBy] = useState<SortKey>("date");
  const [sortAsc, setSortAsc] = useState(false);

  const filtered = useMemo(() => {
    let list = [...invoices];

    if (statusFilter !== "all") {
      list = list.filter((inv) => inv.status === statusFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((inv) => {
        const client = clients.find((c) => c.id === inv.client_id);
        return (
          inv.invoice_number.toLowerCase().includes(q) ||
          (client?.name || "").toLowerCase().includes(q) ||
          (client?.company || "").toLowerCase().includes(q)
        );
      });
    }

    list.sort((a, b) => {
      switch (sortBy) {
        case "date":
          return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * (sortAsc ? 1 : -1);
        case "amount":
          return (a.amount - b.amount) * (sortAsc ? 1 : -1);
        case "client": {
          const ca = clients.find((c) => c.id === a.client_id)?.company || "";
          const cb = clients.find((c) => c.id === b.client_id)?.company || "";
          return ca.localeCompare(cb) * (sortAsc ? 1 : -1);
        }
        case "status":
          return a.status.localeCompare(b.status) * (sortAsc ? 1 : -1);
        default:
          return 0;
      }
    });

    return list;
  }, [invoices, clients, statusFilter, searchQuery, sortBy, sortAsc]);

  const stats = useMemo(() => {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return {
      total: invoices.length,
      outstanding: invoices
        .filter((inv) => inv.status === "unpaid" || inv.status === "overdue")
        .reduce((sum, inv) => sum + inv.amount, 0),
      overdueCount: invoices.filter((inv) => inv.status === "overdue").length,
      paidThisMonth: invoices
        .filter((inv) => inv.status === "paid" && inv.paid_at && new Date(inv.paid_at) >= thisMonth)
        .reduce((sum, inv) => sum + inv.amount, 0),
      draftCount: invoices.filter((inv) => inv.status === "draft").length,
    };
  }, [invoices]);

  const formatCurrency = (val: number) => "$" + val.toLocaleString("en-US", { minimumFractionDigits: 0 });
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "\u2014";
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const toggleSort = (key: SortKey) => {
    if (sortBy === key) setSortAsc(!sortAsc);
    else { setSortBy(key); setSortAsc(false); }
  };

  const SortIcon = ({ active, asc }: { active: boolean; asc: boolean }) => (
    <span className={`inline-flex ml-1 ${active ? "text-secondary-500" : "text-foreground-300"}`}>
      <i className={`text-xs ${active ? (asc ? "ri-sort-asc" : "ri-sort-desc") : "ri-arrow-up-down-line"}`} />
    </span>
  );

  /* Error state */
  if (error) {
    return (
      <div className="text-center py-16">
        <span className="w-14 h-14 rounded-full bg-accent-100 flex items-center justify-center mx-auto mb-3">
          <i className="ri-error-warning-line text-2xl text-accent-500" />
        </span>
        <p className="text-foreground-500 font-medium">Failed to load invoices</p>
        <p className="text-sm text-foreground-400 mt-1 mb-4">{error}</p>
        <button
          onClick={fetchInvoices}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary-500 text-white text-sm font-semibold hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap"
        >
          <span className="w-4 h-4 flex items-center justify-center">
            <i className="ri-refresh-line" />
          </span>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-heading font-semibold text-headline-md text-foreground-950">Invoices</h2>
          <p className="text-body-md text-foreground-500 mt-1">
            {invoices.length} total ·{" "}
            <span className="text-status-unpaid font-medium">
              {formatCurrency(stats.outstanding)} outstanding
            </span>
            {stats.overdueCount > 0 && (
              <span className="text-red-500 font-medium"> · {stats.overdueCount} overdue</span>
            )}
          </p>
        </div>
        <button className="btn-primary whitespace-nowrap">
          <span className="w-4 h-4 flex items-center justify-center">
            <i className="ri-add-line text-sm" />
          </span>
          New Invoice
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-background-200 shadow-ambient p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
              <i className="ri-time-line text-amber-600 text-sm" />
            </div>
            <span className="text-xs text-foreground-400 uppercase tracking-wider font-semibold">Outstanding</span>
          </div>
          <p className="text-xl font-bold text-foreground-950 tabular-data">{formatCurrency(stats.outstanding)}</p>
          {stats.overdueCount > 0 && (
            <p className="text-xs text-red-500 mt-1">{stats.overdueCount} overdue</p>
          )}
        </div>
        <div className="bg-white rounded-xl border border-background-200 shadow-ambient p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
              <i className="ri-check-double-line text-green-600 text-sm" />
            </div>
            <span className="text-xs text-foreground-400 uppercase tracking-wider font-semibold">Paid This Month</span>
          </div>
          <p className="text-xl font-bold text-green-600 tabular-data">{formatCurrency(stats.paidThisMonth)}</p>
        </div>
        <div className="bg-white rounded-xl border border-background-200 shadow-ambient p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
              <i className="ri-draft-line text-slate-600 text-sm" />
            </div>
            <span className="text-xs text-foreground-400 uppercase tracking-wider font-semibold">Drafts</span>
          </div>
          <p className="text-xl font-bold text-foreground-950 tabular-data">{stats.draftCount}</p>
        </div>
        <div className="bg-white rounded-xl border border-background-200 shadow-ambient p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
              <i className="ri-file-list-3-line text-blue-600 text-sm" />
            </div>
            <span className="text-xs text-foreground-400 uppercase tracking-wider font-semibold">Total</span>
          </div>
          <p className="text-xl font-bold text-foreground-950 tabular-data">{stats.total}</p>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="bg-white rounded-xl border border-background-200 shadow-ambient overflow-hidden">
          <div className="p-8 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="animate-pulse flex items-center gap-4">
                <div className="h-4 bg-background-200 rounded w-32" />
                <div className="h-4 bg-background-200 rounded w-24" />
                <div className="h-4 bg-background-200 rounded w-16" />
                <div className="h-4 bg-background-200 rounded w-20" />
                <div className="h-4 bg-background-200 rounded w-20 ml-auto" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search + Filters */}
      {!isLoading && (
        <>
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div className="flex items-center gap-1.5 bg-white border border-background-200 rounded-full px-1 py-1 overflow-x-auto w-full sm:w-auto">
              {filterTabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setStatusFilter(tab.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap cursor-pointer transition-colors ${
                    statusFilter === tab.key
                      ? "bg-secondary-500 text-white"
                      : "text-foreground-500 hover:text-foreground-800 hover:bg-background-50"
                  }`}
                >
                  <span className="w-3.5 h-3.5 flex items-center justify-center">
                    <i className={`${tab.icon} text-[10px]`} />
                  </span>
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-56">
                <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-foreground-400 text-sm" />
                <input
                  type="text"
                  placeholder="Search invoices or clients..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-background-200 rounded-lg bg-white text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:ring-2 focus:ring-secondary-200 focus:border-secondary-300"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-foreground-400 hover:text-foreground-600 cursor-pointer"
                  >
                    <i className="ri-close-line text-sm" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-background-200 shadow-ambient overflow-hidden">
            {filtered.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-background-100 flex items-center justify-center">
                  <i className="ri-file-search-line text-xl text-foreground-400" />
                </div>
                <p className="text-foreground-500 font-medium">No invoices found</p>
                <p className="text-sm text-foreground-400 mt-1">
                  {searchQuery ? "Try adjusting your search or filters." : "Create your first invoice to get started."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="table-header">
                      <th className="text-left px-4 py-3">
                        <button onClick={() => toggleSort("status")} className="text-xs font-semibold text-foreground-500 uppercase tracking-wider hover:text-foreground-800 inline-flex items-center cursor-pointer whitespace-nowrap">
                          Invoice <SortIcon active={sortBy === "status"} asc={sortAsc} />
                        </button>
                      </th>
                      <th className="text-left px-4 py-3">
                        <button onClick={() => toggleSort("client")} className="text-xs font-semibold text-foreground-500 uppercase tracking-wider hover:text-foreground-800 inline-flex items-center cursor-pointer whitespace-nowrap">
                          Client <SortIcon active={sortBy === "client"} asc={sortAsc} />
                        </button>
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-foreground-500 uppercase tracking-wider">Status</th>
                      <th className="text-left px-4 py-3">
                        <button onClick={() => toggleSort("amount")} className="text-xs font-semibold text-foreground-500 uppercase tracking-wider hover:text-foreground-800 inline-flex items-center cursor-pointer whitespace-nowrap">
                          Amount <SortIcon active={sortBy === "amount"} asc={sortAsc} />
                        </button>
                      </th>
                      <th className="text-left px-4 py-3">
                        <button onClick={() => toggleSort("date")} className="text-xs font-semibold text-foreground-500 uppercase tracking-wider hover:text-foreground-800 inline-flex items-center cursor-pointer whitespace-nowrap">
                          Due Date <SortIcon active={sortBy === "date"} asc={sortAsc} />
                        </button>
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-foreground-500 uppercase tracking-wider">Paid</th>
                      <th className="text-right px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((invoice) => {
                      const client = clients.find((c) => c.id === invoice.client_id);
                      const isOverdue = invoice.status === "overdue";
                      return (
                        <tr key={invoice.id} className="table-row group">
                          <td className="px-4 py-3">
                            <Link
                              to={`/invoices/${invoice.id}`}
                              className="text-sm font-semibold text-foreground-900 hover:text-secondary-500 whitespace-nowrap"
                            >
                              {invoice.invoice_number}
                            </Link>
                            <p className="text-xs text-foreground-400 mt-0.5">{formatDate(invoice.created_at)}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-sm font-medium text-foreground-800">{client?.company || "\u2014"}</p>
                            <p className="text-xs text-foreground-400">{client?.name}</p>
                          </td>
                          <td className="px-4 py-3">
                            <InvoiceStatusBadge status={invoice.status} />
                          </td>
                          <td className="px-4 py-3">
                            <p className={`text-sm font-semibold tabular-data ${isOverdue ? "text-red-500" : "text-foreground-800"}`}>
                              {formatCurrency(invoice.amount)}
                            </p>
                          </td>
                          <td className="px-4 py-3">
                            <p className={`text-sm ${isOverdue ? "text-red-500 font-medium" : "text-foreground-600"}`}>
                              {formatDate(invoice.due_date)}
                              {isOverdue && " \u2014 past due"}
                            </p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-sm text-foreground-500">{formatDate(invoice.paid_at)}</p>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Link
                              to={`/invoices/${invoice.id}`}
                              className="text-sm text-secondary-500 hover:text-secondary-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap"
                            >
                              View Details <i className="ri-arrow-right-line text-xs" />
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}