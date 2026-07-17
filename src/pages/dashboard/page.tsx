import { Link } from "react-router-dom";
import { useClients } from "@/hooks/useClients";
import { useProjects } from "@/hooks/useProjects";
import { useProposals } from "@/hooks/useProposals";
import { useInvoices } from "@/hooks/useInvoices";
import { useNotifications } from "@/hooks/useNotifications";
import { useCalendarEvents } from "@/hooks/useCalendarEvents";
import { cn } from "@/lib/utils";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function KpiCard({
  label,
  value,
  change,
  changeType,
  icon,
  accent,
}: {
  label: string;
  value: string;
  change: string;
  changeType: "positive" | "negative" | "neutral";
  icon: string;
  accent: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-background-200 shadow-ambient p-5">
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: accent + "15" }}>
          <i className={cn(icon, "text-lg")} style={{ color: accent }} />
        </div>
        <span
          className={cn(
            "text-xs font-semibold px-2 py-1 rounded-full",
            changeType === "positive" && "bg-accent-50 text-accent-700",
            changeType === "negative" && "bg-status-deleted/10 text-status-deleted",
            changeType === "neutral" && "bg-background-100 text-foreground-500"
          )}
        >
          {change}
        </span>
      </div>
      <p className="text-2xl font-bold text-foreground-950 tabular-data">{value}</p>
      <p className="text-sm text-foreground-500 mt-1">{label}</p>
    </div>
  );
}

export default function DashboardPage() {
  const { clients } = useClients();
  const { projects } = useProjects();
  const { proposals } = useProposals();
  const { invoices } = useInvoices();
  const { notifications } = useNotifications();
  const { events: calendarEvents } = useCalendarEvents();

  const totalRevenue = invoices
    .filter((inv) => inv.status === "paid")
    .reduce((sum, inv) => sum + inv.amount, 0);

  const outstandingAmount = invoices
    .filter((inv) => inv.status === "unpaid" || inv.status === "sent")
    .reduce((sum, inv) => sum + inv.amount, 0);

  const activeProjects = projects.filter(
    (p) => p.status === "in_progress"
  ).length;

  const openProposals = proposals.filter(
    (p) => p.status === "sent"
  ).length;

  const upcomingDeadlines = calendarEvents
    .filter((e) => e.type === "deadline")
    .sort(
      (a, b) =>
        new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    )
    .slice(0, 3);

  const recentNotifications = [...notifications]
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    .slice(0, 5);

  const recentClients = [...clients].slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h2 className="font-heading font-semibold text-headline-md text-foreground-950">
          Good afternoon, Alex
        </h2>
        <p className="text-body-md text-foreground-500 mt-1">
          Here&apos;s what&apos;s happening with your freelance business today.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total Revenue (YTD)"
          value={formatCurrency(totalRevenue)}
          change="+12%"
          changeType="positive"
          icon="ri-money-dollar-circle-line"
          accent="#0058be"
        />
        <KpiCard
          label="Active Projects"
          value={activeProjects.toString()}
          change="2 new"
          changeType="positive"
          icon="ri-folder-3-line"
          accent="#03224d"
        />
        <KpiCard
          label="Open Proposals"
          value={openProposals.toString()}
          change="1 pending"
          changeType="neutral"
          icon="ri-file-list-3-line"
          accent="#F59E0B"
        />
        <KpiCard
          label="Outstanding"
          value={formatCurrency(outstandingAmount)}
          change="Due soon"
          changeType="negative"
          icon="ri-bill-line"
          accent="#EF4444"
        />
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column (2/3) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Revenue by client */}
          <div className="bg-white rounded-xl border border-background-200 shadow-ambient p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-semibold text-lg text-foreground-900">
                Revenue by Client
              </h3>
              <Link
                to="/analytics"
                className="text-sm text-secondary-500 hover:text-secondary-600 font-medium"
              >
                View all
              </Link>
            </div>
            <div className="space-y-3">
              {recentClients.map((client) => {
                const clientInvoices = invoices.filter(
                  (inv) =>
                    inv.client_id === client.id && inv.status === "paid"
                );
                const clientRevenue = clientInvoices.reduce(
                  (sum, inv) => sum + inv.amount,
                  0
                );
                const maxRevenue = totalRevenue || 1;
                const pct = (clientRevenue / maxRevenue) * 100;
                return (
                  <div key={client.id}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-foreground-800">
                        {client.company}
                      </span>
                      <span className="text-sm text-foreground-500 tabular-data">
                        {formatCurrency(clientRevenue)}
                      </span>
                    </div>
                    <div className="h-2 bg-background-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-secondary-500 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent projects */}
          <div className="bg-white rounded-xl border border-background-200 shadow-ambient p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-semibold text-lg text-foreground-900">
                Active Projects
              </h3>
              <Link
                to="/projects"
                className="text-sm text-secondary-500 hover:text-secondary-600 font-medium"
              >
                View all
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="table-header">
                    <th className="text-left px-3 py-2 rounded-l-lg">Project</th>
                    <th className="text-left px-3 py-2">Client</th>
                    <th className="text-left px-3 py-2">Status</th>
                    <th className="text-left px-3 py-2">Budget</th>
                    <th className="text-left px-3 py-2 rounded-r-lg">Deadline</th>
                  </tr>
                </thead>
                <tbody>
                  {projects
                    .filter((p) => p.status !== "completed")
                    .slice(0, 5)
                    .map((project) => {
                      const client = clients.find(
                        (c) => c.id === project.client_id
                      );
                      const statusLabels: Record<string, { label: string; color: string }> = {
                        in_progress: { label: "In Progress", color: "#3B82F6" },
                        not_started: { label: "Not Started", color: "#64748B" },
                        on_hold: { label: "On Hold", color: "#F59E0B" },
                      };
                      const status = statusLabels[project.status] || { label: project.status, color: "#64748B" };
                      return (
                        <tr key={project.id} className="table-row">
                          <td className="px-3 py-3">
                            <Link
                              to={`/projects/${project.id}`}
                              className="text-sm font-medium text-foreground-900 hover:text-secondary-500"
                            >
                              {project.title}
                            </Link>
                          </td>
                          <td className="px-3 py-3 text-sm text-foreground-600">
                            {client?.company || "—"}
                          </td>
                          <td className="px-3 py-3">
                            <span
                              className="status-badge"
                              style={{
                                backgroundColor: status.color + "15",
                                color: status.color,
                              }}
                            >
                              {status.label}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-sm text-foreground-700 tabular-data">
                            {formatCurrency(project.budget)}
                          </td>
                          <td className="px-3 py-3 text-sm text-foreground-500">
                            {new Date(project.end_date).toLocaleDateString()}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right column (1/3) */}
        <div className="space-y-6">
          {/* Notifications */}
          <div className="bg-white rounded-xl border border-background-200 shadow-ambient p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-semibold text-lg text-foreground-900">
                Notifications
              </h3>
              <span className="text-xs font-semibold px-2 py-0.5 bg-status-deleted/10 text-status-deleted rounded-full">
                {notifications.filter((n) => !n.read_status).length} new
              </span>
            </div>
            <div className="space-y-3">
              {recentNotifications.map((notif) => (
                <div
                  key={notif.id}
                  className={cn(
                    "p-3 rounded-lg border transition-colors",
                    !notif.read_status
                      ? "bg-background-50 border-background-200"
                      : "bg-white border-transparent"
                  )}
                >
                  <div className="flex items-start gap-2">
                    <div
                      className={cn(
                        "w-2 h-2 rounded-full mt-1.5 shrink-0",
                        !notif.read_status && "bg-secondary-500"
                      )}
                    />
                    <div>
                      <p className="text-sm font-medium text-foreground-800">
                        {notif.title}
                      </p>
                      <p className="text-xs text-foreground-500 mt-0.5 line-clamp-2">
                        {notif.message}
                      </p>
                      <p className="text-xs text-foreground-400 mt-1">
                        {new Date(notif.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Upcoming deadlines */}
          <div className="bg-white rounded-xl border border-background-200 shadow-ambient p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-semibold text-lg text-foreground-900">
                Upcoming Deadlines
              </h3>
              <Link
                to="/calendar"
                className="text-sm text-secondary-500 hover:text-secondary-600 font-medium"
              >
                Calendar
              </Link>
            </div>
            <div className="space-y-3">
              {upcomingDeadlines.map((evt) => (
                <div
                  key={evt.id}
                  className="flex items-start gap-3 p-3 rounded-lg border border-background-100 hover:bg-background-50 transition-colors"
                >
                  <div className="w-9 h-9 rounded-lg bg-primary-50 flex items-center justify-center shrink-0">
                    <i className="ri-calendar-event-line text-primary-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground-800 truncate">
                      {evt.title}
                    </p>
                    <p className="text-xs text-foreground-500 mt-0.5">
                      {new Date(evt.start_time).toLocaleDateString(undefined, {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick actions */}
          <div className="bg-white rounded-xl border border-background-200 shadow-ambient p-5">
            <h3 className="font-heading font-semibold text-lg text-foreground-900 mb-4">
              Quick Actions
            </h3>
            <div className="space-y-2">
              <Link
                to="/proposals"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-background-50 text-sm text-foreground-700 transition-colors"
              >
                <span className="w-8 h-8 rounded-lg bg-secondary-50 flex items-center justify-center">
                  <i className="ri-file-add-line text-secondary-500" />
                </span>
                Create Proposal
              </Link>
              <Link
                to="/invoices"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-background-50 text-sm text-foreground-700 transition-colors"
              >
                <span className="w-8 h-8 rounded-lg bg-accent-50 flex items-center justify-center">
                  <i className="ri-bill-line text-accent-500" />
                </span>
                Send Invoice
              </Link>
              <Link
                to="/clients"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-background-50 text-sm text-foreground-700 transition-colors"
              >
                <span className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center">
                  <i className="ri-user-add-line text-primary-500" />
                </span>
                Add Client
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}