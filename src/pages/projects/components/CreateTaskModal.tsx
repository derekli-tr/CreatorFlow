import { useState } from "react";

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (task: {
    title: string;
    description: string;
    priority: "low" | "medium" | "high";
    status: string;
    due_date: string;
  }) => void;
}

export default function CreateTaskModal({ isOpen, onClose, onCreate }: CreateTaskModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [status, setStatus] = useState("todo");
  const [dueDate, setDueDate] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onCreate({
      title: title.trim(),
      description: description.trim(),
      priority,
      status,
      due_date: dueDate,
    });
    setTitle("");
    setDescription("");
    setPriority("medium");
    setStatus("todo");
    setDueDate("");
    onClose();
  };

  const priorities: { value: string; label: string; color: string; bg: string }[] = [
    { value: "low", label: "Low", color: "#64748B", bg: "#64748B15" },
    { value: "medium", label: "Medium", color: "#D97706", bg: "#F59E0B15" },
    { value: "high", label: "High", color: "#EF4444", bg: "#EF444415" },
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
          <h3 className="font-heading font-semibold text-lg text-foreground-900">Create Task</h3>
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
              placeholder="Task title..."
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
              placeholder="Optional details..."
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

          <div className="flex items-center justify-end gap-3 pt-2">
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
              Create Task
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}