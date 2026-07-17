import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface TaskCardProps {
  id: string;
  title: string;
  description: string;
  priority: "low" | "medium" | "high";
  due_date: string;
  assigned_to: string | null;
  onClick: () => void;
}

const priorityConfig: Record<string, { label: string; bg: string; color: string }> = {
  high: { label: "High", bg: "#EF444415", color: "#EF4444" },
  medium: { label: "Medium", bg: "#F59E0B15", color: "#D97706" },
  low: { label: "Low", bg: "#64748B15", color: "#64748B" },
};

const assigneeColors = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"];

export default function TaskCard({
  id,
  title,
  description,
  priority,
  due_date,
  assigned_to,
  onClick,
}: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const pc = priorityConfig[priority] || priorityConfig.medium;
  const isOverdue = new Date(due_date) < new Date();

  const assigneeIndex = assigned_to
    ? parseInt(assigned_to.replace("usr-", ""), 10)
    : 0;
  const assigneeColor = assigneeColors[assigneeIndex % assigneeColors.length];

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className="bg-white rounded-lg border border-background-200 p-3 hover:shadow-ambient transition-shadow cursor-grab active:cursor-grabbing group"
    >
      <p className="text-sm font-medium text-foreground-800 leading-snug">
        {title}
      </p>
      {description && (
        <p className="text-xs text-foreground-400 mt-1 line-clamp-2 leading-relaxed">
          {description}
        </p>
      )}

      <div className="flex items-center gap-2 mt-2.5 flex-wrap">
        <span
          className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
          style={{ backgroundColor: pc.bg, color: pc.color }}
        >
          {pc.label}
        </span>

        <span
          className={`text-[10px] font-medium whitespace-nowrap ${
            isOverdue ? "text-status-deleted" : "text-foreground-400"
          }`}
        >
          <span className="w-3 h-3 inline-flex items-center justify-center mr-0.5">
            <i className={isOverdue ? "ri-alert-line" : "ri-calendar-line"} />
          </span>
          {new Date(due_date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })}
        </span>
      </div>

      {assigned_to && (
        <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-background-100">
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
            style={{ backgroundColor: assigneeColor + "20" }}
          >
            <span
              className="text-[9px] font-bold"
              style={{ color: assigneeColor }}
            >
              {assigneeIndex % 2 === 0 ? "A" : "T"}
            </span>
          </div>
          <span className="text-[10px] text-foreground-500">
            {assigneeIndex % 2 === 0 ? "Alex" : "Taylor"}
          </span>
        </div>
      )}
    </div>
  );
}