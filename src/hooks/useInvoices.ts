import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

export interface Invoice {
  id: string;
  client_id: string;
  project_id: string | null;
  owner_id: string;
  invoice_number: string;
  status: string;
  amount: number;
  due_date: string;
  sent_at: string | null;
  paid_at: string | null;
  created_at: string;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  discount: number;
  viewed_at: string | null;
  reminded_at: string | null;
  voided_at: string | null;
  notes: string;
  line_items: InvoiceLineItem[];
}

function mapInvoiceRow(row: Record<string, unknown>): Invoice {
  const content = row.content ? (row.content as Record<string, unknown>) : {};
  return {
    id: row.id as string,
    client_id: row.client_id as string,
    project_id: (row.project_id as string) || null,
    owner_id: row.owner_id as string,
    invoice_number: row.invoice_number as string,
    status: row.status as string,
    amount: Number(row.amount) || 0,
    due_date: row.due_date as string,
    sent_at: (row.sent_at as string) || null,
    paid_at: (row.paid_at as string) || null,
    created_at: row.created_at as string,
    subtotal: Number(content.subtotal) || 0,
    tax_rate: Number(content.tax_rate) || 0,
    tax_amount: Number(content.tax_amount) || 0,
    discount: Number(content.discount) || 0,
    viewed_at: (content.viewed_at as string) || null,
    reminded_at: (content.reminded_at as string) || null,
    voided_at: (content.voided_at as string) || null,
    notes: (content.notes as string) || '',
    line_items: (content.line_items as InvoiceLineItem[]) || [],
  };
}

export function useInvoices() {
  const { user, isAuthenticated } = useAuthStore();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInvoices = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    if (!isAuthenticated || !user) {
      setInvoices([]);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error: fetchError } = await supabase
        .from('invoices')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setInvoices(data?.map(mapInvoiceRow) || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load invoices';
      setError(message);
      setInvoices([]);
    } finally {
      setIsLoading(false);
    }
  }, [user, isAuthenticated]);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  /* Real-time subscription */
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const channel = supabase
      .channel('invoices-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'invoices',
          filter: `owner_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const inserted = mapInvoiceRow(payload.new as Record<string, unknown>);
            setInvoices((prev) => {
              if (prev.find((inv) => inv.id === inserted.id)) return prev;
              return [inserted, ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updated = mapInvoiceRow(payload.new as Record<string, unknown>);
            setInvoices((prev) => prev.map((inv) => (inv.id === updated.id ? updated : inv)));
          } else if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as Record<string, unknown>).id as string;
            setInvoices((prev) => prev.filter((inv) => inv.id !== deletedId));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAuthenticated, user]);

  const updateInvoice = useCallback(async (invoiceId: string, updates: Partial<Invoice>): Promise<boolean> => {
    if (!isAuthenticated || !user) return false;
    try {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.sent_at !== undefined) dbUpdates.sent_at = updates.sent_at;
      if (updates.paid_at !== undefined) dbUpdates.paid_at = updates.paid_at;
      if (updates.amount !== undefined) dbUpdates.amount = updates.amount;

      const { error: updateError } = await supabase
        .from('invoices')
        .update(dbUpdates)
        .eq('id', invoiceId)
        .eq('owner_id', user.id);
      if (updateError) throw updateError;

      setInvoices((prev) => prev.map((inv) => (inv.id === invoiceId ? { ...inv, ...updates } : inv)));
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update invoice';
      setError(message);
      return false;
    }
  }, [user, isAuthenticated]);

  const createInvoice = useCallback(async (data: {
    client_id: string;
    project_id?: string | null;
    invoice_number: string;
    status: string;
    amount: number;
    due_date: string;
    notes?: string;
    line_items?: InvoiceLineItem[];
    subtotal?: number;
    tax_rate?: number;
    tax_amount?: number;
    discount?: number;
  }): Promise<Invoice | null> => {
    if (!isAuthenticated || !user) return null;
    try {
      const content = {
        subtotal: data.subtotal ?? data.amount,
        tax_rate: data.tax_rate ?? 0,
        tax_amount: data.tax_amount ?? 0,
        discount: data.discount ?? 0,
        notes: data.notes ?? '',
        line_items: data.line_items ?? [{ description: 'Services rendered', quantity: 1, rate: data.amount, amount: data.amount }],
      };

      const { data: created, error: createError } = await supabase
        .from('invoices')
        .insert({
          owner_id: user.id,
          client_id: data.client_id,
          project_id: data.project_id || null,
          invoice_number: data.invoice_number,
          status: data.status,
          amount: data.amount,
          due_date: data.due_date,
          content,
        })
        .select()
        .single();

      if (createError) throw createError;

      const mapped = mapInvoiceRow(created as Record<string, unknown>);
      setInvoices((prev) => [mapped, ...prev]);
      return mapped;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create invoice';
      setError(message);
      return null;
    }
  }, [user, isAuthenticated]);

  return { invoices, isLoading, error, fetchInvoices, updateInvoice, createInvoice };
}