import { useState } from "react";
import { Link } from "react-router-dom";
import { useClients } from "@/hooks/useClients";
import { useProjects } from "@/hooks/useProjects";
import { eventTypeConfig } from "@/constants/eventTypes";
import { generateAgenda } from "@/pages/calendar/components/CalendarAIService";

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

interface EventDetailPopoverProps {
  event: CalendarEvent;
  onClose: () => void;
  onEdit: (event: CalendarEvent) => void;
}

export default function EventDetailPopover({ event: evt, onClose, onEdit }: EventDetailPopoverProps) {
  const { clients } = useClients();
  const { projects } = useProjects();
  const cfg = eventTypeConfig[evt.type];
  const client = evt.client_id ? clients.find((c) => c.id === evt.client_id) : null;
  const project = evt.project_id ? projects.find((p) => p.id === evt.project_id) : null;

  const [showAgenda, setShowAgenda] = useState(false);
  const [agendaLoading, setAgendaLoading] = useState(false);
  const [draftedAgenda, setDraftedAgenda] = useState("");

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const isDeadline = evt.type === "deadline";
  const isMeeting = evt.type === "meeting";

  const handleDraftAgenda = () => {
    if (showAgenda) {
      setShowAgenda(false);
      return;
    }

    setShowAgenda(true);
    setAgendaLoading(true);

    setTimeout(() => {
      const { agenda } = generateAgenda(evt, clients, projects, evt.client_id, evt.project_id);
      setDraftedAgenda(agenda);
      setAgendaLoading(false);
    }, 700);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-elevated w-full max-w-sm mx-4 overflow-hidden">
        {/* Color bar */}
        <div className="h-1.5" style={{ backgroundColor: cfg?.color }} />

        <div className="p-5">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex items-start gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: cfg?.bg }}
              >
                <i className={cfg?.icon} style={{ color: cfg?.color }} />
              </div>
              <div>
                <h3 className="font-heading font-semibold text-base text-foreground-950 leading-tight">
                  {evt.title}
                </h3>
                <span
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold mt-1"
                  style={{ backgroundColor: cfg?.bg, color: cfg?.color }}
                >
                  {cfg?.label}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-background-100 text-foreground-400 cursor-pointer flex-shrink-0 transition-colors"
            >
              <i className="ri-close-line" />
            </button>
          </div>

          <div className="space-y-2.5 mb-4">
            <div className="flex items-start gap-2">
              <i className="ri-calendar-line text-sm text-foreground-400 mt-0.5" />
              <div>
                <p className="text-sm text-foreground-800 font-medium">{formatDateTime(evt.start_time)}</p>
                <p className="text-xs text-foreground-500">
                  to{" "}
                  {new Date(evt.end_time).toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>

            {evt.location && (
              <div className="flex items-start gap-2">
                <i className="ri-map-pin-line text-sm text-foreground-400 mt-0.5" />
                <p className="text-sm text-foreground-700">{evt.location}</p>
              </div>
            )}

            {client && (
              <div className="flex items-start gap-2">
                <i className="ri-building-line text-sm text-foreground-400 mt-0.5" />
                <Link
                  to={`/clients/${client.id}`}
                  className="text-sm text-secondary-500 hover:text-secondary-600 font-medium"
                >
                  {client.company}
                </Link>
              </div>
            )}

            {project && (
              <div className="flex items-start gap-2">
                <i className="ri-briefcase-line text-sm text-foreground-400 mt-0.5" />
                <Link
                  to={`/projects/${project.id}`}
                  className="text-sm text-secondary-500 hover:text-secondary-600 font-medium"
                >
                  {project.title}
                </Link>
              </div>
            )}

            {evt.description && (
              <div className="flex items-start gap-2">
                <i className="ri-file-text-line text-sm text-foreground-400 mt-0.5" />
                <p className="text-sm text-foreground-600 leading-relaxed">{evt.description}</p>
              </div>
            )}
          </div>

          {/* AI Draft Agenda */}
          {isMeeting && (
            <div className="mb-3">
              <button
                onClick={handleDraftAgenda}
                className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium cursor-pointer transition-colors ${
                  showAgenda
                    ? "border-amber-300 bg-amber-50 text-amber-700"
                    : "border-dashed border-amber-300 bg-amber-50/50 text-amber-700 hover:bg-amber-50"
                }`}
              >
                <span className="w-4 h-4 flex items-center justify-center">
                  <i className="ri-robot-2-line" />
                </span>
                {showAgenda ? "Hide Agenda" : "AI Draft Agenda"}
              </button>

              {showAgenda && (
                <div className="mt-2 rounded-lg border border-amber-200 bg-gradient-to-b from-amber-50/60 to-white p-3 max-h-52 overflow-y-auto">
                  {agendaLoading ? (
                    <div className="flex items-center gap-3 py-2">
                      <div className="flex gap-1">
                        <span
                          className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce"
                          style={{ animationDelay: "0ms" }}
                        />
                        <span
                          className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce"
                          style={{ animationDelay: "150ms" }}
                        />
                        <span
                          className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce"
                          style={{ animationDelay: "300ms" }}
                        />
                      </div>
                      <span className="text-xs text-foreground-500">Drafting agenda...</span>
                    </div>
                  ) : (
                    <pre className="text-xs text-foreground-700 font-sans whitespace-pre-wrap leading-relaxed">
                      {draftedAgenda}
                    </pre>
                  )}
                </div>
              )}
            </div>
          )}

          {isDeadline && project && (
            <div className="bg-red-50 rounded-lg p-3 mb-3 border border-red-100">
              <p className="text-xs font-medium text-red-600 flex items-center gap-1">
                <i className="ri-error-warning-line text-sm" />
                Project Deadline
              </p>
              <p className="text-xs text-red-500 mt-0.5">
                {project.title} is due{" "}
                {new Date(project.end_date).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>
          )}

          <div className="flex gap-2 pt-2 border-t border-background-100">
            <button
              onClick={() => onEdit(evt)}
              className="flex-1 btn-ghost border border-background-200 text-sm py-2 rounded-lg cursor-pointer"
            >
              <i className="ri-edit-line text-xs" /> Edit
            </button>
            <button className="flex-1 btn-ghost border border-background-200 text-sm py-2 rounded-lg cursor-pointer text-red-500 hover:bg-red-50">
              <i className="ri-delete-bin-line text-xs" /> Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}