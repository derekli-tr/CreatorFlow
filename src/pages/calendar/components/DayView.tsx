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

interface DayViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  onEventReschedule: (eventId: string, newStartISO: string, newEndISO: string) => void;
  onDragCreate: (startISO: string, endISO: string) => void;
  eventTypeConfig: Record<string, { color: string; bg: string; icon: string }>;
}

const HOURS = Array.from({ length: 13 }, (_, i) => i + 7);
const HOUR_HEIGHT = 64;
const GRID_START_HOUR = 7;

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

function GridDroppable({ children }: { children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({
    id: "day-grid",
    data: { type: "day-grid" },
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
}: {
  evt: CalendarEvent;
  cfg: { color: string; bg: string; icon: string } | undefined;
  onEventClick: (event: CalendarEvent) => void;
  top: number;
  height: number;
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
      className={`absolute left-16 right-4 rounded-lg px-3 py-2 cursor-grab active:cursor-grabbing overflow-hidden text-left border-l-2 z-10 transition-opacity ${
        isDragging ? "opacity-20" : "hover:opacity-80"
      }`}
      style={{
        top: `${top}px`,
        height: `${Math.max(height, 24)}px`,
        backgroundColor: cfg?.bg,
        color: cfg?.color,
        borderLeftColor: cfg?.color,
      }}
    >
      <p className="text-sm font-semibold truncate">{evt.title}</p>
      <p className="text-xs opacity-70 mt-0.5">
        {formatTime(evt.start_time)} – {formatTime(evt.end_time)}
      </p>
      {height > 60 && evt.description && (
        <p className="text-xs opacity-60 mt-1 line-clamp-2">{evt.description}</p>
      )}
    </button>
  );
}

/* ---- Main component ---- */

export default function DayView({
  currentDate,
  events,
  onEventClick,
  onEventReschedule,
  onDragCreate,
  eventTypeConfig,
}: DayViewProps) {
  const [activeEvent, setActiveEvent] = useState<CalendarEvent | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const pointerYRef = useRef<number>(0);
  const overlayRef = useRef<HTMLDivElement | null>(null);

  /* Drag-to-create state */
  const [creating, setCreating] = useState<{
    startMinutes: number;
    currentMinutes: number;
  } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const viewStr = currentDate.toISOString().split("T")[0];
  const isToday = viewStr === todayStr;

  const dayEvents = events.filter((e) => {
    const start = e.start_time.split("T")[0];
    const end = e.end_time.split("T")[0];
    return viewStr >= start && viewStr <= end;
  });

  /* ---- Drag-to-create helpers ---- */

  const computeMinutesFromClientY = useCallback((clientY: number): number => {
    const gridEl = gridRef.current;
    if (!gridEl) return GRID_START_HOUR * 60 + 30;
    const rect = gridEl.getBoundingClientRect();
    const relY = clientY - rect.top;
    const raw = GRID_START_HOUR * 60 + (relY / HOUR_HEIGHT) * 60;
    return snapTo30(Math.max(GRID_START_HOUR * 60, Math.min(raw, (GRID_START_HOUR + HOURS.length) * 60)));
  }, []);

  const handleOverlayPointerDown = useCallback((e: React.PointerEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("button")) return;

    const minutes = computeMinutesFromClientY(e.clientY);
    if (overlayRef.current) overlayRef.current.setPointerCapture(e.pointerId);

    setCreating({ startMinutes: minutes, currentMinutes: minutes });
  }, [computeMinutesFromClientY]);

  const handleOverlayPointerMove = useCallback((e: React.PointerEvent) => {
    if (!creating) return;
    if (!e.isPrimary) return;
    const minutes = computeMinutesFromClientY(e.clientY);
    setCreating((prev) => prev ? { ...prev, currentMinutes: minutes } : null);
  }, [creating, computeMinutesFromClientY]);

  const handleOverlayPointerUp = useCallback((e: React.PointerEvent) => {
    if (!creating) return;
    if (overlayRef.current) overlayRef.current.releasePointerCapture(e.pointerId);

    const startMins = creating.startMinutes;
    const endMins = creating.currentMinutes;
    setCreating(null);

    if (Math.abs(endMins - startMins) < 15) return;

    const actualStart = Math.min(startMins, endMins);
    const actualEnd = Math.max(startMins, endMins);

    const pad = (n: number) => String(n).padStart(2, "0");
    const startISO = `${viewStr}T${pad(Math.floor(actualStart / 60))}:${pad(actualStart % 60)}:00Z`;
    const endISO = `${viewStr}T${pad(Math.floor(actualEnd / 60))}:${pad(actualEnd % 60)}:00Z`;

    onDragCreate(startISO, endISO);
  }, [creating, viewStr, onDragCreate]);

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

      const newStart = `${viewStr}T${pad(newHour)}:${pad(newMin)}:00Z`;

      const endHour = Math.floor(newEndMinutes / 60);
      const endMin = newEndMinutes % 60;
      const newEnd = `${viewStr}T${pad(Math.min(endHour, 23))}:${pad(Math.min(endMin, 59))}:00Z`;

      if (snappedMinutes === origStartMin) return;

      onEventReschedule(evt.id, newStart, newEnd);
    },
    [onEventReschedule, viewStr]
  );

  const timeGridHeight = HOURS.length * HOUR_HEIGHT;

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
    >
      <div className="bg-white rounded-xl border border-background-200 shadow-ambient overflow-hidden">
        {/* Day header */}
        <div className={`px-6 py-4 border-b border-background-200 ${isToday ? "bg-secondary-50/50" : ""}`}>
          <p className="text-sm font-semibold text-foreground-500">
            {currentDate.toLocaleDateString("en-US", { weekday: "long" })}
          </p>
          <p className={`text-2xl font-bold mt-0.5 ${isToday ? "text-secondary-600" : "text-foreground-950"}`}>
            {currentDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </p>
          <p className="text-xs text-foreground-400 mt-1">{dayEvents.length} event{dayEvents.length !== 1 ? "s" : ""}</p>
        </div>

        {/* Time grid */}
        <GridDroppable>
          <div ref={gridRef} className="relative" style={{ minHeight: `${timeGridHeight}px` }}>
            {HOURS.map((hour) => (
              <div key={hour} className="flex border-b border-background-100">
                <div className="w-16 flex-shrink-0 pr-2 pt-0 pb-0 border-r border-background-100">
                  <span className="text-[10px] text-foreground-400 font-medium block text-right -mt-1.5 pr-2">
                    {hour === 12 ? "12 PM" : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
                  </span>
                </div>
                <div className="flex-1 h-[64px]" />
              </div>
            ))}

            {/* Drag-to-create: transparent interaction overlay (z-[3] — above grid, below events) */}
            <div
              ref={overlayRef}
              className="absolute top-0 left-16 right-4 z-[3] touch-none"
              style={{ height: `${timeGridHeight}px` }}
              onPointerDown={handleOverlayPointerDown}
              onPointerMove={handleOverlayPointerMove}
              onPointerUp={handleOverlayPointerUp}
            />

            {/* Drag-to-create: selection visual */}
            {creating && (
              <div
                className="absolute left-16 right-4 z-[4] rounded-lg pointer-events-none"
                style={{
                  top: `${((Math.min(creating.startMinutes, creating.currentMinutes) - GRID_START_HOUR * 60) / 60) * HOUR_HEIGHT}px`,
                  height: `${(Math.abs(creating.currentMinutes - creating.startMinutes) / 60) * HOUR_HEIGHT}px`,
                  backgroundColor: "rgba(245, 158, 11, 0.15)",
                  border: "2px solid rgba(245, 158, 11, 0.5)",
                }}
              >
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-100 rounded-full px-2 py-0.5 whitespace-nowrap">
                  {formatTimeFromMinutes(Math.min(creating.startMinutes, creating.currentMinutes))}
                  <span>–</span>
                  {formatTimeFromMinutes(Math.max(creating.startMinutes, creating.currentMinutes))}
                </div>
              </div>
            )}

            {/* Event blocks */}
            {dayEvents.map((evt) => {
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
                />
              );
            })}
          </div>
        </GridDroppable>
      </div>

      {/* Drag overlay */}
      <DragOverlay dropAnimation={null}>
        {activeEvent ? (
          <div
            className="rounded-lg px-3 py-2 shadow-xl opacity-90 cursor-grabbing text-left border-l-2"
            style={{
              backgroundColor: eventTypeConfig[activeEvent.type]?.color,
              color: "#fff",
              borderLeftColor: "rgba(255,255,255,0.4)",
              minWidth: "180px",
            }}
          >
            <p className="text-sm font-semibold truncate">{activeEvent.title}</p>
            <p className="text-xs opacity-75 truncate mt-0.5">
              {formatTime(activeEvent.start_time)}
            </p>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}