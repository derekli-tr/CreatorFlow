import { useState, useEffect } from "react";
import { parseNaturalLanguageRequest, type SmartScheduleResult } from "@/pages/calendar/components/CalendarAIService";
import { eventTypeConfig } from "@/constants/eventTypes";

interface SmartScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateEvent: (result: SmartScheduleResult) => void;
  onEditInFullForm: (result: SmartScheduleResult) => void;
  currentDate: Date;
}

const EXAMPLE_PROMPTS = [
  "Schedule a 30-min check-in with Brightside next Tuesday morning",
  "Set up a 1-hour sprint review with TechFlow this Friday at 2pm",
  "Block 45 minutes for portfolio update tomorrow afternoon",
  "Deadline reminder for NexGen dashboard next Wednesday",
  "Schedule lunch with Sarah on July 25 at noon",
];

export default function SmartScheduleModal({
  isOpen,
  onClose,
  onCreateEvent,
  onEditInFullForm,
  currentDate,
}: SmartScheduleModalProps) {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<SmartScheduleResult | null>(null);
  const [showExamples, setShowExamples] = useState(true);
  const [parseTrigger, setParseTrigger] = useState(0);

  /* Reset on open */
  useEffect(() => {
    if (isOpen) {
      setInput("");
      setResult(null);
      setShowExamples(true);
    }
  }, [isOpen]);

  /* Auto-parse: debounce 600ms after typing stops, or on Enter */
  const handleInputChange = (val: string) => {
    setInput(val);
    setShowExamples(val.length === 0);
    if (val.trim().length >= 5) {
      setParseTrigger((p) => p + 1);
    } else {
      setResult(null);
    }
  };

  useEffect(() => {
    if (parseTrigger === 0) return;
    if (input.trim().length < 5) return;

    const timer = setTimeout(() => {
      const parsed = parseNaturalLanguageRequest(input.trim(), [], [], currentDate);
      setResult(parsed);
    }, 600);

    return () => clearTimeout(timer);
  }, [parseTrigger, input, currentDate]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && input.trim().length >= 5) {
      e.preventDefault();
      const parsed = parseNaturalLanguageRequest(input.trim(), [], [], currentDate);
      setResult(parsed);
    }
  };

  const handleExampleClick = (example: string) => {
    setInput(example);
    setShowExamples(false);
    const parsed = parseNaturalLanguageRequest(example, [], [], currentDate);
    setResult(parsed);
  };

  const cfg = result ? eventTypeConfig[result.type] : null;

  const confidenceConfig = {
    high: { color: "#22C55E", label: "High confidence", icon: "ri-shield-check-line" },
    medium: { color: "#F59E0B", label: "Medium confidence", icon: "ri-shield-flash-line" },
    low: { color: "#EF4444", label: "Low confidence — review below", icon: "ri-shield-cross-line" },
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-elevated w-full max-w-lg mx-4 overflow-hidden">
        {/* Decorative top bar */}
        <div className="h-1 bg-gradient-to-r from-amber-400 via-amber-500 to-rose-400" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br from-amber-100 to-amber-200">
              <i className="ri-robot-2-line text-amber-600" />
            </div>
            <div>
              <h3 className="font-heading font-semibold text-base text-foreground-950">Smart Schedule</h3>
              <p className="text-xs text-foreground-400">Describe your event naturally and I'll set it up</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-background-100 text-foreground-400 cursor-pointer transition-colors"
          >
            <i className="ri-close-line" />
          </button>
        </div>

        <div className="px-5 py-4">
          {/* Input */}
          <div className="relative">
            <textarea
              value={input}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g. Schedule a 30-min check-in with Brightside next Tuesday morning..."
              rows={2}
              className="w-full px-4 py-3.5 text-sm border border-background-200 rounded-xl bg-white text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-300 resize-none pr-10"
            />
            <div className="absolute right-3 top-3">
              <span className="w-6 h-6 flex items-center justify-center">
                <i className="ri-mic-line text-foreground-400 text-sm" />
              </span>
            </div>
          </div>

          {/* Example prompts */}
          {showExamples && (
            <div className="mt-3">
              <p className="text-[10px] font-semibold text-foreground-400 uppercase tracking-wider mb-2">
                Try these
              </p>
              <div className="flex flex-wrap gap-1.5">
                {EXAMPLE_PROMPTS.slice(0, 3).map((ex, i) => (
                  <button
                    key={i}
                    onClick={() => handleExampleClick(ex)}
                    className="text-[11px] text-foreground-500 bg-background-100 hover:bg-amber-50 hover:text-amber-700 px-2.5 py-1 rounded-full cursor-pointer transition-colors whitespace-nowrap"
                  >
                    {ex.length > 50 ? ex.slice(0, 50) + "…" : ex}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Parsed result preview */}
          {result && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-gradient-to-b from-amber-50/60 to-white p-4 space-y-4">
              {/* Confidence badge */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground-400 uppercase tracking-wider">
                  Parsed Result
                </span>
                <span
                  className="flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full"
                  style={{
                    color: confidenceConfig[result.confidence].color,
                    backgroundColor: `${confidenceConfig[result.confidence].color}15`,
                  }}
                >
                  <span className="w-3 h-3 flex items-center justify-center">
                    <i className={`${confidenceConfig[result.confidence].icon} text-[10px]`} />
                  </span>
                  {confidenceConfig[result.confidence].label}
                </span>
              </div>

              {/* Event preview card */}
              <div className="bg-white rounded-lg border border-background-200 p-3.5 space-y-3">
                {/* Title & type */}
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-foreground-950 leading-snug flex-1">
                    {result.title}
                  </p>
                  <span
                    className="flex-shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap text-white"
                    style={{ backgroundColor: cfg?.color }}
                  >
                    <span className="w-3 h-3 flex items-center justify-center">
                      <i className={`${cfg?.icon} text-[9px]`} />
                    </span>
                    {cfg?.label}
                  </span>
                </div>

                {/* Date & time */}
                <div className="flex items-center gap-4 text-xs text-foreground-600">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 flex items-center justify-center text-foreground-400">
                      <i className="ri-calendar-line text-xs" />
                    </span>
                    <span className="font-medium">
                      {new Date(`${result.startDate}T00:00:00`).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 flex items-center justify-center text-foreground-400">
                      <i className="ri-time-line text-xs" />
                    </span>
                    <span className="font-medium">
                      {result.startTime} – {result.endTime}
                      {result.startDate !== result.endDate && (
                        <span className="text-foreground-400 ml-0.5">
                          (+{Math.ceil((new Date(`${result.endDate}T${result.endTime}`).getTime() - new Date(`${result.startDate}T${result.startTime}`).getTime()) / (24 * 60 * 60 * 1000))}d)
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 flex items-center justify-center text-foreground-400">
                      <i className="ri-hourglass-line text-xs" />
                    </span>
                    <span className="font-medium">
                      {result.durationMinutes >= 60
                        ? `${Math.floor(result.durationMinutes / 60)}h${result.durationMinutes % 60 > 0 ? ` ${result.durationMinutes % 60}m` : ""}`
                        : `${result.durationMinutes}m`}
                    </span>
                  </div>
                </div>

                {/* Client & project chips */}
                {(result.clientName || result.projectName || result.location) && (
                  <div className="flex items-center gap-2 flex-wrap">
                    {result.clientName && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-background-100 text-[11px] font-medium text-foreground-600">
                        <span className="w-3 h-3 flex items-center justify-center">
                          <i className="ri-building-line text-[10px] text-foreground-400" />
                        </span>
                        {result.clientName}
                      </span>
                    )}
                    {result.projectName && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-background-100 text-[11px] font-medium text-foreground-600">
                        <span className="w-3 h-3 flex items-center justify-center">
                          <i className="ri-folder-line text-[10px] text-foreground-400" />
                        </span>
                        {result.projectName}
                      </span>
                    )}
                    {result.location && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-background-100 text-[11px] font-medium text-foreground-600">
                        <span className="w-3 h-3 flex items-center justify-center">
                          <i className="ri-map-pin-line text-[10px] text-foreground-400" />
                        </span>
                        {result.location}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* How it was parsed — collapsible notes */}
              <details className="group">
                <summary className="text-[11px] text-foreground-400 cursor-pointer hover:text-foreground-600 transition-colors list-none flex items-center gap-1">
                  <span className="w-3 h-3 flex items-center justify-center group-open:rotate-90 transition-transform">
                    <i className="ri-arrow-right-s-line text-xs" />
                  </span>
                  How this was parsed
                </summary>
                <div className="mt-2 pl-4 space-y-0.5">
                  {result.notes.map((note, i) => (
                    <p key={i} className="text-[11px] text-foreground-400">· {note}</p>
                  ))}
                </div>
              </details>

              {/* Action buttons */}
              <div className="flex gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => onCreateEvent(result)}
                  className="flex-1 flex items-center justify-center gap-2 bg-secondary-500 hover:bg-secondary-600 text-white font-medium text-sm py-2.5 rounded-lg whitespace-nowrap cursor-pointer transition-colors"
                >
                  <span className="w-4 h-4 flex items-center justify-center">
                    <i className="ri-sparkling-line" />
                  </span>
                  Create Event
                </button>
                <button
                  type="button"
                  onClick={() => onEditInFullForm(result)}
                  className="flex items-center justify-center gap-2 border border-background-200 hover:bg-background-50 text-foreground-600 font-medium text-sm py-2.5 px-4 rounded-lg whitespace-nowrap cursor-pointer transition-colors"
                >
                  <span className="w-4 h-4 flex items-center justify-center">
                    <i className="ri-edit-line" />
                  </span>
                  Edit details
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}