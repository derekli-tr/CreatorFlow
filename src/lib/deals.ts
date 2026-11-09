export type DealStage = "pitching" | "in_production" | "awaiting_payment" | "paid";

export type Platform = "Instagram" | "TikTok" | "YouTube" | "Twitch" | "X" | "Other";

export interface Deal {
  id: string;
  owner_id: string;
  brand: string;
  amount: number;
  platform: Platform;
  stage: DealStage;
  position: number;
  /** When the deal was marked Paid. */
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Fields the deal form edits. */
export type DealFields = Pick<Deal, "brand" | "amount" | "platform">;

export interface StageInfo {
  id: DealStage;
  label: string;
  description: string;
  dot: string;
}

export const STAGE_INFO: Record<DealStage, StageInfo> = {
  pitching: { id: "pitching", label: "Pitching", description: "Brands you're reaching out to", dot: "bg-background-500" },
  in_production: { id: "in_production", label: "In Production", description: "Agreed and creating content", dot: "bg-status-active" },
  awaiting_payment: { id: "awaiting_payment", label: "Awaiting Payment", description: "Delivered, waiting to be paid", dot: "bg-status-warning" },
  paid: { id: "paid", label: "Paid", description: "Money received", dot: "bg-status-paid" },
};

export const STAGES: StageInfo[] = (["pitching", "in_production", "awaiting_payment", "paid"] as const).map(
  (id) => STAGE_INFO[id]
);

export const PLATFORMS: Platform[] = ["Instagram", "TikTok", "YouTube", "Twitch", "X", "Other"];

export const PLATFORM_ICONS: Record<Platform, string> = {
  Instagram: "ri-instagram-line",
  TikTok: "ri-tiktok-line",
  YouTube: "ri-youtube-line",
  Twitch: "ri-twitch-line",
  X: "ri-twitter-x-line",
  Other: "ri-global-line",
};

export function stageLabel(stage: DealStage): string {
  return STAGE_INFO[stage]?.label ?? stage;
}

/** Sums deal amounts in cents to avoid floating point drift. */
export function sumAmount(deals: Deal[]): number {
  return deals.reduce((total, d) => total + Math.round(d.amount * 100), 0) / 100;
}

const wholeDollars = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const withCents = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });

/** "$1,200" for whole dollars, "$1,200.50" otherwise. */
export function formatMoney(value: number): string {
  return Number.isInteger(Math.round(value * 100) / 100) ? wholeDollars.format(value) : withCents.format(value);
}

export function formatDate(value: string | null): string {
  if (!value) return "";
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function isSameMonth(value: string, now = new Date()): boolean {
  const date = new Date(value);
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
}
