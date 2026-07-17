import { useState, useEffect } from "react";
import { useClients } from "@/hooks/useClients";
import { useProjects } from "@/hooks/useProjects";
import { eventTypeConfig } from "@/constants/eventTypes";
import {
  findOptimalSlots,
  generateAgenda,
  type SlotSuggestion,
} from "@/pages/calendar/components/CalendarAIService";

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

interface NewEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (event: {
    id?: string;
    title: string;
    type: string;
    start_time: string;
    end_time: string;
    description: string;
    location: string;
    client_id: string | null;
    project_id: string | null;
  }) => void;
  defaultDate?: Date;
  prefill?: NewEventPrefill;
  allEvents?: Array<{
    id: string;
    title: string;
    type: string;
    start_time: string;
    end_time: string;
    client_id: string | null;
    project_id: string | null;
    description: string;
    location: string | null;
  }>;
}

function toDatetimeLocal(isoLike: string): string {
  return isoLike.slice(0, 16);
}

export default function NewEventModal({
  isOpen,
  onClose,
  onSave,
  defaultDate,
  prefill,
  allEvents = [],
}: NewEventModalProps) {
  const { clients } = useClients();
  const { projects } = useProjects();

  const defaultStart = defaultDate
    ? new Date(defaultDate.getFullYear(), defaultDate.getMonth(), defaultDate.getDate(), 9, 0)
        .toISOString()
        .slice(0, 16)
    : "";
  const defaultEnd = defaultDate
    ? new Date(defaultDate.getFullYear(), defaultDate.getMonth(), defaultDate.getDate(), 10, 0)
        .toISOString()
        .slice(0, 16)
    : "";

  const [title, setTitle] = useState("");
  const [type, setType] = useState("meeting");
  const [startTime, setStartTime] = useState(defaultStart);
  const [endTime, setEndTime] = useState(defaultEnd);
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [clientId, setClientId] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);

  /* AI Suggest state */
  const [aiSuggestOpen, setAiSuggestOpen] = useState(false);
  const [aiSlots, setAiSlots] = useState<SlotSuggestion[]>([]);
  const [aiAgenda, setAiAgenda] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [selectedSlotIdx, setSelectedSlotIdx] = useState<number | null>(null);

  /* Apply prefill when modal opens with AI suggestion or edit data */
  useEffect(() => {
    if (isOpen && prefill) {
      setTitle(prefill.title);
      setType(prefill.type || "meeting");
      setStartTime(toDatetimeLocal(prefill.start));
      setEndTime(toDatetimeLocal(prefill.end));
      setDescription(prefill.description);
      setLocation(prefill.location || "");
      setClientId(prefill.clientId);
      setProjectId(prefill.projectId);
      setAiSuggestOpen(false);
    } else if (isOpen && !prefill) {
      setTitle("");
      setType("meeting");
      setStartTime(defaultStart);
      setEndTime(defaultEnd);
      setDescription("");
      setLocation("");
      setClientId(null);
      setProjectId(null);
      setAiSuggestOpen(false);
    }
  }, [isOpen, prefill, defaultStart, defaultEnd]);

  /* Reset AI state when client/project changes */
  useEffect(() => {
    setAiSuggestOpen(false);
    setSelectedSlotIdx(null);
  }, [clientId, projectId]);

  if (!isOpen) return null;

  const availableProjects = clientId
    ? projects.filter((p) => p.client_id === clientId)
    : projects;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !startTime || !endTime) return;
    onSave({
      id: prefill?.eventId,
      title: title.trim(),
      type,
      start_time: new Date(startTime).toISOString(),
      end_time: new Date(endTime).toISOString(),
      description: description.trim(),
      location: location.trim(),
      client_id: clientId,
      project_id: projectId,
    });
    onClose();
  };

  const handleAISuggest = () => {
    setAiSuggestOpen(true);
    setAiLoading(true);
    setSelectedSlotIdx(null);

    /* Simulate AI processing delay for natural feel */
    setTimeout(() => {
      const slots = findOptimalSlots(allEvents, defaultDate || new Date(), {
        clientId,
        duration: type === "meeting" ? 60 : 30,
        clients,
      });

      const { agenda } = generateAgenda(
        { title: title || "New Meeting", start_time: startTime ? new Date(startTime).toISOString() : undefined, end_time: endTime ? new Date(endTime).toISOString() : undefined },
        clients,
        projects,
        clientId,
        projectId
      );

      setAiSlots(slots);
      setAiAgenda(agenda);
      setAiLoading(false);
    }, 800);
  };

  const handleApplySlot = (slot: SlotSuggestion, idx: number) => {
    setSelectedSlotIdx(idx);
    setStartTime(`${slot.date}T${slot.start}`);
    setEndTime(`${slot.date}T${slot.end}`);

    if (!title.trim()) {
      const client = clientId ? clients.find((c) => c.id === clientId) : null;
      const project = projectId ? projects.find((p) => p.id === projectId) : null;
      const prefix = project ? project.title.split(" ").slice(0, 3).join(" ") : client ? client.company : "";
      setTitle(prefix ? `${prefix} — Sync` : "Team Sync");
    }

    if (!description.trim()) {
      setDescription(aiAgenda);
    }
  };

  const eventTypes = Object.entries(eventTypeConfig);
  const canAISuggest = (clientId || projectId || title.trim()) && !prefill?.eventId;
  const isEditMode = !!prefill?.eventId;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-elevated p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-heading font-semibold text-lg text-foreground-950">
            {isEditMode ? "Edit Event" : prefill ? "Create from Suggestion" : "New Event"}
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-background-100 text-foreground-400 cursor-pointer transition-colors"
          >
            <i className="ri-close-line" />
          </button>
        </div>

        {prefill && !isEditMode && (
          <div className="mb-4 px-3 py-2 rounded-lg bg-amber-50 border border-amber-100 text-xs text-amber-700 flex items-start gap-2">
            <i className="ri-robot-2-line text-amber-500 mt-0.5" />
            <span>AI suggested this time slot based on your availability. Adjust as needed.</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Event type selector */}
          <div>
            <label className="text-xs font-semibold text-foreground-400 uppercase tracking-wider block mb-2">
              Event Type
            </label>
            <div className="flex gap-1.5 flex-wrap">
              {eventTypes.map(([key, cfg]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setType(key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-colors whitespace-nowrap ${
                    type === key ? "text-white" : "text-foreground-600 hover:bg-background-100"
                  }`}
                  style={type === key ? { backgroundColor: cfg.color } : {}}
                >
                  <span className="w-3.5 h-3.5 flex items-center justify-center">
                    <i className={`${cfg.icon} text-[10px]`} />
                  </span>
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="text-xs font-semibold text-foreground-400 uppercase tracking-wider block mb-1.5">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Client kickoff meeting"
              className="w-full px-3 py-2 text-sm border border-background-200 rounded-lg bg-white text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:ring-2 focus:ring-secondary-200 focus:border-secondary-300"
              required
            />
          </div>

          {/* AI Suggest button */}
          {canAISuggest && !aiSuggestOpen && (
            <button
              type="button"
              onClick={handleAISuggest}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-dashed border-amber-300 bg-amber-50/50 hover:bg-amber-50 text-amber-700 text-sm font-medium cursor-pointer transition-colors"
            >
              <span className="w-4 h-4 flex items-center justify-center">
                <i className="ri-robot-2-line" />
              </span>
              AI Suggest — find best time & draft agenda
            </button>
          )}

          {/* AI Suggest panel */}
          {aiSuggestOpen && (
            <div className="rounded-xl border border-amber-200 bg-gradient-to-b from-amber-50/80 to-white p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-gradient-to-br from-amber-100 to-amber-200">
                    <i className="ri-robot-2-line text-amber-600 text-sm" />
                  </div>
                  <span className="text-sm font-semibold text-foreground-800">AI Suggestions</span>
                </div>
                <button
                  type="button"
                  onClick={() => setAiSuggestOpen(false)}
                  className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-background-100 text-foreground-400 cursor-pointer transition-colors"
                >
                  <i className="ri-close-line text-xs" />
                </button>
              </div>

              {aiLoading ? (
                <div className="flex items-center gap-3 py-3">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                  <span className="text-xs text-foreground-500">Analyzing your calendar...</span>
                </div>
              ) : (
                <>
                  {/* Time slot suggestions */}
                  {aiSlots.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-foreground-400 uppercase tracking-wider mb-2">
                        Best Time Slots
                      </p>
                      <div className="space-y-1.5">
                        {aiSlots.slice(0, 3).map((slot, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleApplySlot(slot, idx)}
                            className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors cursor-pointer text-xs ${
                              selectedSlotIdx === idx
                                ? "border-secondary-400 bg-secondary-50"
                                : "border-background-200 bg-white hover:border-secondary-200 hover:bg-secondary-50/30"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <p className="font-semibold text-foreground-800">
                                {slot.day}, {slot.date} · {slot.start}–{slot.end}
                              </p>
                              {selectedSlotIdx === idx && (
                                <span className="w-4 h-4 flex items-center justify-center text-secondary-500">
                                  <i className="ri-check-line text-xs" />
                                </span>
                              )}
                            </div>
                            <p className="text-foreground-400 mt-0.5">{slot.reason}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Agenda preview */}
                  {aiAgenda && selectedSlotIdx !== null && (
                    <div>
                      <p className="text-xs font-semibold text-foreground-400 uppercase tracking-wider mb-2">
                        Draft Agenda
                      </p>
                      <div className="bg-white rounded-lg border border-background-200 p-3 max-h-40 overflow-y-auto">
                        <pre className="text-xs text-foreground-700 font-sans whitespace-pre-wrap leading-relaxed">
                          {aiAgenda}
                        </pre>
                      </div>
                      <p className="text-[10px] text-foreground-400 mt-1.5">
                        Agenda will be added to the description. Edit it anytime before saving.
                      </p>
                    </div>
                  )}

                  {aiSlots.length === 0 && (
                    <p className="text-xs text-foreground-500 py-2">
                      No open slots found this week during business hours. Try selecting a different date range or adjusting your existing events.
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          {/* Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-foreground-400 uppercase tracking-wider block mb-1.5">
                Start
              </label>
              <input
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-background-200 rounded-lg bg-white text-foreground-900 focus:outline-none focus:ring-2 focus:ring-secondary-200 focus:border-secondary-300"
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground-400 uppercase tracking-wider block mb-1.5">
                End
              </label>
              <input
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-background-200 rounded-lg bg-white text-foreground-900 focus:outline-none focus:ring-2 focus:ring-secondary-200 focus:border-secondary-300"
                required
              />
            </div>
          </div>

          {/* Client */}
          <div>
            <label className="text-xs font-semibold text-foreground-400 uppercase tracking-wider block mb-1.5">
              Client (optional)
            </label>
            <select
              value={clientId || ""}
              onChange={(e) => {
                const val = e.target.value || null;
                setClientId(val);
                if (!val) setProjectId(null);
              }}
              className="w-full px-3 py-2 text-sm border border-background-200 rounded-lg bg-white text-foreground-900 focus:outline-none focus:ring-2 focus:ring-secondary-200 focus:border-secondary-300"
            >
              <option value="">No client</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.company}
                </option>
              ))}
            </select>
          </div>

          {/* Project */}
          <div>
            <label className="text-xs font-semibold text-foreground-400 uppercase tracking-wider block mb-1.5">
              Project (optional)
            </label>
            <select
              value={projectId || ""}
              onChange={(e) => setProjectId(e.target.value || null)}
              className="w-full px-3 py-2 text-sm border border-background-200 rounded-lg bg-white text-foreground-900 focus:outline-none focus:ring-2 focus:ring-secondary-200 focus:border-secondary-300"
            >
              <option value="">No project</option>
              {availableProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>

          {/* Location */}
          <div>
            <label className="text-xs font-semibold text-foreground-400 uppercase tracking-wider block mb-1.5">
              Location (optional)
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Google Meet link or office address"
              className="w-full px-3 py-2 text-sm border border-background-200 rounded-lg bg-white text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:ring-2 focus:ring-secondary-200 focus:border-secondary-300"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-semibold text-foreground-400 uppercase tracking-wider block mb-1.5">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add details or agenda..."
              rows={3}
              maxLength={500}
              className="w-full px-3 py-2 text-sm border border-background-200 rounded-lg bg-white text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:ring-2 focus:ring-secondary-200 focus:border-secondary-300 resize-none"
            />
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-ghost border border-background-200 text-sm px-4 py-2 rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-secondary-500 hover:bg-secondary-600 text-white font-medium text-sm px-5 py-2 rounded-lg whitespace-nowrap cursor-pointer transition-colors"
            >
              {isEditMode ? "Save Changes" : "Create Event"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}