import { forwardRef } from 'react';
import type { Proposal } from '@/types/proposals';

interface PrintableProposalProps {
  proposal: Proposal;
}

function renderPlainText(content: string) {
  return content.split('\n').map((line, i) => {
    const trimmed = line.trim();
    if (trimmed === '') return <div key={i} style={{ height: 8 }} />;
    if (trimmed.startsWith('## ')) {
      return (
        <h3 key={i} style={{ fontSize: 15, fontWeight: 600, color: '#111827', margin: '16px 0 6px' }}>
          {trimmed.replace('## ', '')}
        </h3>
      );
    }
    if (/^\d+\./.test(trimmed)) {
      const parts = trimmed.match(/^(\d+)\.\s+(.*)/);
      if (parts) {
        return (
          <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#6B7280', width: 22, textAlign: 'right', flexShrink: 0 }}>
              {parts[1]}.
            </span>
            <span style={{ fontSize: 13, color: '#374151' }}>{parts[2]}</span>
          </div>
        );
      }
    }
    if (trimmed.startsWith('- ')) {
      return (
        <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 3, paddingLeft: 24 }}>
          <span style={{ fontSize: 12, color: '#9CA3AF', flexShrink: 0 }}>&bull;</span>
          <span style={{ fontSize: 13, color: '#374151' }}>{trimmed.replace('- ', '')}</span>
        </div>
      );
    }
    return (
      <p key={i} style={{ fontSize: 13, color: '#374151', lineHeight: 1.6, marginBottom: 4 }}>
        {trimmed}
      </p>
    );
  });
}

const PrintableProposal = forwardRef<HTMLDivElement, PrintableProposalProps>(
  ({ proposal }, ref) => {
    const cover = proposal.sections.find((s) => s.type === 'cover');
    const bodySections = proposal.sections.filter((s) => s.type !== 'cover');

    return (
      <div ref={ref} className="bg-white" style={{ width: '794px', fontFamily: 'Inter, system-ui, sans-serif' }}>
        {/* Cover Page */}
        <div style={{ padding: '60px 50px', borderBottom: '1px solid #E5E7EB', minHeight: 400 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 48 }}>
            Proposal
          </p>
          <h1 style={{ fontSize: 30, fontWeight: 700, color: '#111827', marginBottom: 48, lineHeight: 1.3, maxWidth: 500 }}>
            {proposal.title}
          </h1>
          <div style={{ display: 'flex', gap: 80 }}>
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
                Prepared For
              </p>
              <p style={{ fontSize: 15, fontWeight: 600, color: '#111827', margin: 0 }}>
                {proposal.coverData.clientName}
              </p>
              <p style={{ fontSize: 14, color: '#4B5563', margin: '2px 0' }}>
                {proposal.coverData.clientCompany}
              </p>
            </div>
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
                Prepared By
              </p>
              <p style={{ fontSize: 15, fontWeight: 600, color: '#111827', margin: 0 }}>
                {proposal.coverData.preparedBy}
              </p>
              <p style={{ fontSize: 14, color: '#4B5563', margin: '2px 0' }}>
                {proposal.coverData.preparedCompany}
              </p>
            </div>
          </div>
          <div style={{ marginTop: 32, display: 'flex', gap: 40, fontSize: 12, color: '#6B7280' }}>
            <span>Date: {new Date(proposal.coverData.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
            <span>Valid until: {new Date(proposal.coverData.validUntil).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
          </div>
        </div>

        {/* Body Sections */}
        <div style={{ padding: '50px 50px 40px' }}>
          {bodySections.map((section) => (
            <div key={section.type} style={{ marginBottom: 32 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid #E5E7EB' }}>
                {section.label}
              </h2>
              <div>{renderPlainText(section.content)}</div>
            </div>
          ))}

          {/* Pricing Table */}
          {proposal.pricingItems.length > 0 && (
            <div style={{ marginBottom: 32 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid #E5E7EB' }}>
                Pricing
              </h2>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #E5E7EB' }}>
                    <th style={{ textAlign: 'left', padding: '8px', fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 1 }}>Item</th>
                    <th style={{ textAlign: 'right', padding: '8px', fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 1 }}>Qty</th>
                    <th style={{ textAlign: 'right', padding: '8px', fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 1 }}>Rate</th>
                    <th style={{ textAlign: 'right', padding: '8px', fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 1 }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {proposal.pricingItems.map((item) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                      <td style={{ padding: '8px', fontSize: 13, color: '#1F2937' }}>{item.description}</td>
                      <td style={{ padding: '8px', fontSize: 13, color: '#4B5563', textAlign: 'right' }}>{item.quantity}</td>
                      <td style={{ padding: '8px', fontSize: 13, color: '#4B5563', textAlign: 'right' }}>
                        ${item.rate.toLocaleString()}
                      </td>
                      <td style={{ padding: '8px', fontSize: 13, color: '#1F2937', textAlign: 'right', fontWeight: 500 }}>
                        ${item.amount.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12, paddingTop: 12, borderTop: '2px solid #111827' }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>
                  Total: ${proposal.amount.toLocaleString()}
                </span>
              </div>
            </div>
          )}

          {/* Timeline */}
          {proposal.timelinePhases.length > 0 && (
            <div style={{ marginBottom: 32 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid #E5E7EB' }}>
                Timeline
              </h2>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #E5E7EB' }}>
                    <th style={{ textAlign: 'left', padding: '8px', fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 1 }}>Phase</th>
                    <th style={{ textAlign: 'left', padding: '8px', fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 1 }}>Description</th>
                    <th style={{ textAlign: 'right', padding: '8px', fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 1 }}>Start</th>
                    <th style={{ textAlign: 'right', padding: '8px', fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 1 }}>End</th>
                  </tr>
                </thead>
                <tbody>
                  {proposal.timelinePhases.map((phase) => (
                    <tr key={phase.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                      <td style={{ padding: '8px', fontSize: 13, color: '#1F2937', fontWeight: 500 }}>{phase.name}</td>
                      <td style={{ padding: '8px', fontSize: 13, color: '#4B5563' }}>{phase.description}</td>
                      <td style={{ padding: '8px', fontSize: 13, color: '#4B5563', textAlign: 'right' }}>
                        {phase.startDate ? new Date(phase.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                      </td>
                      <td style={{ padding: '8px', fontSize: 13, color: '#4B5563', textAlign: 'right' }}>
                        {phase.endDate ? new Date(phase.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 50px', borderTop: '1px solid #E5E7EB', fontSize: 11, color: '#9CA3AF', textAlign: 'center' }}>
          Generated on {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </div>
      </div>
    );
  }
);

PrintableProposal.displayName = 'PrintableProposal';
export default PrintableProposal;