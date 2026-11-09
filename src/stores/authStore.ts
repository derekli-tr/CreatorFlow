import { create } from "zustand";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
}

interface AuthResult {
  success: boolean;
  error?: string;
  /** True when Supabase requires the user to confirm their email before signing in. */
  needsConfirmation?: boolean;
}

interface AuthState {
  user: AuthUser | null;
  isInitialized: boolean;
  initialize: () => void;
  login: (email: string, password: string) => Promise<AuthResult>;
  signup: (email: string, password: string, fullName: string) => Promise<AuthResult>;
  logout: () => Promise<void>;
}

function toUser(session: Session | null): AuthUser | null {
  if (!session?.user) return null;
  return {
    id: session.user.id,
    email: session.user.email ?? "",
    full_name: (session.user.user_metadata?.full_name as string) || "",
  };
}

let initialized = false;

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isInitialized: false,

  initialize: () => {
    if (initialized) return;
    initialized = true;

    supabase.auth.getSession().then(({ data }) => {
      set({ user: toUser(data.session), isInitialized: true });
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      set({ user: toUser(session), isInitialized: true });
    });
  },

  login: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { success: false, error: error.message };
    return { success: true };
  },

  signup: async (email, password, fullName) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) return { success: false, error: error.message };
    return { success: true, needsConfirmation: !data.session };
  },

  logout: async () => {
    await supabase.auth.signOut();
  },
}));
