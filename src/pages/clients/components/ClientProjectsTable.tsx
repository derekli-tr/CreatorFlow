import { Link } from "react-router-dom";

interface Project {
  id: string;
  client_id: string;
  title: string;
  status: string;
  start_date: string;
  end_date: string;
  budget: number;
}

interface ClientProjectsTableProps {
  projects: Project[];
}

const statusConfig: Record<string, { label: string; bg: string; color: string }> = {
  not_started: { label: "Not Started", bg: "#64748B15", color: "#64748B" },
  in_progress: { label: "In Progress", bg: "#3B82F615", color: "#3B82F6" },
  completed: { label: "Completed", bg: "#10B98115", color: "#10B981" },
  on_hold: { label: "On Hold", bg: "#F59E0B15", color: "#F59E0B" },
};

export default function ClientProjectsTable({ projects }: ClientProjectsTableProps) {
  if (projects.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-background-200 shadow-ambient p-5">
        <h3 className="font-heading font-semibold text-lg text-foreground-900 mb-4">Projects</h3>
        <div className="text-center py-8">
          <span className="w-10 h-10 rounded-full bg-background-100 flex items-center justify-center mx-auto mb-2">
            <i className="ri-folder-open-line text-xl text-foreground-400" />
          </span>
          <p className="text-sm text-foreground-500">No projects linked to this client</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-background-200 shadow-ambient overflow-hidden">
      <div className="p-5 pb-3 flex items-center justify-between">
        <h3 className="font-heading font-semibold text-lg text-foreground-900">Projects</h3>
        <span className="text-xs text-foreground-400">{projects.length} total</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-t border-background-200">
              <th className="text-left px-5 py-2.5 text-xs font-semibold text-foreground-500 uppercase tracking-wider">Project</th>
              <th className="text-left px-5 py-2.5 text-xs font-semibold text-foreground-500 uppercase tracking-wider">Status</th>
              <th className="text-left px-5 py-2.5 text-xs font-semibold text-foreground-500 uppercase tracking-wider">Timeline</th>
              <th className="text-right px-5 py-2.5 text-xs font-semibold text-foreground-500 uppercase tracking-wider">Budget</th>
              <th className="px-5 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {projects.map((p) => {
              const sc = statusConfig[p.status] || statusConfig.not_started;
              return (
                <tr key={p.id} className="border-t border-background-100 hover:bg-background-50 transition-colors">
                  <td className="px-5 py-3">
                    <Link
                      to={`/projects/${p.id}`}
                      className="text-sm font-medium text-foreground-900 hover:text-secondary-500"
                    >
                      {p.title}
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
                  <td className="px-5 py-3 text-sm text-foreground-500 whitespace-nowrap">
                    {new Date(p.start_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    {" — "}
                    {new Date(p.end_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </td>
                  <td className="px-5 py-3 text-sm font-medium text-foreground-800 text-right tabular-nums">
                    ${p.budget.toLocaleString()}
                  </td>
                  <td className="px-5 py-3">
                    <Link
                      to={`/projects/${p.id}`}
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