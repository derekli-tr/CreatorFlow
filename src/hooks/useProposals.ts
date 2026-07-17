import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import type { Proposal, ProposalSection, PricingLineItem, TimelinePhase } from '@/types/proposals';

function buildDefaultSections(): ProposalSection[] {
  return [
    { type: 'cover', label: 'Cover Page', content: '' },
    { type: 'summary', label: 'Executive Summary', content: '' },
    { type: 'scope', label: 'Scope of Work', content: '' },
    { type: 'pricing', label: 'Investment', content: '' },
    { type: 'terms', label: 'Terms & Conditions', content: '' },
  ];
}

interface ProposalContent {
  sections?: ProposalSection[];
  pricingItems?: PricingLineItem[];
  timelinePhases?: TimelinePhase[];
  coverData?: Proposal['coverData'];
  template_id?: string | null;
  viewed_at?: string | null;
  accepted_at?: string | null;
  declined_at?: string | null;
  updated_at?: string;
}

function parseContent(contentRaw: string | null): ProposalContent {
  if (!contentRaw) return {};
  try {
    return JSON.parse(contentRaw) as ProposalContent;
  } catch {
    return {};
  }
}

function serializeContent(data: ProposalContent): string {
  return JSON.stringify(data);
}

function mapRowToProposal(
  row: Record<string, unknown>,
  clientNameMap: Record<string, string>,
): Proposal {
  const content = parseContent(row.content as string | null);
  return {
    id: row.id as string,
    client_id: (row.client_id as string) || '',
    owner_id: (row.owner_id as string) || '',
    template_id: content.template_id ?? null,
    title: (row.title as string) || 'Untitled Proposal',
    status: (row.status as Proposal['status']) || 'draft',
    amount: Number(row.amount) || 0,
    sections: content.sections || buildDefaultSections(),
    pricingItems: content.pricingItems || [],
    timelinePhases: content.timelinePhases || [],
    coverData: content.coverData || {
      clientName: '',
      clientCompany: '',
      preparedBy: 'Alex Rivera',
      preparedCompany: 'FreelanceFlow Studio',
      date: new Date().toISOString().split('T')[0],
      validUntil: '',
    },
    sent_at: (row.sent_at as string) || content.viewed_at || null,
    viewed_at: content.viewed_at || null,
    accepted_at: content.accepted_at || null,
    declined_at: content.declined_at || null,
    created_at: (row.created_at as string) || new Date().toISOString(),
    updated_at: content.updated_at || (row.created_at as string) || new Date().toISOString(),
  };
}

export function useProposals() {
  const { user, isAuthenticated } = useAuthStore();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clientNameMap, setClientNameMap] = useState<Record<string, string>>({});
  const [clientEmailMap, setClientEmailMap] = useState<Record<string, string>>({});

  const fetchProposals = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    if (!isAuthenticated || !user) {
      setProposals([]);
      setIsLoading(false);
      return;
    }

    try {
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('id, company, email')
        .eq('owner_id', user.id);

      if (clientError) throw clientError;

      const cmap: Record<string, string> = {};
      const emap: Record<string, string> = {};
      if (clientData) {
        clientData.forEach((c: Record<string, unknown>) => {
          cmap[c.id as string] = (c.company as string) || '—';
          emap[c.id as string] = (c.email as string) || '';
        });
      }
      setClientNameMap(cmap);
      setClientEmailMap(emap);

      const { data, error: fetchError } = await supabase
        .from('proposals')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setProposals(data?.map((row: Record<string, unknown>) => mapRowToProposal(row, cmap)) || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load proposals';
      setError(message);
      setProposals([]);
    } finally {
      setIsLoading(false);
    }
  }, [user, isAuthenticated]);

  useEffect(() => {
    fetchProposals();
  }, [fetchProposals]);

  /* Real-time subscription */
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const channel = supabase
      .channel('proposals-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'proposals',
          filter: `owner_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const inserted = mapRowToProposal(payload.new as Record<string, unknown>, clientNameMap);
            setProposals((prev) => {
              if (prev.find((p) => p.id === inserted.id)) return prev;
              return [inserted, ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updated = mapRowToProposal(payload.new as Record<string, unknown>, clientNameMap);
            setProposals((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
          } else if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as Record<string, unknown>).id as string;
            setProposals((prev) => prev.filter((p) => p.id !== deletedId));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAuthenticated, user, clientNameMap]);

  const getProposal = useCallback((proposalId: string): Proposal | null => {
    return proposals.find((p) => p.id === proposalId) || null;
  }, [proposals]);

  const updateProposal = useCallback(async (proposalId: string, updates: Partial<Proposal>): Promise<boolean> => {
    if (!isAuthenticated || !user) {
      return false;
    }

    try {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.amount !== undefined) dbUpdates.amount = updates.amount;

      if (updates.status !== undefined) {
        dbUpdates.status = updates.status;
        const now = new Date().toISOString();
        if (updates.status === 'sent') dbUpdates.sent_at = now;
      }

      if (updates.sent_at !== undefined) dbUpdates.sent_at = updates.sent_at;

      const current = proposals.find((p) => p.id === proposalId);
      if (current) {
        const existingContent = {
          sections: current.sections,
          pricingItems: current.pricingItems,
          timelinePhases: current.timelinePhases,
          coverData: current.coverData,
          template_id: current.template_id,
          viewed_at: current.viewed_at,
          accepted_at: current.accepted_at,
          declined_at: current.declined_at,
          updated_at: current.updated_at,
        };

        const now = new Date().toISOString();
        if (updates.sections !== undefined) existingContent.sections = updates.sections;
        if (updates.pricingItems !== undefined) existingContent.pricingItems = updates.pricingItems;
        if (updates.timelinePhases !== undefined) existingContent.timelinePhases = updates.timelinePhases;
        if (updates.coverData !== undefined) existingContent.coverData = updates.coverData;
        if (updates.viewed_at !== undefined) existingContent.viewed_at = updates.viewed_at;
        if (updates.accepted_at !== undefined) existingContent.accepted_at = updates.accepted_at;
        if (updates.declined_at !== undefined) existingContent.declined_at = updates.declined_at;

        if (updates.status === 'accepted') existingContent.accepted_at = now;
        if (updates.status === 'declined') existingContent.declined_at = now;

        existingContent.updated_at = now;
        dbUpdates.content = serializeContent(existingContent);
      } else {
        const now = new Date().toISOString();
        const fallbackContent: ProposalContent = {
          sections: updates.sections,
          pricingItems: updates.pricingItems,
          timelinePhases: updates.timelinePhases,
          coverData: updates.coverData,
          updated_at: now,
        };
        if (updates.status === 'accepted') fallbackContent.accepted_at = now;
        if (updates.status === 'declined') fallbackContent.declined_at = now;
        dbUpdates.content = serializeContent(fallbackContent);
      }

      const { error: updateError } = await supabase
        .from('proposals')
        .update(dbUpdates)
        .eq('id', proposalId)
        .eq('owner_id', user.id);

      if (updateError) throw updateError;

      setProposals((prev) => prev.map((p) => (p.id === proposalId ? { ...p, ...updates, updated_at: new Date().toISOString() } : p)));
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update proposal';
      setError(message);
      return false;
    }
  }, [user, isAuthenticated, proposals]);

  const createProposal = useCallback(async (data: {
    title: string;
    client_id: string;
    sections?: ProposalSection[];
    coverData?: Proposal['coverData'];
  }): Promise<Proposal | null> => {
    const now = new Date().toISOString();
    const sections = data.sections || buildDefaultSections();
    const coverData = data.coverData || {
      clientName: '',
      clientCompany: '',
      preparedBy: 'Alex Rivera',
      preparedCompany: 'FreelanceFlow Studio',
      date: now.split('T')[0],
      validUntil: '',
    };

    const content: ProposalContent = {
      sections,
      pricingItems: [],
      timelinePhases: [],
      coverData,
      updated_at: now,
    };

    if (!isAuthenticated || !user) {
      return null;
    }

    try {
      const { data: created, error: createError } = await supabase
        .from('proposals')
        .insert({
          owner_id: user.id,
          client_id: data.client_id,
          title: data.title,
          content: serializeContent(content),
          status: 'draft',
          amount: 0,
        })
        .select()
        .single();

      if (createError) throw createError;

      const mapped = mapRowToProposal(created as Record<string, unknown>, clientNameMap);
      setProposals((prev) => [mapped, ...prev]);
      return mapped;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create proposal';
      setError(message);
      return null;
    }
  }, [user, isAuthenticated, clientNameMap]);

  return {
    proposals,
    isLoading,
    error,
    fetchProposals,
    getProposal,
    updateProposal,
    createProposal,
    clientNameMap,
    clientEmailMap,
  };
}