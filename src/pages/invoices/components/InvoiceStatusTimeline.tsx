import InvoiceStatusBadge from "@/pages/invoices/components/InvoiceStatusBadge";

interface Step {
  label: string;
  date: string | null;
  icon: string;
  reached: boolean;
}

interface InvoiceStatusTimelineProps {
  status: string;
  created_at: string;
  sent_at: string | null;
  viewed_at: string | null;
  paid_at: string | null;
  voided_at: string | null;
  reminded_at: string | null;
}

export default function InvoiceStatusTimeline({
  status,
  created_at,
  sent_at,
  viewed_at,
  paid_at,
  voided_at,
  reminded_at,
}: InvoiceStatusTimelineProps) {
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const steps: Step[] = [
    { label: "Created", date: formatDateTime(created_at), icon: "ri-file-add-line", reached: true },
    { label: "Sent", date: formatDateTime(sent_at), icon: "ri-send-plane-line", reached: !!sent_at },
    { label: "Viewed", date: formatDateTime(viewed_at), icon: "ri-eye-line", reached: !!viewed_at },
    ...(reminded_at ? [{ label: "Reminded", date: formatDateTime(reminded_at), icon: "ri-notification-line", reached: true }] : []),
    ...(status === "paid" ? [{ label: "Paid", date: formatDateTime(paid_at), icon: "ri-check-double-line", reached: true }] : []),
    ...(status === "voided" ? [{ label: "Voided", date: formatDateTime(voided_at), icon: "ri-close-circle-line", reached: true }] : []),
  ];

  return (
    <div className="bg-white rounded-xl border border-background-200 shadow-ambient p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-heading font-semibold text-base text-foreground-900">Status Timeline</h3>
        <InvoiceStatusBadge status={status} />
      </div>
      <div className="relative">
        <div className="absolute left-[19px] top-2 bottom-2 w-px bg-background-200" />
        <div className="space-y-3">
          {steps.map((step, i) => (
            <div key={i} className="flex items-start gap-3 relative">
              <div
                className={`w-[38px] h-[38px] rounded-full flex items-center justify-center flex-shrink-0 z-10 ${
                  step.reached
                    ? "bg-secondary-500 text-white"
                    : "bg-background-100 text-foreground-400"
                }`}
              >
                <i className={`${step.icon} text-sm`} />
              </div>
              <div className="pt-1.5">
                <p className={`text-sm font-medium ${step.reached ? "text-foreground-900" : "text-foreground-400"}`}>
                  {step.label}
                </p>
                {step.date && (
                  <p className="text-xs text-foreground-500 mt-0.5">{step.date}</p>
                )}
                {!step.reached && (
                  <p className="text-xs text-foreground-400 mt-0.5">Pending</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}