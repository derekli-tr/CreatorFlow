import { useState } from 'react';

interface ShareModalProps {
  open: boolean;
  onClose: () => void;
  documentType: 'invoice' | 'proposal';
  documentLabel: string;
  clientName: string;
  clientEmail: string;
  clientCompany: string;
  onDownloadPackage: () => Promise<void>;
  isPackaging: boolean;
  pdfFilename: string;
}

function generateEmailDraft(
  type: 'invoice' | 'proposal',
  clientName: string,
  clientCompany: string,
  documentLabel: string
): { subject: string; body: string } {
  const firstName = clientName.split(' ')[0] || clientName;

  if (type === 'invoice') {
    return {
      subject: `Invoice ${documentLabel} — ${clientCompany || clientName}`,
      body: `Hi ${firstName},

Please find attached invoice ${documentLabel} for your review.

The invoice covers the services we've delivered. You can also view and pay this invoice online through your secure client portal.

If you have any questions about the charges or need to discuss payment terms, just let me know — I'm happy to chat.

Best regards`,
    };
  }

  return {
    subject: `Proposal: ${documentLabel} — ${clientCompany || clientName}`,
    body: `Hi ${firstName},

I'm excited to share this proposal with you! The attached PDF outlines the full scope of work, timeline, and pricing for ${documentLabel}.

You can review the proposal, accept or decline it, and if you're ready to move forward, the acceptance will automatically generate an invoice so we can get started right away.

If anything needs clarification or you'd like to discuss adjustments, I'm all ears — let's make this work for you.

Best regards`,
  };
}

export default function ShareModal({
  open,
  onClose,
  documentType,
  documentLabel,
  clientName,
  clientEmail,
  clientCompany,
  onDownloadPackage,
  isPackaging,
  pdfFilename,
}: ShareModalProps) {
  const [showDraft, setShowDraft] = useState(true);
  const [copiedSubject, setCopiedSubject] = useState(false);
  const [copiedBody, setCopiedBody] = useState(false);

  if (!open) return null;

  const draft = generateEmailDraft(documentType, clientName, clientCompany, documentLabel);

  const handleCopySubject = async () => {
    await navigator.clipboard.writeText(draft.subject);
    setCopiedSubject(true);
    setTimeout(() => setCopiedSubject(false), 2000);
  };

  const handleCopyBody = async () => {
    await navigator.clipboard.writeText(draft.body);
    setCopiedBody(true);
    setTimeout(() => setCopiedBody(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-elevated w-full max-w-lg mx-4 max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 pb-0">
          <div>
            <h3 className="font-heading font-semibold text-lg text-foreground-950">Share with Client</h3>
            <p className="text-sm text-foreground-500 mt-1">
              {documentType === 'invoice' ? 'Invoice' : 'Proposal'}: {documentLabel}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground-400 hover:text-foreground-600 hover:bg-background-50 transition-colors cursor-pointer"
          >
            <i className="ri-close-line" />
          </button>
        </div>

        {/* Email preview */}
        <div className="p-5">
          <div className="bg-background-50 rounded-lg border border-background-200 overflow-hidden">
            {/* Email header bar */}
            <div className="px-4 py-3 border-b border-background-200 bg-background-100/50">
              <div className="flex items-center gap-2 text-xs text-foreground-500 mb-1">
                <span className="font-medium text-foreground-400 w-12 shrink-0">To:</span>
                <span className="text-foreground-700">{clientEmail || '(no email on file)'}</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="font-medium text-foreground-400 w-12 shrink-0">Subject:</span>
                <span className="text-foreground-700 flex-1">{draft.subject}</span>
                <button
                  onClick={handleCopySubject}
                  className="text-foreground-400 hover:text-foreground-600 cursor-pointer shrink-0"
                  title="Copy subject"
                >
                  <span className="w-4 h-4 flex items-center justify-center">
                    <i className={copiedSubject ? "ri-check-line text-status-accepted" : "ri-file-copy-line"} />
                  </span>
                </button>
              </div>
            </div>
            {/* Body */}
            <div className="relative">
              <div className="p-4">
                <pre className="text-sm text-foreground-700 leading-relaxed font-sans whitespace-pre-wrap">
                  {draft.body}
                </pre>
              </div>
              <button
                onClick={handleCopyBody}
                className="absolute top-3 right-3 w-7 h-7 rounded-md flex items-center justify-center text-foreground-400 hover:text-foreground-600 hover:bg-background-100 transition-colors cursor-pointer"
                title="Copy body"
              >
                <span className="w-4 h-4 flex items-center justify-center">
                  <i className={copiedBody ? "ri-check-line text-status-accepted" : "ri-file-copy-line"} />
                </span>
              </button>
            </div>
          </div>

          {/* Toggle draft visibility */}
          <button
            onClick={() => setShowDraft(!showDraft)}
            className="text-xs text-secondary-500 hover:text-secondary-600 mt-3 cursor-pointer inline-flex items-center gap-1"
          >
            <span className="w-3.5 h-3.5 flex items-center justify-center">
              <i className={showDraft ? "ri-eye-off-line" : "ri-eye-line"} />
            </span>
            {showDraft ? "Hide email draft" : "Show email draft"}
          </button>
        </div>

        {/* Actions */}
        <div className="p-5 pt-0 space-y-3">
          <button
            onClick={onDownloadPackage}
            disabled={isPackaging}
            className="w-full flex items-center justify-center gap-2 bg-secondary-500 hover:bg-secondary-600 text-white font-medium text-sm py-2.5 px-4 rounded-lg whitespace-nowrap cursor-pointer transition-colors disabled:opacity-50"
          >
            <span className="w-4 h-4 flex items-center justify-center">
              <i className={isPackaging ? "ri-loader-4-line animate-spin" : "ri-archive-line"} />
            </span>
            {isPackaging ? "Packaging..." : `Download ZIP (${pdfFilename} + email draft)`}
          </button>

          <p className="text-xs text-foreground-400 text-center px-2">
            Downloads a ZIP file containing the PDF and a cover-email.txt file. Copy the draft above into your email client or attach the txt as a reference for your assistant.
          </p>
        </div>
      </div>
    </div>
  );
}