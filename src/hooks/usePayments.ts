import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

export interface Payment {
  id: string;
  invoice_id: string;
  amount: number;
  method: string;
  paid_at: string;
}

function mapPaymentRow(row: Record<string, unknown>): Payment {
  return {
    id: row.id as string,
    invoice_id: row.invoice_id as string,
    amount: Number(row.amount) || 0,
    method: row.method as string,
    paid_at: row.paid_at as string,
  };
}

export function usePayments() {
  const { user, isAuthenticated } = useAuthStore();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPayments = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    if (!isAuthenticated || !user) {
      setPayments([]);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error: fetchError } = await supabase
        .from('payments')
        .select('*')
        .order('paid_at', { ascending: false });

      if (fetchError) throw fetchError;

      setPayments(data?.map(mapPaymentRow) || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load payments';
      setError(message);
      setPayments([]);
    } finally {
      setIsLoading(false);
    }
  }, [user, isAuthenticated]);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  /* Real-time subscription — RLS handles scoping since payments table has no owner_id */
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const channel = supabase
      .channel('payments-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payments',
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const inserted = mapPaymentRow(payload.new as Record<string, unknown>);
            setPayments((prev) => {
              if (prev.find((p) => p.id === inserted.id)) return prev;
              return [inserted, ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updated = mapPaymentRow(payload.new as Record<string, unknown>);
            setPayments((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
          } else if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as Record<string, unknown>).id as string;
            setPayments((prev) => prev.filter((p) => p.id !== deletedId));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAuthenticated, user]);

  return { payments, isLoading, error, fetchPayments };
}