import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

export interface Project {
  id: string;
  client_id: string;
  owner_id: string;
  title: string;
  description: string;
  status: string;
  start_date: string;
  end_date: string;
  budget: number;
  created_at: string;
  clientName: string;
}

function mapProjectRow(row: Record<string, unknown>, clientNameMap: Record<string, string>): Project {
  return {
    id: row.id as string,
    client_id: row.client_id as string,
    owner_id: row.owner_id as string,
    title: row.title as string,
    description: row.description as string,
    status: row.status as string,
    start_date: row.start_date as string,
    end_date: row.end_date as string,
    budget: Number(row.budget) || 0,
    created_at: row.created_at as string,
    clientName: (row.client_id ? clientNameMap[row.client_id as string] : undefined) || '—',
  };
}

export function useProjects() {
  const { user, isAuthenticated } = useAuthStore();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    if (!isAuthenticated || !user) {
      setProjects([]);
      setIsLoading(false);
      return;
    }

    try {
      /* Fetch clients first to build name map */
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('id, company')
        .eq('owner_id', user.id);

      if (clientError) throw clientError;

      const clientNameMap: Record<string, string> = {};
      if (clientData) {
        clientData.forEach((c: Record<string, unknown>) => {
          clientNameMap[c.id as string] = (c.company as string) || '—';
        });
      }

      /* Fetch projects */
      const { data, error: fetchError } = await supabase
        .from('projects')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setProjects(data?.map((row: Record<string, unknown>) => mapProjectRow(row, clientNameMap)) || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load projects';
      setError(message);
      setProjects([]);
    } finally {
      setIsLoading(false);
    }
  }, [user, isAuthenticated]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  /* Real-time subscription */
  const projChannelIdRef = useRef(0);
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    projChannelIdRef.current += 1;
    const channelName = `projects-realtime-${projChannelIdRef.current}-${Date.now()}`;

    const resolveClientName = async (clientId: string): Promise<string> => {
      const { data } = await supabase
        .from('clients')
        .select('company')
        .eq('id', clientId)
        .maybeSingle();
      return (data as Record<string, unknown> | null)?.company as string || '—';
    };

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'projects',
          filter: `owner_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const row = payload.new as Record<string, unknown>;
            const id = row.id as string;
            setProjects((prev) => {
              if (prev.find((p) => p.id === id)) return prev;
              const placeholder = mapProjectRow(row, {});
              resolveClientName(row.client_id as string).then((name) => {
                setProjects((prev2) =>
                  prev2.map((p) => (p.id === id ? { ...p, clientName: name } : p))
                );
              });
              return [placeholder, ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            const row = payload.new as Record<string, unknown>;
            const id = row.id as string;
            setProjects((prev) => {
              const existing = prev.find((p) => p.id === id);
              const updated = mapProjectRow(row, {});
              updated.clientName = existing?.clientName || '—';
              if (existing && row.client_id !== existing.client_id) {
                resolveClientName(row.client_id as string).then((name) => {
                  setProjects((prev2) =>
                    prev2.map((p) => (p.id === id ? { ...p, clientName: name } : p))
                  );
                });
              }
              return prev.map((p) => (p.id === id ? updated : p));
            });
          } else if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as Record<string, unknown>).id as string;
            setProjects((prev) => prev.filter((p) => p.id !== deletedId));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAuthenticated, user]);

  const getProject = useCallback((projectId: string): Project | null => {
    return projects.find((p) => p.id === projectId) || null;
  }, [projects]);

  const updateProject = useCallback(async (projectId: string, updates: Partial<Project>): Promise<boolean> => {
    if (!isAuthenticated || !user) {
      return false;
    }

    try {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.start_date !== undefined) dbUpdates.start_date = updates.start_date;
      if (updates.end_date !== undefined) dbUpdates.end_date = updates.end_date;
      if (updates.budget !== undefined) dbUpdates.budget = updates.budget;

      const { error: updateError } = await supabase
        .from('projects')
        .update(dbUpdates)
        .eq('id', projectId)
        .eq('owner_id', user.id);

      if (updateError) throw updateError;

      setProjects((prev) => prev.map((p) => (p.id === projectId ? { ...p, ...updates } : p)));
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update project';
      setError(message);
      return false;
    }
  }, [user, isAuthenticated]);

  return {
    projects,
    isLoading,
    error,
    fetchProjects,
    getProject,
    updateProject,
  };
}