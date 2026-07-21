import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useClients } from "@/hooks/useClients";
import { useProjects } from "@/hooks/useProjects";
import { useInvoices } from "@/hooks/useInvoices";
import AddClientModal from "./components/AddClientModal";

type SortKey = "name" | "company" | "revenue" | "last_contacted";
type SortDir = "asc" | "desc";

const statusConfig: Record<string, { label: string; bg: string; color: string }> = {
  active: { label: "Active", bg: "#10B98115", color: "#10B981" },
  inactive: { label: "Inactive", bg: "#F59E0B15", color: "#F59E0B" },
  lead: { label: "Lead", bg: "#64748B15", color: "#64748B" },
};

export default function ClientsPage() {
  const { clients, isLoading, error, fetchClients, createClient } = useClients();
  const [showAddModal, setShowAddModal] = useState(false);
  const { projects } = useProjects();
  const { invoices } = useInvoices();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const filtered = useMemo(() => {
    let result = [...clients];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.company.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          c.industry.toLowerCase().includes(q)
      );
    }

    if (statusFilter !== "all") {
      result = result.filter((c) => c.status === statusFilter);
    }

    result.sort((a, b) => {
      let valA: string | number = "";
      let valB: string | number = "";

      switch (sortKey) {
        case "name":
          valA = a.name.toLowerCase();
          valB = b.name.toLowerCase();
          break;
        case "company":
          valA = a.company.toLowerCase();
          valB = b.company.toLowerCase();
          break;
        case "revenue":
          valA = a.lifetime_revenue;
          valB = b.lifetime_revenue;
          break;
        case "last_contacted":
          valA = new Date(a.last_contacted_at).getTime();
          valB = new Date(b.last_contacted_at).getTime();
          break;
      }

      if (valA < valB) return sortDir === "asc" ? -1 : 1;
      if (valA > valB) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [clients, search, statusFilter, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sortIndicator = (key: SortKey) => {
    if (sortKey !== key) return null;
    return sortDir === "asc" ? " \u2191" : " \u2193";
  };

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: clients.length };
    clients.forEach((c) => {
      counts[c.status] = (counts[c.status] || 0) + 1;
    });
    return counts;
  }, [clients]);

  /* Loading state */
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-secondary-300 border-t-secondary-500 rounded-full animate-spin" />
          <p className="text-sm text-foreground-500">Loading clients...</p>
        </div>
      </div>
    );
  }

  /* Error state */
  if (error) {
    return (
      <div className="text-center py-16">
        <span className="w-14 h-14 rounded-full bg-accent-100 flex items-center justify-center mx-auto mb-3">
          <i className="ri-error-warning-line text-2xl text-accent-500" />
        </span>
        <p className="text-foreground-500 font-medium">Failed to load clients</p>
        <p className="text-sm text-foreground-400 mt-1 mb-4">{error}</p>
        <button
          onClick={fetchClients}
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-heading font-semibold text-headline-md text-foreground-950">
            Clients
          </h2>
          <p className="text-body-md text-foreground-500 mt-1">
            {clients.length} total · {clients.filter((c) => c.status === "active").length} active ·{" "}
            {clients.filter((c) => c.status === "lead").length} lead
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-primary-500 text-white text-sm font-semibold hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap"
        >
          <span className="w-4 h-4 flex items-center justify-center">
            <i className="ri-add-line" />
          </span>
          Add Client
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center">
            <i className="ri-search-line text-foreground-400 text-sm" />
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search clients by name, company, email, or industry..."
            className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-background-200 bg-white text-sm text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:ring-2 focus:ring-secondary-300 focus:border-transparent"
          />
        </div>
        <div className="flex items-center gap-1 bg-background-100 rounded-lg p-1">
          {Object.entries(statusCounts).map(([key, count]) => (
            <button
              key={key}
              onClick={() => setStatusFilter(key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                statusFilter === key
                  ? "bg-white text-foreground-900 shadow-sm"
                  : "text-foreground-500 hover:text-foreground-700"
              }`}
            >
              {key === "all" ? "All" : statusConfig[key]?.label || key}
              <span className="ml-1 text-foreground-400">({count})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Results summary */}
      {filtered.length < clients.length && (
        <p className="text-xs text-foreground-400">
          Showing {filtered.length} of {clients.length} clients
        </p>
      )}

      {/* Client Cards Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <span className="w-14 h-14 rounded-full bg-background-100 flex items-center justify-center mx-auto mb-3">
            <i className="ri-user-search-line text-2xl text-foreground-400" />
          </span>
          <p className="text-foreground-500 font-medium">No clients match your search</p>
          <p className="text-sm text-foreground-400 mt-1">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((client) => {
            const clientProjects = projects.filter((p) => p.client_id === client.id);
            const clientRevenue = invoices
              .filter((inv) => inv.client_id === client.id && inv.status === "paid")
              .reduce((sum, inv) => sum + inv.amount, 0);
            const sc = statusConfig[client.status] || statusConfig.lead;

            return (
              <Link
                key={client.id}
                to={`/clients/${client.id}`}
                className="group bg-white rounded-xl border border-background-200 shadow-ambient p-5 hover:border-background-300 transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-background-100 flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-foreground-600">
                        {client.name.charAt(0)}
                        {client.name.split(" ")[1]?.charAt(0) || ""}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground-900 group-hover:text-secondary-500 transition-colors">
                        {client.name}
                      </h3>
                      <p className="text-xs text-foreground-500">{client.company}</p>
                    </div>
                  </div>
                  <span
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold"
                    style={{ backgroundColor: sc.bg, color: sc.color }}
                  >
                    {sc.label}
                  </span>
                </div>

                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs text-foreground-400">{client.industry}</span>
                  <span className="text-foreground-300">·</span>
                  <span className="text-xs text-foreground-400">{client.source}</span>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-background-100">
                  <div className="flex items-center gap-4">
                    <div>
                      <span className="text-[10px] text-foreground-400 uppercase tracking-wider">Revenue</span>
                      <p className="text-sm font-semibold text-foreground-800 tabular-nums">
                        ${client.lifetime_revenue.toLocaleString()}
                      </p>
                    </div>
                    {clientProjects.length > 0 && (
                      <div>
                        <span className="text-[10px] text-foreground-400 uppercase tracking-wider">Projects</span>
                        <p className="text-sm font-semibold text-foreground-800 tabular-nums">
                          {clientProjects.length}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-secondary-500 font-medium">
                    View
                    <span className="w-3.5 h-3.5 flex items-center justify-center">
                      <i className="ri-arrow-right-s-line" />
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Table view */}
      <div className="bg-white rounded-xl border border-background-200 shadow-ambient overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-background-200">
                <th
                  className="text-left px-5 py-3 text-xs font-semibold text-foreground-500 uppercase tracking-wider cursor-pointer hover:text-foreground-700"
                  onClick={() => toggleSort("name")}
                >
                  Client{sortIndicator("name")}
                </th>
                <th
                  className="text-left px-5 py-3 text-xs font-semibold text-foreground-500 uppercase tracking-wider cursor-pointer hover:text-foreground-700"
                  onClick={() => toggleSort("company")}
                >
                  Company{sortIndicator("company")}
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-foreground-500 uppercase tracking-wider">
                  Status
                </th>
                <th
                  className="text-right px-5 py-3 text-xs font-semibold text-foreground-500 uppercase tracking-wider cursor-pointer hover:text-foreground-700"
                  onClick={() => toggleSort("revenue")}
                >
                  Revenue{sortIndicator("revenue")}
                </th>
                <th
                  className="text-left px-5 py-3 text-xs font-semibold text-foreground-500 uppercase tracking-wider cursor-pointer hover:text-foreground-700"
                  onClick={() => toggleSort("last_contacted")}
                >
                  Last Contact{sortIndicator("last_contacted")}
                </th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((client) => {
                const sc = statusConfig[client.status] || statusConfig.lead;

                return (
                  <tr
                    key={client.id}
                    className="border-b border-background-100 hover:bg-background-50 transition-colors"
                  >
                    <td className="px-5 py-3">
                      <Link
                        to={`/clients/${client.id}`}
                        className="text-sm font-medium text-foreground-900 hover:text-secondary-500"
                      >
                        {client.name}
                      </Link>
                      <p className="text-xs text-foreground-400">{client.email}</p>
                    </td>
                    <td className="px-5 py-3 text-sm text-foreground-600">{client.company}</td>
                    <td className="px-5 py-3">
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold"
                        style={{ backgroundColor: sc.bg, color: sc.color }}
                      >
                        {sc.label}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm font-medium text-foreground-800 text-right tabular-nums">
                      ${client.lifetime_revenue.toLocaleString()}
                    </td>
                    <td className="px-5 py-3 text-sm text-foreground-500 whitespace-nowrap">
                      {new Date(client.last_contacted_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </td>
                    <td className="px-5 py-3">
                      <Link
                        to={`/clients/${client.id}`}
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

      <AddClientModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={createClient}
      />
    </div>
  );
}