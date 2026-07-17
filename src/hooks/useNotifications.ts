import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

export interface Notification {
  id: string;
  recipient_id: string;
  type: string;
  title: string;
  message: string;
  related_record_type: string;
  related_record_id: string;
  read_status: boolean;
  created_at: string;
}

function mapNotifRow(row: Record<string, unknown>): Notification {
  return {
    id: row.id as string,
    recipient_id: row.recipient_id as string,
    type: row.type as string,
    title: row.title as string,
    message: row.message as string,
    related_record_type: row.related_record_type as string,
    related_record_id: row.related_record_id as string,
    read_status: Boolean(row.read_status),
    created_at: row.created_at as string,
  };
}

export function useNotifications() {
  const { user, isAuthenticated } = useAuthStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    if (!isAuthenticated || !user) {
      setNotifications([]);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error: fetchError } = await supabase
        .from('notifications')
        .select('*')
        .eq('recipient_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setNotifications(data?.map(mapNotifRow) || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load notifications';
      setError(message);
      setNotifications([]);
    } finally {
      setIsLoading(false);
    }
  }, [user, isAuthenticated]);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  /* Real-time subscription */
  const channelName = useMemo(
    () => `notifications-realtime-${user?.id ?? 'anon'}-${Math.random().toString(36).slice(2)}`,
    [user?.id]
  );

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const inserted = mapNotifRow(payload.new as Record<string, unknown>);
            setNotifications((prev) => {
              if (prev.find((n) => n.id === inserted.id)) return prev;
              return [inserted, ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updated = mapNotifRow(payload.new as Record<string, unknown>);
            setNotifications((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
          } else if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as Record<string, unknown>).id as string;
            setNotifications((prev) => prev.filter((n) => n.id !== deletedId));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelName, isAuthenticated, user]);

  return { notifications, isLoading, error, fetchNotifications };
}