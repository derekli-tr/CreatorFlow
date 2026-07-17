export interface ProposalSection {
  type: string;
  label: string;
  content: string;
}

export interface PricingLineItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

export interface TimelinePhase {
  id: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
}

export interface ProposalCoverData {
  clientName: string;
  clientCompany: string;
  preparedBy: string;
  preparedCompany: string;
  date: string;
  validUntil: string;
}

export interface Proposal {
  id: string;
  client_id: string;
  owner_id: string;
  template_id: string | null;
  title: string;
  status: 'draft' | 'sent' | 'accepted' | 'declined';
  amount: number;
  sections: ProposalSection[];
  pricingItems: PricingLineItem[];
  timelinePhases: TimelinePhase[];
  coverData: ProposalCoverData;
  sent_at: string | null;
  viewed_at: string | null;
  accepted_at: string | null;
  declined_at: string | null;
  created_at: string;
  updated_at: string;
}
