import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import PrintableInvoice from "@/pages/invoices/components/PrintableInvoice";
import ShareModal from "@/components/feature/ShareModal";

interface PortalInvoice {
  id: string;
  client_id: string;
  invoice_number: string;
  status: string;
  amount: number;
  due_date: string;
  sent_at: string | null;
  paid_at: string | null;
  created_at: string;
  notes: string;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  discount: number;
  line_items: Array<{ description: string; quantity: number; rate: number; amount: number }>;
}

interface PortalClient {
  name: string;
  email: string;
  company: string;
  address: string;
}

function formatCurrency(val: number) {
  return "$" + val.toLocaleString("en-US", { minimumFractionDigits: 2 });
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: "Draft", color: "#64748B", bg: "#64748B15" },
  sent: { label: "Sent", color: "#3B82F6", bg: "#3B82F615" },
  unpaid: { label: "Unpaid", color: "#F59E0B", bg: "#F59E0B15" },
  paid: { label: "Paid", color: "#10B981", bg: "#10B98115" },
  overdue: { label: "Overdue", color: "#EF4444", bg: "#EF444415" },
  voided: { label: "Voided", color: "#6B7280", bg: "#6B728015" },
};

export default function PortalInvoicesPage() {
  const [searchParams] = useSearchParams();
  const clientId = searchParams.get("client_id");

  const [client, setClient] = useState<PortalClient>({ name: "", email: "", company: "", address: "" });
  const [invoices, setInvoices] = useState<PortalInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // PDF export state
  const printableRef = useRef<HTMLDivElement>(null);
  const [printInv, setPrintInv] = useState<PortalInvoice | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isPackaging, setIsPackaging] = useState(false);

  // Share modal state
  const [shareTarget, setShareTarget] = useState<PortalInvoice | null>(null);

  const fetchInvoices = useCallback(async () => {
    if (!clientId) {
      setError("No client identifier provided. Please use the link shared by your freelancer.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const fnUrl = `${import.meta.env.VITE_PUBLIC_SUPABASE_URL}/functions/v1/portal-invoices?client_id=${encodeURIComponent(clientId)}`;
      const response = await fetch(fnUrl, {
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY}`,
        },
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => undefined);
        throw new Error(errData?.error || "Failed to fetch invoices");
      }

      const data = await response.json();
      setClient(data.client || { name: "", email: "", company: "", address: "" });
      setInvoices((data.invoices || []) as PortalInvoice[]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not load invoices");
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  // Generate PDF blob from the currently-rendered printable invoice
  const getPdfBlobForInv = useCallback(async (): Promise<Blob | null> => {
    await new Promise((r) => requestAnimationFrame(r));
    await new Promise((r) => setTimeout(r, 120));

    if (!printableRef.current) return null;

    const { default: html2canvas } = await import("html2canvas");
    const canvas = await html2canvas(printableRef.current, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
    });

    const { default: jsPDF } = await import("jspdf");
    const pdf = new jsPDF("portrait", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth - 10;
    const margin = 5;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = margin;

    pdf.addImage(canvas.toDataURL("image/png"), "PNG", margin, position, imgWidth, imgHeight);
    heightLeft -= pageHeight - margin * 2;

    while (heightLeft > 0) {
      position = margin - (imgHeight - (pageHeight - margin * 2));
      pdf.addPage();
      pdf.addImage(canvas.toDataURL("image/png"), "PNG", margin, position, imgWidth, imgHeight);
      heightLeft -= pageHeight - margin * 2;
    }

    return pdf.output("blob");
  }, []);

  const handleDownloadPdf = async (inv: PortalInvoice) => {
    setPrintInv(inv);
    setIsExporting(true);
    try {
      const blob = await getPdfBlobForInv();
      if (!blob) return;

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${inv.invoice_number.replace(/[^a-zA-Z0-9]/g, "-")}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("PDF export failed:", err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleShareDownload = async () => {
    if (!shareTarget) return;
    setIsPackaging(true);
    try {
      setPrintInv(shareTarget);
      const pdfBlob = await getPdfBlobForInv();
      if (!pdfBlob) return;

      const clientName = client.name || "Valued Client";
      const clientCompany = client.company || "";

      const emailBody = `Hi ${clientName.split(" ")[0] || clientName},

Please find attached invoice ${shareTarget.invoice_number} for your records.

You can also view this invoice online through your secure client portal.

If you have any questions about the charges, just let us know.

Best regards`;

      const { default: JSZip } = await import("jszip");
      const zip = new JSZip();
      const safeName = shareTarget.invoice_number.replace(/[^a-zA-Z0-9]/g, "-");
      zip.file(`${safeName}.pdf`, pdfBlob);
      zip.file("cover-email.txt", emailBody);

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${safeName}-package.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Share packaging failed:", err);
    } finally {
      setIsPackaging(false);
    }
  };

  const openShareForInv = (inv: PortalInvoice) => {
    setPrintInv(inv);
    setShareTarget(inv);
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto py-20 text-center">
        <div className="animate-spin w-8 h-8 border-2 border-secondary-500 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-foreground-500 text-sm">Loading invoices...</p>
      </div>
    );
  }

  if (error || !clientId) {
    return (
      <div className="max-w-lg mx-auto py-20 text-center">
        <div className="w-16 h-16 rounded-full bg-background-100 flex items-center justify-center mx-auto mb-4">
          <i className="ri-file-list-3-line text-2xl text-foreground-400" />
        </div>
        <h2 className="text-xl font-heading font-semibold text-foreground-950 mb-2">
          {error || "No invoices found"}
        </h2>
        <p className="text-sm text-foreground-500">
          Please use the invoice link shared by your freelancer.
        </p>
      </div>
    );
  }

  const totalOutstanding = invoices
    .filter((inv) => inv.status === "unpaid" || inv.status === "sent" || inv.status === "overdue")
    .reduce((sum, inv) => sum + inv.amount, 0);

  const totalPaid = invoices
    .filter((inv) => inv.status === "paid")
    .reduce((sum, inv) => sum + inv.amount, 0);

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="text-center mb-10">
        <h1 className="text-2xl md:text-3xl font-heading font-bold text-foreground-950 mb-2">
          Your Invoices
        </h1>
        <p className="text-sm text-foreground-500">
          View and track all invoices from your freelancer
        </p>
      </div>

      {/* Summary Cards */}
      {invoices.length > 0 && (
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-background-200 p-5 text-center">
            <p className="text-xs text-foreground-400 uppercase tracking-wider font-semibold mb-2">Total Paid</p>
            <p className="text-2xl font-bold text-accent-500 tabular-data">{formatCurrency(totalPaid)}</p>
          </div>
          <div className="bg-white rounded-xl border border-background-200 p-5 text-center">
            <p className="text-xs text-foreground-400 uppercase tracking-wider font-semibold mb-2">Outstanding</p>
            <p className={`text-2xl font-bold tabular-data ${totalOutstanding > 0 ? "text-red-500" : "text-foreground-600"}`}>
              {formatCurrency(totalOutstanding)}
            </p>
          </div>
        </div>
      )}

      {/* Invoice List */}
      {invoices.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-background-200">
          <div className="w-14 h-14 rounded-full bg-background-100 flex items-center justify-center mx-auto mb-3">
            <i className="ri-bill-line text-xl text-foreground-400" />
          </div>
          <p className="text-foreground-500 font-medium">No invoices yet</p>
          <p className="text-sm text-foreground-400 mt-1">Invoices will appear here once your freelancer sends them.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {invoices.map((inv) => {
            const sc = statusConfig[inv.status] || statusConfig.draft;
            const isExpanded = expandedId === inv.id;
            const isThisExporting = isExporting && printInv?.id === inv.id;
            const isThisPackaging = isPackaging && shareTarget?.id === inv.id;

            return (
              <div
                key={inv.id}
                className="bg-white rounded-xl border border-background-200 overflow-hidden transition-shadow hover:shadow-sm"
              >
                {/* Invoice Row */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : inv.id)}
                  className="w-full p-5 flex items-center justify-between gap-4 text-left cursor-pointer hover:bg-background-50/50 transition-colors"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-background-100 flex items-center justify-center shrink-0">
                      <i className="ri-bill-line text-foreground-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground-900 truncate">
                        {inv.invoice_number}
                      </p>
                      <p className="text-xs text-foreground-500 mt-0.5">
                        Due {formatDate(inv.due_date)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <span
                      className="text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap"
                      style={{ backgroundColor: sc.bg, color: sc.color }}
                    >
                      {sc.label}
                    </span>
                    <span className="text-sm font-bold text-foreground-950 tabular-data whitespace-nowrap">
                      {formatCurrency(inv.amount)}
                    </span>
                    <span className="w-5 h-5 flex items-center justify-center">
                      <i className={`text-foreground-400 text-sm transition-transform ${isExpanded ? "ri-arrow-up-s-line" : "ri-arrow-down-s-line"}`} />
                    </span>
                  </div>
                </button>

                {/* Expanded Detail */}
                {isExpanded && (
                  <div className="px-5 pb-5 border-t border-background-100 pt-4">
                    {inv.line_items && inv.line_items.length > 0 && (
                      <div className="mb-4">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-background-100">
                              <th className="text-left text-xs font-semibold text-foreground-400 uppercase tracking-wider pb-2 pr-3">Description</th>
                              <th className="text-right text-xs font-semibold text-foreground-400 uppercase tracking-wider pb-2 px-3">Qty</th>
                              <th className="text-right text-xs font-semibold text-foreground-400 uppercase tracking-wider pb-2 px-3">Rate</th>
                              <th className="text-right text-xs font-semibold text-foreground-400 uppercase tracking-wider pb-2 pl-3">Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {inv.line_items.map((item, idx) => (
                              <tr key={idx} className="border-b border-background-50">
                                <td className="py-2 pr-3 text-sm text-foreground-700">{item.description}</td>
                                <td className="py-2 px-3 text-sm text-foreground-600 text-right">{item.quantity}</td>
                                <td className="py-2 px-3 text-sm text-foreground-600 text-right tabular-data">{formatCurrency(item.rate)}</td>
                                <td className="py-2 pl-3 text-sm text-foreground-800 text-right tabular-data font-medium">{formatCurrency(item.amount)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <div className="flex justify-end mt-3">
                          <div className="text-right">
                            <span className="text-sm font-bold text-foreground-950 tabular-data">
                              Total: {formatCurrency(inv.amount)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {inv.notes && (
                      <div className="text-sm text-foreground-500 bg-background-50 rounded-lg p-3 mb-3">
                        <span className="font-medium text-foreground-600">Notes:</span> {inv.notes}
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-6 text-xs text-foreground-400 flex-wrap">
                      <div className="flex items-center gap-4">
                        <span>Created: {formatDate(inv.created_at)}</span>
                        {inv.sent_at && <span>Sent: {formatDate(inv.sent_at)}</span>}
                        {inv.paid_at && <span className="text-accent-500 font-medium">Paid: {formatDate(inv.paid_at)}</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadPdf(inv);
                          }}
                          disabled={isThisExporting}
                          className="text-xs font-medium text-foreground-600 hover:text-foreground-900 bg-background-50 hover:bg-background-100 px-3 py-1.5 rounded-lg transition-colors cursor-pointer whitespace-nowrap inline-flex items-center gap-1 disabled:opacity-50"
                        >
                          <span className="w-3.5 h-3.5 flex items-center justify-center">
                            <i className={isThisExporting ? "ri-loader-4-line animate-spin" : "ri-download-line"} />
                          </span>
                          {isThisExporting ? "Exporting..." : "Download PDF"}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openShareForInv(inv);
                          }}
                          disabled={isThisPackaging}
                          className="text-xs font-medium text-foreground-600 hover:text-foreground-900 bg-background-50 hover:bg-background-100 px-3 py-1.5 rounded-lg transition-colors cursor-pointer whitespace-nowrap inline-flex items-center gap-1 disabled:opacity-50"
                        >
                          <span className="w-3.5 h-3.5 flex items-center justify-center">
                            <i className={isThisPackaging ? "ri-loader-4-line animate-spin" : "ri-share-line"} />
                          </span>
                          {isThisPackaging ? "Packaging..." : "Share"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Hidden printable container for PDF export */}
      <div className="fixed left-[-9999px] top-0 z-[-1]" aria-hidden="true">
        {printInv && (
          <div ref={printableRef}>
            <PrintableInvoice
              invoice={printInv as any}
              clientName={client.name}
              clientCompany={client.company}
              clientEmail={client.email}
              clientAddress={client.address}
              projectTitle=""
            />
          </div>
        )}
      </div>

      {/* Share Modal */}
      <ShareModal
        open={shareTarget !== null}
        onClose={() => setShareTarget(null)}
        documentType="invoice"
        documentLabel={shareTarget?.invoice_number || ""}
        clientName={client.name || "Valued Client"}
        clientEmail={client.email}
        clientCompany={client.company}
        onDownloadPackage={handleShareDownload}
        isPackaging={isPackaging}
        pdfFilename={`${(shareTarget?.invoice_number || "invoice").replace(/[^a-zA-Z0-9]/g, "-")}.pdf`}
      />
    </div>
  );
}