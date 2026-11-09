import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { PLATFORMS, STAGE_INFO, formatDate, type Deal, type Platform } from "@/lib/deals";
import { inputClass, labelClass, primaryButtonClass, secondaryButtonClass } from "@/lib/ui";
import { useDealsStore } from "@/stores/dealsStore";

interface DealModalProps {
  /** Omit to create a new deal. */
  dealId?: string;
  onClose: () => void;
}

interface FormState {
  brand: string;
  amount: string;
  platform: Platform;
}

function formFromDeal(deal?: Deal): FormState {
  return {
    brand: deal?.brand ?? "",
    amount: deal && deal.amount > 0 ? String(deal.amount) : "",
    platform: deal?.platform ?? "Instagram",
  };
}

export default function DealModal({ dealId, onClose }: DealModalProps) {
  const deal = useDealsStore((s) => s.deals.find((d) => d.id === dealId));
  const { createDeal, updateDeal, deleteDeal } = useDealsStore();

  const [form, setForm] = useState<FormState>(() => formFromDeal(deal));
  const [errors, setErrors] = useState<{ brand?: string; amount?: string }>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Re-sync the form after a save
  useEffect(() => {
    if (deal) setForm(formFromDeal(deal));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deal?.updated_at]);

  // The deal was deleted elsewhere
  useEffect(() => {
    if (dealId && !deal) onClose();
  }, [dealId, deal, onClose]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  const saved = formFromDeal(deal);
  const isDirty =
    !!deal && (form.brand !== saved.brand || form.amount !== saved.amount || form.platform !== saved.platform);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setServerError(null);

    const brand = form.brand.trim();
    const amount = form.amount.trim() === "" ? 0 : Math.round(Number(form.amount) * 100) / 100;
    const nextErrors: typeof errors = {};
    if (!brand) nextErrors.brand = "Brand is required.";
    if (!Number.isFinite(amount) || amount < 0) nextErrors.amount = "Enter an amount of $0 or more.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const fields = { brand, amount, platform: form.platform };
    setSaving(true);
    const result = deal ? await updateDeal(deal.id, fields) : await createDeal(fields);
    setSaving(false);

    if (!result.ok) setServerError(result.error);
    else if (!deal) onClose();
  };

  const handleDelete = async () => {
    if (!deal) return;
    setSaving(true);
    const result = await deleteDeal(deal.id);
    setSaving(false);
    if (result.ok) onClose();
    else setServerError(result.error);
  };

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/40 flex items-start justify-center p-4 overflow-y-auto"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="deal-modal-title"
        className="w-full max-w-lg bg-white rounded-xl shadow-elevated my-4 sm:my-10"
      >
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-background-200">
          <div className="flex items-center gap-3 min-w-0">
            <h2 id="deal-modal-title" className="font-heading font-semibold text-headline-sm text-foreground-950 truncate">
              {deal ? deal.brand : "New deal"}
            </h2>
            {deal && <StageBadge deal={deal} />}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground-500 hover:bg-background-100 cursor-pointer"
          >
            <i className="ri-close-line text-lg" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="px-6 py-5 space-y-4" aria-label="Deal details">
          <Field id="deal-brand" label="Brand *" error={errors.brand}>
            <input
              id="deal-brand"
              autoFocus={!deal}
              value={form.brand}
              onChange={(e) => set("brand", e.target.value)}
              className={inputClass}
              placeholder="e.g. Glossier"
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field id="deal-amount" label="Amount (USD)" error={errors.amount}>
              <input
                id="deal-amount"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={form.amount}
                onChange={(e) => set("amount", e.target.value)}
                className={inputClass}
                placeholder="0"
              />
            </Field>
            <Field id="deal-platform" label="Platform">
              <select
                id="deal-platform"
                value={form.platform}
                onChange={(e) => set("platform", e.target.value as Platform)}
                className={inputClass}
              >
                {PLATFORMS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </Field>
          </div>

          <p className="text-sm text-foreground-500">
            {deal
              ? `${deal.stage === "paid" && deal.paid_at ? `Paid on ${formatDate(deal.paid_at)}. ` : ""}Stage changes happen on the pipeline board.`
              : "New deals start in Pitching."}
          </p>

          {serverError && (
            <p role="alert" className="text-sm text-status-deleted">{serverError}</p>
          )}

          <div className="flex flex-col-reverse sm:flex-row sm:items-center gap-3 pt-2">
            {deal && (
              <div className="sm:mr-auto">
                {confirmDelete ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-foreground-700">Delete this deal?</span>
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={saving}
                      className="rounded-lg bg-status-deleted px-3 py-2 text-sm font-semibold text-white cursor-pointer disabled:opacity-60"
                    >
                      Yes, delete
                    </button>
                    <button type="button" onClick={() => setConfirmDelete(false)} className="text-sm text-foreground-500 cursor-pointer">
                      Keep
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    className="text-sm font-medium text-status-deleted hover:underline cursor-pointer"
                  >
                    Delete deal
                  </button>
                )}
              </div>
            )}
            <div className="flex gap-3 sm:ml-auto">
              <button type="button" onClick={onClose} className={`${secondaryButtonClass} flex-1 sm:flex-none`}>
                {deal ? "Close" : "Cancel"}
              </button>
              <button
                type="submit"
                disabled={saving || (!!deal && !isDirty)}
                className={`${primaryButtonClass} flex-1 sm:flex-none`}
              >
                {saving ? "Saving..." : deal ? "Save changes" : "Create deal"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className={labelClass}>{label}</label>
      {children}
      {error && <p className="text-xs text-status-deleted mt-1">{error}</p>}
    </div>
  );
}

export function StageBadge({ deal }: { deal: Deal }) {
  const info = STAGE_INFO[deal.stage];
  return (
    <span className={cn("status-badge bg-background-100 text-foreground-700 gap-1.5")} data-testid="stage-badge">
      <span className={cn("w-2 h-2 rounded-full", info.dot)} aria-hidden />
      {info.label}
    </span>
  );
}
