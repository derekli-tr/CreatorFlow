import type { Client } from "@/hooks/useClients";

export interface SlotSuggestion {
  day: string;
  date: string;
  start: string;
  end: string;
  reason: string;
}

export interface AgendaSuggestion {
  agenda: string;
  reasoning: string;
}

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

interface ProjectInfo {
  id: string;
  client_id: string;
  title: string;
  description: string;
  status: string;
  start_date: string;
  end_date: string;
  budget: number;
}

const BUSINESS_HOURS_START = 8;
const BUSINESS_HOURS_END = 18;
const DEFAULT_DURATION = 60;

function getWeekRange(date: Date): { start: Date; end: Date } {
  const start = new Date(date);
  start.setDate(start.getDate() - start.getDay());
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function getDayLabel(day: Date, today: Date): string {
  if (day.toDateString() === today.toDateString()) return "Today";
  const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  if (day.toDateString() === tomorrow.toDateString()) return "Tomorrow";
  return day.toLocaleDateString("en-US", { weekday: "long" });
}

/* --- Core slot finding --- */
export function findOptimalSlots(
  events: CalendarEvent[],
  date: Date,
  opts?: { clientId?: string | null; duration?: number; preferredDay?: number; clients?: Client[] }
): SlotSuggestion[] {
  const duration = opts?.duration || DEFAULT_DURATION;
  const { start: weekStart, end: weekEnd } = getWeekRange(date);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const weekEvents = events.filter((e) => {
    const eventStart = new Date(e.start_time);
    const eventEnd = new Date(e.end_time);
    return eventStart <= weekEnd && eventEnd >= weekStart;
  });

  const clients = opts?.clients || [];
  const client = opts?.clientId ? clients.find((c) => c.id === opts.clientId) : null;

  const allSlots: SlotSuggestion[] = [];

  for (let d = 0; d < 7; d++) {
    const day = new Date(weekStart);
    day.setDate(day.getDate() + d);
    if (day < today) continue;

    /* Skip weekends unless we're low on options */
    const dayOfWeek = day.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    const dayEvents = weekEvents.filter((e) => {
      const es = new Date(e.start_time);
      const ee = new Date(e.end_time);
      const ds = new Date(day.getFullYear(), day.getMonth(), day.getDate());
      const de = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59);
      return es <= de && ee >= ds;
    });

    const busyRanges = dayEvents
      .map((e) => ({
        start: Math.max(
          new Date(e.start_time).getHours() * 60 + new Date(e.start_time).getMinutes(),
          BUSINESS_HOURS_START * 60
        ),
        end: Math.min(
          new Date(e.end_time).getHours() * 60 + new Date(e.end_time).getMinutes(),
          BUSINESS_HOURS_END * 60
        ),
      }))
      .filter((r) => r.start < r.end)
      .sort((a, b) => a.start - b.start);

    let cursor = BUSINESS_HOURS_START * 60;
    for (const busy of busyRanges) {
      const gap = busy.start - cursor;
      if (gap >= duration) {
        const slot = buildSlot(day, cursor, duration, gap, isWeekend, client, today);
        allSlots.push(slot);
      }
      cursor = Math.max(cursor, busy.end);
    }

    const finalGap = BUSINESS_HOURS_END * 60 - cursor;
    if (finalGap >= duration) {
      const slot = buildSlot(day, cursor, duration, finalGap, isWeekend, client, today);
      allSlots.push(slot);
    }
  }

  /* Scoring — prefer weekday mornings, penalize weekends, boost preferred day */
  const scored = allSlots.map((slot) => {
    let score = 0;
    const hour = parseInt(slot.start.split(":")[0], 10);
    const slotDay = new Date(slot.date + "T00:00:00").getDay();

    if (hour >= 9 && hour <= 11) score += 3;
    else if (hour >= 14 && hour <= 16) score += 2;
    else score += 1;

    if (slotDay === 0 || slotDay === 6) score -= 2;

    if (opts?.preferredDay !== undefined && slotDay === opts.preferredDay) score += 4;

    if (client && (client as unknown as Record<string, unknown>).preferred_contact_method) score += 1;

    return { ...slot, score };
  });

  scored.sort((a, b) => (b as any).score - (a as any).score);

  return scored.slice(0, 5).map(({ score, ...rest }) => rest);
}

function buildSlot(
  day: Date,
  cursorMinutes: number,
  duration: number,
  gap: number,
  isWeekend: boolean,
  client: { name?: string; company?: string } | undefined | null,
  today: Date
): SlotSuggestion {
  const startH = Math.floor(cursorMinutes / 60);
  const startM = cursorMinutes % 60;
  const endMinutes = cursorMinutes + duration;
  const endH = Math.floor(endMinutes / 60);
  const endM = endMinutes % 60;
  const dayLabel = getDayLabel(day, today);

  let reason = "";
  if (startH >= 9 && startH <= 10) reason = "Prime morning slot — highest energy for important discussions";
  else if (startH >= 14 && startH <= 15) reason = "Good afternoon window — post-lunch clarity";
  else if (startH >= 16) reason = "Late afternoon — ideal for quick syncs and wrap-ups";
  else if (startH < 9) reason = "Early start — great for international or east-coast clients";
  else reason = gap >= 180 ? "Large uninterrupted block — plenty of buffer time" : "Fits neatly between existing commitments";

  if (isWeekend) reason = "Weekend slot — only if you're flexible";
  if (client?.company) reason += ` · Works well with ${client.company}'s schedule`;

  return {
    day: dayLabel,
    date: day.toISOString().split("T")[0],
    start: `${String(startH).padStart(2, "0")}:${String(startM).padStart(2, "0")}`,
    end: `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`,
    reason,
  };
}

/* --- Agenda generation --- */
export function generateAgenda(
  event: Partial<CalendarEvent> & { title: string },
  clients: Client[],
  projects: ProjectInfo[],
  clientId?: string | null,
  projectId?: string | null
): AgendaSuggestion {
  const client = clientId ? clients.find((c) => c.id === clientId) : null;
  const project = projectId ? projects.find((p) => p.id === projectId) : null;

  const clientName = client?.name || "the team";
  const companyName = client?.company || "the client";
  const projectName = project?.title || "the current engagement";

  let agenda = "";
  const startTime = event.start_time
    ? new Date(event.start_time).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    : "TBD";
  const endTime = event.end_time
    ? new Date(event.end_time).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    : "TBD";

  agenda += `## ${event.title}\n\n`;
  agenda += `**Attendees:** ${clientName} (${companyName}), Freelancer\n`;
  agenda += `**When:** ${startTime} – ${endTime}\n\n`;

  /* Section 1 — Check-in */
  agenda += `### 1. Check-in & Updates (5 min)\n`;
  agenda += `- Quick personal catch-up\n`;
  agenda += `- Any urgent items or blockers since last sync\n`;
  if (project?.status === "in_progress") {
    agenda += `- Pulse check: how's the team feeling about current progress?\n`;
  }
  agenda += `\n`;

  /* Section 2 — Project review */
  if (project) {
    const statusLabel = project.status === "in_progress" ? "Progress" : "Review";
    agenda += `### 2. ${projectName} — ${statusLabel} (15 min)\n`;
    agenda += `- Review completed deliverables against the timeline\n`;
    agenda += `- Walk through work-in-progress items\n`;
    agenda += `- ${clientName}'s feedback on latest iterations\n`;

    if (project.budget) {
      agenda += `- Budget check: $${project.budget.toLocaleString()} allocated, status update\n`;
    }
    if (project.status === "in_progress") {
      agenda += `- Are we on track for the ${project.end_date ? new Date(project.end_date).toLocaleDateString("en-US", { month: "long", day: "numeric" }) : "upcoming"} deadline?\n`;
    }
    agenda += `\n`;

    agenda += `### 3. Next Milestones & Priorities (10 min)\n`;
    agenda += `- Key dates and deliverables for the next sprint\n`;
    agenda += `- Adjust priorities based on feedback\n`;
    agenda += `- Resource or access needs from ${companyName}\n`;
    agenda += `\n`;
  } else {
    agenda += `### 2. Discussion Topics (20 min)\n`;
    agenda += `- Key discussion points for today\n`;
    agenda += `- ${companyName} priorities and how we can support\n`;
    agenda += `- Any new opportunities or challenges on the horizon\n`;
    agenda += `\n`;

    agenda += `### 3. Next Steps (10 min)\n`;
    agenda += `- Define action items with clear owners\n`;
    agenda += `- Set target dates for deliverables\n`;
    agenda += `- Schedule follow-up if needed\n`;
    agenda += `\n`;
  }

  /* Section 4 — Action items */
  agenda += `### 4. Action Items & Owners (5 min)\n`;
  agenda += `- Recap decisions made during this meeting\n`;
  agenda += `- Assign owners for each action item\n`;
  if (client?.notes) {
    const firstNote = client.notes.split(".")[0];
    if (firstNote && firstNote.length < 80) {
      agenda += `- Context from last engagement: ${firstNote}\n`;
    }
  }
  agenda += `\n`;

  /* Section 5 — Wrap-up */
  agenda += `### 5. Wrap-up & Next Meeting (5 min)\n`;
  agenda += `- Confirm next meeting date and time\n`;
  agenda += `- Any final questions or open items\n`;

  let reasoning = "Structured to cover check-in, project review, priorities, action items, and wrap-up";
  if (project) {
    reasoning = `Tailored to ${projectName} — covers progress review, milestone planning, and action items specific to this engagement`;
  }

  return { agenda, reasoning };
}

/* --- Week analysis --- */
export function analyzeWeek(events: CalendarEvent[], date: Date): string {
  const { start: weekStart, end: weekEnd } = getWeekRange(date);
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  const dayCounts: Record<number, { count: number; meetingHours: number }> = {};
  for (let i = 0; i < 7; i++) dayCounts[i] = { count: 0, meetingHours: 0 };

  let totalMeetings = 0;
  let totalDeadlines = 0;

  events.forEach((e) => {
    const es = new Date(e.start_time);
    if (es >= weekStart && es <= weekEnd) {
      const d = es.getDay();
      dayCounts[d].count++;
      if (e.type === "meeting") {
        const ee = new Date(e.end_time);
        dayCounts[d].meetingHours += (ee.getTime() - es.getTime()) / (1000 * 60 * 60);
        totalMeetings++;
      }
      if (e.type === "deadline") totalDeadlines++;
    }
  });

  let busiestDay = 0;
  let maxCount = 0;
  let mostMeetingHours = 0;
  for (let i = 0; i < 7; i++) {
    if (dayCounts[i].count > maxCount) {
      maxCount = dayCounts[i].count;
      busiestDay = i;
    }
    if (dayCounts[i].meetingHours > mostMeetingHours) {
      mostMeetingHours = dayCounts[i].meetingHours;
    }
  }

  /* Find best focus day (least busy weekday) */
  let bestFocusDay = 1; /* Monday */
  let minCount = Infinity;
  for (let i = 1; i <= 5; i++) {
    if (dayCounts[i].count < minCount) {
      minCount = dayCounts[i].count;
      bestFocusDay = i;
    }
  }

  let summary = `📊 **Week at a Glance**\n\n`;
  summary += `**${dayNames[busiestDay]}** is your busiest day with ${maxCount} event${maxCount > 1 ? "s" : ""}`;
  if (mostMeetingHours > 3) summary += ` and ${mostMeetingHours.toFixed(1)} hours of meetings`;
  summary += `.\n\n`;

  summary += `**${dayNames[bestFocusDay]}** looks best for deep work — only ${minCount} commitment${minCount !== 1 ? "s" : ""}.\n\n`;

  if (totalMeetings > 5) summary += `You've got ${totalMeetings} meetings this week — that's a lot! Consider blocking focus time.\n`;
  else if (totalMeetings <= 2) summary += `Light meeting week with only ${totalMeetings} meetings — great for making progress on deliverables.\n`;

  if (totalDeadlines > 0) summary += `\n⚠️ ${totalDeadlines} deadline${totalDeadlines > 1 ? "s" : ""} this week — keep an eye on those!`;

  return summary;
}

/* --- Quick meeting time suggestion for a specific client --- */
export function suggestTimeForClient(
  events: CalendarEvent[],
  date: Date,
  clientId: string,
  clients: Client[]
): { response: string; slots: SlotSuggestion[] } {
  const client = clients.find((c) => c.id === clientId);
  if (!client) return { response: "I couldn't find that client.", slots: [] };

  const slots = findOptimalSlots(events, date, { clientId, clients });

  if (slots.length === 0) {
    return {
      response: `This week looks fully booked. Want me to check next week for ${client.company}? I can also suggest early-morning or late-afternoon slots if you're flexible.`,
      slots: [],
    };
  }

  const response = `I found **${slots.length} good slot${slots.length > 1 ? "s" : ""}** for meeting with **${client.company}** this week. Here are the top picks:\n\n${slots
    .slice(0, 3)
    .map((s, i) => `**${i + 1}.** ${s.day}, ${s.date} · ${s.start}–${s.end}\n   ↳ ${s.reason}`)
    .join("\n\n")}${client.notes ? `\n\n📝 *Note:* ${client.notes.split(".")[0]}.` : ""}`;

  return { response, slots };
}

/* ====== SMART SCHEDULE — Natural Language Parser ====== */

const DAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const MONTH_NAMES = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
const MONTH_ABBREV: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

export interface SmartScheduleResult {
  title: string;
  type: string;
  startDate: string;  /* YYYY-MM-DD */
  startTime: string;  /* HH:MM */
  endDate: string;
  endTime: string;
  durationMinutes: number;
  clientId: string | null;
  clientName: string | null;
  projectId: string | null;
  projectName: string | null;
  location: string | null;
  rawInput: string;
  confidence: "high" | "medium" | "low";
  notes: string[];
}

/* ---- Duration extraction ---- */
function extractDuration(input: string): number {
  const patterns = [
    /(\d+)\s*(?:min|minute|minutes)\b/i,
    /(\d+)\s*(?:hour|hours|hr|hrs|h)\b/i,
    /(\d+(?:\.\d+)?)\s*(?:hour|hours|hr|hrs|h)\b/i,
  ];

  for (const re of patterns) {
    const m = input.match(re);
    if (m) {
      const isHour = /hour|hr|h/i.test(m[0]);
      const val = parseFloat(m[1]);
      return Math.round(isHour ? val * 60 : val);
    }
  }

  /* Fractional words */
  const halfHour = /\b(?:half[- ]?(?:an[- ]?)?hour|30\s*min)\b/i;
  if (halfHour.test(input)) return 30;

  const quarterHour = /\b(?:quarter[- ]?(?:an[- ]?)?hour|15\s*min)\b/i;
  if (quarterHour.test(input)) return 15;

  return 30; /* default 30min */
}

/* ---- Date extraction ---- */
function extractDate(input: string, refDate: Date): { date: Date; matched: boolean } {
  const lower = input.toLowerCase();
  const today = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate());

  /* "today" */
  if (/\btoday\b/.test(lower)) return { date: today, matched: true };

  /* "tomorrow" */
  if (/\btomorrow\b/.test(lower)) {
    const d = new Date(today);
    d.setDate(d.getDate() + 1);
    return { date: d, matched: true };
  }

  /* "next [dayname]" */
  const nextDayRe = /\bnext\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/i;
  const nextDayMatch = lower.match(nextDayRe);
  if (nextDayMatch) {
    const targetDay = DAY_NAMES.indexOf(nextDayMatch[1].toLowerCase());
    const d = new Date(today);
    d.setDate(d.getDate() + ((targetDay + 7 - d.getDay()) % 7 || 7));
    return { date: d, matched: true };
  }

  /* "this [dayname]" */
  const thisDayRe = /\bthis\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/i;
  const thisDayMatch = lower.match(thisDayRe);
  if (thisDayMatch) {
    const targetDay = DAY_NAMES.indexOf(thisDayMatch[1].toLowerCase());
    const d = new Date(today);
    d.setDate(d.getDate() + ((targetDay + 7 - d.getDay()) % 7));
    return { date: d, matched: true };
  }

  /* Bare "[dayname]" — upcoming */
  const bareDayRe = /\b(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/i;
  const bareDayMatch = lower.match(bareDayRe);
  if (bareDayMatch) {
    const targetDay = DAY_NAMES.indexOf(bareDayMatch[1].toLowerCase());
    const d = new Date(today);
    const diff = (targetDay + 7 - d.getDay()) % 7;
    d.setDate(d.getDate() + diff === 0 ? 7 : diff);
    return { date: d, matched: true };
  }

  /* "[month] [day]" e.g. "July 25", "on July 25" */
  const monthDayRe = /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(?:st|nd|rd|th)?\b/i;
  const monthDayMatch = lower.match(monthDayRe);
  if (monthDayMatch) {
    const monthIdx = MONTH_NAMES.indexOf(monthDayMatch[1].toLowerCase());
    const day = parseInt(monthDayMatch[2], 10);
    if (monthIdx !== -1 && day >= 1 && day <= 31) {
      const d = new Date(today.getFullYear(), monthIdx, day);
      /* If the date is in the past, assume next year */
      if (d < today) d.setFullYear(d.getFullYear() + 1);
      return { date: d, matched: true };
    }
  }

  /* "on the [ordinal]" e.g. "on the 22nd" */
  const ordinalRe = /\b(?:on\s+)?the\s+(\d{1,2})(?:st|nd|rd|th)?\b/i;
  const ordinalMatch = lower.match(ordinalRe);
  if (ordinalMatch) {
    const day = parseInt(ordinalMatch[1], 10);
    if (day >= 1 && day <= 31) {
      const d = new Date(today.getFullYear(), today.getMonth(), day);
      if (d < today) d.setMonth(d.getMonth() + 1);
      return { date: d, matched: true };
    }
  }

  return { date: today, matched: false };
}

/* ---- Time extraction ---- */
function extractTime(input: string): { hour: number; minute: number; matched: boolean } {
  const lower = input.toLowerCase();

  /* "X:XX am/pm" */
  const timeRe = /(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i;
  const timeMatch = lower.match(timeRe);
  if (timeMatch) {
    let h = parseInt(timeMatch[1], 10);
    const m = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
    const ampm = timeMatch[3].toLowerCase();
    if (ampm === "pm" && h !== 12) h += 12;
    if (ampm === "am" && h === 12) h = 0;
    if (h >= 0 && h < 24 && m >= 0 && m < 60) {
      return { hour: h, minute: m, matched: true };
    }
  }

  /* "at X" o'clock style */
  const atRe = /\bat\s+(\d{1,2})\b/i;
  const atMatch = lower.match(atRe);
  if (atMatch) {
    let h = parseInt(atMatch[1], 10);
    if (h >= 1 && h <= 12) {
      /* Assume PM for afternoon-ish context, AM otherwise */
      if (h >= 1 && h <= 6) h += 12;
      return { hour: h, minute: 0, matched: true };
    }
  }

  /* Time-of-day words */
  if (/\bmorning\b/.test(lower)) return { hour: 9, minute: 0, matched: true };
  if (/\bafternoon\b/.test(lower)) return { hour: 14, minute: 0, matched: true };
  if (/\bevening\b/.test(lower)) return { hour: 17, minute: 0, matched: true };
  if (/\bnoon\b/.test(lower)) return { hour: 12, minute: 0, matched: true };
  if (/\blunch\b/.test(lower)) return { hour: 12, minute: 0, matched: true };

  return { hour: 9, minute: 0, matched: false };
}

/* ---- Client matching ---- */
function extractClient(input: string, clients: Client[]): { clientId: string; clientName: string; company: string } | null {
  const lower = input.toLowerCase();
  let best: { clientId: string; clientName: string; company: string; score: number } | null = null;

  for (const c of clients) {
    let score = 0;
    const companyLower = c.company.toLowerCase();

    /* Exact company name match: highest score */
    if (lower.includes(companyLower)) score += 100;
    /* Company name token match */
    else if (companyLower.split(/[\s-]+/).some((tok) => tok.length > 3 && lower.includes(tok))) score += 70;
    /* Person name */
    if (c.name && lower.includes(c.name.toLowerCase())) score += 60;
    /* First name only */
    if (c.name) {
      const firstName = c.name.split(" ")[0].toLowerCase();
      if (firstName.length > 2 && lower.includes(firstName)) score += 40;
    }

    if (score > 0 && (!best || score > best.score)) {
      best = { clientId: c.id, clientName: c.name, company: c.company, score };
    }
  }

  if (best && (best as any).score >= 40) {
    return { clientId: best.clientId, clientName: best.clientName, company: best.company };
  }
  return null;
}

/* ---- Project matching ---- */
function extractProject(input: string, clientId: string | null, projects: ProjectInfo[]): { projectId: string; projectName: string } | null {
  const lower = input.toLowerCase();
  const candidates = clientId ? projects.filter((p) => p.client_id === clientId) : projects;

  let best: { projectId: string; projectName: string; score: number } | null = null;

  for (const p of candidates) {
    let score = 0;
    const titleLower = p.title.toLowerCase();

    if (lower.includes(titleLower)) score += 100;
    else {
      const tokens = titleLower.split(/[\s-]+/);
      const matchCount = tokens.filter((t) => t.length > 3 && lower.includes(t)).length;
      score = matchCount * 30;
    }

    if (score > 0 && (!best || score > best.score)) {
      best = { projectId: p.id, projectName: p.title, score };
    }
  }

  if (best && (best as any).score >= 30) {
    return { projectId: best.projectId, projectName: best.projectName };
  }
  return null;
}

/* ---- Event type inference ---- */
function inferEventType(input: string): string {
  const lower = input.toLowerCase();

  const meetingKeywords = /\b(check[- ]?in|sync|review|catch[- ]?up|call|meeting|chat|discuss|discussion|standup|walkthrough|demo|intro|kickoff|planning)\b/i;
  const deadlineKeywords = /\b(deadline|due|final|launch|delivery|deliver)\b/i;
  const reminderKeywords = /\b(remind|reminder|remember|don'?t forget|heads[- ]?up)\b/i;

  if (deadlineKeywords.test(lower)) return "deadline";
  if (reminderKeywords.test(lower)) return "reminder";
  if (meetingKeywords.test(lower)) return "meeting";

  return "meeting";
}

/* ---- Location extraction ---- */
function extractLocation(input: string): string | null {
  const lower = input.toLowerCase();

  /* Zoom / Meet / Teams */
  if (/\bzoom\b/.test(lower)) return "Zoom";
  if (/\b(?:google\s*)?meet\b/.test(lower)) return "Google Meet";
  if (/\bteams\b/.test(lower)) return "Microsoft Teams";

  /* Phone */
  const phoneRe = /\b(?:phone|call|voice)\b/i;
  if (phoneRe.test(lower)) return "Phone Call";

  return null;
}

/* ---- Title generation ---- */
function generateTitle(input: string, client: { clientName: string; company: string } | null, eventType: string): string {
  /* Try to extract a meaningful title */
  const lower = input.toLowerCase();

  /* Remove scheduling prefixes */
  let title = lower
    .replace(/\b(schedule|book|set\s+up|create|add|make|block|put)\b/i, "")
    .trim();

  /* Remove time/duration phrases */
  title = title
    .replace(/(\d+)\s*(min|minute|hour|hr|h)(s)?\b/gi, "")
    .replace(/\b(at|on|from|for|next|this)\b/gi, "")
    .replace(/\b(morning|afternoon|evening|noon|tomorrow|today)\b/gi, "")
    .replace(/\d{1,2}(?::\d{2})?\s*(am|pm)/gi, "")
    .trim();

  /* Remove day names */
  for (const dn of DAY_NAMES) {
    title = title.replace(new RegExp(`\\b${dn}\\b`, "gi"), "");
  }

  /* Remove "with X" */
  if (client) {
    title = title
      .replace(new RegExp(`\\bwith\\s+${client.company.toLowerCase()}\\b`, "i"), "")
      .replace(new RegExp(`\\bwith\\s+${client.clientName.toLowerCase()}\\b`, "i"), "");
  }

  /* Clean up */
  title = title.replace(/\s{2,}/g, " ").trim();
  title = title.charAt(0).toUpperCase() + title.slice(1);

  /* If title is still empty, construct one */
  if (!title || title.length < 3) {
    const clientPart = client ? `${client.company} ` : "";
    const typeLabels: Record<string, string> = { meeting: "Sync", deadline: "Deadline", reminder: "Reminder" };
    title = `${clientPart}${typeLabels[eventType] || "Event"}`;
  }

  /* Capitalize words */
  title = title.replace(/\b\w/g, (c) => c.toUpperCase()).replace(/\b(a|an|the|in|on|at|with|to|for|of|and|or)\b/gi, (m) => m.toLowerCase());
  /* Re-capitalize first letter */
  title = title.charAt(0).toUpperCase() + title.slice(1);

  return title;
}

/* ---- Main parse function ---- */
export function parseNaturalLanguageRequest(
  input: string,
  clients: Client[],
  projects: ProjectInfo[],
  refDate: Date = new Date()
): SmartScheduleResult {
  const duration = extractDuration(input);
  const { date, matched: dateMatched } = extractDate(input, refDate);
  const { hour, minute, matched: timeMatched } = extractTime(input);
  const client = extractClient(input, clients);
  const project = extractProject(input, client?.clientId || null, projects);
  const eventType = inferEventType(input);
  const location = extractLocation(input);
  const title = generateTitle(input, client, eventType);

  /* Build start/end */
  const startDate = date;
  startDate.setHours(hour, minute, 0, 0);
  const endDate = new Date(startDate.getTime() + duration * 60 * 1000);

  const pad = (n: number) => String(n).padStart(2, "0");
  const dateStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const timeStr = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

  /* Confidence scoring */
  let confidenceScore = 0;
  if (dateMatched) confidenceScore++;
  if (timeMatched) confidenceScore++;
  if (client) confidenceScore++;
  if (project) confidenceScore++;
  if (duration !== 30) confidenceScore++;

  let confidence: "high" | "medium" | "low" = "medium";
  if (confidenceScore >= 3) confidence = "high";
  else if (confidenceScore <= 1) confidence = "low";

  /* Build notes about what was parsed */
  const notes: string[] = [];
  if (duration !== 30) notes.push(`Duration: ${duration} minutes`);
  else notes.push(`Duration: 30 minutes (default)`);
  if (dateMatched) notes.push(`Date matched from request`);
  else notes.push(`Date defaulted to today`);
  if (timeMatched) notes.push(`Time matched from request`);
  else notes.push(`Time defaulted to 9:00 AM`);
  if (client) notes.push(`Matched client: ${client.company}`);
  if (project) notes.push(`Matched project: ${project.projectName}`);
  if (location) notes.push(`Location: ${location}`);

  return {
    title,
    type: eventType,
    startDate: dateStr(startDate),
    startTime: timeStr(startDate),
    endDate: dateStr(endDate),
    endTime: timeStr(endDate),
    durationMinutes: duration,
    clientId: client?.clientId || null,
    clientName: client?.company || null,
    projectId: project?.projectId || null,
    projectName: project?.projectName || null,
    location,
    rawInput: input,
    confidence,
    notes,
  };
}