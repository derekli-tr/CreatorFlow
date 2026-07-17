import { useState } from "react";

interface CommunicationLog {
  id: string;
  client_id: string;
  type: string;
  content: string;
  created_by: string;
  created_at: string;
}

interface CommunicationTimelineProps {
  logs: CommunicationLog[];
  onAddLog: () => void;
}

const typeConfig: Record<string, { icon: string; label: string; bg: string; color: string }> = {
  call: {
    icon: "ri-phone-line",
    label: "Call",
    bg: "#3B82F615",
    color: "#3B82F6",
  },
  email: {
    icon: "ri-mail-line",
    label: "Email",
    bg: "#10B98115",
    color: "#10B981",
  },
  meeting: {
    icon: "ri-video-chat-line",
    label: "Meeting",
    bg: "#F59E0B15",
    color: "#D97706",
  },
  note: {
    icon: "ri-sticky-note-line",
    label: "Note",
    bg: "#64748B15",
    color: "#64748B",
  },
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export default function CommunicationTimeline({ logs, onAddLog }: CommunicationTimelineProps) {
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const filteredLogs = typeFilter === "all" ? logs : logs.filter((l) => l.type === typeFilter);
  const sorted = [...filteredLogs].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <div className="bg-white rounded-xl border border-background-200 shadow-ambient p-5">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h3 className="font-heading font-semibold text-lg text-foreground-900">
          Communication Timeline
        </h3>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-background-100 rounded-lg p-0.5">
            {["all", "meeting", "call", "email", "note"].map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                  typeFilter === t
                    ? "bg-white text-foreground-900 shadow-sm"
                    : "text-foreground-500 hover:text-foreground-700"
                }`}
              >
                {t === "all" ? "All" : typeConfig[t]?.label || t}
              </button>
            ))}
          </div>
          <button
            onClick={onAddLog}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-500 text-white text-xs font-semibold hover:bg-accent-600 transition-colors cursor-pointer whitespace-nowrap"
          >
            <span className="w-3.5 h-3.5 flex items-center justify-center">
              <i className="ri-add-line" />
            </span>
            Log Activity
          </button>
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className="text-center py-12">
          <span className="w-12 h-12 rounded-full bg-background-100 flex items-center justify-center mx-auto mb-3">
            <i className="ri-chat-history-line text-2xl text-foreground-400" />
          </span>
          <p className="text-sm text-foreground-500">No communication logs yet</p>
          <button
            onClick={onAddLog}
            className="text-sm text-secondary-500 hover:text-secondary-600 font-medium mt-1 cursor-pointer"
          >
            Log your first interaction
          </button>
        </div>
      ) : (
        <div className="relative">
          <div className="absolute left-[15px] top-2 bottom-2 w-px bg-background-200" />
          <div className="space-y-0">
            {sorted.map((log, idx) => {
              const tc = typeConfig[log.type] || typeConfig.note;
              return (
                <div key={log.id} className="relative flex gap-4 pb-5 last:pb-0">
                  <div
                    className="relative z-10 w-[30px] h-[30px] rounded-full flex items-center justify-center shrink-0 border-2 border-white"
                    style={{ backgroundColor: tc.bg }}
                  >
                    <i className={tc.icon} style={{ color: tc.color, fontSize: "13px" }} />
                  </div>
                  <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span
                        className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded"
                        style={{ backgroundColor: tc.bg, color: tc.color }}
                      >
                        {tc.label}
                      </span>
                      <span className="text-xs text-foreground-400">
                        {formatDate(log.created_at)} at {formatTime(log.created_at)}
                      </span>
                    </div>
                    <p className="text-sm text-foreground-700 leading-relaxed">{log.content}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}