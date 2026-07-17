import { useState, useMemo } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import TaskCard from "@/pages/projects/components/TaskCard";

export interface Task {
  id: string;
  project_id: string;
  title: string;
  description: string;
  status: "todo" | "in_progress" | "review" | "done";
  priority: "low" | "medium" | "high";
  assigned_to: string | null;
  due_date: string;
  created_at: string;
}

interface ColumnConfig {
  key: string;
  label: string;
  color: string;
  icon: string;
}

const columns: ColumnConfig[] = [
  { key: "todo", label: "To Do", color: "#64748B", icon: "ri-inbox-line" },
  { key: "in_progress", label: "In Progress", color: "#3B82F6", icon: "ri-loader-4-line" },
  { key: "review", label: "Review", color: "#F59E0B", icon: "ri-eye-line" },
  { key: "done", label: "Done", color: "#10B981", icon: "ri-check-double-line" },
];

interface KanbanBoardProps {
  tasks: Task[];
  onTasksChange: (tasks: Task[]) => void;
  onTaskClick: (task: Task) => void;
}

function DroppableColumn({
  column,
  tasks,
  children,
}: {
  column: ColumnConfig;
  tasks: Task[];
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.key });

  return (
    <div
      ref={setNodeRef}
      className={`bg-background-100 rounded-xl p-3 flex flex-col min-h-[200px] transition-colors ${
        isOver ? "bg-background-200/70 ring-2 ring-secondary-200" : ""
      }`}
    >
      <div className="flex items-center gap-2 mb-3 px-1">
        <div
          className="w-2.5 h-2.5 rounded-full shrink-0"
          style={{ backgroundColor: column.color }}
        />
        <span className="text-sm font-semibold text-foreground-700">
          {column.label}
        </span>
        <span className="text-xs text-foreground-400 ml-auto bg-white rounded-full px-2 py-0.5 font-medium">
          {tasks.length}
        </span>
      </div>
      <SortableContext
        items={tasks.map((t) => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-2 flex-1">{children}</div>
      </SortableContext>

      {tasks.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <span className="w-8 h-8 rounded-full bg-white flex items-center justify-center mx-auto mb-1">
              <i className={`${column.icon} text-foreground-400`} />
            </span>
            <p className="text-xs text-foreground-400">Drop tasks here</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function KanbanBoard({ tasks, onTasksChange, onTaskClick }: KanbanBoardProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  const tasksByColumn = useMemo(() => {
    const map: Record<string, Task[]> = {};
    columns.forEach((col) => {
      map[col.key] = tasks.filter((t) => t.status === col.key);
    });
    return map;
  }, [tasks]);

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find((t) => t.id === event.active.id);
    if (task) setActiveTask(task);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;

    const activeTaskId = String(active.id);
    const overId = String(over.id);

    const activeTask = tasks.find((t) => t.id === activeTaskId);
    if (!activeTask) return;

    // Check if dropped on a column directly
    const overColumn = columns.find((c) => c.key === overId);
    if (overColumn) {
      // Dropped directly on column
      if (activeTask.status !== overColumn.key) {
        const updated = tasks.map((t) =>
          t.id === activeTaskId ? { ...t, status: overColumn.key as Task["status"] } : t
        );
        onTasksChange(updated);
      }
      return;
    }

    // Check if dropped on another task
    const overTask = tasks.find((t) => t.id === overId);
    if (overTask) {
      if (activeTask.status !== overTask.status) {
        const updated = tasks.map((t) =>
          t.id === activeTaskId ? { ...t, status: overTask.status } : t
        );
        onTasksChange(updated);
      }
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {columns.map((col) => (
          <DroppableColumn key={col.key} column={col} tasks={tasksByColumn[col.key] || []}>
            {(tasksByColumn[col.key] || []).map((task) => (
              <TaskCard
                key={task.id}
                id={task.id}
                title={task.title}
                description={task.description}
                priority={task.priority}
                due_date={task.due_date}
                assigned_to={task.assigned_to}
                onClick={() => onTaskClick(task)}
              />
            ))}
          </DroppableColumn>
        ))}
      </div>

      <DragOverlay>
        {activeTask ? (
          <div className="bg-white rounded-lg border border-background-200 shadow-lg p-3 w-[280px] rotate-2">
            <p className="text-sm font-medium text-foreground-800">{activeTask.title}</p>
            <p className="text-xs text-foreground-400 mt-1 line-clamp-2">{activeTask.description}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-secondary-100 text-secondary-700">
                {activeTask.priority}
              </span>
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}