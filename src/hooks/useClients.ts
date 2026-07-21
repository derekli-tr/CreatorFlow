import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

export interface Client {
  id: string;
  owner_id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  address: string;
  industry: string;
  source: string;
  website: string;
  notes: string;
  status: string;
  lifetime_revenue: number;
  outstanding_balance: number;
  last_contacted_at: string;
  created_at: string;
  updated_at: string;
}

function mapClientRow(row: Record<string, unknown>): Client {
  return {
    id: row.id as string,
    owner_id: row.owner_id as string,
    name: row.name as string,
    email: row.email as string,
    phone: row.phone as string,
    company: row.company as string,
    address: row.address as string,
    industry: row.industry as string,
    source: row.source as string,
    website: row.website as string,
    notes: row.notes as string,
    status: row.status as string,
    lifetime_revenue: Number(row.lifetime_revenue) || 0,
    outstanding_balance: Number(row.outstanding_balance) || 0,
    last_contacted_at: row.last_contacted_at as string,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

export function useClients() {
  const { user, isAuthenticated } = useAuthStore();
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchClients = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    if (!isAuthenticated || !user) {
      setClients([]);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error: fetchError } = await supabase
        .from('clients')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setClients(data?.map(mapClientRow) || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load clients';
      setError(message);
      setClients([]);
    } finally {
      setIsLoading(false);
    }
  }, [user, isAuthenticated]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  /* Real-time subscription */
  const channelIdRef = useRef(0);
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    channelIdRef.current += 1;
    const channelName = `clients-realtime-${channelIdRef.current}-${Date.now()}`;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'clients',
          filter: `owner_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const inserted = mapClientRow(payload.new as Record<string, unknown>);
            setClients((prev) => {
              if (prev.find((c) => c.id === inserted.id)) return prev;
              return [inserted, ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updated = mapClientRow(payload.new as Record<string, unknown>);
            setClients((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
          } else if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as Record<string, unknown>).id as string;
            setClients((prev) => prev.filter((c) => c.id !== deletedId));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAuthenticated, user]);

  const getClient = useCallback((clientId: string): Client | null => {
    return clients.find((c) => c.id === clientId) || null;
  }, [clients]);

  const updateClient = useCallback(async (clientId: string, updates: Partial<Client>): Promise<boolean> => {
    if (!isAuthenticated || !user) {
      return false;
    }

    try {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.email !== undefined) dbUpdates.email = updates.email;
      if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
      if (updates.company !== undefined) dbUpdates.company = updates.company;
      if (updates.address !== undefined) dbUpdates.address = updates.address;
      if (updates.industry !== undefined) dbUpdates.industry = updates.industry;
      if (updates.source !== undefined) dbUpdates.source = updates.source;
      if (updates.website !== undefined) dbUpdates.website = updates.website;
      if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
      if (updates.status !== undefined) dbUpdates.status = updates.status;

      const { error: updateError } = await supabase
        .from('clients')
        .update(dbUpdates)
        .eq('id', clientId)
        .eq('owner_id', user.id);

      if (updateError) throw updateError;

      setClients((prev) => prev.map((c) => (c.id === clientId ? { ...c, ...updates } : c)));
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update client';
      setError(message);
      return false;
    }
  }, [user, isAuthenticated]);

  const createClient = useCallback(async (clientData: Omit<Client, 'id' | 'owner_id' | 'created_at' | 'updated_at'>): Promise<Client | null> => {
    if (!isAuthenticated || !user) {
      return null;
    }

    try {
      const { data, error: insertError } = await supabase
        .from('clients')
        .insert({
          owner_id: user.id,
          name: clientData.name,
          email: clientData.email,
          phone: clientData.phone,
          company: clientData.company,
          address: clientData.address,
          industry: clientData.industry,
          source: clientData.source,
          website: clientData.website,
          notes: clientData.notes,
          status: clientData.status,
          lifetime_revenue: clientData.lifetime_revenue,
          outstanding_balance: clientData.outstanding_balance,
          last_contacted_at: clientData.last_contacted_at,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      const created = mapClientRow(data);
      setClients((prev) => [created, ...prev]);
      return created;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create client';
      setError(message);
      return null;
    }
  }, [user, isAuthenticated]);

  return {
    clients,
    isLoading,
    error,
    fetchClients,
    getClient,
    updateClient,
    createClient,
  };
}