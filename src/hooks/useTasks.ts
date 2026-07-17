import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

export interface Task {
  id: string;
  project_id: string;
  title: string;
  description: string;
  status: 'todo' | 'in_progress' | 'review' | 'done';
  priority: 'low' | 'medium' | 'high';
  assigned_to: string | null;
  due_date: string;
  created_at: string;
}

function mapTaskRow(row: Record<string, unknown>): Task {
  return {
    id: row.id as string,
    project_id: row.project_id as string,
    title: row.title as string,
    description: (row.description as string) || '',
    status: (row.status as Task['status']) || 'todo',
    priority: (row.priority as Task['priority']) || 'medium',
    assigned_to: (row.assigned_to as string) || null,
    due_date: row.due_date as string,
    created_at: row.created_at as string,
  };
}

export function useTasks(projectId: string) {
  const { user, isAuthenticated } = useAuthStore();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    if (!projectId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    if (!isAuthenticated || !user) {
      setTasks([]);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error: fetchError } = await supabase
        .from('tasks')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });

      if (fetchError) throw fetchError;

      setTasks(data?.map((row: Record<string, unknown>) => mapTaskRow(row)) || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load tasks';
      setError(message);
      setTasks([]);
    } finally {
      setIsLoading(false);
    }
  }, [projectId, user, isAuthenticated]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  /* Real-time subscription */
  useEffect(() => {
    if (!isAuthenticated || !user || !projectId) return;

    const channel = supabase
      .channel(`tasks-realtime-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const inserted = mapTaskRow(payload.new as Record<string, unknown>);
            setTasks((prev) => {
              if (prev.find((t) => t.id === inserted.id)) return prev;
              return [...prev, inserted];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updated = mapTaskRow(payload.new as Record<string, unknown>);
            setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
          } else if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as Record<string, unknown>).id as string;
            setTasks((prev) => prev.filter((t) => t.id !== deletedId));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAuthenticated, user, projectId]);

  const createTask = useCallback(async (data: {
    title: string;
    description: string;
    priority: 'low' | 'medium' | 'high';
    status: string;
    due_date: string;
  }): Promise<Task | null> => {
    if (!isAuthenticated || !user) {
      return null;
    }

    try {
      const { data: created, error: createError } = await supabase
        .from('tasks')
        .insert({
          project_id: projectId,
          title: data.title,
          description: data.description,
          status: data.status,
          priority: data.priority,
          due_date: data.due_date,
        })
        .select()
        .single();

      if (createError) throw createError;

      const mapped = mapTaskRow(created as Record<string, unknown>);
      setTasks((prev) => [...prev, mapped]);
      return mapped;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create task';
      setError(message);
      return null;
    }
  }, [projectId, user, isAuthenticated]);

  const updateTask = useCallback(async (taskId: string, updates: Partial<Task>): Promise<boolean> => {
    if (!isAuthenticated || !user) {
      return false;
    }

    try {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
      if (updates.due_date !== undefined) dbUpdates.due_date = updates.due_date;

      const { error: updateError } = await supabase
        .from('tasks')
        .update(dbUpdates)
        .eq('id', taskId);

      if (updateError) throw updateError;

      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, ...updates } : t)));
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update task';
      setError(message);
      return false;
    }
  }, [user, isAuthenticated]);

  const deleteTask = useCallback(async (taskId: string): Promise<boolean> => {
    if (!isAuthenticated || !user) {
      return false;
    }

    try {
      const { error: deleteError } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      if (deleteError) throw deleteError;

      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete task';
      setError(message);
      return false;
    }
  }, [user, isAuthenticated]);

  const updateTaskList = useCallback((newTasks: Task[]) => {
    setTasks(newTasks);
  }, []);

  return {
    tasks,
    isLoading,
    error,
    fetchTasks,
    createTask,
    updateTask,
    deleteTask,
    updateTaskList,
  };
}