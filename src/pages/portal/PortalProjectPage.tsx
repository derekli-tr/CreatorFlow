import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams } from "react-router-dom";

interface PortalProject {
  id: string;
  client_id: string;
  title: string;
  description: string;
  status: string;
  start_date: string;
  end_date: string;
  budget: number;
  created_at: string;
  clientName: string;
}

interface PortalTask {
  id: string;
  project_id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  assigned_to: string | null;
  due_date: string | null;
  created_at: string;
}

function formatCurrency(val: number) {
  return "$" + val.toLocaleString("en-US", { minimumFractionDigits: 0 });
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  not_started: { label: "Not Started", color: "#64748B", bg: "#64748B15" },
  in_progress: { label: "In Progress", color: "#3B82F6", bg: "#3B82F615" },
  completed: { label: "Completed", color: "#10B981", bg: "#10B98115" },
  on_hold: { label: "On Hold", color: "#F59E0B", bg: "#F59E0B15" },
};

const taskStatusConfig: Record<string, { label: string; color: string; bg: string }> = {
  todo: { label: "To Do", color: "#64748B", bg: "#64748B10" },
  in_progress: { label: "In Progress", color: "#3B82F6", bg: "#3B82F610" },
  review: { label: "Review", color: "#F59E0B", bg: "#F59E0B10" },
  done: { label: "Done", color: "#10B981", bg: "#10B98110" },
};

const priorityConfig: Record<string, string> = {
  low: "bg-background-100 text-foreground-500",
  medium: "bg-yellow-50 text-yellow-700",
  high: "bg-red-50 text-red-600",
};

export default function PortalProjectPage() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<PortalProject | null>(null);
  const [tasks, setTasks] = useState<PortalTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);

    try {
      const fnUrl = `${import.meta.env.VITE_PUBLIC_SUPABASE_URL}/functions/v1/portal-project?id=${encodeURIComponent(id)}`;
      const response = await fetch(fnUrl, {
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY}`,
        },
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => undefined);
        throw new Error(errData?.error || "Project not found");
      }

      const data = await response.json();
      setProject(data.project as PortalProject);
      setTasks(data.tasks as PortalTask[]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load project");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const progress = useMemo(() => {
    if (tasks.length === 0) return 0;
    const done = tasks.filter((t) => t.status === "done").length;
    return Math.round((done / tasks.length) * 100);
  }, [tasks]);

  const tasksByStatus = useMemo(() => {
    const groups: Record<string, PortalTask[]> = { todo: [], in_progress: [], review: [], done: [] };
    tasks.forEach((t) => {
      if (groups[t.status]) groups[t.status].push(t);
    });
    return groups;
  }, [tasks]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto py-20 text-center">
        <div className="animate-spin w-8 h-8 border-2 border-secondary-500 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-foreground-500 text-sm">Loading project...</p>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="max-w-lg mx-auto py-20 text-center">
        <div className="w-16 h-16 rounded-full bg-background-100 flex items-center justify-center mx-auto mb-4">
          <i className="ri-folder-open-line text-2xl text-foreground-400" />
        </div>
        <h2 className="text-xl font-heading font-semibold text-foreground-950 mb-2">
          {error || "Project not found"}
        </h2>
        <p className="text-sm text-foreground-500">
          This project link may be broken or the project has been removed.
        </p>
      </div>
    );
  }

  const psc = statusConfig[project.status] || statusConfig.not_started;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-3 flex-wrap">
          <h1 className="text-2xl md:text-3xl font-heading font-bold text-foreground-950">
            {project.title}
          </h1>
          <span
            className="text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap"
            style={{ backgroundColor: psc.bg, color: psc.color }}
          >
            {psc.label}
          </span>
        </div>
        <p className="text-sm text-foreground-500">
          {project.clientName} &middot; Budget: {formatCurrency(project.budget)}
        </p>
      </div>

      {/* Progress */}
      <div className="bg-white rounded-xl border border-background-200 p-6 mb-8">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-foreground-700">Overall Progress</span>
          <span className="text-sm font-bold text-foreground-900 tabular-nums">{progress}%</span>
        </div>
        <div className="w-full h-3 bg-background-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${progress}%`,
              backgroundColor: progress === 100 ? "#10B981" : "#3B82F6",
            }}
          />
        </div>
        <div className="flex items-center gap-4 mt-3 text-xs text-foreground-500">
          <span><span className="font-semibold text-foreground-700">{tasks.length}</span> total tasks</span>
          <span><span className="font-semibold text-accent-500">{tasks.filter((t) => t.status === "done").length}</span> completed</span>
          <span><span className="font-semibold text-blue-500">{tasks.filter((t) => t.status === "in_progress").length}</span> in progress</span>
        </div>
      </div>

      {/* Description */}
      <div className="bg-white rounded-xl border border-background-200 p-6 mb-8">
        <h3 className="text-sm font-semibold text-foreground-800 mb-2">Project Details</h3>
        <p className="text-sm text-foreground-600 leading-relaxed">{project.description || "No description provided."}</p>
        <div className="flex items-center gap-6 mt-4 text-sm text-foreground-500 flex-wrap">
          <span className="flex items-center gap-1.5">
            <span className="w-4 h-4 flex items-center justify-center">
              <i className="ri-calendar-line" />
            </span>
            Start: {formatDate(project.start_date)}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-4 h-4 flex items-center justify-center">
              <i className="ri-flag-line" />
            </span>
            Deadline: {formatDate(project.end_date)}
          </span>
        </div>
      </div>

      {/* Task Board */}
      <div>
        <h3 className="font-heading font-semibold text-lg text-foreground-900 mb-4">
          Task Board
        </h3>
        {tasks.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-background-200">
            <div className="w-12 h-12 rounded-full bg-background-100 flex items-center justify-center mx-auto mb-3">
              <i className="ri-task-line text-xl text-foreground-400" />
            </div>
            <p className="text-foreground-500 text-sm">No tasks yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(tasksByStatus).map(([status, statusTasks]) => {
              const tsc = taskStatusConfig[status] || taskStatusConfig.todo;
              return (
                <div key={status} className="bg-white rounded-xl border border-background-200 p-4 min-h-[120px]">
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className="text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: tsc.bg, color: tsc.color }}
                    >
                      {tsc.label}
                    </span>
                    <span className="text-xs text-foreground-400 tabular-nums">{statusTasks.length}</span>
                  </div>
                  <div className="space-y-2">
                    {statusTasks.map((task) => (
                      <div
                        key={task.id}
                        className="bg-background-50 rounded-lg p-3 border border-background-100"
                      >
                        <p className="text-sm font-medium text-foreground-800 mb-1">{task.title}</p>
                        {task.description && (
                          <p className="text-xs text-foreground-500 line-clamp-2 mb-2">{task.description}</p>
                        )}
                        <div className="flex items-center gap-2 flex-wrap">
                          {task.priority && (
                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${priorityConfig[task.priority] || ""}`}>
                              {task.priority}
                            </span>
                          )}
                          {task.due_date && (
                            <span className="text-[10px] text-foreground-400">
                              Due {formatDate(task.due_date)}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}