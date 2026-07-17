import { useMemo } from "react";
import { useInvoices } from "@/hooks/useInvoices";
import { useClients } from "@/hooks/useClients";
import { useProjects } from "@/hooks/useProjects";
import { useProposals } from "@/hooks/useProposals";
import { cn } from "@/lib/utils";

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

interface MonthlyBucket {
  month: string;
  revenue: number;
  clientCount: number;
}

function buildMonthlyBuckets(monthsBack: number): MonthlyBucket[] {
  const now = new Date();
  const buckets: MonthlyBucket[] = [];
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({
      month: `${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear().toString().slice(2)}`,
      revenue: 0,
      clientCount: 0,
    });
  }
  return buckets;
}

export default function AnalyticsPage() {
  const { invoices, isLoading: invLoading } = useInvoices();
  const { clients, isLoading: cliLoading } = useClients();
  const { projects, isLoading: prjLoading } = useProjects();
  const { proposals, isLoading: propLoading } = useProposals();

  const isLoading = invLoading || cliLoading || prjLoading || propLoading;

  /* ---- Computed metrics ---- */

  const paidInvoices = useMemo(
    () => invoices.filter((inv) => inv.status === "paid"),
    [invoices]
  );
  const totalRevenue = useMemo(
    () => paidInvoices.reduce((sum, inv) => sum + inv.amount, 0),
    [paidInvoices]
  );
  const outstanding = useMemo(
    () =>
      invoices
        .filter((inv) => inv.status === "unpaid" || inv.status === "sent")
        .reduce((sum, inv) => sum + inv.amount, 0),
    [invoices]
  );
  const avgProjectValue = useMemo(
    () =>
      projects.length > 0
        ? projects.reduce((sum, p) => sum + p.budget, 0) / projects.length
        : 0,
    [projects]
  );
  const collectionRate = useMemo(
    () =>
      totalRevenue + outstanding > 0
        ? Math.round((totalRevenue / (totalRevenue + outstanding)) * 100)
        : 0,
    [totalRevenue, outstanding]
  );

  const activeClients = useMemo(
    () => clients.filter((c) => c.status === "active").length,
    [clients]
  );

  /* ---- Revenue by month (last 6 months from paid invoices) ---- */
  const revenueBuckets = useMemo(() => {
    const buckets = buildMonthlyBuckets(6);
    paidInvoices.forEach((inv) => {
      if (!inv.paid_at) return;
      const d = new Date(inv.paid_at);
      const key = `${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear().toString().slice(2)}`;
      const bucket = buckets.find((b) => b.month === key);
      if (bucket) bucket.revenue += inv.amount;
    });
    return buckets;
  }, [paidInvoices]);

  const maxRevenue = useMemo(
    () => Math.max(...revenueBuckets.map((b) => b.revenue), 1),
    [revenueBuckets]
  );

  /* ---- Client growth (last 6 months cumulative) ---- */
  const clientGrowth = useMemo(() => {
    const buckets = buildMonthlyBuckets(6);
    const sortedClients = [...clients].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    let cumulative = 0;
    buckets.forEach((bucket) => {
      const [m, y] = bucket.month.split(" ");
      const monthIdx = MONTHS_SHORT.indexOf(m);
      const year = 2000 + parseInt(y, 10);

      sortedClients.forEach((c) => {
        const cd = new Date(c.created_at);
        if (cd.getFullYear() === year && cd.getMonth() === monthIdx) {
          cumulative++;
        }
      });

      // Count all clients created up to this bucket
      cumulative = 0;
      sortedClients.forEach((c) => {
        const cd = new Date(c.created_at);
        const bucketDate = new Date(year, monthIdx + 1, 0);
        if (cd <= bucketDate) cumulative++;
      });
      bucket.clientCount = cumulative;
    });
    return buckets;
  }, [clients]);

  const maxClients = useMemo(
    () => Math.max(...clientGrowth.map((b) => b.clientCount), 1),
    [clientGrowth]
  );

  /* ---- Project status distribution ---- */
  const projectStatusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      not_started: 0,
      in_progress: 0,
      completed: 0,
      on_hold: 0,
    };
    projects.forEach((p) => {
      if (counts[p.status] !== undefined) counts[p.status]++;
    });
    return counts;
  }, [projects]);

  const statusLabels: Record<string, { label: string; color: string }> = {
    not_started: { label: "Not Started", color: "#94A3B8" },
    in_progress: { label: "In Progress", color: "#F59E0B" },
    completed: { label: "Completed", color: "#10B981" },
    on_hold: { label: "On Hold", color: "#EF4444" },
  };

  /* ---- Proposal funnel ---- */
  const proposalFunnel = useMemo(() => {
    const total = proposals.length;
    const sent = proposals.filter((p) => p.status === "sent" || (p.status as string) === "viewed" || p.status === "accepted" || p.status === "declined").length;
    const viewed = proposals.filter((p) => p.viewed_at).length;
    const accepted = proposals.filter((p) => p.status === "accepted").length;
    const declined = proposals.filter((p) => p.status === "declined").length;
    return { total, sent, viewed, accepted, declined };
  }, [proposals]);

  const funnelSteps = [
    { label: "Created", count: proposalFunnel.total, max: proposalFunnel.total || 1 },
    { label: "Sent", count: proposalFunnel.sent, max: proposalFunnel.total || 1 },
    { label: "Viewed", count: proposalFunnel.viewed, max: proposalFunnel.total || 1 },
    { label: "Accepted", count: proposalFunnel.accepted, max: proposalFunnel.total || 1 },
    { label: "Declined", count: proposalFunnel.declined, max: proposalFunnel.total || 1 },
  ];

  /* ---- Client revenue breakdown ---- */
  const clientBreakdown = useMemo(() => {
    return clients
      .map((client) => {
        const clientInvoices = invoices.filter(
          (inv) => inv.client_id === client.id && inv.status === "paid"
        );
        const clientProjects = projects.filter((p) => p.client_id === client.id);
        const clientRevenue = clientInvoices.reduce((sum, inv) => sum + inv.amount, 0);
        return {
          id: client.id,
          company: client.company,
          name: client.name,
          projects: clientProjects.length,
          invoices: clientInvoices.length,
          revenue: clientRevenue,
        };
      })
      .filter((c) => c.revenue > 0 || c.projects > 0)
      .sort((a, b) => b.revenue - a.revenue);
  }, [clients, invoices, projects]);

  /* ---- Loading state ---- */
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-background-200 rounded w-32" />
          <div className="h-4 bg-background-200 rounded w-48" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28 bg-background-200 rounded-xl" />
            ))}
          </div>
          <div className="h-80 bg-background-200 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="font-heading font-semibold text-headline-md text-foreground-950">
          Analytics
        </h2>
        <p className="text-body-md text-foreground-500 mt-1">
          Business insights from your live data
        </p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total Revenue"
          value={`$${totalRevenue.toLocaleString()}`}
          subtitle={`${paidInvoices.length} paid invoices`}
          valueClass="text-foreground-950"
        />
        <KpiCard
          label="Outstanding"
          value={`$${outstanding.toLocaleString()}`}
          subtitle={`${invoices.filter((i) => i.status === "unpaid" || i.status === "sent").length} pending`}
          valueClass="text-amber-500"
        />
        <KpiCard
          label="Avg Project Value"
          value={`$${Math.round(avgProjectValue).toLocaleString()}`}
          subtitle={`${projects.length} total projects`}
          valueClass="text-foreground-950"
        />
        <KpiCard
          label="Collection Rate"
          value={`${collectionRate}%`}
          subtitle={`${activeClients} active clients`}
          valueClass="text-accent-500"
        />
      </div>

      {/* Revenue Chart + Project Status side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue bar chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-background-200 shadow-ambient p-5">
          <h3 className="font-heading font-semibold text-base text-foreground-900 mb-5">
            Monthly Revenue
          </h3>
          {revenueBuckets.every((b) => b.revenue === 0) ? (
            <div className="h-56 flex items-center justify-center text-sm text-foreground-400">
              <div className="text-center">
                <span className="w-10 h-10 rounded-full bg-background-100 flex items-center justify-center mx-auto mb-2">
                  <i className="ri-bar-chart-line text-foreground-300" />
                </span>
                <p>No paid invoices yet. Revenue data will appear here once payments come in.</p>
              </div>
            </div>
          ) : (
            <div className="h-56 flex items-end gap-3 px-1">
              {revenueBuckets.map((b) => {
                const height = (b.revenue / maxRevenue) * 100;
                return (
                  <div key={b.month} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                    <div className="w-full flex flex-col items-center relative group">
                      <div className="absolute -top-9 left-1/2 -translate-x-1/2 bg-foreground-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                        ${b.revenue.toLocaleString()}
                      </div>
                      <div
                        className="w-full bg-secondary-200 rounded-t-md hover:bg-secondary-300 transition-colors min-h-[4px]"
                        style={{ height: `${Math.max(height, 2)}%` }}
                      />
                    </div>
                    <span className="text-xs text-foreground-400 font-medium">
                      {b.month}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Project status distribution */}
        <div className="bg-white rounded-xl border border-background-200 shadow-ambient p-5">
          <h3 className="font-heading font-semibold text-base text-foreground-900 mb-5">
            Project Status
          </h3>
          {projects.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-sm text-foreground-400 text-center">
              <div>
                <span className="w-10 h-10 rounded-full bg-background-100 flex items-center justify-center mx-auto mb-2">
                  <i className="ri-folder-line text-foreground-300" />
                </span>
                <p>No projects yet</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(projectStatusCounts).map(([status, count]) => {
                const cfg = statusLabels[status];
                const pct = projects.length > 0 ? Math.round((count / projects.length) * 100) : 0;
                return (
                  <div key={status}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium text-foreground-700">{cfg.label}</span>
                      <span className="text-sm text-foreground-500 tabular-nums">{count} ({pct}%)</span>
                    </div>
                    <div className="h-2.5 bg-background-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: cfg.color,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
              <div className="pt-3 border-t border-background-100 mt-3">
                <p className="text-xs text-foreground-400">
                  <strong className="text-foreground-600">{projects.length}</strong> total projects
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Client Growth + Proposal Funnel side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Client growth */}
        <div className="bg-white rounded-xl border border-background-200 shadow-ambient p-5">
          <h3 className="font-heading font-semibold text-base text-foreground-900 mb-5">
            Client Growth
          </h3>
          {clients.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-sm text-foreground-400 text-center">
              <div>
                <span className="w-10 h-10 rounded-full bg-background-100 flex items-center justify-center mx-auto mb-2">
                  <i className="ri-user-add-line text-foreground-300" />
                </span>
                <p>No clients yet</p>
              </div>
            </div>
          ) : (
            <div className="h-48 flex items-end gap-3 px-1">
              {clientGrowth.map((b, i) => {
                const height = (b.clientCount / maxClients) * 100;
                const prevCount = i > 0 ? clientGrowth[i - 1].clientCount : 0;
                return (
                  <div key={b.month} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                    <div className="w-full flex flex-col items-center relative group">
                      <div className="absolute -top-9 left-1/2 -translate-x-1/2 bg-foreground-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                        {b.clientCount} client{b.clientCount !== 1 ? "s" : ""}{" "}
                        {prevCount > 0 && b.clientCount > prevCount
                          ? `(+${b.clientCount - prevCount})`
                          : ""}
                      </div>
                      <div
                        className="w-full bg-accent-200 rounded-t-md hover:bg-accent-300 transition-colors min-h-[4px]"
                        style={{ height: `${Math.max(height, 2)}%` }}
                      />
                    </div>
                    <span className="text-xs text-foreground-400 font-medium">
                      {b.month}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
          <div className="mt-4 pt-3 border-t border-background-100 flex items-center justify-between text-xs text-foreground-400">
            <span>
              <strong className="text-foreground-600">{clients.length}</strong> total clients
            </span>
            <span>
              <strong className="text-foreground-600">{activeClients}</strong> active
            </span>
          </div>
        </div>

        {/* Proposal funnel */}
        <div className="bg-white rounded-xl border border-background-200 shadow-ambient p-5">
          <h3 className="font-heading font-semibold text-base text-foreground-900 mb-5">
            Proposal Funnel
          </h3>
          {proposals.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-sm text-foreground-400 text-center">
              <div>
                <span className="w-10 h-10 rounded-full bg-background-100 flex items-center justify-center mx-auto mb-2">
                  <i className="ri-file-text-line text-foreground-300" />
                </span>
                <p>No proposals yet</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {funnelSteps.map((step) => {
                const pct = Math.round((step.count / step.max) * 100);
                const isLast = step.label === "Declined";
                return (
                  <div key={step.label} className="flex items-center gap-3">
                    <span className="text-sm text-foreground-600 w-16 shrink-0 font-medium">
                      {step.label}
                    </span>
                    <div className="flex-1 h-6 bg-background-100 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full flex items-center justify-end pr-2 transition-all duration-500",
                          step.label === "Declined"
                            ? "bg-red-400"
                            : step.label === "Accepted"
                            ? "bg-emerald-400"
                            : step.label === "Viewed"
                            ? "bg-violet-400"
                            : step.label === "Sent"
                            ? "bg-amber-400"
                            : "bg-secondary-400"
                        )}
                        style={{ width: `${Math.max(pct, 3)}%` }}
                      >
                        {pct >= 15 && (
                          <span className="text-xs text-white font-semibold">{step.count}</span>
                        )}
                      </div>
                    </div>
                    {pct < 15 && (
                      <span className="text-xs text-foreground-500 w-8 text-right tabular-nums">
                        {step.count}
                      </span>
                    )}
                  </div>
                );
              })}
              <div className="pt-3 border-t border-background-100 mt-3">
                <p className="text-xs text-foreground-400">
                  {proposalFunnel.accepted > 0 && proposalFunnel.sent > 0 ? (
                    <>
                      <strong className="text-accent-500">{Math.round((proposalFunnel.accepted / proposalFunnel.sent) * 100)}%</strong> close rate
                      {" "}&middot;{" "}
                    </>
                  ) : null}
                  <strong className="text-foreground-600">{proposals.length}</strong> total proposals
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Client Revenue Breakdown Table */}
      <div className="bg-white rounded-xl border border-background-200 shadow-ambient p-5">
        <h3 className="font-heading font-semibold text-base text-foreground-900 mb-5">
          Client Revenue Breakdown
        </h3>
        {clientBreakdown.length === 0 ? (
          <div className="py-10 text-center text-sm text-foreground-400">
            <span className="w-10 h-10 rounded-full bg-background-100 flex items-center justify-center mx-auto mb-2">
              <i className="ri-money-dollar-circle-line text-foreground-300" />
            </span>
            <p>No paid invoices yet. Revenue per client will appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-background-100">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-foreground-400 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-foreground-400 uppercase tracking-wider">
                    Projects
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-foreground-400 uppercase tracking-wider">
                    Paid Invoices
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-foreground-400 uppercase tracking-wider">
                    Revenue
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-foreground-400 uppercase tracking-wider">
                    Share
                  </th>
                </tr>
              </thead>
              <tbody>
                {clientBreakdown.map((client) => {
                  const pct =
                    totalRevenue > 0
                      ? Math.round((client.revenue / totalRevenue) * 100)
                      : 0;
                  return (
                    <tr
                      key={client.id}
                      className="border-b border-background-50 hover:bg-background-50/50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-foreground-800">
                          {client.company || client.name}
                        </p>
                        {client.company && client.name && (
                          <p className="text-xs text-foreground-400">{client.name}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-foreground-600 tabular-nums">
                        {client.projects}
                      </td>
                      <td className="px-4 py-3 text-sm text-foreground-600 tabular-nums">
                        {client.invoices}
                      </td>
                      <td className="px-4 py-3 text-sm text-foreground-700 text-right tabular-nums font-medium">
                        ${client.revenue.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="h-1.5 bg-background-100 rounded-full w-20">
                            <div
                              className="h-full bg-secondary-400 rounded-full"
                              style={{ width: `${Math.max(pct, 2)}%` }}
                            />
                          </div>
                          <span className="text-xs text-foreground-500 w-8 text-right tabular-nums">
                            {pct}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---- KPI Card ---- */
function KpiCard({
  label,
  value,
  subtitle,
  valueClass,
}: {
  label: string;
  value: string;
  subtitle: string;
  valueClass: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-background-200 shadow-ambient p-5">
      <p className="text-sm text-foreground-500">{label}</p>
      <p className={cn("text-2xl font-bold mt-1 tabular-nums", valueClass)}>{value}</p>
      <p className="text-xs text-foreground-400 mt-2">{subtitle}</p>
    </div>
  );
}