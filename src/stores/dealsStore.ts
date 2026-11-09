import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import type { Deal, DealFields } from "@/lib/deals";

/** Result of a write: `error` holds the message to show. */
export type WriteResult = { ok: true } | { ok: false; error: string };

interface DealsState {
  deals: Deal[];
  isLoading: boolean;
  hasLoaded: boolean;
  loadError: string | null;
  fetchDeals: () => Promise<void>;
  createDeal: (fields: DealFields) => Promise<WriteResult>;
  updateDeal: (id: string, changes: Partial<DealFields>) => Promise<WriteResult>;
  deleteDeal: (id: string) => Promise<WriteResult>;
  reset: () => void;
}

/** Supabase errors are plain objects, not Error instances. */
function errorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === "object" && "message" in err && typeof err.message === "string") {
    return err.message;
  }
  return fallback;
}

function mapDeal(row: Record<string, unknown>): Deal {
  return {
    ...(row as unknown as Deal),
    amount: Number(row.amount) || 0,
    position: Number(row.position) || 0,
  };
}

export const useDealsStore = create<DealsState>((set, get) => ({
  deals: [],
  isLoading: false,
  hasLoaded: false,
  loadError: null,

  fetchDeals: async () => {
    set({ isLoading: true, loadError: null });
    const { data, error } = await supabase.from("deals").select("*").order("position", { ascending: false });

    if (error) {
      set({ isLoading: false, loadError: errorMessage(error, "Failed to load deals") });
      return;
    }
    set({ deals: (data ?? []).map(mapDeal), isLoading: false, hasLoaded: true });
  },

  createDeal: async (fields) => {
    const { data, error } = await supabase.from("deals").insert(fields).select().single();
    if (error) return { ok: false, error: errorMessage(error, "Failed to create deal") };
    set({ deals: [mapDeal(data), ...get().deals] });
    return { ok: true };
  },

  updateDeal: async (id, changes) => {
    const { data, error } = await supabase.from("deals").update(changes).eq("id", id).select().single();
    if (error) return { ok: false, error: errorMessage(error, "Failed to save deal") };
    set({ deals: get().deals.map((d) => (d.id === id ? mapDeal(data) : d)) });
    return { ok: true };
  },

  deleteDeal: async (id) => {
    const { error } = await supabase.from("deals").delete().eq("id", id);
    if (error) return { ok: false, error: errorMessage(error, "Failed to delete deal") };
    set({ deals: get().deals.filter((d) => d.id !== id) });
    return { ok: true };
  },

  reset: () => set({ deals: [], hasLoaded: false, loadError: null }),
}));
