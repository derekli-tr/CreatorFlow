import { useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useProjects } from "@/hooks/useProjects";
import { useTasks } from "@/hooks/useTasks";
import type { Task } from "@/hooks/useTasks";
import KanbanBoard from "@/pages/projects/components/KanbanBoard";
import CreateTaskModal from "@/pages/projects/components/CreateTaskModal";
import EditTaskModal from "@/pages/projects/components/EditTaskModal";

const projectStatusConfig: Record<string, { label: string; color: string; bg: string }> = {
  not_started: { label: "Not Started", color: "#64748B", bg: "#64748B15" },
  in_progress: { label: "In Progress", color: "#3B82F6", bg: "#3B82F615" },
  completed: { label: "Completed", color: "#10B981", bg: "#10B98115" },
  on_hold: { label: "On Hold", color: "#F59E0B", bg: "#F59E0B15" },
};

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { getProject } = useProjects();
  const project = useMemo(() => (id ? getProject(id) : null), [id, getProject]);
  const { tasks, isLoading, error, createTask, updateTask, deleteTask, updateTaskList, fetchTasks } = useTasks(id || '');

  const [createOpen, setCreateOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const progress = useMemo(() => {
    if (tasks.length === 0) return 0;
    const done = tasks.filter((t) => t.status === "done").length;
    return Math.round((done / tasks.length) * 100);
  }, [tasks]);

  if (!project && !isLoading) {
    return (
      <div className="text-center py-20">
        <span className="w-14 h-14 rounded-full bg-background-100 flex items-center justify-center mx-auto mb-3">
          <i className="ri-folder-open-line text-2xl text-foreground-400" />
        </span>
        <p className="text-foreground-500 font-medium">Project not found</p>
        <Link
          to="/projects"
          className="text-sm text-secondary-500 hover:text-secondary-600 mt-2 inline-block font-medium"
        >
          &larr; Back to projects
        </Link>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="space-y-6">
        <Link
          to="/projects"
          className="text-sm text-secondary-500 hover:text-secondary-600 font-medium mb-2 inline-flex items-center gap-1"
        >
          <span className="w-4 h-4 flex items-center justify-center">
            <i className="ri-arrow-left-line" />
          </span>
          All projects
        </Link>
        <div className="bg-white rounded-xl border border-background-200 p-10 text-center">
          {isLoading ? (
            <div className="space-y-3">
              <div className="h-6 w-48 bg-background-100 rounded animate-pulse mx-auto" />
              <div className="h-4 w-64 bg-background-100 rounded animate-pulse mx-auto" />
            </div>
          ) : (
            <p className="text-foreground-500">Loading project...</p>
          )}
        </div>
      </div>
    );
  }

  const psc = projectStatusConfig[project.status] || projectStatusConfig.not_started;

  const handleCreate = async (data: {
    title: string;
    description: string;
    priority: "low" | "medium" | "high";
    status: string;
    due_date: string;
  }) => {
    await createTask(data);
  };

  const handleSaveTask = async (updated: Partial<Task>) => {
    if (!editingTask) return;
    await updateTask(editingTask.id, updated);
  };

  const handleDeleteTask = async (taskId: string) => {
    await deleteTask(taskId);
  };

  const handleTasksChange = async (newTasks: Task[]) => {
    /* Find the changed task(s) and persist */
    const changed = newTasks.find((nt) => {
      const old = tasks.find((t) => t.id === nt.id);
      return old && old.status !== nt.status;
    });
    if (changed) {
      await updateTask(changed.id, { status: changed.status });
    } else {
      updateTaskList(newTasks);
    }
  };

  return (
    <div className="space-y-6">
      {/* Error */}
      {error && (
        <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-status-deleted/10 border border-status-deleted/20">
          <span className="text-sm text-status-deleted">{error}</span>
          <button
            onClick={() => fetchTasks()}
            className="px-3 py-1 rounded-lg bg-status-deleted/15 text-status-deleted text-sm font-medium hover:bg-status-deleted/25 cursor-pointer whitespace-nowrap"
          >
            Retry
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <Link
            to="/projects"
            className="text-sm text-secondary-500 hover:text-secondary-600 font-medium mb-2 inline-flex items-center gap-1"
          >
            <span className="w-4 h-4 flex items-center justify-center">
              <i className="ri-arrow-left-line" />
            </span>
            All projects
          </Link>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <h2 className="font-heading font-semibold text-headline-md text-foreground-950">
              {project.title}
            </h2>
            <span
              className="text-xs font-semibold px-2.5 py-1 rounded-full"
              style={{ backgroundColor: psc.bg, color: psc.color }}
            >
              {psc.label}
            </span>
          </div>
          <p className="text-body-md text-foreground-500 mt-1">
            {project.clientName} &middot; Budget: ${project.budget.toLocaleString()}
          </p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="btn-primary inline-flex items-center gap-2 whitespace-nowrap cursor-pointer"
        >
          <span className="w-4 h-4 flex items-center justify-center">
            <i className="ri-add-line" />
          </span>
          Add Task
        </button>
      </div>

      {/* Progress Bar */}
      <div className="bg-white rounded-xl border border-background-200 shadow-ambient p-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-foreground-700">Overall Progress</span>
          <span className="text-sm font-bold text-foreground-900 tabular-nums">{progress}%</span>
        </div>
        <div className="w-full h-3 bg-background-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${progress}%`,
              backgroundColor: progress === 100 ? "#10B981" : "#3B82F6",
            }}
          />
        </div>
        <div className="flex items-center gap-4 mt-3 text-xs text-foreground-500">
          <span>
            <span className="font-semibold text-foreground-700">{tasks.length}</span> total tasks
          </span>
          <span>
            <span className="font-semibold text-foreground-700">
              {tasks.filter((t) => t.status === "done").length}
            </span>{" "}
            completed
          </span>
          <span>
            <span className="font-semibold text-foreground-700">
              {tasks.filter((t) => t.status === "in_progress").length}
            </span>{" "}
            in progress
          </span>
        </div>
      </div>

      {/* Project Info */}
      <div className="bg-white rounded-xl border border-background-200 shadow-ambient p-5">
        <h3 className="text-sm font-semibold text-foreground-800 mb-2">Project Details</h3>
        <p className="text-sm text-foreground-600 leading-relaxed">{project.description}</p>
        <div className="flex items-center gap-6 mt-4 text-sm text-foreground-500 flex-wrap">
          <span className="flex items-center gap-1.5">
            <span className="w-4 h-4 flex items-center justify-center">
              <i className="ri-calendar-line" />
            </span>
            Start: {new Date(project.start_date).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-4 h-4 flex items-center justify-center">
              <i className="ri-flag-line" />
            </span>
            Deadline: {new Date(project.end_date).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-4 h-4 flex items-center justify-center">
              <i className="ri-link" />
            </span>
            {project.clientName}
          </span>
        </div>
      </div>

      {/* Task Board */}
      <div>
        <h3 className="font-heading font-semibold text-lg text-foreground-900 mb-4">
          Task Board
        </h3>
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-background-100 rounded-xl p-4 min-h-[200px]">
                <div className="h-4 w-16 bg-background-200 rounded animate-pulse mb-3" />
                <div className="space-y-2">
                  <div className="h-20 bg-white rounded-lg animate-pulse" />
                  <div className="h-20 bg-white rounded-lg animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <KanbanBoard
            tasks={tasks}
            onTasksChange={handleTasksChange}
            onTaskClick={(task) => setEditingTask(task)}
          />
        )}
      </div>

      {/* Modals */}
      <CreateTaskModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={handleCreate}
      />
      <EditTaskModal
        task={editingTask}
        isOpen={editingTask !== null}
        onClose={() => setEditingTask(null)}
        onSave={handleSaveTask}
        onDelete={handleDeleteTask}
      />
    </div>
  );
}