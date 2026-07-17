import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useProposals } from "@/hooks/useProposals";
import StatusBadge from "@/pages/proposals/components/StatusBadge";

const statusTabs = [
  { key: "all", label: "All" },
  { key: "draft", label: "Drafts" },
  { key: "sent", label: "Sent" },
  { key: "accepted", label: "Accepted" },
  { key: "declined", label: "Declined" },
];

export default function ProposalsPage() {
  const navigate = useNavigate();
  const { proposals, isLoading, error, fetchProposals, clientNameMap } = useProposals();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"date" | "amount" | "title">("date");

  const filtered = useMemo(() => {
    let result = [...proposals];
    if (statusFilter !== "all") result = result.filter((p) => p.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((p) => {
        const company = clientNameMap[p.client_id] || "";
        return (
          p.title.toLowerCase().includes(q) ||
          company.toLowerCase().includes(q)
        );
      });
    }
    result.sort((a, b) => {
      if (sortBy === "amount") return b.amount - a.amount;
      if (sortBy === "title") return a.title.localeCompare(b.title);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    return result;
  }, [search, statusFilter, sortBy, proposals, clientNameMap]);

  const counts = useMemo(() => ({
    all: proposals.length,
    draft: proposals.filter((p) => p.status === "draft").length,
    sent: proposals.filter((p) => p.status === "sent").length,
    accepted: proposals.filter((p) => p.status === "accepted").length,
  }), [proposals]);

  const totalValue = useMemo(
    () => proposals.filter((p) => p.status === "accepted").reduce((s, p) => s + p.amount, 0),
    [proposals]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-heading font-semibold text-headline-md text-foreground-950">
            Proposals
          </h2>
          <p className="text-body-md text-foreground-500 mt-1">
            {counts.all} total &middot; {counts.accepted} accepted &middot; ${totalValue.toLocaleString()} won
          </p>
          {error && (
            <p className="text-body-md text-status-deleted mt-1">{error}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {error && (
            <button
              onClick={fetchProposals}
              className="px-4 py-2 rounded-lg border border-background-200 text-sm font-medium text-foreground-600 hover:bg-background-50 transition-colors cursor-pointer whitespace-nowrap"
            >
              Retry
            </button>
          )}
          <button
            onClick={() => navigate("/proposals/new")}
            className="btn-primary inline-flex items-center gap-2 whitespace-nowrap cursor-pointer"
          >
            <span className="w-4 h-4 flex items-center justify-center">
              <i className="ri-add-line" />
            </span>
            New Proposal
          </button>
        </div>
      </div>

      {/* Loading skeleton */}
      {isLoading && (
        <div className="bg-white rounded-xl border border-background-200 overflow-hidden">
          <div className="p-8 space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse flex items-center gap-4">
                <div className="h-4 bg-background-200 rounded w-48" />
                <div className="h-4 bg-background-200 rounded w-24" />
                <div className="h-4 bg-background-200 rounded w-16" />
                <div className="h-4 bg-background-200 rounded w-20 ml-auto" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      {!isLoading && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-1 bg-background-100 rounded-full p-1 overflow-x-auto max-w-full">
            {statusTabs.map((tab) => {
              const isActive = statusFilter === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setStatusFilter(tab.key)}
                  className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
                    isActive
                      ? "bg-white text-foreground-900 shadow-ambient"
                      : "text-foreground-500 hover:text-foreground-700"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center pointer-events-none">
                <i className="ri-search-line text-sm text-foreground-400" />
              </span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search proposals..."
                className="pl-9 pr-4 py-2 rounded-full border border-background-200 bg-white text-sm text-foreground-900 focus:outline-none focus:ring-2 focus:ring-secondary-300 focus:border-transparent w-56"
              />
            </div>

            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="appearance-none pl-3 pr-8 py-2 rounded-full border border-background-200 bg-white text-sm text-foreground-700 focus:outline-none focus:ring-2 focus:ring-secondary-300 focus:border-transparent cursor-pointer"
              >
                <option value="date">Sort: Recent</option>
                <option value="amount">Sort: Amount</option>
                <option value="title">Sort: A—Z</option>
              </select>
              <span className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center pointer-events-none">
                <i className="ri-arrow-down-s-line text-xs text-foreground-400" />
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      {!isLoading && (
        <div className="bg-white rounded-xl border border-background-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-background-200">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-foreground-500 uppercase tracking-wider">Proposal</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-foreground-500 uppercase tracking-wider">Client</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-foreground-500 uppercase tracking-wider">Status</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-foreground-500 uppercase tracking-wider">Amount</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-foreground-500 uppercase tracking-wider">Date</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <div className="text-center py-12">
                        <span className="w-10 h-10 rounded-full bg-background-100 flex items-center justify-center mx-auto mb-2">
                          <i className="ri-file-text-line text-xl text-foreground-400" />
                        </span>
                        <p className="text-sm text-foreground-500">
                          {search.trim() || statusFilter !== "all" ? "No proposals match your filters" : "No proposals yet"}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((proposal) => {
                    const company = clientNameMap[proposal.client_id] || "—";
                    return (
                      <tr
                        key={proposal.id}
                        className="border-b border-background-100 hover:bg-background-50 transition-colors"
                      >
                        <td className="px-5 py-3.5">
                          <Link
                            to={`/proposals/${proposal.id}`}
                            className="text-sm font-semibold text-foreground-900 hover:text-secondary-500"
                          >
                            {proposal.title}
                          </Link>
                        </td>
                        <td className="px-5 py-3.5 text-sm text-foreground-600">
                          {company}
                        </td>
                        <td className="px-5 py-3.5">
                          <StatusBadge status={proposal.status} />
                        </td>
                        <td className="px-5 py-3.5 text-sm font-medium text-foreground-800 text-right tabular-nums">
                          ${proposal.amount.toLocaleString()}
                        </td>
                        <td className="px-5 py-3.5 text-sm text-foreground-500 whitespace-nowrap">
                          {new Date(proposal.created_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </td>
                        <td className="px-5 py-3.5">
                          <Link
                            to={`/proposals/${proposal.id}`}
                            className="text-sm text-secondary-500 hover:text-secondary-600 font-medium whitespace-nowrap"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}