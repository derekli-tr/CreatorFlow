import { useState, useRef, useEffect, useCallback } from "react";
import { useClients } from "@/hooks/useClients";
import { useProjects } from "@/hooks/useProjects";
import {
  findOptimalSlots,
  generateAgenda,
  analyzeWeek,
  suggestTimeForClient,
  type SlotSuggestion,
} from "@/pages/calendar/components/CalendarAIService";

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

interface ChatMessage {
  role: "ai" | "user";
  content: string;
  slots?: SlotSuggestion[];
}

interface AIAssistantProps {
  allEvents: CalendarEvent[];
  currentDate: Date;
  onNewEvent?: (prefill: {
    title: string;
    start: string;
    end: string;
    clientId: string | null;
    projectId: string | null;
    description: string;
  }) => void;
}

const MEETING_DURATION = 60;

export default function AIAssistant({ allEvents, currentDate, onNewEvent }: AIAssistantProps) {
  const { clients } = useClients();
  const { projects } = useProjects();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "ai",
      content:
        "Hey! I'm your calendar assistant. I can find the best meeting times, draft agendas, analyze your week, and help you schedule smarter. What can I help with?",
    },
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollTop = messagesEndRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const simulateResponse = useCallback((response: string, slots?: SlotSuggestion[]) => {
    setIsTyping(true);
    const delay = Math.min(response.length * 12, 1800);
    setTimeout(() => {
      setMessages((prev) => [...prev, { role: "ai", content: response, slots }]);
      setIsTyping(false);
    }, delay);
  }, []);

  /* Build dynamic client quick actions from the top 3 most relevant */
  const getClientQuickActions = useCallback(() => {
    const upcomingClientEvents = allEvents
      .filter((e) => new Date(e.start_time) >= new Date() && e.client_id)
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

    const seen = new Set<string>();
    const actions: { id: string; company: string }[] = [];
    for (const evt of upcomingClientEvents) {
      if (!seen.has(evt.client_id!) && actions.length < 3) {
        seen.add(evt.client_id!);
        const client = clients.find((c) => c.id === evt.client_id);
        if (client) actions.push({ id: evt.client_id!, company: client.company });
      }
    }
    return actions;
  }, [allEvents, clients]);

  const handleQuickAction = (action: string) => {
    setMessages((prev) => [...prev, { role: "user", content: action }]);

    switch (action) {
      case "Find open slots this week": {
        const slots = findOptimalSlots(allEvents, currentDate, { clients });
        if (slots.length === 0) {
          simulateResponse(
            "Your week looks fully booked during business hours. Want me to check early morning or evening slots? I can also look at next week if that works better."
          );
        } else {
          const response = `I found **${slots.length} open slot${slots.length > 1 ? "s" : ""}** this week for a ${MEETING_DURATION}-minute meeting:\n\n${slots
            .map(
              (s, i) =>
                `**${i + 1}.** ${s.day}, ${s.date} · ${s.start}–${s.end}\n   ↳ *${s.reason}*`
            )
            .join("\n\n")}\n\nClick any slot to create the event, or ask me to narrow it down by client.`;
          simulateResponse(response, slots);
        }
        break;
      }
      case "Draft agenda for my next meeting": {
        const upcoming = allEvents
          .filter((e) => new Date(e.start_time) >= new Date() && e.type === "meeting")
          .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
        if (upcoming.length === 0) {
          simulateResponse(
            "You don't have any upcoming meetings on the calendar. Want to schedule one first? I can help find the best time."
          );
        } else {
          const { agenda, reasoning } = generateAgenda(upcoming[0], clients, projects);
          const response = `Here's a draft agenda for **"${upcoming[0].title}"**:\n\n${agenda}\n\n> *${reasoning}*\n\nWant me to adjust the time allocations or add specific discussion points?`;
          simulateResponse(response);
        }
        break;
      }
      case "Analyze my week": {
        const response = analyzeWeek(allEvents, currentDate);
        simulateResponse(response);
        break;
      }
      default: {
        /* Check if it's a client-specific action */
        const clientActions = getClientQuickActions();
        for (const ca of clientActions) {
          if (action === `Suggest time with ${ca.company}`) {
            const { response, slots } = suggestTimeForClient(allEvents, currentDate, ca.id, clients);
            simulateResponse(response, slots);
            return;
          }
        }
        simulateResponse(
          "Good question! I can help with finding open slots, drafting agendas, or analyzing your schedule. Try one of the quick actions below or ask me something specific about your calendar."
        );
      }
    }
  };

  const clientActions = getClientQuickActions();

  const staticActions = [
    { label: "Find open slots this week", icon: "ri-time-line" },
    { label: "Draft agenda for my next meeting", icon: "ri-file-list-3-line" },
    { label: "Analyze my week", icon: "ri-bar-chart-line" },
  ];

  return (
    <>
      {/* Collapsed button */}
      {!isOpen && (
        <div className="bg-white rounded-xl border border-background-200 shadow-ambient p-4">
          <button
            onClick={() => setIsOpen(true)}
            className="w-full flex items-center gap-3 group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-amber-100 to-amber-200 transition-transform group-hover:scale-105">
              <i className="ri-robot-2-line text-lg text-amber-600" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-foreground-800">AI Assistant</p>
              <p className="text-xs text-foreground-400">Schedule smarter</p>
            </div>
            <div className="ml-auto w-5 h-5 flex items-center justify-center">
              <i className="ri-arrow-up-s-line text-foreground-400" />
            </div>
          </button>
        </div>
      )}

      {/* Expanded panel */}
      {isOpen && (
        <div
          className="bg-white rounded-xl border border-background-200 shadow-ambient overflow-hidden flex flex-col"
          style={{ maxHeight: "520px" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-background-100 bg-gradient-to-r from-amber-50 to-white">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br from-amber-100 to-amber-200">
                <i className="ri-robot-2-line text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground-900">AI Assistant</p>
                <p className="text-[10px] text-foreground-400">Smart scheduling · Agenda drafting</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-background-100 text-foreground-400 cursor-pointer transition-colors"
            >
              <i className="ri-arrow-down-s-line" />
            </button>
          </div>

          {/* Messages */}
          <div
            ref={messagesEndRef}
            className="flex-1 overflow-y-auto px-4 py-3 space-y-3"
            style={{ maxHeight: "300px" }}
          >
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[90%] rounded-xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === "user"
                      ? "bg-secondary-500 text-white rounded-br-md"
                      : "bg-background-100 text-foreground-800 rounded-bl-md"
                  }`}
                >
                  {msg.content}
                  {msg.slots && msg.slots.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {msg.slots.slice(0, 3).map((slot, si) => (
                        <button
                          key={si}
                          onClick={() =>
                            onNewEvent?.({
                              title: "New Meeting",
                              start: `${slot.date}T${slot.start}:00`,
                              end: `${slot.date}T${slot.end}:00`,
                              clientId: null,
                              projectId: null,
                              description: "",
                            })
                          }
                          className="w-full text-left px-2.5 py-2 rounded-lg bg-white border border-background-200 hover:border-secondary-300 hover:bg-secondary-50/50 cursor-pointer transition-colors text-xs"
                        >
                          <p className="font-semibold text-foreground-800">
                            {slot.day}, {slot.date} · {slot.start}–{slot.end}
                          </p>
                          <p className="text-foreground-400 mt-0.5">{slot.reason}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-background-100 rounded-xl rounded-bl-md px-3 py-2">
                  <div className="flex gap-1">
                    <span
                      className="w-1.5 h-1.5 rounded-full bg-foreground-300 animate-bounce"
                      style={{ animationDelay: "0ms" }}
                    />
                    <span
                      className="w-1.5 h-1.5 rounded-full bg-foreground-300 animate-bounce"
                      style={{ animationDelay: "150ms" }}
                    />
                    <span
                      className="w-1.5 h-1.5 rounded-full bg-foreground-300 animate-bounce"
                      style={{ animationDelay: "300ms" }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick actions */}
          <div className="px-4 py-3 border-t border-background-100">
            <div className="flex flex-wrap gap-1.5">
              {staticActions.map((action) => (
                <button
                  key={action.label}
                  onClick={() => handleQuickAction(action.label)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-background-100 hover:bg-background-200 text-xs text-foreground-600 hover:text-foreground-800 cursor-pointer transition-colors whitespace-nowrap"
                >
                  <span className="w-3.5 h-3.5 flex items-center justify-center">
                    <i className={`${action.icon} text-[11px]`} />
                  </span>
                  {action.label}
                </button>
              ))}
              {clientActions.map((ca) => (
                <button
                  key={ca.id}
                  onClick={() => handleQuickAction(`Suggest time with ${ca.company}`)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-amber-50 hover:bg-amber-100 text-xs text-amber-700 hover:text-amber-800 cursor-pointer transition-colors whitespace-nowrap"
                >
                  <span className="w-3.5 h-3.5 flex items-center justify-center">
                    <i className="ri-user-heart-line text-[11px]" />
                  </span>
                  {ca.company}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}