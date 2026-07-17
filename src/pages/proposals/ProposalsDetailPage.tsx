import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useProposals } from "@/hooks/useProposals";
import { useInvoices } from "@/hooks/useInvoices";
import { usePdfExport } from "@/hooks/usePdfExport";
import { supabase } from "@/lib/supabase";
import ProposalEditor from "@/pages/proposals/components/ProposalEditor";
import ProposalPreview from "@/pages/proposals/components/ProposalPreview";
import PrintableProposal from "@/pages/proposals/components/PrintableProposal";
import ShareModal from "@/components/feature/ShareModal";
import StatusBadge from "@/pages/proposals/components/StatusBadge";
import type { Proposal } from "@/types/proposals";

export default function ProposalsDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { proposals, isLoading, error, fetchProposals, updateProposal, clientNameMap, clientEmailMap } = useProposals();
  const { createInvoice } = useInvoices();

  const [editDraft, setEditDraft] = useState<Proposal | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [emailStatus, setEmailStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [emailErrorMessage, setEmailErrorMessage] = useState<string | null>(null);
  const [linkedInvoiceId, setLinkedInvoiceId] = useState<string | null>(null);
  const [payNowLoading, setPayNowLoading] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [copiedPortal, setCopiedPortal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  const { containerRef, exportPdf, getPdfBlob, isExporting } = usePdfExport({
    filename: editDraft ? `${editDraft.title.replace(/[^a-zA-Z0-9]/g, '-').slice(0, 60)}.pdf` : 'proposal.pdf',
  });

  const [isPackaging, setIsPackaging] = useState(false);

  const handleShareDownload = async () => {
    setIsPackaging(true);
    try {
      const pdfBlob = await getPdfBlob();
      if (!pdfBlob) return;

      const clientName = editDraft?.coverData?.clientName || 'client';
      const clientCompany = editDraft?.coverData?.clientCompany || '';
      const firstName = clientName.split(' ')[0] || clientName;
      const emailBody = `Hi ${firstName},\n\nI'm excited to share this proposal with you! The attached PDF outlines the full scope of work, timeline, and pricing for ${editDraft?.title || 'this project'}.\n\nYou can review the proposal, accept or decline it, and if you're ready to move forward, the acceptance will automatically generate an invoice so we can get started right away.\n\nIf anything needs clarification or you'd like to discuss adjustments, I'm all ears — let's make this work for you.\n\nBest regards`;

      const { default: JSZip } = await import('jszip');
      const zip = new JSZip();
      const safeName = (editDraft?.title || 'proposal').replace(/[^a-zA-Z0-9]/g, '-').slice(0, 60);
      zip.file(`${safeName}.pdf`, pdfBlob);
      zip.file('cover-email.txt', emailBody);

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${safeName}-package.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Share packaging failed:', err);
    } finally {
      setIsPackaging(false);
    }
  };

  /* Resolve proposal from hook data whenever proposals change */
  useEffect(() => {
    const found = proposals.find((p) => p.id === id);
    if (found) {
      setEditDraft({
        ...found,
        sections: found.sections.map((s) => ({ ...s })),
        pricingItems: found.pricingItems.map((pi) => ({ ...pi })),
        timelinePhases: found.timelinePhases.map((tp) => ({ ...tp })),
        coverData: { ...found.coverData },
      });
    }
  }, [id, proposals]);

  /* Handle edits: update local draft only */
  const handleUpdate = (updated: Proposal) => {
    setEditDraft(updated);
  };

  /* Save to backend */
  const handleSave = async () => {
    if (!editDraft || !id) return;
    setSaving(true);
    await updateProposal(id, {
      title: editDraft.title,
      amount: editDraft.amount,
      sections: editDraft.sections,
      pricingItems: editDraft.pricingItems,
      timelinePhases: editDraft.timelinePhases,
      coverData: editDraft.coverData,
    });
    setSaving(false);
  };

  /* Status actions */
  const handleStatusChange = async (newStatus: Proposal["status"]) => {
    if (!editDraft || !id) return;
    const now = new Date().toISOString();
    const updates: Partial<Proposal> = {
      status: newStatus,
      sent_at: newStatus === "sent" ? now : editDraft.sent_at,
    };
    if (newStatus === "accepted") updates.accepted_at = now;
    if (newStatus === "declined") updates.declined_at = now;

    setSaving(true);
    if (newStatus === "sent") setEmailStatus('sending');

    const success = await updateProposal(id, updates);

    if (!success) {
      setSaving(false);
      setEmailStatus('idle');
      return;
    }

    if (newStatus === "sent") {
      const clientEmail = clientEmailMap[editDraft.client_id] || '';
      if (!clientEmail) {
        setEmailStatus('error');
        setEmailErrorMessage('No email address on file for this client. Proposal saved but not delivered.');
        setSaving(false);
        return;
      }

      try {
        const basePath = (window as unknown as { __BASE_PATH__?: string }).__BASE_PATH__ || '';
        const pathPrefix = basePath ? `/${basePath}` : '';
        const portalUrl = `${window.location.origin}${pathPrefix}/portal/proposals/${id}`;

        const { error: emailError } = await supabase.functions.invoke('send-proposal-email', {
          body: {
            to_email: clientEmail,
            to_name: editDraft.coverData.clientName,
            client_company: editDraft.coverData.clientCompany,
            proposal_title: editDraft.title,
            amount: editDraft.amount,
            portal_url: portalUrl,
          },
        });

        if (emailError) {
          setEmailStatus('error');
          setEmailErrorMessage(typeof emailError === 'string' ? emailError : 'Email failed to send. Check your Resend configuration.');
        } else {
          setEmailStatus('sent');
        }
      } catch (err: unknown) {
        setEmailStatus('error');
        setEmailErrorMessage(err instanceof Error ? err.message : 'Unexpected error sending email.');
      }
    }

    /* When proposal is accepted, auto-create an invoice */
    if (newStatus === "accepted" && editDraft.amount > 0) {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 14);
      const invNumber = `INV-${Date.now().toString(36).toUpperCase()}`;

      const invoice = await createInvoice({
        client_id: editDraft.client_id,
        invoice_number: invNumber,
        status: "unpaid",
        amount: editDraft.amount,
        due_date: dueDate.toISOString().split('T')[0],
        notes: `Generated from accepted proposal: ${editDraft.title}`,
      });

      if (invoice) {
        setLinkedInvoiceId(invoice.id);
        /* Link invoice to proposal in DB */
        await supabase
          .from('proposals')
          .update({ invoice_id: invoice.id })
          .eq('id', id);
      }
    }

    setSaving(false);
  };

  /* Stripe Pay Now */
  const handlePayInvoice = async () => {
    if (!linkedInvoiceId || !editDraft) return;
    setPayNowLoading(true);
    setPayError(null);

    try {
      const basePath = (window as unknown as { __BASE_PATH__?: string }).__BASE_PATH__ || '';
      const pathPrefix = basePath ? `/${basePath}` : '';
      const successPath = `${pathPrefix}/invoices/${linkedInvoiceId}?session_id={CHECKOUT_SESSION_ID}`;
      const cancelPath = `${pathPrefix}/invoices/${linkedInvoiceId}?cancelled=true`;

      const { data, error: invokeError } = await supabase.functions.invoke('create-invoice-checkout', {
        body: {
          invoice_id: linkedInvoiceId,
          invoice_number: `INV-${Date.now().toString(36)}`,
          amount: editDraft.amount,
          client_email: clientEmailMap[editDraft.client_id] || '',
          client_name: editDraft.coverData.clientName || '',
          success_path: successPath,
          cancel_path: cancelPath,
        },
      });

      if (invokeError || !data?.url) {
        throw new Error(typeof invokeError === 'string' ? invokeError : 'Failed to create checkout');
      }

      window.location.href = data.url;
    } catch (err: unknown) {
      setPayError(err instanceof Error ? err.message : 'Payment setup failed');
      setPayNowLoading(false);
    }
  };

  /* Copy portal link */
  const handleCopyPortalLink = async () => {
    if (!id) return;
    const basePath = (window as unknown as { __BASE_PATH__?: string }).__BASE_PATH__ || '';
    const pathPrefix = basePath ? `/${basePath}` : '';
    const portalUrl = `${window.location.origin}${pathPrefix}/portal/proposals/${id}`;
    try {
      await navigator.clipboard.writeText(portalUrl);
      setCopiedPortal(true);
      setTimeout(() => setCopiedPortal(false), 2000);
    } catch {
      /* fallback for older browsers */
      const input = document.createElement('input');
      input.value = portalUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopiedPortal(true);
      setTimeout(() => setCopiedPortal(false), 2000);
    }
  };

  /* Loading state */
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-5 bg-background-200 rounded w-32" />
          <div className="h-8 bg-background-200 rounded w-64" />
          <div className="h-4 bg-background-200 rounded w-48" />
          <div className="h-64 bg-background-200 rounded-xl" />
        </div>
      </div>
    );
  }

  /* Error state */
  if (error && !editDraft) {
    return (
      <div className="text-center py-20">
        <span className="w-14 h-14 rounded-full bg-background-100 flex items-center justify-center mx-auto mb-3">
          <i className="ri-error-warning-line text-2xl text-foreground-400" />
        </span>
        <p className="text-foreground-500 font-medium">{error}</p>
        <button
          onClick={fetchProposals}
          className="text-sm text-secondary-500 hover:text-secondary-600 mt-2 inline-block font-medium cursor-pointer"
        >
          Try again
        </button>
        <Link
          to="/proposals"
          className="text-sm text-secondary-500 hover:text-secondary-600 mt-2 inline-block font-medium ml-3"
        >
          &larr; Back to proposals
        </Link>
      </div>
    );
  }

  /* Not found */
  if (!editDraft && !isLoading) {
    return (
      <div className="text-center py-20">
        <span className="w-14 h-14 rounded-full bg-background-100 flex items-center justify-center mx-auto mb-3">
          <i className="ri-file-text-line text-2xl text-foreground-400" />
        </span>
        <p className="text-foreground-500 font-medium">Proposal not found</p>
        <Link
          to="/proposals"
          className="text-sm text-secondary-500 hover:text-secondary-600 mt-2 inline-block font-medium"
        >
          &larr; Back to proposals
        </Link>
      </div>
    );
  }

  const proposal = editDraft;
  const clientCompany = proposal ? (clientNameMap[proposal.client_id] || "No client linked") : "";

  return (
    <div className="space-y-6">
      {!previewOpen && (
        <>
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <Link
                to="/proposals"
                className="text-sm text-secondary-500 hover:text-secondary-600 font-medium mb-2 inline-flex items-center gap-1"
              >
                <span className="w-4 h-4 flex items-center justify-center">
                  <i className="ri-arrow-left-line" />
                </span>
                All proposals
              </Link>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                <h2 className="font-heading font-semibold text-headline-md text-foreground-950">
                  {proposal?.title || "Untitled Proposal"}
                </h2>
                {proposal && <StatusBadge status={proposal.status} />}
              </div>
              <p className="text-body-md text-foreground-500 mt-1">
                {clientCompany} &middot; ${(proposal?.amount || 0).toLocaleString()}
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-wrap">
              {proposal && (
                <>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-4 py-2 rounded-lg border border-background-200 text-sm font-medium text-foreground-600 hover:bg-background-50 transition-colors cursor-pointer whitespace-nowrap inline-flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <span className="w-4 h-4 flex items-center justify-center">
                      <i className="ri-save-line" />
                    </span>
                    {saving && emailStatus !== 'sending' ? "Saving..." : "Save"}
                  </button>
                  <button
                    onClick={handleCopyPortalLink}
                    className="px-4 py-2 rounded-lg border border-background-200 text-sm font-medium text-foreground-600 hover:bg-background-50 transition-colors cursor-pointer whitespace-nowrap inline-flex items-center gap-1.5"
                  >
                    <span className="w-4 h-4 flex items-center justify-center">
                      <i className={copiedPortal ? "ri-check-line text-status-accepted" : "ri-link"} />
                    </span>
                    {copiedPortal ? "Copied!" : "Copy Portal Link"}
                  </button>
                  <button
                    onClick={exportPdf}
                    disabled={isExporting}
                    className="px-4 py-2 rounded-lg border border-background-200 text-sm font-medium text-foreground-600 hover:bg-background-50 transition-colors cursor-pointer whitespace-nowrap inline-flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <span className="w-4 h-4 flex items-center justify-center">
                      <i className={isExporting ? "ri-loader-4-line animate-spin" : "ri-download-line"} />
                    </span>
                    {isExporting ? "Generating..." : "Download PDF"}
                  </button>
                  <button
                    onClick={() => setShowShareModal(true)}
                    className="px-4 py-2 rounded-lg border border-background-200 text-sm font-medium text-foreground-600 hover:bg-background-50 transition-colors cursor-pointer whitespace-nowrap inline-flex items-center gap-1.5"
                  >
                    <span className="w-4 h-4 flex items-center justify-center">
                      <i className="ri-share-line" />
                    </span>
                    Share
                  </button>
                  {proposal.status === "draft" && (
                    <button
                      onClick={() => handleStatusChange("sent")}
                      disabled={saving}
                      className="btn-primary inline-flex items-center gap-2 whitespace-nowrap cursor-pointer disabled:opacity-50"
                    >
                      <span className="w-4 h-4 flex items-center justify-center">
                        <i className={emailStatus === 'sending' ? "ri-loader-4-line animate-spin" : "ri-send-plane-line"} />
                      </span>
                      {emailStatus === 'sending' ? "Sending..." : "Send to Client"}
                    </button>
                  )}
                  {proposal.status === "sent" && (
                    <>
                      <button
                        onClick={() => handleStatusChange("accepted")}
                        disabled={saving}
                        className="px-4 py-2 rounded-lg bg-status-accepted text-white text-sm font-semibold hover:opacity-90 transition-opacity cursor-pointer whitespace-nowrap inline-flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <span className="w-4 h-4 flex items-center justify-center">
                          <i className="ri-check-line" />
                        </span>
                        Accept
                      </button>
                      <button
                        onClick={() => handleStatusChange("declined")}
                        disabled={saving}
                        className="px-4 py-2 rounded-lg bg-status-deleted text-white text-sm font-semibold hover:opacity-90 transition-opacity cursor-pointer whitespace-nowrap inline-flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <span className="w-4 h-4 flex items-center justify-center">
                          <i className="ri-close-line" />
                        </span>
                        Decline
                      </button>
                    </>
                  )}
                  {proposal.status === "accepted" && linkedInvoiceId && (
                    <>
                      <Link
                        to={`/invoices/${linkedInvoiceId}`}
                        className="px-4 py-2 rounded-lg border border-background-200 text-sm font-medium text-foreground-600 hover:bg-background-50 transition-colors cursor-pointer whitespace-nowrap inline-flex items-center gap-1.5"
                      >
                        <span className="w-4 h-4 flex items-center justify-center">
                          <i className="ri-file-text-line" />
                        </span>
                        View Invoice
                      </Link>
                      <button
                        onClick={handlePayInvoice}
                        disabled={payNowLoading}
                        className="px-4 py-2 rounded-lg bg-secondary-500 hover:bg-secondary-600 text-white text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap inline-flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <span className="w-4 h-4 flex items-center justify-center">
                          <i className={payNowLoading ? "ri-loader-4-line animate-spin" : "ri-bank-card-line"} />
                        </span>
                        {payNowLoading ? "Redirecting..." : "Pay Invoice"}
                      </button>
                    </>
                  )}
                  {proposal.status === "accepted" && !linkedInvoiceId && (
                    <span className="text-sm text-foreground-400">
                      Invoice generation pending...
                    </span>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Email status feedback */}
          {emailStatus !== 'idle' && (
            <div className={`rounded-lg p-3 text-sm flex items-start gap-2.5 ${
              emailStatus === 'sending' ? 'bg-background-100 text-foreground-600' :
              emailStatus === 'sent' ? 'bg-status-accepted/10 text-status-accepted border border-status-accepted/20' :
              'bg-status-deleted/10 text-status-deleted border border-status-deleted/20'
            }`}>
              <span className="w-4 h-4 flex items-center justify-center shrink-0 mt-0.5">
                {emailStatus === 'sending' && <i className="ri-loader-4-line animate-spin" />}
                {emailStatus === 'sent' && <i className="ri-check-double-line" />}
                {emailStatus === 'error' && <i className="ri-error-warning-line" />}
              </span>
              <div className="flex-1">
                {emailStatus === 'sending' && (
                  <p>Delivering proposal to <strong>{clientEmailMap[proposal?.client_id || ''] || 'client'}</strong>...</p>
                )}
                {emailStatus === 'sent' && (
                  <p>Proposal sent and email delivered to <strong>{clientEmailMap[proposal?.client_id || ''] || 'client'}</strong>.</p>
                )}
                {emailStatus === 'error' && (
                  <div>
                    <p className="font-medium">{emailErrorMessage || 'Email failed to send.'}</p>
                    <button
                      onClick={() => {
                        setEmailStatus('idle');
                        setEmailErrorMessage(null);
                      }}
                      className="text-xs underline hover:no-underline mt-1 cursor-pointer"
                    >
                      Dismiss
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Pay error feedback */}
          {payError && (
            <div className="rounded-lg p-3 text-sm flex items-start gap-2.5 bg-status-deleted/10 text-status-deleted border border-status-deleted/20">
              <span className="w-4 h-4 flex items-center justify-center shrink-0 mt-0.5">
                <i className="ri-error-warning-line" />
              </span>
              <div className="flex-1">
                <p className="font-medium">{payError}</p>
                <button
                  onClick={() => setPayError(null)}
                  className="text-xs underline hover:no-underline mt-1 cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {/* Metadata bar */}
          {proposal && (
            <div className="bg-white rounded-xl border border-background-200 p-4 flex items-center gap-6 text-sm text-foreground-500 flex-wrap">
              <span className="flex items-center gap-1.5">
                <span className="w-4 h-4 flex items-center justify-center">
                  <i className="ri-calendar-line" />
                </span>
                Created {new Date(proposal.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
              {proposal.sent_at && (
                <span className="flex items-center gap-1.5">
                  <span className="w-4 h-4 flex items-center justify-center">
                    <i className="ri-send-plane-line" />
                  </span>
                  Sent {new Date(proposal.sent_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              )}
              {proposal.viewed_at && (
                <span className="flex items-center gap-1.5">
                  <span className="w-4 h-4 flex items-center justify-center">
                    <i className="ri-eye-line" />
                  </span>
                  Viewed {new Date(proposal.viewed_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              )}
              {proposal.accepted_at && (
                <span className="flex items-center gap-1.5 text-status-accepted">
                  <span className="w-4 h-4 flex items-center justify-center">
                    <i className="ri-check-double-line" />
                  </span>
                  Accepted {new Date(proposal.accepted_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              )}
              {proposal.declined_at && (
                <span className="flex items-center gap-1.5 text-status-deleted">
                  <span className="w-4 h-4 flex items-center justify-center">
                    <i className="ri-close-line" />
                  </span>
                  Declined {new Date(proposal.declined_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              )}
            </div>
          )}
        </>
      )}

      {/* Editor or Preview */}
      {proposal && (
        previewOpen ? (
          <ProposalPreview proposal={proposal} onToggleEdit={() => setPreviewOpen(false)} />
        ) : (
          <ProposalEditor
            proposal={proposal}
            onUpdate={handleUpdate}
            onTogglePreview={() => setPreviewOpen(true)}
          />
        )
      )}

      {/* Hidden printable container for PDF export */}
      {proposal && (
        <div className="fixed left-[-9999px] top-0 z-[-1]" aria-hidden="true">
          <PrintableProposal ref={containerRef} proposal={proposal} />
        </div>
      )}

      {/* Share Modal */}
      <ShareModal
        open={showShareModal}
        onClose={() => setShowShareModal(false)}
        documentType="proposal"
        documentLabel={proposal?.title || 'Proposal'}
        clientName={proposal?.coverData?.clientName || ''}
        clientEmail={clientEmailMap[proposal?.client_id || ''] || ''}
        clientCompany={proposal?.coverData?.clientCompany || ''}
        onDownloadPackage={handleShareDownload}
        isPackaging={isPackaging}
        pdfFilename={`${(proposal?.title || 'proposal').replace(/[^a-zA-Z0-9]/g, '-').slice(0, 60)}.pdf`}
      />
    </div>
  );
}