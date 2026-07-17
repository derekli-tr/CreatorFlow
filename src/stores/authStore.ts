import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/lib/supabase';

export type UserRole = 'freelancer' | 'team_member' | 'client';

export interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  role: UserRole;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (email: string, password: string, fullName: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      isInitialized: false,

      initialize: async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .maybeSingle();

            if (profile) {
              set({
                user: {
                  id: profile.id,
                  email: profile.email,
                  full_name: profile.full_name || '',
                  avatar_url: profile.avatar_url,
                  role: profile.role as UserRole,
                },
                isAuthenticated: true,
                isInitialized: true,
              });
              return;
            }
          }
          set({ isInitialized: true });
        } catch {
          set({ isInitialized: true });
        }

        /* Listen for auth state changes */
        supabase.auth.onAuthStateChange(async (_event, session) => {
          if (session?.user) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .maybeSingle();

            if (profile) {
              set({
                user: {
                  id: profile.id,
                  email: profile.email,
                  full_name: profile.full_name || '',
                  avatar_url: profile.avatar_url,
                  role: profile.role as UserRole,
                },
                isAuthenticated: true,
              });
            }
          } else {
            set({ user: null, isAuthenticated: false });
          }
        });
      },

      login: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (error) {
            set({ isLoading: false });
            return { success: false, error: error.message };
          }

          if (data.user) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', data.user.id)
              .maybeSingle();

            if (profile) {
              set({
                user: {
                  id: profile.id,
                  email: profile.email,
                  full_name: profile.full_name || '',
                  avatar_url: profile.avatar_url,
                  role: profile.role as UserRole,
                },
                isAuthenticated: true,
                isLoading: false,
              });
              return { success: true };
            }
          }

          set({ isLoading: false });
          return { success: false, error: 'Profile not found. Please contact support.' };
        } catch (err: unknown) {
          set({ isLoading: false });
          const message = err instanceof Error ? err.message : 'An unexpected error occurred';
          return { success: false, error: message };
        }
      },

      signup: async (email: string, password: string, fullName: string) => {
        set({ isLoading: true });
        try {
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: { full_name: fullName },
            },
          });

          if (error) {
            set({ isLoading: false });
            return { success: false, error: error.message };
          }

          if (data.user) {
            /* Profile is auto-created by database trigger, but let's ensure it exists */
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', data.user.id)
              .maybeSingle();

            if (profile) {
              set({
                user: {
                  id: profile.id,
                  email: profile.email,
                  full_name: profile.full_name || '',
                  avatar_url: profile.avatar_url,
                  role: profile.role as UserRole,
                },
                isAuthenticated: true,
                isLoading: false,
              });
            } else {
              /* Trigger may still be processing — set user from auth metadata as fallback */
              set({
                user: {
                  id: data.user.id,
                  email: data.user.email || email,
                  full_name: fullName,
                  avatar_url: null,
                  role: 'freelancer',
                },
                isAuthenticated: true,
                isLoading: false,
              });
            }
            return { success: true };
          }

          set({ isLoading: false });
          return { success: false, error: 'Signup failed. Please try again.' };
        } catch (err: unknown) {
          set({ isLoading: false });
          const message = err instanceof Error ? err.message : 'An unexpected error occurred';
          return { success: false, error: message };
        }
      },

      logout: async () => {
        await supabase.auth.signOut();
        set({ user: null, isAuthenticated: false });
      },

      setUser: (user) => {
        set({ user, isAuthenticated: !!user });
      },
    }),
    {
      name: 'freelanceflow-auth',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);