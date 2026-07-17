import { useState, useEffect } from "react";
import type { Task } from "@/pages/projects/components/KanbanBoard";

interface EditTaskModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updated: Partial<Task>) => void;
  onDelete: (taskId: string) => void;
}

export default function EditTaskModal({ task, isOpen, onClose, onSave, onDelete }: EditTaskModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [status, setStatus] = useState("todo");
  const [dueDate, setDueDate] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description);
      setPriority(task.priority);
      setStatus(task.status);
      setDueDate(task.due_date);
      setConfirmDelete(false);
    }
  }, [task]);

  if (!isOpen || !task) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSave({
      title: title.trim(),
      description: description.trim(),
      priority,
      status: status as Task["status"],
      due_date: dueDate,
    });
    onClose();
  };

  const handleDelete = () => {
    if (confirmDelete) {
      onDelete(task.id);
      onClose();
    } else {
      setConfirmDelete(true);
    }
  };

  const priorities: { value: string; label: string; color: string }[] = [
    { value: "low", label: "Low", color: "#64748B" },
    { value: "medium", label: "Medium", color: "#D97706" },
    { value: "high", label: "High", color: "#EF4444" },
  ];

  const statuses: { value: string; label: string; color: string }[] = [
    { value: "todo", label: "To Do", color: "#64748B" },
    { value: "in_progress", label: "In Progress", color: "#3B82F6" },
    { value: "review", label: "Review", color: "#F59E0B" },
    { value: "done", label: "Done", color: "#10B981" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh]">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-lg w-full max-w-md mx-4 max-h-[80vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-background-200 px-6 py-4 flex items-center justify-between rounded-t-xl">
          <h3 className="font-heading font-semibold text-lg text-foreground-900">Edit Task</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-background-100 flex items-center justify-center cursor-pointer">
            <i className="ri-close-line text-foreground-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-foreground-600 mb-1.5">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-background-200 bg-white text-sm text-foreground-900 focus:outline-none focus:ring-2 focus:ring-secondary-300 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground-600 mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-background-200 bg-white text-sm text-foreground-900 focus:outline-none focus:ring-2 focus:ring-secondary-300 focus:border-transparent resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground-600 mb-2">Priority</label>
            <div className="grid grid-cols-3 gap-2">
              {priorities.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPriority(p.value as typeof priority)}
                  className={`flex items-center justify-center gap-1.5 p-2.5 rounded-lg border text-sm font-medium transition-colors cursor-pointer ${
                    priority === p.value
                      ? "border-secondary-300 bg-secondary-50 text-foreground-900"
                      : "border-background-200 text-foreground-500 hover:bg-background-50"
                  }`}
                >
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground-600 mb-2">Status</label>
            <div className="grid grid-cols-4 gap-2">
              {statuses.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setStatus(s.value)}
                  className={`flex items-center justify-center gap-1 p-2 rounded-lg border text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    status === s.value
                      ? "border-secondary-300 bg-secondary-50 text-foreground-900"
                      : "border-background-200 text-foreground-500 hover:bg-background-50"
                  }`}
                >
                  <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground-600 mb-1.5">Due Date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-background-200 bg-white text-sm text-foreground-900 focus:outline-none focus:ring-2 focus:ring-secondary-300 focus:border-transparent cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={handleDelete}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                confirmDelete
                  ? "bg-status-deleted text-white hover:bg-status-deleted/90"
                  : "text-status-deleted hover:bg-status-deleted/10"
              }`}
            >
              {confirmDelete ? "Confirm Delete?" : "Delete Task"}
            </button>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-background-200 text-sm font-medium text-foreground-600 hover:bg-background-50 transition-colors cursor-pointer whitespace-nowrap"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-primary-500 text-white text-sm font-semibold hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap"
              >
                Save
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}