import { forwardRef } from 'react';
import type { Invoice } from '@/hooks/useInvoices';

interface PrintableInvoiceProps {
  invoice: Invoice;
  clientName: string;
  clientCompany: string;
  clientEmail: string;
  clientAddress: string;
  projectTitle: string;
}

const PrintableInvoice = forwardRef<HTMLDivElement, PrintableInvoiceProps>(
  ({ invoice, clientName, clientCompany, clientEmail, clientAddress, projectTitle }, ref) => {
    const formatCurrency = (val: number) =>
      '$' + val.toLocaleString('en-US', { minimumFractionDigits: 2 });
    const formatDate = (dateStr: string | null) => {
      if (!dateStr) return '—';
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    };

    return (
      <div ref={ref} className="bg-white p-10" style={{ width: '794px', fontFamily: 'Inter, system-ui, sans-serif' }}>
        {/* Header */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h1 style={{ fontSize: 32, fontWeight: 700, color: '#111827', margin: 0 }}>
                INVOICE
              </h1>
              <p style={{ fontSize: 18, fontWeight: 600, color: '#374151', marginTop: 4 }}>
                {invoice.invoice_number}
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: 28, fontWeight: 700, color: '#111827', margin: 0 }}>
                {formatCurrency(invoice.amount)}
              </p>
              <p style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>Amount Due</p>
              {invoice.status === 'paid' && (
                <p style={{ fontSize: 12, color: '#059669', marginTop: 2, fontWeight: 600 }}>
                  Paid {formatDate(invoice.paid_at)}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Dates */}
        <div style={{ display: 'flex', gap: 60, marginBottom: 32, paddingBottom: 24, borderBottom: '1px solid #E5E7EB' }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Issue Date</p>
            <p style={{ fontSize: 14, color: '#374151' }}>{formatDate(invoice.created_at)}</p>
          </div>
          <div>
            <p style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Due Date</p>
            <p style={{ fontSize: 14, color: '#374151' }}>{formatDate(invoice.due_date)}</p>
          </div>
          <div>
            <p style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Status</p>
            <p style={{ fontSize: 14, fontWeight: 600, color: invoice.status === 'paid' ? '#059669' : invoice.status === 'overdue' ? '#DC2626' : '#374151', textTransform: 'capitalize' }}>
              {invoice.status}
            </p>
          </div>
        </div>

        {/* Bill To & Project */}
        <div style={{ display: 'flex', gap: 60, marginBottom: 32 }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Bill To</p>
            {clientName ? (
              <>
                <p style={{ fontSize: 15, fontWeight: 600, color: '#111827', margin: 0 }}>{clientName}</p>
                {clientCompany && <p style={{ fontSize: 14, color: '#4B5563', margin: '2px 0' }}>{clientCompany}</p>}
                {clientEmail && <p style={{ fontSize: 13, color: '#6B7280', margin: '2px 0' }}>{clientEmail}</p>}
                {clientAddress && <p style={{ fontSize: 13, color: '#6B7280', margin: '2px 0', whiteSpace: 'pre-line' }}>{clientAddress}</p>}
              </>
            ) : (
              <p style={{ fontSize: 14, color: '#9CA3AF' }}>No client linked</p>
            )}
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Project</p>
            <p style={{ fontSize: 14, color: '#374151', margin: 0 }}>{projectTitle || 'No project linked'}</p>
          </div>
        </div>

        {/* Line Items */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #E5E7EB' }}>
              <th style={{ textAlign: 'left', padding: '10px 8px', fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 1 }}>Description</th>
              <th style={{ textAlign: 'right', padding: '10px 8px', fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 1 }}>Qty</th>
              <th style={{ textAlign: 'right', padding: '10px 8px', fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 1 }}>Rate</th>
              <th style={{ textAlign: 'right', padding: '10px 8px', fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 1 }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoice.line_items.map((item, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #F3F4F6' }}>
                <td style={{ padding: '10px 8px', fontSize: 14, color: '#1F2937' }}>{item.description}</td>
                <td style={{ padding: '10px 8px', fontSize: 14, color: '#4B5563', textAlign: 'right' }}>{item.quantity}</td>
                <td style={{ padding: '10px 8px', fontSize: 14, color: '#4B5563', textAlign: 'right' }}>{formatCurrency(item.rate)}</td>
                <td style={{ padding: '10px 8px', fontSize: 14, color: '#1F2937', textAlign: 'right', fontWeight: 500 }}>{formatCurrency(item.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 32 }}>
          <div style={{ width: 240 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13, color: '#6B7280' }}>
              <span>Subtotal</span>
              <span>{formatCurrency(invoice.subtotal)}</span>
            </div>
            {invoice.discount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13 }}>
                <span style={{ color: '#6B7280' }}>Discount</span>
                <span style={{ color: '#DC2626' }}>-{formatCurrency(invoice.discount)}</span>
              </div>
            )}
            {invoice.tax_rate > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13 }}>
                <span style={{ color: '#6B7280' }}>Tax ({invoice.tax_rate}%)</span>
                <span style={{ color: '#1F2937' }}>{formatCurrency(invoice.tax_amount)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0 0', borderTop: '2px solid #111827', marginTop: 4, fontSize: 16, fontWeight: 700, color: '#111827' }}>
              <span>Total</span>
              <span>{formatCurrency(invoice.amount)}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {invoice.notes && (
          <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: 20 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Notes</p>
            <p style={{ fontSize: 13, color: '#4B5563', lineHeight: 1.6 }}>{invoice.notes}</p>
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop: 40, paddingTop: 16, borderTop: '1px solid #E5E7EB', fontSize: 11, color: '#9CA3AF', textAlign: 'center' }}>
          Generated on {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </div>
      </div>
    );
  }
);

PrintableInvoice.displayName = 'PrintableInvoice';
export default PrintableInvoice;