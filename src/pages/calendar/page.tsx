import { useState, useMemo, useCallback, useRef } from "react";
import { useCalendarEvents, eventTypeConfig, type CalendarEvent } from "@/hooks/useCalendarEvents";
import CalendarHeader from "@/pages/calendar/components/CalendarHeader";
import MiniCalendar from "@/pages/calendar/components/MiniCalendar";
import MonthView from "@/pages/calendar/components/MonthView";
import WeekView from "@/pages/calendar/components/WeekView";
import DayView from "@/pages/calendar/components/DayView";
import NewEventModal from "@/pages/calendar/components/NewEventModal";
import EventDetailPopover from "@/pages/calendar/components/EventDetailPopover";
import AIAssistant from "@/pages/calendar/components/AIAssistant";
import SmartScheduleModal from "@/pages/calendar/components/SmartScheduleModal";
import UndoToast from "@/pages/calendar/components/UndoToast";
import type { SmartScheduleResult } from "@/pages/calendar/components/CalendarAIService";

type ViewMode = "month" | "week" | "day";

interface NewEventPrefill {
  title: string;
  start: string;
  end: string;
  clientId: string | null;
  projectId: string | null;
  description: string;
  type?: string;
  location?: string;
  eventId?: string;
}

interface PendingUndo {
  id: string;
  message: string;
  action: "create" | "reschedule";
  eventId: string;
  oldStartTime?: string;
  oldEndTime?: string;
}

export default function CalendarPage() {
  const {
    events: allEvents,
    isLoading,
    error,
    fetchEvents,
    createEvent,
    updateEvent,
    deleteEvent,
  } = useCalendarEvents();

  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showNewEventModal, setShowNewEventModal] = useState(false);
  const [showSmartSchedule, setShowSmartSchedule] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [eventPrefill, setEventPrefill] = useState<NewEventPrefill | undefined>(undefined);

  /* Undo toast stack */
  const pendingUndosRef = useRef<PendingUndo[]>([]);
  const [undoToasts, setUndoToasts] = useState<PendingUndo[]>([]);

  /* Build event count map for MiniCalendar dots */
  const eventsByDate = useMemo(() => {
    const map: Record<string, number> = {};
    allEvents.forEach((evt) => {
      const key = evt.start_time.split("T")[0];
      map[key] = (map[key] || 0) + 1;
    });
    return map;
  }, [allEvents]);

  /* Navigation handlers */
  const handlePrev = useCallback(() => {
    setCurrentDate((d) => {
      const n = new Date(d);
      if (viewMode === "month") n.setMonth(n.getMonth() - 1);
      else if (viewMode === "week") n.setDate(n.getDate() - 7);
      else n.setDate(n.getDate() - 1);
      return n;
    });
  }, [viewMode]);

  const handleNext = useCallback(() => {
    setCurrentDate((d) => {
      const n = new Date(d);
      if (viewMode === "month") n.setMonth(n.getMonth() + 1);
      else if (viewMode === "week") n.setDate(n.getDate() + 7);
      else n.setDate(n.getDate() + 1);
      return n;
    });
  }, [viewMode]);

  const handleToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  const handleViewChange = useCallback((mode: ViewMode) => {
    setViewMode(mode);
  }, []);

  const handleMiniCalendarSelect = useCallback((date: Date) => {
    setCurrentDate(date);
  }, []);

  /* Title generation */
  const title = useMemo(() => {
    if (viewMode === "month") {
      return currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    }
    if (viewMode === "week") {
      const start = new Date(currentDate);
      start.setDate(start.getDate() - start.getDay());
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      const sameMonth = start.getMonth() === end.getMonth();
      if (sameMonth) {
        return `${start.toLocaleDateString("en-US", { month: "long" })} ${start.getDate()} – ${end.getDate()}, ${end.getFullYear()}`;
      }
      return `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
    }
    return currentDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  }, [viewMode, currentDate]);

  /* New event / edit event handler */
  const handleNewEvent = useCallback(async (eventData: {
    id?: string;
    title: string;
    type: string;
    start_time: string;
    end_time: string;
    description: string;
    location: string;
    client_id: string | null;
    project_id: string | null;
  }) => {
    if (eventData.id) {
      /* Edit existing — no undo toast */
      await updateEvent(eventData.id, {
        title: eventData.title,
        type: eventData.type,
        start_time: eventData.start_time,
        end_time: eventData.end_time,
        description: eventData.description,
        location: eventData.location,
        client_id: eventData.client_id,
        project_id: eventData.project_id,
      });
    } else {
      /* New event — show undo toast */
      const created = await createEvent({
        title: eventData.title,
        type: eventData.type,
        start_time: eventData.start_time,
        end_time: eventData.end_time,
        description: eventData.description,
        location: eventData.location,
        client_id: eventData.client_id,
        project_id: eventData.project_id,
      });

      if (created) {
        const toastId = `undo-${Date.now()}`;
        pendingUndosRef.current = [...pendingUndosRef.current, {
          id: toastId,
          message: "Event created",
          action: "create",
          eventId: created.id,
        }];
        setUndoToasts((prev) => [...prev, {
          id: toastId,
          message: "Event created",
          action: "create",
          eventId: created.id,
        }]);
      }
    }

    setShowNewEventModal(false);
    setEventPrefill(undefined);
  }, [createEvent, updateEvent]);

  /* Drag-to-reschedule handler */
  const handleEventReschedule = useCallback(async (eventId: string, newStartISO: string, newEndISO: string) => {
    /* Capture old state before mutation for undo */
    const oldEvent = allEvents.find((e) => e.id === eventId);

    const success = await updateEvent(eventId, {
      start_time: newStartISO,
      end_time: newEndISO,
    });

    if (success && oldEvent) {
      const toastId = `undo-${Date.now()}`;
      pendingUndosRef.current = [...pendingUndosRef.current, {
        id: toastId,
        message: "Event moved",
        action: "reschedule",
        eventId,
        oldStartTime: oldEvent.start_time,
        oldEndTime: oldEvent.end_time,
      }];
      setUndoToasts((prev) => [...prev, {
        id: toastId,
        message: "Event moved",
        action: "reschedule",
        eventId,
        oldStartTime: oldEvent.start_time,
        oldEndTime: oldEvent.end_time,
      }]);
    }
  }, [allEvents, updateEvent]);

  /* Drag-to-create handler: open new event modal pre-filled with the selected time range */
  const handleDragCreate = useCallback((startISO: string, endISO: string) => {
    setEventPrefill({
      title: "",
      start: startISO,
      end: endISO,
      clientId: null,
      projectId: null,
      description: "",
    });
    setShowNewEventModal(true);
  }, []);

  /* Undo handler */
  const handleUndo = useCallback(async (undoId: string) => {
    const actionIdx = pendingUndosRef.current.findIndex((u) => u.id === undoId);
    if (actionIdx === -1) return;
    const action = pendingUndosRef.current[actionIdx];

    if (action.action === "reschedule" && action.oldStartTime && action.oldEndTime) {
      await updateEvent(action.eventId, {
        start_time: action.oldStartTime,
        end_time: action.oldEndTime,
      });
    } else if (action.action === "create") {
      await deleteEvent(action.eventId);
    }

    pendingUndosRef.current = pendingUndosRef.current.filter((u) => u.id !== undoId);
    setUndoToasts((prev) => prev.filter((u) => u.id !== undoId));
  }, [updateEvent, deleteEvent]);

  const handleDismissUndo = useCallback((undoId: string) => {
    pendingUndosRef.current = pendingUndosRef.current.filter((u) => u.id !== undoId);
    setUndoToasts((prev) => prev.filter((u) => u.id !== undoId));
  }, []);

  /* Edit button in popover → open modal pre-filled */
  const handleEditEvent = useCallback((evt: CalendarEvent) => {
    setSelectedEvent(null);
    setEventPrefill({
      title: evt.title,
      start: evt.start_time,
      end: evt.end_time,
      clientId: evt.client_id,
      projectId: evt.project_id,
      description: evt.description,
      type: evt.type,
      location: evt.location || "",
      eventId: evt.id,
    });
    setShowNewEventModal(true);
  }, []);

  /* AI suggested slot → prefill and open modal */
  const handleAISuggestion = useCallback((prefill: NewEventPrefill) => {
    setEventPrefill(prefill);
    setShowNewEventModal(true);
  }, []);

  /* Smart Schedule: create event directly */
  const handleSmartCreate = useCallback((result: SmartScheduleResult) => {
    setShowSmartSchedule(false);
    handleNewEvent({
      title: result.title,
      type: result.type,
      start_time: new Date(`${result.startDate}T${result.startTime}:00`).toISOString(),
      end_time: new Date(`${result.endDate}T${result.endTime}:00`).toISOString(),
      description: `Auto-created via Smart Schedule: "${result.rawInput}"`,
      location: result.location || "",
      client_id: result.clientId,
      project_id: result.projectId,
    });
  }, [handleNewEvent]);

  /* Smart Schedule: open full form pre-filled for editing */
  const handleSmartEdit = useCallback((result: SmartScheduleResult) => {
    setShowSmartSchedule(false);
    setEventPrefill({
      title: result.title,
      start: `${result.startDate}T${result.startTime}:00`,
      end: `${result.endDate}T${result.endTime}:00`,
      clientId: result.clientId,
      projectId: result.projectId,
      description: `Auto-created via Smart Schedule: "${result.rawInput}"`,
      type: result.type,
      location: result.location || "",
    });
    setShowNewEventModal(true);
  }, []);

  /* Loading state */
  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-foreground-500">Loading calendar...</p>
        </div>
      </div>
    );
  }

  /* Error state with retry */
  if (error) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-status-deleted text-sm">{error}</p>
          <button
            onClick={fetchEvents}
            className="bg-secondary-500 hover:bg-secondary-600 text-white font-medium text-sm py-2 px-4 rounded-lg whitespace-nowrap cursor-pointer transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <CalendarHeader
        viewMode={viewMode}
        onViewChange={handleViewChange}
        currentDate={currentDate}
        onPrev={handlePrev}
        onNext={handleNext}
        onToday={handleToday}
        title={title}
      />

      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="hidden lg:block w-[260px] flex-shrink-0 space-y-4">
          <button
            onClick={() => { setEventPrefill(undefined); setShowNewEventModal(true); }}
            className="w-full flex items-center justify-center gap-2 bg-secondary-500 hover:bg-secondary-600 text-white font-medium text-sm py-2.5 px-4 rounded-lg whitespace-nowrap cursor-pointer transition-colors"
          >
            <span className="w-4 h-4 flex items-center justify-center">
              <i className="ri-add-line" />
            </span>
            New Event
          </button>

          <button
            onClick={() => setShowSmartSchedule(true)}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-medium text-sm py-2.5 px-4 rounded-lg whitespace-nowrap cursor-pointer transition-all"
          >
            <span className="w-4 h-4 flex items-center justify-center">
              <i className="ri-robot-2-line" />
            </span>
            Smart Schedule
          </button>

          <AIAssistant
            allEvents={allEvents}
            currentDate={currentDate}
            onNewEvent={handleAISuggestion}
          />

          <MiniCalendar
            currentDate={currentDate}
            onDateSelect={handleMiniCalendarSelect}
            eventsByDate={eventsByDate}
          />

          {/* Legend */}
          <div className="bg-white rounded-xl border border-background-200 shadow-ambient p-4">
            <h4 className="text-xs font-semibold text-foreground-400 uppercase tracking-wider mb-3">Event Types</h4>
            <div className="space-y-2">
              {Object.entries(eventTypeConfig).map(([key, cfg]) => (
                <div key={key} className="flex items-center gap-2.5">
                  <div
                    className="w-3 h-3 rounded-sm flex-shrink-0"
                    style={{ backgroundColor: cfg.color }}
                  />
                  <span className="text-sm text-foreground-600">{cfg.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Upcoming */}
          <UpcomingEvents events={allEvents} onEventClick={setSelectedEvent} />
        </div>

        {/* Main calendar view */}
        <div className="flex-1 min-w-0">
          {/* Mobile new event button */}
          <div className="lg:hidden mb-4">
            <button
              onClick={() => { setEventPrefill(undefined); setShowNewEventModal(true); }}
              className="w-full flex items-center justify-center gap-2 bg-secondary-500 hover:bg-secondary-600 text-white font-medium text-sm py-2.5 px-4 rounded-lg whitespace-nowrap cursor-pointer transition-colors"
            >
              <span className="w-4 h-4 flex items-center justify-center">
                <i className="ri-add-line" />
              </span>
              New Event
            </button>
          </div>

          {viewMode === "month" && (
            <MonthView
              currentDate={currentDate}
              events={allEvents}
              onEventClick={setSelectedEvent}
              onEventReschedule={handleEventReschedule}
              eventTypeConfig={eventTypeConfig}
            />
          )}
          {viewMode === "week" && (
            <WeekView
              currentDate={currentDate}
              events={allEvents}
              onEventClick={setSelectedEvent}
              onEventReschedule={handleEventReschedule}
              onDragCreate={handleDragCreate}
              eventTypeConfig={eventTypeConfig}
            />
          )}
          {viewMode === "day" && (
            <DayView
              currentDate={currentDate}
              events={allEvents}
              onEventClick={setSelectedEvent}
              onEventReschedule={handleEventReschedule}
              onDragCreate={handleDragCreate}
              eventTypeConfig={eventTypeConfig}
            />
          )}
        </div>
      </div>

      {/* New Event Modal */}
      <NewEventModal
        isOpen={showNewEventModal}
        onClose={() => { setShowNewEventModal(false); setEventPrefill(undefined); }}
        onSave={handleNewEvent}
        defaultDate={currentDate}
        prefill={eventPrefill}
        allEvents={allEvents}
      />

      {/* Smart Schedule Modal */}
      <SmartScheduleModal
        isOpen={showSmartSchedule}
        onClose={() => setShowSmartSchedule(false)}
        onCreateEvent={handleSmartCreate}
        onEditInFullForm={handleSmartEdit}
        currentDate={currentDate}
      />

      {/* Event Detail Popover */}
      {selectedEvent && (
        <EventDetailPopover
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onEdit={handleEditEvent}
        />
      )}

      {/* Undo Toast */}
      <UndoToast
        toasts={undoToasts}
        onUndo={handleUndo}
        onDismiss={handleDismissUndo}
      />
    </div>
  );
}

/* Upcoming events sidebar widget */
function UpcomingEvents({ events, onEventClick }: { events: CalendarEvent[]; onEventClick: (e: CalendarEvent) => void }) {
  const now = new Date();
  const upcoming = events
    .filter((e) => new Date(e.start_time) >= now)
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
    .slice(0, 5);

  return (
    <div className="bg-white rounded-xl border border-background-200 shadow-ambient p-4">
      <h4 className="text-xs font-semibold text-foreground-400 uppercase tracking-wider mb-3">Up Next</h4>
      {upcoming.length === 0 ? (
        <p className="text-xs text-foreground-400">No upcoming events</p>
      ) : (
        <div className="space-y-3">
          {upcoming.map((evt) => {
            const cfg = eventTypeConfig[evt.type];
            const eventDate = new Date(evt.start_time);
            const isToday = eventDate.toDateString() === now.toDateString();
            const isTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toDateString() === eventDate.toDateString();
            const dayLabel = isToday ? "Today" : isTomorrow ? "Tomorrow" : eventDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });

            return (
              <button
                key={evt.id}
                onClick={() => onEventClick(evt)}
                className="w-full text-left group cursor-pointer"
              >
                <div className="flex items-start gap-2.5">
                  <div
                    className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                    style={{ backgroundColor: cfg?.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground-800 group-hover:text-secondary-500 transition-colors truncate">
                      {evt.title}
                    </p>
                    <p className="text-xs text-foreground-400 mt-0.5">
                      {dayLabel} · {eventDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}