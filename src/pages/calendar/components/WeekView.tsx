import { useState, useCallback, useRef } from "react";
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
  type DragMoveEvent,
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

interface WeekViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  onEventReschedule: (eventId: string, newStartISO: string, newEndISO: string) => void;
  onDragCreate: (startISO: string, endISO: string) => void;
  eventTypeConfig: Record<string, { color: string; bg: string; icon: string }>;
}

const HOURS = Array.from({ length: 13 }, (_, i) => i + 7);
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOUR_HEIGHT = 56;
const GRID_START_HOUR = 7;

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

function getMinutesFromMidnight(dateStr: string): number {
  const d = new Date(dateStr);
  return d.getHours() * 60 + d.getMinutes();
}

function snapTo30(minutes: number): number {
  return Math.round(minutes / 30) * 30;
}

function formatTimeFromMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

/* ---- Sub-components ---- */

function ColumnDroppable({ dayIndex, dateStr, children }: { dayIndex: number; dateStr: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `col-${dayIndex}`,
    data: { dayIndex, date: dateStr },
  });

  return (
    <div
      ref={setNodeRef}
      className={`relative transition-colors ${isOver ? "bg-amber-50/40 ring-2 ring-amber-300 ring-inset rounded-md" : ""}`}
    >
      {children}
    </div>
  );
}

function DraggableEventBlock({
  evt,
  cfg,
  onEventClick,
  top,
  height,
  left,
  width,
}: {
  evt: CalendarEvent;
  cfg: { color: string; bg: string; icon: string } | undefined;
  onEventClick: (event: CalendarEvent) => void;
  top: number;
  height: number;
  left: string;
  width: string;
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
        onEventClick(evt);
      }}
      className={`absolute rounded-md px-1.5 py-0.5 cursor-grab active:cursor-grabbing overflow-hidden text-left border-l-2 z-10 transition-opacity ${
        isDragging ? "opacity-20" : "hover:opacity-80"
      }`}
      style={{
        top: `${top}px`,
        height: `${Math.max(height, 20)}px`,
        left,
        width,
        backgroundColor: cfg?.bg,
        color: cfg?.color,
        borderLeftColor: cfg?.color,
      }}
    >
      <p className="text-[10px] font-semibold truncate leading-tight">{evt.title}</p>
      {height > 32 && (
        <p className="text-[9px] opacity-70 truncate leading-tight mt-0.5">
          {formatTime(evt.start_time)} – {formatTime(evt.end_time)}
        </p>
      )}
    </button>
  );
}

/* ---- Main component ---- */

export default function WeekView({
  currentDate,
  events,
  onEventClick,
  onEventReschedule,
  onDragCreate,
  eventTypeConfig,
}: WeekViewProps) {
  const [activeEvent, setActiveEvent] = useState<CalendarEvent | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const pointerYRef = useRef<number>(0);
  const overlayRefs = useRef<(HTMLDivElement | null)[]>([]);

  /* Drag-to-create state */
  const [creating, setCreating] = useState<{
    dayIndex: number;
    startMinutes: number;
    currentMinutes: number;
  } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const weekStart = getWeekStart(currentDate);
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const getEventsForDay = (date: Date): CalendarEvent[] => {
    const dateStr = date.toISOString().split("T")[0];
    return events.filter((e) => {
      const start = e.start_time.split("T")[0];
      const end = e.end_time.split("T")[0];
      return dateStr >= start && dateStr <= end;
    });
  };

  /* ---- Drag-to-create handlers ---- */

  const computeMinutesFromClientY = useCallback((clientY: number): number => {
    const gridEl = gridRef.current;
    if (!gridEl) return GRID_START_HOUR * 60 + 30;
    const rect = gridEl.getBoundingClientRect();
    const relY = clientY - rect.top;
    const raw = GRID_START_HOUR * 60 + (relY / HOUR_HEIGHT) * 60;
    return snapTo30(Math.max(GRID_START_HOUR * 60, Math.min(raw, (GRID_START_HOUR + HOURS.length) * 60)));
  }, []);

  const handleOverlayPointerDown = useCallback((dayIndex: number, e: React.PointerEvent) => {
    /* Skip if clicked on an event button (let @dnd-kit handle it) */
    const target = e.target as HTMLElement;
    if (target.closest("button")) return;

    const minutes = computeMinutesFromClientY(e.clientY);
    const overlay = overlayRefs.current[dayIndex];
    if (overlay) overlay.setPointerCapture(e.pointerId);

    setCreating({ dayIndex, startMinutes: minutes, currentMinutes: minutes });
  }, [computeMinutesFromClientY]);

  const handleOverlayPointerMove = useCallback((e: React.PointerEvent) => {
    if (!creating) return;
    if (!e.isPrimary) return;
    const minutes = computeMinutesFromClientY(e.clientY);
    setCreating((prev) => prev ? { ...prev, currentMinutes: minutes } : null);
  }, [creating, computeMinutesFromClientY]);

  const handleOverlayPointerUp = useCallback((e: React.PointerEvent) => {
    if (!creating) return;
    const overlay = overlayRefs.current[creating.dayIndex];
    if (overlay) overlay.releasePointerCapture(e.pointerId);

    const startMins = creating.startMinutes;
    const endMins = creating.currentMinutes;
    setCreating(null);

    /* Ignore tiny selections (no meaningful drag) */
    if (Math.abs(endMins - startMins) < 15) return;

    const actualStart = Math.min(startMins, endMins);
    const actualEnd = Math.max(startMins, endMins);

    const dateStr = days[creating.dayIndex].toISOString().split("T")[0];
    const pad = (n: number) => String(n).padStart(2, "0");
    const startISO = `${dateStr}T${pad(Math.floor(actualStart / 60))}:${pad(actualStart % 60)}:00Z`;
    const endISO = `${dateStr}T${pad(Math.floor(actualEnd / 60))}:${pad(actualEnd % 60)}:00Z`;

    onDragCreate(startISO, endISO);
  }, [creating, days, onDragCreate]);

  /* ---- Drag-to-reschedule handlers ---- */

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const evt = event.active.data.current?.event as CalendarEvent | undefined;
    setActiveEvent(evt || null);
  }, []);

  const handleDragMove = useCallback((event: DragMoveEvent) => {
    pointerYRef.current = event.activatorEvent instanceof PointerEvent
      ? event.activatorEvent.clientY
      : pointerYRef.current;
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveEvent(null);

      const { active, over } = event;
      if (!over) return;

      const evt = active.data.current?.event as CalendarEvent | undefined;
      if (!evt) return;

      const targetDayIndex = over.data.current?.dayIndex as number | undefined;
      const targetDate = over.data.current?.date as string | undefined;

      if (targetDayIndex === undefined || !targetDate) return;

      const gridEl = gridRef.current;
      if (!gridEl) return;

      const gridRect = gridEl.getBoundingClientRect();
      const relativeY = pointerYRef.current - gridRect.top;
      const minutesFromGridTop = (relativeY / HOUR_HEIGHT) * 60;
      const totalMinutes = GRID_START_HOUR * 60 + minutesFromGridTop;
      const snappedMinutes = snapTo30(totalMinutes);
      const clampedMinutes = Math.max(0, Math.min(snappedMinutes, 23 * 60 + 30));

      const newHour = Math.floor(clampedMinutes / 60);
      const newMin = clampedMinutes % 60;

      const origStartMin = getMinutesFromMidnight(evt.start_time);
      const origEndMin = getMinutesFromMidnight(evt.end_time);
      const duration = Math.max(origEndMin - origStartMin, 30);

      const newEndMinutes = clampedMinutes + duration;

      const pad = (n: number) => String(n).padStart(2, "0");
      const newStart = `${targetDate}T${pad(newHour)}:${pad(newMin)}:00Z`;

      const endHour = Math.floor(newEndMinutes / 60);
      const endMin = newEndMinutes % 60;
      const newEnd = `${targetDate}T${pad(Math.min(endHour, 23))}:${pad(Math.min(endMin, 59))}:00Z`;

      const origDate = evt.start_time.split("T")[0];
      if (origDate === targetDate && snappedMinutes === origStartMin) return;

      onEventReschedule(evt.id, newStart, newEnd);
    },
    [onEventReschedule]
  );

  /* ---- Render helpers ---- */

  const columnLeft = (di: number) => `calc(${(di + 1) * (100 / 8)}% + ${(di + 1) * 2}px)`;
  const columnWidth = `calc(${100 / 8}% - 4px)`;
  const timeGridHeight = HOURS.length * HOUR_HEIGHT;

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
    >
      <div className="bg-white rounded-xl border border-background-200 shadow-ambient overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-background-200">
          <div className="py-2 border-r border-background-200" />
          {days.map((d, i) => {
            const dateStr = d.toISOString().split("T")[0];
            const isToday = dateStr === todayStr;
            return (
              <div
                key={i}
                className={`py-2.5 text-center border-r border-background-200 last:border-r-0 ${
                  isToday ? "bg-secondary-50/50" : ""
                }`}
              >
                <p className="text-xs font-semibold text-foreground-500 uppercase">{DAY_LABELS[i]}</p>
                <p
                  className={`text-lg font-bold mt-0.5 ${
                    isToday ? "text-secondary-600" : "text-foreground-900"
                  }`}
                >
                  {d.getDate()}
                </p>
              </div>
            );
          })}
        </div>

        {/* Time grid with column droppables */}
        <div ref={gridRef} className="relative">
          <div className="grid grid-cols-[60px_repeat(7,1fr)]">
            {HOURS.map((hour) => (
              <div key={hour} className="contents">
                <div className="h-[56px] border-r border-background-200 border-b border-background-100 pr-2 pt-0">
                  <span className="text-[10px] text-foreground-400 font-medium block text-right -mt-1.5 pr-1">
                    {hour === 12 ? "12 PM" : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
                  </span>
                </div>
                {Array.from({ length: 7 }).map((_, ci) => {
                  const dayDate = days[ci].toISOString().split("T")[0];
                  return (
                    <ColumnDroppable key={ci} dayIndex={ci} dateStr={dayDate}>
                      <div className="h-[56px] border-r border-background-100 border-b border-background-100 last:border-r-0" />
                    </ColumnDroppable>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Drag-to-create: transparent interaction overlays per column (z-[3] — above grid, below events) */}
          {days.map((_, di) => (
            <div
              key={`overlay-${di}`}
              ref={(el) => { overlayRefs.current[di] = el; }}
              className="absolute top-0 z-[3] touch-none"
              style={{
                left: columnLeft(di),
                width: columnWidth,
                height: `${timeGridHeight}px`,
              }}
              onPointerDown={(e) => handleOverlayPointerDown(di, e)}
              onPointerMove={handleOverlayPointerMove}
              onPointerUp={handleOverlayPointerUp}
            />
          ))}

          {/* Drag-to-create: selection visual */}
          {creating && (
            <div
              className="absolute z-[4] rounded-md pointer-events-none"
              style={{
                left: columnLeft(creating.dayIndex),
                width: columnWidth,
                top: `${((Math.min(creating.startMinutes, creating.currentMinutes) - GRID_START_HOUR * 60) / 60) * HOUR_HEIGHT}px`,
                height: `${(Math.abs(creating.currentMinutes - creating.startMinutes) / 60) * HOUR_HEIGHT}px`,
                backgroundColor: "rgba(245, 158, 11, 0.15)",
                border: "2px solid rgba(245, 158, 11, 0.5)",
              }}
            >
              <div className="absolute -left-[70px] top-0 flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-100 rounded-full px-2 py-0.5 whitespace-nowrap">
                {formatTimeFromMinutes(Math.min(creating.startMinutes, creating.currentMinutes))}
                <span>–</span>
                {formatTimeFromMinutes(Math.max(creating.startMinutes, creating.currentMinutes))}
              </div>
            </div>
          )}

          {/* Event blocks */}
          {days.map((day, di) => {
            const dayEvents = getEventsForDay(day);
            return dayEvents.map((evt) => {
              const startMin = getMinutesFromMidnight(evt.start_time);
              const endMin = getMinutesFromMidnight(evt.end_time);
              const durationMin = Math.max(endMin - startMin, 30);
              const top = Math.max((startMin - GRID_START_HOUR * 60) * (HOUR_HEIGHT / 60), 0);
              const height = durationMin * (HOUR_HEIGHT / 60);
              const cfg = eventTypeConfig[evt.type];

              return (
                <DraggableEventBlock
                  key={evt.id}
                  evt={evt}
                  cfg={cfg}
                  onEventClick={onEventClick}
                  top={top}
                  height={height}
                  left={columnLeft(di)}
                  width={columnWidth}
                />
              );
            });
          })}
        </div>
      </div>

      {/* Drag overlay for reschedule */}
      <DragOverlay dropAnimation={null}>
        {activeEvent ? (
          <div
            className="rounded-md px-2 py-1 shadow-xl opacity-90 cursor-grabbing text-left border-l-2"
            style={{
              backgroundColor: eventTypeConfig[activeEvent.type]?.color,
              color: "#fff",
              borderLeftColor: "rgba(255,255,255,0.4)",
              minWidth: "140px",
            }}
          >
            <p className="text-xs font-semibold truncate">{activeEvent.title}</p>
            <p className="text-[10px] opacity-75 truncate mt-0.5">
              {formatTime(activeEvent.start_time)}
            </p>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}