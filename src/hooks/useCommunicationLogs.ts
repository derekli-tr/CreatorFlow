import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

export interface CommunicationLog {
  id: string;
  client_id: string;
  type: string;
  content: string;
  created_by: string;
  created_at: string;
}

function mapLogRow(row: Record<string, unknown>): CommunicationLog {
  return {
    id: row.id as string,
    client_id: row.client_id as string,
    type: row.type as string,
    content: row.content as string,
    created_by: row.created_by as string,
    created_at: row.created_at as string,
  };
}

export function useCommunicationLogs() {
  const { user, isAuthenticated } = useAuthStore();
  const [logsByClient, setLogsByClient] = useState<Record<string, CommunicationLog[]>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const subscribedRef = useRef(false);

  /* Real-time subscription — listen to all visible communication_logs */
  useEffect(() => {
    if (!isAuthenticated || !user || subscribedRef.current) return;
    subscribedRef.current = true;

    const channel = supabase
      .channel('comm-logs-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'communication_logs',
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const inserted = mapLogRow(payload.new as Record<string, unknown>);
            setLogsByClient((prev) => {
              const existing = prev[inserted.client_id] || [];
              if (existing.find((l) => l.id === inserted.id)) return prev;
              return {
                ...prev,
                [inserted.client_id]: [inserted, ...existing],
              };
            });
          } else if (payload.eventType === 'UPDATE') {
            const updated = mapLogRow(payload.new as Record<string, unknown>);
            setLogsByClient((prev) => {
              const newState: Record<string, CommunicationLog[]> = {};
              for (const cid of Object.keys(prev)) {
                newState[cid] = prev[cid].map((l) => (l.id === updated.id ? updated : l));
              }
              return newState;
            });
          } else if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as Record<string, unknown>).id as string;
            const deletedClientId = (payload.old as Record<string, unknown>).client_id as string;
            setLogsByClient((prev) => ({
              ...prev,
              [deletedClientId]: (prev[deletedClientId] || []).filter((l) => l.id !== deletedId),
            }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      subscribedRef.current = false;
    };
  }, [isAuthenticated, user]);

  const fetchLogs = useCallback(async (clientId: string): Promise<CommunicationLog[]> => {
    if (!isAuthenticated || !user) {
      setLogsByClient((prev) => ({ ...prev, [clientId]: [] }));
      return [];
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('communication_logs')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      const mapped = data?.map(mapLogRow) || [];
      setLogsByClient((prev) => ({ ...prev, [clientId]: mapped }));
      setIsLoading(false);
      return mapped;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load communication logs';
      setError(message);
      setLogsByClient((prev) => ({ ...prev, [clientId]: [] }));
      setIsLoading(false);
      return [];
    }
  }, [user, isAuthenticated]);

  const addLog = useCallback(async (
    clientId: string,
    log: { type: string; content: string }
  ): Promise<CommunicationLog | null> => {
    if (!isAuthenticated || !user) {
      return null;
    }

    try {
      const { data, error: insertError } = await supabase
        .from('communication_logs')
        .insert({
          client_id: clientId,
          type: log.type,
          content: log.content,
          created_by: user.id,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      const created = mapLogRow(data);
      setLogsByClient((prev) => ({
        ...prev,
        [clientId]: [created, ...(prev[clientId] || [])],
      }));
      return created;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to add log';
      setError(message);
      return null;
    }
  }, [user, isAuthenticated]);

  return {
    logsByClient,
    isLoading,
    error,
    fetchLogs,
    addLog,
  };
}