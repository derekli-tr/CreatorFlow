import { useState, useMemo, useEffect } from "react";
import { useParams, Link, useNavigate, useSearchParams } from "react-router-dom";
import { useInvoices } from "@/hooks/useInvoices";
import { useClients } from "@/hooks/useClients";
import { useProjects } from "@/hooks/useProjects";
import { usePayments } from "@/hooks/usePayments";
import { usePdfExport } from "@/hooks/usePdfExport";
import { supabase } from "@/lib/supabase";
import InvoiceStatusBadge from "@/pages/invoices/components/InvoiceStatusBadge";
import InvoiceStatusTimeline from "@/pages/invoices/components/InvoiceStatusTimeline";
import PrintableInvoice from "@/pages/invoices/components/PrintableInvoice";
import ShareModal from "@/components/feature/ShareModal";
import type { Invoice } from "@/hooks/useInvoices";

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { invoices, updateInvoice } = useInvoices();
  const { clients } = useClients();
  const { projects } = useProjects();
  const { payments } = usePayments();

  const invoice = useMemo(() => invoices.find((inv) => inv.id === id) || null, [invoices, id]);
  const [showVoidConfirm, setShowVoidConfirm] = useState(false);
  const [showSendConfirm, setShowSendConfirm] = useState(false);
  const [showRemindConfirm, setShowRemindConfirm] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [payLoading, setPayLoading] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [verifyingSession, setVerifyingSession] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  const client = useMemo(() => clients.find((c) => c.id === invoice?.client_id), [clients, invoice]);
  const project = useMemo(() => projects.find((p) => p.id === invoice?.project_id), [projects, invoice]);
  const payment = useMemo(() => payments.find((p) => p.invoice_id === invoice?.id), [payments, invoice]);

  const { containerRef, exportPdf, getPdfBlob, isExporting } = usePdfExport({
    filename: invoice ? `${invoice.invoice_number.replace(/[^a-zA-Z0-9]/g, '-')}.pdf` : 'invoice.pdf',
  });

  const [isPackaging, setIsPackaging] = useState(false);

  const handleShareDownload = async () => {
    setIsPackaging(true);
    try {
      const pdfBlob = await getPdfBlob();
      if (!pdfBlob) return;

      const clientName = client?.name || 'client';
      const clientCompany = client?.company || '';
      const firstName = clientName.split(' ')[0] || clientName;
      const emailBody = `Hi ${firstName},\n\nPlease find attached invoice ${invoice?.invoice_number || ''} for your review.\n\nThe invoice covers the services we've delivered. You can also view and pay this invoice online through your secure client portal.\n\nIf you have any questions about the charges or need to discuss payment terms, just let me know — I'm happy to chat.\n\nBest regards`;

      const { default: JSZip } = await import('jszip');
      const zip = new JSZip();
      zip.file(`${invoice?.invoice_number.replace(/[^a-zA-Z0-9]/g, '-') || 'invoice'}.pdf`, pdfBlob);
      zip.file('cover-email.txt', emailBody);

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${invoice?.invoice_number.replace(/[^a-zA-Z0-9]/g, '-') || 'invoice'}-package.zip`;
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

  /* Handle Stripe return — verify session and mark paid */
  useEffect(() => {
    const sessionId = searchParams.get("session_id");
    const cancelled = searchParams.get("cancelled");

    if (cancelled === "true") {
      setPayError("Payment was cancelled. You can try again anytime.");
      const newParams = new URLSearchParams(searchParams);
      newParams.delete("cancelled");
      setSearchParams(newParams, { replace: true });
      return;
    }

    if (sessionId && invoice && !verifyingSession && !paymentSuccess) {
      setVerifyingSession(true);
      supabase.functions.invoke("create-invoice-checkout", {
        body: {
          verify_session_id: sessionId,
          invoice_id: invoice.id,
        },
      }).then(({ data, error }) => {
        if (error || !data?.verified) {
          setPayError("Payment verification failed. If your card was charged, please contact support.");
        } else {
          updateInvoice(invoice.id, {
            status: "paid",
            paid_at: new Date().toISOString(),
          }).then(() => {
            setPaymentSuccess(true);
          });
        }
        const newParams = new URLSearchParams(searchParams);
        newParams.delete("session_id");
        setSearchParams(newParams, { replace: true });
        setVerifyingSession(false);
      }).catch(() => {
        setPayError("Could not verify payment. Please refresh the page.");
        setVerifyingSession(false);
      });
    }
  }, [searchParams, invoice, verifyingSession, paymentSuccess]);

  if (!invoice) {
    return (
      <div className="text-center py-20">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-background-100 flex items-center justify-center">
          <i className="ri-file-search-line text-2xl text-foreground-400" />
        </div>
        <p className="text-foreground-500 text-lg font-medium">Invoice not found</p>
        <p className="text-foreground-400 text-sm mt-1">This invoice may have been deleted or the link is broken.</p>
        <Link to="/invoices" className="text-secondary-500 hover:text-secondary-600 text-sm font-medium mt-4 inline-flex items-center gap-1">
          <i className="ri-arrow-left-line" />
          Back to invoices
        </Link>
      </div>
    );
  }

  const handleSend = async () => {
    await updateInvoice(invoice.id, { status: "sent", sent_at: new Date().toISOString() });
    setShowSendConfirm(false);
  };
  const handleMarkPaid = async () => {
    await updateInvoice(invoice.id, { status: "paid", paid_at: new Date().toISOString() });
  };
  const handleVoid = async () => {
    await updateInvoice(invoice.id, { status: "voided" });
    setShowVoidConfirm(false);
  };
  const handleRemind = async () => {
    const now = new Date().toISOString();
    await updateInvoice(invoice.id, { status: invoice.status });
    setShowRemindConfirm(false);
  };

  /* Stripe Pay Now */
  const handlePayWithCard = async () => {
    if (!invoice || !client?.email) {
      setPayError("Client email is required to process payment.");
      return;
    }
    setPayLoading(true);
    setPayError(null);

    try {
      const basePath = (window as unknown as { __BASE_PATH__?: string }).__BASE_PATH__ || '';
      const pathPrefix = basePath ? `/${basePath}` : '';
      const successPath = `${pathPrefix}/invoices/${invoice.id}?session_id={CHECKOUT_SESSION_ID}`;
      const cancelPath = `${pathPrefix}/invoices/${invoice.id}?cancelled=true`;

      const { data, error: invokeError } = await supabase.functions.invoke("create-invoice-checkout", {
        body: {
          invoice_id: invoice.id,
          invoice_number: invoice.invoice_number,
          amount: invoice.amount,
          client_email: client.email,
          client_name: client.name || "",
          success_path: successPath,
          cancel_path: cancelPath,
        },
      });

      if (invokeError || !data?.url) {
        throw new Error(typeof invokeError === "string" ? invokeError : "Failed to create checkout session");
      }

      window.location.href = data.url;
    } catch (err: unknown) {
      setPayError(err instanceof Error ? err.message : "Payment setup failed. Please try again.");
      setPayLoading(false);
    }
  };

  const formatCurrency = (val: number) => "$" + val.toLocaleString("en-US", { minimumFractionDigits: 2 });
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  };

  const isActionable = invoice.status === "draft" || invoice.status === "unpaid" || invoice.status === "overdue" || invoice.status === "sent";

  return (
    <div className="space-y-6">
      {/* Top bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <Link
            to="/invoices"
            className="text-sm text-secondary-500 hover:text-secondary-600 font-medium inline-flex items-center gap-1 mb-1"
          >
            <i className="ri-arrow-left-line" />
            Back to invoices
          </Link>
          <h2 className="font-heading font-semibold text-headline-md text-foreground-950">
            {invoice.invoice_number}
          </h2>
          <div className="flex items-center gap-2 mt-1">
            <InvoiceStatusBadge status={invoice.status} />
            {invoice.status === "overdue" && (
              <span className="text-xs text-red-500 font-medium">— {Math.ceil((Date.now() - new Date(invoice.due_date).getTime()) / (1000 * 60 * 60 * 24))} days past due</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/invoices")}
            className="btn-ghost border border-background-200 text-sm px-4 py-2 rounded-lg"
          >
            <i className="ri-edit-line" />
            Edit
          </button>
          <button
            onClick={exportPdf}
            disabled={isExporting}
            className="btn-ghost border border-background-200 text-sm px-4 py-2 rounded-lg cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
          >
            <span className="w-4 h-4 flex items-center justify-center">
              <i className={isExporting ? "ri-loader-4-line animate-spin" : "ri-download-line"} />
            </span>
            {isExporting ? "Generating..." : "Download PDF"}
          </button>
          <button
            onClick={() => setShowShareModal(true)}
            className="btn-ghost border border-background-200 text-sm px-4 py-2 rounded-lg cursor-pointer flex items-center gap-1.5"
          >
            <span className="w-4 h-4 flex items-center justify-center">
              <i className="ri-share-line" />
            </span>
            Share
          </button>
        </div>
      </div>

      {/* Payment status banners */}
      {verifyingSession && (
        <div className="rounded-lg p-3 text-sm flex items-start gap-2.5 bg-background-100 text-foreground-600">
          <span className="w-4 h-4 flex items-center justify-center shrink-0 mt-0.5">
            <i className="ri-loader-4-line animate-spin" />
          </span>
          <p>Verifying your payment with Stripe...</p>
        </div>
      )}
      {paymentSuccess && (
        <div className="rounded-lg p-3 text-sm flex items-start gap-2.5 bg-status-accepted/10 text-status-accepted border border-status-accepted/20">
          <span className="w-4 h-4 flex items-center justify-center shrink-0 mt-0.5">
            <i className="ri-check-double-line" />
          </span>
          <div className="flex-1">
            <p className="font-medium">Payment successful! This invoice has been marked as paid.</p>
            <button
              onClick={() => setPaymentSuccess(false)}
              className="text-xs underline hover:no-underline mt-1 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main document */}
        <div className="lg:col-span-2 space-y-6">
          {/* Invoice document card */}
          <div className="bg-white rounded-xl border border-background-200 shadow-ambient overflow-hidden">
            {/* Header section */}
            <div className="p-6 md:p-8 border-b border-background-100">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
                <div>
                  <p className="text-label-md text-foreground-400 uppercase tracking-wider text-xs font-semibold">Invoice</p>
                  <p className="text-3xl font-bold text-foreground-950 mt-1 tracking-tight tabular-data">
                    {invoice.invoice_number}
                  </p>
                  <div className="flex items-center gap-3 mt-3 text-sm text-foreground-500">
                    <span className="flex items-center gap-1">
                      <i className="ri-calendar-line text-xs" />
                      Issued {formatDate(invoice.created_at)}
                    </span>
                    <span className="flex items-center gap-1">
                      <i className="ri-timer-line text-xs" />
                      Due {formatDate(invoice.due_date)}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-label-md text-foreground-400 uppercase tracking-wider text-xs font-semibold">Amount Due</p>
                  <p className="text-3xl font-bold text-foreground-950 mt-1 tracking-tight tabular-data">
                    {formatCurrency(invoice.amount)}
                  </p>
                  {invoice.status === "paid" && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 mt-1">
                      <i className="ri-check-double-line" />
                      Paid {formatDate(invoice.paid_at)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Bill To & Details */}
            <div className="p-6 md:p-8 border-b border-background-100">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <p className="text-xs font-semibold text-foreground-400 uppercase tracking-wider mb-2">Bill To</p>
                  {client ? (
                    <div className="space-y-0.5">
                      <p className="text-sm font-semibold text-foreground-900">{client.name}</p>
                      <p className="text-sm text-foreground-700">{client.company}</p>
                      <p className="text-sm text-foreground-500">{client.email}</p>
                      <p className="text-sm text-foreground-500 whitespace-pre-line">{client.address}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-foreground-400">No client linked</p>
                  )}
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground-400 uppercase tracking-wider mb-2">Project</p>
                  {project ? (
                    <div className="space-y-0.5">
                      <Link to={`/projects/${project.id}`} className="text-sm font-semibold text-secondary-500 hover:text-secondary-600">
                        {project.title}
                      </Link>
                      <p className="text-sm text-foreground-500">{project.description?.slice(0, 80)}{(project.description?.length || 0) > 80 ? "..." : ""}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-foreground-400">No project linked</p>
                  )}
                  {client && (
                    <Link to={`/clients/${client.id}`} className="text-xs text-secondary-500 hover:text-secondary-600 inline-flex items-center gap-1 mt-3">
                      <i className="ri-user-line" />
                      View client profile
                    </Link>
                  )}
                </div>
              </div>
            </div>

            {/* Line items */}
            <div className="p-6 md:p-8 border-b border-background-100">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-background-200">
                    <th className="text-left text-xs font-semibold text-foreground-400 uppercase tracking-wider pb-3 pr-3">Description</th>
                    <th className="text-right text-xs font-semibold text-foreground-400 uppercase tracking-wider pb-3 px-3">Qty</th>
                    <th className="text-right text-xs font-semibold text-foreground-400 uppercase tracking-wider pb-3 px-3">Rate</th>
                    <th className="text-right text-xs font-semibold text-foreground-400 uppercase tracking-wider pb-3 pl-3">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.line_items.map((item, i) => (
                    <tr key={i} className="border-b border-background-50">
                      <td className="py-3 pr-3 text-sm text-foreground-800">{item.description}</td>
                      <td className="py-3 px-3 text-sm text-foreground-600 text-right tabular-data">{item.quantity}</td>
                      <td className="py-3 px-3 text-sm text-foreground-600 text-right tabular-data">{formatCurrency(item.rate)}</td>
                      <td className="py-3 pl-3 text-sm text-foreground-800 text-right tabular-data font-medium">{formatCurrency(item.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals */}
              <div className="flex justify-end mt-4">
                <div className="w-full max-w-[240px] space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-foreground-500">Subtotal</span>
                    <span className="text-foreground-800 tabular-data">{formatCurrency(invoice.subtotal)}</span>
                  </div>
                  {invoice.discount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-foreground-500">Discount</span>
                      <span className="text-red-500 tabular-data">-{formatCurrency(invoice.discount)}</span>
                    </div>
                  )}
                  {invoice.tax_rate > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-foreground-500">Tax ({invoice.tax_rate}%)</span>
                      <span className="text-foreground-800 tabular-data">{formatCurrency(invoice.tax_amount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t border-background-200">
                    <span className="text-sm font-bold text-foreground-950">Total</span>
                    <span className="text-lg font-bold text-foreground-950 tabular-data">{formatCurrency(invoice.amount)}</span>
                  </div>
                  {invoice.status === "paid" && (
                    <div className="flex justify-between text-sm">
                      <span className="text-foreground-500">Amount Paid</span>
                      <span className="text-green-600 font-semibold tabular-data">-{formatCurrency(invoice.amount)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Notes */}
            {invoice.notes && (
              <div className="p-6 md:p-8">
                <p className="text-xs font-semibold text-foreground-400 uppercase tracking-wider mb-2">Notes</p>
                <p className="text-sm text-foreground-600 leading-relaxed">{invoice.notes}</p>
              </div>
            )}
          </div>

          {/* Payment record if paid */}
          {payment && invoice.status === "paid" && (
            <div className="bg-white rounded-xl border border-background-200 shadow-ambient p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                  <i className="ri-check-line text-green-600 text-sm" />
                </div>
                <h3 className="font-heading font-semibold text-base text-foreground-900">Payment Recorded</h3>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-foreground-400 uppercase tracking-wider">Amount</p>
                  <p className="text-sm font-semibold text-foreground-900 tabular-data mt-0.5">{formatCurrency(payment.amount)}</p>
                </div>
                <div>
                  <p className="text-xs text-foreground-400 uppercase tracking-wider">Method</p>
                  <p className="text-sm font-semibold text-foreground-900 mt-0.5">{payment.method}</p>
                </div>
                <div>
                  <p className="text-xs text-foreground-400 uppercase tracking-wider">Date</p>
                  <p className="text-sm font-semibold text-foreground-900 mt-0.5">{formatDate(payment.paid_at)}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Actions */}
          <div className="bg-white rounded-xl border border-background-200 shadow-ambient p-5">
            <h3 className="font-heading font-semibold text-base text-foreground-900 mb-4">Actions</h3>
            <div className="space-y-2">
              {invoice.status === "draft" && (
                <button
                  onClick={() => setShowSendConfirm(true)}
                  className="w-full flex items-center justify-center gap-2 bg-secondary-500 hover:bg-secondary-600 text-white font-medium text-sm py-2.5 px-4 rounded-lg whitespace-nowrap cursor-pointer transition-colors"
                >
                  <i className="ri-send-plane-line" />
                  Send Invoice
                </button>
              )}
              {(invoice.status === "sent" || invoice.status === "unpaid" || invoice.status === "overdue") && (
                <>
                  <button
                    onClick={handlePayWithCard}
                    disabled={payLoading || !client?.email}
                    className="w-full flex items-center justify-center gap-2 bg-secondary-500 hover:bg-secondary-600 text-white font-medium text-sm py-2.5 px-4 rounded-lg whitespace-nowrap cursor-pointer transition-colors disabled:opacity-50"
                  >
                    <span className="w-4 h-4 flex items-center justify-center">
                      <i className={payLoading ? "ri-loader-4-line animate-spin" : "ri-bank-card-line"} />
                    </span>
                    {payLoading ? "Redirecting to Stripe..." : "Pay with Card"}
                  </button>
                  <button
                    onClick={handleMarkPaid}
                    className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-medium text-sm py-2.5 px-4 rounded-lg whitespace-nowrap cursor-pointer transition-colors"
                  >
                    <i className="ri-check-line" />
                    Mark as Paid
                  </button>
                  <button
                    onClick={() => setShowRemindConfirm(true)}
                    className="w-full flex items-center justify-center gap-2 border border-background-200 text-foreground-700 hover:bg-background-50 font-medium text-sm py-2.5 px-4 rounded-lg whitespace-nowrap cursor-pointer transition-colors"
                  >
                    <i className="ri-notification-line" />
                    Send Reminder
                  </button>
                </>
              )}
              {isActionable && (
                <button
                  onClick={() => setShowVoidConfirm(true)}
                  className="w-full flex items-center justify-center gap-2 border border-background-200 text-foreground-500 hover:text-red-500 hover:border-red-200 font-medium text-sm py-2.5 px-4 rounded-lg whitespace-nowrap cursor-pointer transition-colors"
                >
                  <i className="ri-close-circle-line" />
                  Void Invoice
                </button>
              )}
              {(invoice.status === "paid" || invoice.status === "voided") && (
                <div className="text-center py-3">
                  <p className="text-sm text-foreground-400">
                    {invoice.status === "paid" ? "This invoice has been paid." : "This invoice has been voided."}
                  </p>
                </div>
              )}
              {invoice.status !== "voided" && (
                <>
                  <div className="border-t border-background-100 my-2" />
                  <button className="w-full flex items-center justify-center gap-2 border border-background-200 text-foreground-600 hover:bg-background-50 font-medium text-sm py-2.5 px-4 rounded-lg whitespace-nowrap cursor-pointer transition-colors">
                    <i className="ri-printer-line" />
                    Print Invoice
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Status Timeline */}
          <InvoiceStatusTimeline
            status={invoice.status}
            created_at={invoice.created_at}
            sent_at={invoice.sent_at}
            viewed_at={invoice.viewed_at}
            paid_at={invoice.paid_at}
            voided_at={invoice.voided_at}
            reminded_at={invoice.reminded_at}
          />

          {/* Quick Info */}
          <div className="bg-white rounded-xl border border-background-200 shadow-ambient p-5">
            <h3 className="font-heading font-semibold text-base text-foreground-900 mb-3">Details</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-foreground-400">Invoice #</span>
                <span className="text-foreground-800 font-medium">{invoice.invoice_number}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-foreground-400">Created</span>
                <span className="text-foreground-800">{formatDate(invoice.created_at)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-foreground-400">Due Date</span>
                <span className={`font-medium ${invoice.status === "overdue" ? "text-red-500" : "text-foreground-800"}`}>
                  {formatDate(invoice.due_date)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-foreground-400">Client</span>
                <span className="text-foreground-800">{client?.company || "—"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-foreground-400">Project</span>
                <span className="text-foreground-800">{project?.title || "—"}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirm Modals */}
      {/* Send Confirm */}
      {showSendConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowSendConfirm(false)} />
          <div className="relative bg-white rounded-xl shadow-elevated p-6 w-full max-w-md mx-4">
            <h3 className="font-heading font-semibold text-lg text-foreground-950 mb-2">Send Invoice</h3>
            <p className="text-sm text-foreground-500 mb-6">
              Send {invoice.invoice_number} to {client?.name} at {client?.email}?<br />
              They&apos;ll receive an email with a link to view and pay this invoice.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowSendConfirm(false)}
                className="btn-ghost border border-background-200 text-sm px-4 py-2 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSend}
                className="bg-secondary-500 hover:bg-secondary-600 text-white font-medium text-sm px-5 py-2 rounded-lg whitespace-nowrap cursor-pointer transition-colors"
              >
                Send Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Void Confirm */}
      {showVoidConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowVoidConfirm(false)} />
          <div className="relative bg-white rounded-xl shadow-elevated p-6 w-full max-w-md mx-4">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center mb-3">
              <i className="ri-error-warning-line text-red-500 text-lg" />
            </div>
            <h3 className="font-heading font-semibold text-lg text-foreground-950 mb-2">Void Invoice</h3>
            <p className="text-sm text-foreground-500 mb-6">
              Are you sure you want to void {invoice.invoice_number}? This action cannot be undone. The invoice will no longer be collectible.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowVoidConfirm(false)}
                className="btn-ghost border border-background-200 text-sm px-4 py-2 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleVoid}
                className="bg-red-500 hover:bg-red-600 text-white font-medium text-sm px-5 py-2 rounded-lg whitespace-nowrap cursor-pointer transition-colors"
              >
                Void Invoice
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remind Confirm */}
      {showRemindConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowRemindConfirm(false)} />
          <div className="relative bg-white rounded-xl shadow-elevated p-6 w-full max-w-md mx-4">
            <h3 className="font-heading font-semibold text-lg text-foreground-950 mb-2">Send Reminder</h3>
            <p className="text-sm text-foreground-500 mb-6">
              Send a payment reminder to {client?.name} for {invoice.invoice_number}? This will notify them that payment is still pending.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowRemindConfirm(false)}
                className="btn-ghost border border-background-200 text-sm px-4 py-2 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleRemind}
                className="bg-secondary-500 hover:bg-secondary-600 text-white font-medium text-sm px-5 py-2 rounded-lg whitespace-nowrap cursor-pointer transition-colors"
              >
                Send Reminder
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden printable container for PDF export */}
      {invoice && (
        <div className="fixed left-[-9999px] top-0 z-[-1]" aria-hidden="true">
          <PrintableInvoice
            ref={containerRef}
            invoice={invoice}
            clientName={client?.name || ''}
            clientCompany={client?.company || ''}
            clientEmail={client?.email || ''}
            clientAddress={client?.address || ''}
            projectTitle={project?.title || ''}
          />
        </div>
      )}

      {/* Share Modal */}
      <ShareModal
        open={showShareModal}
        onClose={() => setShowShareModal(false)}
        documentType="invoice"
        documentLabel={invoice.invoice_number}
        clientName={client?.name || ''}
        clientEmail={client?.email || ''}
        clientCompany={client?.company || ''}
        onDownloadPackage={handleShareDownload}
        isPackaging={isPackaging}
        pdfFilename={`${invoice.invoice_number.replace(/[^a-zA-Z0-9]/g, '-')}.pdf`}
      />
    </div>
  );
}