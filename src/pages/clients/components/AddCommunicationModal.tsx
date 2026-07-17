import { useState } from "react";

interface AddCommunicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (log: { type: string; content: string }) => void;
}

export default function AddCommunicationModal({ isOpen, onClose, onAdd }: AddCommunicationModalProps) {
  const [type, setType] = useState("note");
  const [content, setContent] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    onAdd({ type, content: content.trim() });
    setType("note");
    setContent("");
    onClose();
  };

  const types = [
    { value: "note", icon: "ri-sticky-note-line", label: "Note", color: "#64748B" },
    { value: "call", icon: "ri-phone-line", label: "Call", color: "#3B82F6" },
    { value: "email", icon: "ri-mail-line", label: "Email", color: "#10B981" },
    { value: "meeting", icon: "ri-video-chat-line", label: "Meeting", color: "#D97706" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh]">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-lg w-full max-w-md mx-4">
        <div className="border-b border-background-200 px-6 py-4 flex items-center justify-between rounded-t-xl">
          <h3 className="font-heading font-semibold text-lg text-foreground-900">Log Activity</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-background-100 flex items-center justify-center cursor-pointer">
            <i className="ri-close-line text-foreground-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-foreground-600 mb-2">Type</label>
            <div className="grid grid-cols-4 gap-2">
              {types.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setType(t.value)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-colors cursor-pointer ${
                    type === t.value
                      ? "border-secondary-300 bg-secondary-50"
                      : "border-background-200 hover:bg-background-50"
                  }`}
                >
                  <i className={t.icon} style={{ color: t.color, fontSize: "18px" }} />
                  <span className="text-[11px] font-medium text-foreground-700">{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground-600 mb-1.5">Details</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 rounded-lg border border-background-200 bg-white text-sm text-foreground-900 focus:outline-none focus:ring-2 focus:ring-secondary-300 focus:border-transparent resize-none"
              placeholder="What happened? Record key details, decisions, or follow-up items..."
              required
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-background-200 text-sm font-medium text-foreground-600 hover:bg-background-50 transition-colors cursor-pointer whitespace-nowrap"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-accent-500 text-white text-sm font-semibold hover:bg-accent-600 transition-colors cursor-pointer whitespace-nowrap"
            >
              Save Log
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}