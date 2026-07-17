import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { eventTypeConfig } from '@/constants/eventTypes';

export interface CalendarEvent {
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

export function useCalendarEvents() {
  const { user, isAuthenticated } = useAuthStore();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    if (!isAuthenticated || !user) {
      setEvents([]);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error: fetchError } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('owner_id', user.id)
        .order('start_time', { ascending: true });

      if (fetchError) throw fetchError;

      const mapped: CalendarEvent[] = data?.map((row: Record<string, unknown>) => ({
        id: row.id as string,
        title: row.title as string,
        type: row.type as string,
        start_time: row.start_time as string,
        end_time: row.end_time as string,
        client_id: row.client_id as string | null,
        project_id: row.project_id as string | null,
        description: (row.description as string) || '',
        location: (row.location as string) || null,
      })) || [];

      setEvents(mapped);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load events';
      setError(message);
      setEvents([]);
    } finally {
      setIsLoading(false);
    }
  }, [user, isAuthenticated]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  /* Real-time subscription */
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const channel = supabase
      .channel('calendar-events-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'calendar_events',
          filter: `owner_id=eq.${user.id}`,
        },
        (payload) => {
          const mapPayload = (row: Record<string, unknown>): CalendarEvent => ({
            id: row.id as string,
            title: row.title as string,
            type: row.type as string,
            start_time: row.start_time as string,
            end_time: row.end_time as string,
            client_id: row.client_id as string | null,
            project_id: row.project_id as string | null,
            description: (row.description as string) || '',
            location: (row.location as string) || null,
          });

          if (payload.eventType === 'INSERT') {
            const inserted = mapPayload(payload.new as Record<string, unknown>);
            setEvents((prev) => {
              if (prev.find((e) => e.id === inserted.id)) return prev;
              const next = [...prev, inserted];
              next.sort((a, b) => a.start_time.localeCompare(b.start_time));
              return next;
            });
          } else if (payload.eventType === 'UPDATE') {
            const updated = mapPayload(payload.new as Record<string, unknown>);
            setEvents((prev) => {
              const next = prev.map((e) => (e.id === updated.id ? updated : e));
              next.sort((a, b) => a.start_time.localeCompare(b.start_time));
              return next;
            });
          } else if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as Record<string, unknown>).id as string;
            setEvents((prev) => prev.filter((e) => e.id !== deletedId));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAuthenticated, user]);

  const createEvent = useCallback(async (eventData: Omit<CalendarEvent, 'id'>): Promise<CalendarEvent | null> => {
    if (!isAuthenticated || !user) {
      return null;
    }

    try {
      const { data, error: insertError } = await supabase
        .from('calendar_events')
        .insert({
          owner_id: user.id,
          title: eventData.title,
          type: eventData.type,
          start_time: eventData.start_time,
          end_time: eventData.end_time,
          client_id: eventData.client_id,
          project_id: eventData.project_id,
          description: eventData.description,
          location: eventData.location,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      const created: CalendarEvent = {
        id: data.id as string,
        title: data.title as string,
        type: data.type as string,
        start_time: data.start_time as string,
        end_time: data.end_time as string,
        client_id: data.client_id as string | null,
        project_id: data.project_id as string | null,
        description: (data.description as string) || '',
        location: (data.location as string) || null,
      };

      setEvents((prev) => [...prev, created]);
      return created;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create event';
      setError(message);
      return null;
    }
  }, [user, isAuthenticated]);

  const updateEvent = useCallback(async (eventId: string, updates: Partial<CalendarEvent>): Promise<boolean> => {
    if (!isAuthenticated || !user) {
      return false;
    }

    try {
      const supabaseUpdates: Record<string, unknown> = {};
      if (updates.title !== undefined) supabaseUpdates.title = updates.title;
      if (updates.type !== undefined) supabaseUpdates.type = updates.type;
      if (updates.start_time !== undefined) supabaseUpdates.start_time = updates.start_time;
      if (updates.end_time !== undefined) supabaseUpdates.end_time = updates.end_time;
      if (updates.description !== undefined) supabaseUpdates.description = updates.description;
      if (updates.location !== undefined) supabaseUpdates.location = updates.location;
      if (updates.client_id !== undefined) supabaseUpdates.client_id = updates.client_id;
      if (updates.project_id !== undefined) supabaseUpdates.project_id = updates.project_id;

      const { error: updateError } = await supabase
        .from('calendar_events')
        .update(supabaseUpdates)
        .eq('id', eventId)
        .eq('owner_id', user.id);

      if (updateError) throw updateError;

      setEvents((prev) =>
        prev.map((e) => (e.id === eventId ? { ...e, ...updates } : e))
      );
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update event';
      setError(message);
      return false;
    }
  }, [user, isAuthenticated]);

  const deleteEvent = useCallback(async (eventId: string): Promise<boolean> => {
    if (!isAuthenticated || !user) {
      return false;
    }

    try {
      const { error: deleteError } = await supabase
        .from('calendar_events')
        .delete()
        .eq('id', eventId)
        .eq('owner_id', user.id);

      if (deleteError) throw deleteError;

      setEvents((prev) => prev.filter((e) => e.id !== eventId));
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete event';
      setError(message);
      return false;
    }
  }, [user, isAuthenticated]);

  return {
    events,
    isLoading,
    error,
    fetchEvents,
    createEvent,
    updateEvent,
    deleteEvent,
  };
}

export { eventTypeConfig };