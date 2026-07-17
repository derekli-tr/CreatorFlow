import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { usePdfExport } from "@/hooks/usePdfExport";
import PrintableProposal from "@/pages/proposals/components/PrintableProposal";
import ShareModal from "@/components/feature/ShareModal";

interface PortalProposal {
  id: string;
  client_id: string;
  owner_id: string;
  title: string;
  status: string;
  amount: number;
  sent_at: string | null;
  created_at: string;
  sections: Array<{ type: string; label: string; content: string }>;
  pricingItems: Array<{ id: string; description: string; quantity: number; unit: string; rate: number; amount: number }>;
  timelinePhases: Array<{ id: string; name: string; description: string; startDate: string; endDate: string }>;
  coverData: {
    clientName: string;
    clientCompany: string;
    preparedBy: string;
    preparedCompany: string;
    date: string;
    validUntil: string;
  };
  client_name: string;
  client_company: string;
  accepted_at: string | null;
  declined_at: string | null;
}

function formatCurrency(val: number) {
  return "$" + val.toLocaleString("en-US", { minimumFractionDigits: 2 });
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export default function PortalProposalPage() {
  const { id } = useParams<{ id: string }>();
  const [proposal, setProposal] = useState<PortalProposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionResult, setActionResult] = useState<{ type: "accepted" | "declined"; invoiceId?: string | null } | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [isPackaging, setIsPackaging] = useState(false);

  const { containerRef, exportPdf, getPdfBlob, isExporting } = usePdfExport({
    filename: proposal ? `${proposal.title.replace(/[^a-zA-Z0-9]/g, '-').slice(0, 60)}.pdf` : 'proposal.pdf',
  });

  const handleShareDownload = async () => {
    setIsPackaging(true);
    try {
      const pdfBlob = await getPdfBlob();
      if (!pdfBlob || !proposal) return;

      const clientName = proposal.coverData?.clientName || proposal.client_name || 'client';
      const clientCompany = proposal.coverData?.clientCompany || proposal.client_company || '';
      const firstName = clientName.split(' ')[0] || clientName;
      const emailBody = `Hi ${firstName},\n\nI'm excited to share this proposal with you! The attached PDF outlines the full scope of work, timeline, and pricing for ${proposal.title}.\n\nYou can review the proposal, accept or decline it, and if you're ready to move forward, the acceptance will automatically generate an invoice so we can get started right away.\n\nIf anything needs clarification or you'd like to discuss adjustments, I'm all ears — let's make this work for you.\n\nBest regards`;

      const { default: JSZip } = await import('jszip');
      const zip = new JSZip();
      const safeName = proposal.title.replace(/[^a-zA-Z0-9]/g, '-').slice(0, 60);
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

  const fetchProposal = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);

    try {
      const fnUrl = `${import.meta.env.VITE_PUBLIC_SUPABASE_URL}/functions/v1/portal-proposal?id=${encodeURIComponent(id)}`;
      const response = await fetch(fnUrl, {
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY}`,
        },
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => undefined);
        throw new Error(errData?.error || "Proposal not found");
      }

      const data = await response.json();
      setProposal(data as PortalProposal);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load proposal");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProposal();
  }, [fetchProposal]);

  const handleAction = async (action: "accept" | "decline") => {
    if (!id) return;
    setActionLoading(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("portal-proposal", {
        body: { id, action },
      });

      if (fnError || !data?.success) {
        throw new Error(data?.error || "Action failed");
      }

      setActionResult({
        type: action === "accept" ? "accepted" : "declined",
        invoiceId: data.invoice_id || null,
      });

      setProposal((prev) =>
        prev ? { ...prev, status: action === "accept" ? "accepted" : "declined" } : prev
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Action failed. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto py-20 text-center">
        <div className="animate-spin w-8 h-8 border-2 border-secondary-500 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-foreground-500 text-sm">Loading proposal...</p>
      </div>
    );
  }

  if (error || !proposal) {
    return (
      <div className="max-w-lg mx-auto py-20 text-center">
        <div className="w-16 h-16 rounded-full bg-background-100 flex items-center justify-center mx-auto mb-4">
          <i className="ri-file-text-line text-2xl text-foreground-400" />
        </div>
        <h2 className="text-xl font-heading font-semibold text-foreground-950 mb-2">
          {error || "Proposal not found"}
        </h2>
        <p className="text-sm text-foreground-500">
          This proposal link may be broken or the proposal has been removed.
        </p>
      </div>
    );
  }

  const isFinal = proposal.status === "accepted" || proposal.status === "declined" || actionResult !== null;
  const totalPricing = proposal.pricingItems.reduce((sum, item) => sum + item.amount, 0);
  const clientDisplayName = proposal.coverData?.clientName || proposal.client_name || "Client";
  const clientDisplayCompany = proposal.coverData?.clientCompany || proposal.client_company || "";

  return (
    <div className="max-w-3xl mx-auto">
      {/* Success/Result Banner */}
      {actionResult && (
        <div className={`rounded-xl p-6 mb-8 text-center ${
          actionResult.type === "accepted"
            ? "bg-accent-50 border border-accent-200"
            : "bg-background-100 border border-background-200"
        }`}>
          <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3 ${
            actionResult.type === "accepted" ? "bg-accent-500 text-white" : "bg-foreground-400 text-white"
          }`}>
            <i className={`text-2xl ${actionResult.type === "accepted" ? "ri-check-line" : "ri-close-line"}`} />
          </div>
          <h3 className="text-xl font-heading font-semibold text-foreground-950 mb-1">
            {actionResult.type === "accepted" ? "Proposal Accepted!" : "Proposal Declined"}
          </h3>
          <p className="text-sm text-foreground-600 max-w-md mx-auto">
            {actionResult.type === "accepted"
              ? `Thank you for accepting the proposal. An invoice has been generated and your freelancer will be in touch shortly.`
              : `You've declined this proposal. Your freelancer has been notified.`}
          </p>
          {actionResult.invoiceId && (
            <a
              href={`/portal/invoices?client_id=${proposal.client_id}`}
              className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 rounded-lg bg-secondary-500 hover:bg-secondary-600 text-white text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap"
            >
              <i className="ri-bill-line" />
              View Your Invoices
            </a>
          )}
        </div>
      )}

      {/* Cover Section */}
      <div className="bg-white rounded-2xl border border-background-200 overflow-hidden mb-8">
        <div className="bg-secondary-500 px-8 py-10 text-white">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-xs uppercase tracking-[0.15em] font-semibold text-white/70 mb-3">Proposal</p>
              <h1 className="text-3xl md:text-4xl font-heading font-bold tracking-tight mb-4">
                {proposal.title}
              </h1>
              <div className="flex flex-wrap items-center gap-2 text-white/80 text-sm">
                <span>Prepared for</span>
                <span className="font-semibold text-white">{clientDisplayName}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={exportPdf}
                disabled={isExporting}
                className="px-4 py-2 rounded-lg bg-white/15 hover:bg-white/25 text-white text-sm font-medium transition-colors cursor-pointer whitespace-nowrap inline-flex items-center gap-1.5 disabled:opacity-50"
              >
                <span className="w-4 h-4 flex items-center justify-center">
                  <i className={isExporting ? "ri-loader-4-line animate-spin" : "ri-download-line"} />
                </span>
                {isExporting ? "Generating..." : "Download PDF"}
              </button>
              <button
                onClick={() => setShowShareModal(true)}
                className="px-4 py-2 rounded-lg bg-white/15 hover:bg-white/25 text-white text-sm font-medium transition-colors cursor-pointer whitespace-nowrap inline-flex items-center gap-1.5"
              >
                <span className="w-4 h-4 flex items-center justify-center">
                  <i className="ri-share-line" />
                </span>
                Share
              </button>
            </div>
          </div>
        </div>
        <div className="p-6 md:p-8 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-foreground-400 text-xs uppercase tracking-wider font-semibold mb-1">Prepared by</p>
            <p className="text-foreground-900 font-medium">{proposal.coverData?.preparedBy || "Alex Rivera"}</p>
            <p className="text-foreground-500">{proposal.coverData?.preparedCompany || "FreelanceFlow Studio"}</p>
          </div>
          <div>
            <p className="text-foreground-400 text-xs uppercase tracking-wider font-semibold mb-1">Date</p>
            <p className="text-foreground-900 font-medium">{formatDate(proposal.coverData?.date || proposal.created_at)}</p>
          </div>
          <div>
            <p className="text-foreground-400 text-xs uppercase tracking-wider font-semibold mb-1">Valid Until</p>
            <p className="text-foreground-900 font-medium">{formatDate(proposal.coverData?.validUntil)}</p>
          </div>
          <div>
            <p className="text-foreground-400 text-xs uppercase tracking-wider font-semibold mb-1">Status</p>
            <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
              proposal.status === "accepted" || actionResult?.type === "accepted"
                ? "bg-accent-100 text-accent-700"
                : proposal.status === "declined" || actionResult?.type === "declined"
                  ? "bg-foreground-100 text-foreground-600"
                  : "bg-background-100 text-foreground-600"
            }`}>
              {(actionResult?.type === "accepted" || proposal.status === "accepted") ? "Accepted" :
               (actionResult?.type === "declined" || proposal.status === "declined") ? "Declined" :
               proposal.status === "sent" ? "Awaiting Review" : proposal.status}
            </span>
          </div>
        </div>
      </div>

      {/* Content Sections */}
      <div className="space-y-8">
        {proposal.sections?.filter((s) => s.type !== "cover" && s.content?.trim()).map((section) => (
          <div key={section.type} className="bg-white rounded-xl border border-background-200 p-6 md:p-8">
            <h3 className="font-heading font-semibold text-lg text-foreground-950 mb-4 pb-3 border-b border-background-100">
              {section.label}
            </h3>
            <div className="prose prose-sm max-w-none text-foreground-700 leading-relaxed whitespace-pre-line">
              {section.content}
            </div>
          </div>
        ))}

        {/* Pricing Table */}
        {proposal.pricingItems && proposal.pricingItems.length > 0 && (
          <div className="bg-white rounded-xl border border-background-200 p-6 md:p-8">
            <h3 className="font-heading font-semibold text-lg text-foreground-950 mb-4 pb-3 border-b border-background-100">
              Investment
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-background-200">
                    <th className="text-left text-xs font-semibold text-foreground-400 uppercase tracking-wider pb-3 pr-3">Item</th>
                    <th className="text-right text-xs font-semibold text-foreground-400 uppercase tracking-wider pb-3 px-3">Qty</th>
                    <th className="text-right text-xs font-semibold text-foreground-400 uppercase tracking-wider pb-3 px-3">Rate</th>
                    <th className="text-right text-xs font-semibold text-foreground-400 uppercase tracking-wider pb-3 pl-3">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {proposal.pricingItems.map((item) => (
                    <tr key={item.id} className="border-b border-background-50">
                      <td className="py-3 pr-3 text-sm text-foreground-800">{item.description}</td>
                      <td className="py-3 px-3 text-sm text-foreground-600 text-right tabular-data">{item.quantity}</td>
                      <td className="py-3 px-3 text-sm text-foreground-600 text-right tabular-data">{formatCurrency(item.rate)}</td>
                      <td className="py-3 pl-3 text-sm text-foreground-900 text-right tabular-data font-semibold">{formatCurrency(item.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end mt-4 pt-4 border-t border-background-200">
              <div className="text-right">
                <p className="text-xs text-foreground-400 uppercase tracking-wider mb-1">Total Investment</p>
                <p className="text-2xl font-bold text-foreground-950 tabular-data">{formatCurrency(totalPricing)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Timeline */}
        {proposal.timelinePhases && proposal.timelinePhases.length > 0 && (
          <div className="bg-white rounded-xl border border-background-200 p-6 md:p-8">
            <h3 className="font-heading font-semibold text-lg text-foreground-950 mb-4 pb-3 border-b border-background-100">
              Timeline
            </h3>
            <div className="space-y-5">
              {proposal.timelinePhases.map((phase, idx) => (
                <div key={phase.id} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-secondary-500 text-white flex items-center justify-center text-xs font-bold shrink-0">
                      {idx + 1}
                    </div>
                    {idx < proposal.timelinePhases.length - 1 && (
                      <div className="w-0.5 flex-1 bg-background-200 my-1" />
                    )}
                  </div>
                  <div className="pb-5">
                    <p className="text-sm font-semibold text-foreground-900">{phase.name}</p>
                    <p className="text-xs text-foreground-500 mt-0.5">
                      {formatDate(phase.startDate)} &mdash; {formatDate(phase.endDate)}
                    </p>
                    {phase.description && (
                      <p className="text-sm text-foreground-600 mt-2">{phase.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Terms */}
        {proposal.sections?.filter((s) => s.type === "terms" && s.content?.trim()).map((section) => (
          <div key={section.type} className="bg-white rounded-xl border border-background-200 p-6 md:p-8">
            <h3 className="font-heading font-semibold text-lg text-foreground-950 mb-4 pb-3 border-b border-background-100">
              {section.label}
            </h3>
            <div className="text-sm text-foreground-600 leading-relaxed whitespace-pre-line">
              {section.content}
            </div>
          </div>
        ))}
      </div>

      {/* Action Buttons — only show if not yet decided */}
      {!isFinal && proposal.status !== "draft" && (
        <div className="mt-10 bg-white rounded-2xl border border-background-200 p-6 md:p-8 text-center">
          <h3 className="font-heading font-semibold text-lg text-foreground-950 mb-2">
            Ready to decide?
          </h3>
          <p className="text-sm text-foreground-500 mb-6 max-w-md mx-auto">
            Review the proposal above and let us know your decision. No obligations &mdash; we&apos;re happy to discuss any questions.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <button
              onClick={() => handleAction("accept")}
              disabled={actionLoading}
              className="px-8 py-3 rounded-xl bg-secondary-500 hover:bg-secondary-600 text-white font-semibold text-sm transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50 inline-flex items-center gap-2 shadow-sm"
            >
              <span className="w-4 h-4 flex items-center justify-center">
                <i className={actionLoading ? "ri-loader-4-line animate-spin" : "ri-check-line"} />
              </span>
              {actionLoading ? "Processing..." : "Accept Proposal"}
            </button>
            <button
              onClick={() => handleAction("decline")}
              disabled={actionLoading}
              className="px-8 py-3 rounded-xl border border-background-200 text-foreground-600 hover:bg-background-50 font-medium text-sm transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50 inline-flex items-center gap-2"
            >
              <span className="w-4 h-4 flex items-center justify-center">
                <i className="ri-close-line" />
              </span>
              Decline
            </button>
          </div>
          {error && (
            <p className="text-sm text-red-500 mt-4">{error}</p>
          )}
        </div>
      )}

      {/* Hidden printable container for PDF export */}
      <div className="fixed left-[-9999px] top-0 z-[-1]" aria-hidden="true">
        <PrintableProposal ref={containerRef} proposal={proposal as any} />
      </div>

      {/* Share Modal */}
      <ShareModal
        open={showShareModal}
        onClose={() => setShowShareModal(false)}
        documentType="proposal"
        documentLabel={proposal.title}
        clientName={clientDisplayName}
        clientEmail=""
        clientCompany={clientDisplayCompany}
        onDownloadPackage={handleShareDownload}
        isPackaging={isPackaging}
        pdfFilename={`${proposal.title.replace(/[^a-zA-Z0-9]/g, '-').slice(0, 60)}.pdf`}
      />
    </div>
  );
}