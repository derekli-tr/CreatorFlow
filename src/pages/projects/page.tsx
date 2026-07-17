import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useProjects } from "@/hooks/useProjects";
import type { Project } from "@/hooks/useProjects";

const projectStatusConfig: Record<string, { label: string; color: string }> = {
  not_started: { label: "Not Started", color: "#64748B" },
  in_progress: { label: "In Progress", color: "#3B82F6" },
  completed: { label: "Completed", color: "#10B981" },
  on_hold: { label: "On Hold", color: "#F59E0B" },
};

const statusTabs = [
  { key: "all", label: "All" },
  { key: "in_progress", label: "Active" },
  { key: "not_started", label: "Not Started" },
  { key: "completed", label: "Completed" },
  { key: "on_hold", label: "On Hold" },
];

export default function ProjectsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"deadline" | "budget" | "title">("deadline");

  const { projects, isLoading, error, fetchProjects } = useProjects();

  const filtered = useMemo(() => {
    let result = [...projects];
    if (statusFilter !== "all") {
      result = result.filter((p) => p.status === statusFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.clientName.toLowerCase().includes(q)
      );
    }
    result.sort((a, b) => {
      if (sortBy === "deadline") return new Date(a.end_date).getTime() - new Date(b.end_date).getTime();
      if (sortBy === "budget") return b.budget - a.budget;
      return a.title.localeCompare(b.title);
    });
    return result;
  }, [projects, statusFilter, search, sortBy]);

  const counts = useMemo(() => {
    return {
      all: projects.length,
      active: projects.filter((p) => p.status === "in_progress").length,
      completed: projects.filter((p) => p.status === "completed").length,
    };
  }, [projects]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-heading font-semibold text-headline-md text-foreground-950">
            Projects
          </h2>
          <p className="text-body-md text-foreground-500 mt-1">
            {counts.all} total &middot; {counts.active} active &middot; {counts.completed} completed
          </p>
        </div>
        <button className="btn-primary inline-flex items-center gap-2 whitespace-nowrap cursor-pointer">
          <span className="w-4 h-4 flex items-center justify-center">
            <i className="ri-add-line" />
          </span>
          New Project
        </button>
      </div>

      {/* Search + Filter */}
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
              placeholder="Search projects..."
              className="pl-9 pr-4 py-2 rounded-full border border-background-200 bg-white text-sm text-foreground-900 focus:outline-none focus:ring-2 focus:ring-secondary-300 focus:border-transparent w-56"
            />
          </div>

          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="appearance-none pl-3 pr-8 py-2 rounded-full border border-background-200 bg-white text-sm text-foreground-700 focus:outline-none focus:ring-2 focus:ring-secondary-300 focus:border-transparent cursor-pointer"
            >
              <option value="deadline">Sort: Deadline</option>
              <option value="budget">Sort: Budget</option>
              <option value="title">Sort: A—Z</option>
            </select>
            <span className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center pointer-events-none">
              <i className="ri-arrow-down-s-line text-xs text-foreground-400" />
            </span>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-status-deleted/10 border border-status-deleted/20">
          <span className="text-sm text-status-deleted">{error}</span>
          <button
            onClick={fetchProjects}
            className="px-3 py-1 rounded-lg bg-status-deleted/15 text-status-deleted text-sm font-medium hover:bg-status-deleted/25 cursor-pointer whitespace-nowrap"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="bg-white rounded-xl border border-background-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-background-200">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-foreground-500 uppercase tracking-wider">Project</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-foreground-500 uppercase tracking-wider">Client</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-foreground-500 uppercase tracking-wider">Status</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-foreground-500 uppercase tracking-wider">Budget</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-foreground-500 uppercase tracking-wider">Deadline</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3, 4].map((i) => (
                  <tr key={i} className="border-b border-background-100">
                    {[1, 2, 3, 4, 5, 6].map((j) => (
                      <td key={j} className="px-5 py-3.5">
                        <div className="h-4 bg-background-100 rounded animate-pulse" style={{ width: `${60 + j * 10}%` }} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
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
                  <th className="text-left px-5 py-3 text-xs font-semibold text-foreground-500 uppercase tracking-wider">
                    Project
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-foreground-500 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-foreground-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-foreground-500 uppercase tracking-wider">
                    Budget
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-foreground-500 uppercase tracking-wider">
                    Deadline
                  </th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <div className="text-center py-12">
                        <span className="w-10 h-10 rounded-full bg-background-100 flex items-center justify-center mx-auto mb-2">
                          <i className="ri-folder-open-line text-xl text-foreground-400" />
                        </span>
                        <p className="text-sm text-foreground-500">
                          {search.trim() || statusFilter !== "all"
                            ? "No projects match your filters"
                            : "No projects yet"}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((project) => {
                    const sc = projectStatusConfig[project.status] || projectStatusConfig.not_started;
                    return (
                      <tr
                        key={project.id}
                        className="border-b border-background-100 hover:bg-background-50 transition-colors"
                      >
                        <td className="px-5 py-3.5">
                          <Link
                            to={`/projects/${project.id}`}
                            className="text-sm font-semibold text-foreground-900 hover:text-secondary-500"
                          >
                            {project.title}
                          </Link>
                        </td>
                        <td className="px-5 py-3.5 text-sm text-foreground-600">
                          {project.clientName}
                        </td>
                        <td className="px-5 py-3.5">
                          <span
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold"
                            style={{
                              backgroundColor: sc.color + "15",
                              color: sc.color,
                            }}
                          >
                            {sc.label}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-sm font-medium text-foreground-800 text-right tabular-nums">
                          ${project.budget.toLocaleString()}
                        </td>
                        <td className="px-5 py-3.5 text-sm text-foreground-500 whitespace-nowrap">
                          {new Date(project.end_date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </td>
                        <td className="px-5 py-3.5">
                          <Link
                            to={`/projects/${project.id}`}
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