import { useState, useCallback } from "react";
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";

interface CalendarEvent {
  id: string;
  title: string;
  type: string;
  start_time: string;
  end_time: string;
  client_id: string | null;
  project_id: string | null;
  description: string;
  location: string | null;
}

interface MonthViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  onEventReschedule: (eventId: string, newStartISO: string, newEndISO: string) => void;
  eventTypeConfig: Record<string, { color: string; bg: string; icon: string }>;
}

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getEventsForDate(events: CalendarEvent[], date: Date): CalendarEvent[] {
  const dateStr = date.toISOString().split("T")[0];
  return events.filter((e) => {
    const start = e.start_time.split("T")[0];
    const end = e.end_time.split("T")[0];
    return dateStr >= start && dateStr <= end;
  });
}

/* ---- Sub-components ---- */

function DroppableDayCell({
  date,
  isToday,
  children,
}: {
  date: Date;
  isToday: boolean;
  children: React.ReactNode;
}) {
  const dateStr = date.toISOString().split("T")[0];
  const { setNodeRef, isOver } = useDroppable({
    id: `day-${dateStr}`,
    data: { date: dateStr },
  });

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[100px] p-1.5 border-r border-background-100 last:border-r-0 transition-colors ${
        isToday ? "bg-secondary-50/50" : ""
      } ${isOver ? "bg-amber-50 ring-2 ring-amber-300 ring-inset rounded-md" : ""}`}
    >
      {children}
    </div>
  );
}

function DraggableEventChip({
  evt,
  cfg,
  onEventClick,
}: {
  evt: CalendarEvent;
  cfg: { color: string; bg: string; icon: string } | undefined;
  onEventClick: (event: CalendarEvent) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: evt.id,
    data: { event: evt },
  });

  return (
    <button
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={(e) => {
        e.stopPropagation();
        if (!isDragging) onEventClick(evt);
      }}
      className={`w-full text-left px-1.5 py-0.5 rounded text-[11px] font-medium truncate cursor-grab active:cursor-grabbing hover:opacity-80 transition-opacity whitespace-nowrap ${
        isDragging ? "opacity-30" : ""
      }`}
      style={{ backgroundColor: cfg?.bg, color: cfg?.color }}
    >
      {evt.title}
    </button>
  );
}

/* ---- Main component ---- */

export default function MonthView({
  currentDate,
  events,
  onEventClick,
  onEventReschedule,
  eventTypeConfig,
}: MonthViewProps) {
  const [activeEvent, setActiveEvent] = useState<CalendarEvent | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startOffset = firstDay.getDay();
  const totalDays = lastDay.getDate();

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  const days: (number | null)[] = [];
  for (let i = 0; i < startOffset; i++) days.push(null);
  for (let d = 1; d <= totalDays; d++) days.push(d);

  const weeks: (number | null)[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const evt = event.active.data.current?.event as CalendarEvent | undefined;
    setActiveEvent(evt || null);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveEvent(null);

      const { active, over } = event;
      if (!over) return;

      const evt = active.data.current?.event as CalendarEvent | undefined;
      const targetDate = over.data.current?.date as string | undefined;
      if (!evt || !targetDate) return;

      /* Skip if dropped on the same date */
      const origDate = evt.start_time.split("T")[0];
      if (origDate === targetDate) return;

      /* Preserve time, move to new date */
      const startTime = evt.start_time.split("T")[1]?.slice(0, 5) || "09:00";
      const endTime = evt.end_time.split("T")[1]?.slice(0, 5) || "10:00";

      const newStart = `${targetDate}T${startTime}:00Z`;
      const newEnd = `${targetDate}T${endTime}:00Z`;

      onEventReschedule(evt.id, newStart, newEnd);
    },
    [onEventReschedule]
  );

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="bg-white rounded-xl border border-background-200 shadow-ambient overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-background-200">
          {DAYS_OF_WEEK.map((d) => (
            <div
              key={d}
              className="py-2.5 text-center text-xs font-semibold text-foreground-400 uppercase tracking-wider"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Weeks */}
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 border-b border-background-100 last:border-b-0">
            {week.map((d, di) => {
              if (d === null) {
                return <div key={`empty-${wi}-${di}`} className="min-h-[100px] bg-background-50/50" />;
              }
              const date = new Date(year, month, d);
              const dateStr = date.toISOString().split("T")[0];
              const isToday = dateStr === todayStr;
              const dayEvents = getEventsForDate(events, date);
              const displayEvents = dayEvents.slice(0, 3);
              const overflow = dayEvents.length - 3;

              return (
                <DroppableDayCell key={d} date={date} isToday={isToday}>
                  <p
                    className={`text-xs font-semibold mb-1 px-1 ${
                      isToday
                        ? "w-6 h-6 rounded-full bg-secondary-500 text-white flex items-center justify-center"
                        : "text-foreground-600"
                    }`}
                  >
                    {d}
                  </p>
                  <div className="space-y-0.5">
                    {displayEvents.map((evt) => {
                      const cfg = eventTypeConfig[evt.type];
                      return (
                        <DraggableEventChip
                          key={evt.id}
                          evt={evt}
                          cfg={cfg}
                          onEventClick={onEventClick}
                        />
                      );
                    })}
                    {overflow > 0 && (
                      <p className="text-[10px] text-foreground-400 px-1 font-medium">
                        +{overflow} more
                      </p>
                    )}
                  </div>
                </DroppableDayCell>
              );
            })}
          </div>
        ))}
      </div>

      {/* Drag overlay */}
      <DragOverlay dropAnimation={null}>
        {activeEvent ? (
          <div
            className="px-2 py-1 rounded text-[11px] font-medium truncate shadow-lg opacity-90 cursor-grabbing"
            style={{
              backgroundColor: eventTypeConfig[activeEvent.type]?.color,
              color: "#fff",
            }}
          >
            {activeEvent.title}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}