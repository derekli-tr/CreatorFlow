import { useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { STAGES, formatDate, formatMoney, isSameMonth, sumAmount, type Deal } from "@/lib/deals";
import { primaryButtonClass } from "@/lib/ui";
import { useAuthStore } from "@/stores/authStore";
import { useDealsStore } from "@/stores/dealsStore";
import DealModal from "@/components/DealModal";
import LoadState from "@/components/LoadState";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const { deals, hasLoaded } = useDealsStore();
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const stats = useMemo(() => {
    const open = deals.filter((d) => d.stage === "pitching" || d.stage === "in_production");
    const awaiting = deals.filter((d) => d.stage === "awaiting_payment").sort((a, b) => b.amount - a.amount);
    const paid = deals.filter((d) => d.stage === "paid");
    const paidThisMonth = paid.filter((d) => d.paid_at && isSameMonth(d.paid_at));
    const recentlyPaid = [...paid].sort((a, b) => (b.paid_at ?? "").localeCompare(a.paid_at ?? "")).slice(0, 5);
    return { open, awaiting, paid, paidThisMonth, recentlyPaid };
  }, [deals]);

  const firstName = user?.full_name.split(" ")[0];

  return (
    <div className="space-y-6">
      <PageHeader
        title={firstName ? `Welcome back, ${firstName}` : "Dashboard"}
        subtitle="Here's where your brand deals stand."
        action={
          <button type="button" onClick={() => setCreating(true)} className={primaryButtonClass}>
            <i className="ri-add-line" />
            New deal
          </button>
        }
      />

      <LoadState />

      {hasLoaded && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              testId="stat-open-pipeline"
              label="Open pipeline"
              icon="ri-funds-line"
              value={formatMoney(sumAmount(stats.open))}
              hint={`${plural(stats.open.length, "deal")} pitching or in production`}
            />
            <StatCard
              testId="stat-awaiting-payment"
              label="Awaiting payment"
              icon="ri-time-line"
              value={formatMoney(sumAmount(stats.awaiting))}
              hint={plural(stats.awaiting.length, "deal")}
            />
            <StatCard
              testId="stat-earned-this-month"
              label="Earned this month"
              icon="ri-calendar-check-line"
              value={formatMoney(sumAmount(stats.paidThisMonth))}
              hint={plural(stats.paidThisMonth.length, "paid deal")}
            />
            <StatCard
              testId="stat-total-earned"
              label="Total earned"
              icon="ri-money-dollar-circle-line"
              value={formatMoney(sumAmount(stats.paid))}
              hint={plural(stats.paid.length, "paid deal")}
            />
          </div>

          {deals.length === 0 ? (
            <div className="bg-white rounded-xl border border-dashed border-background-300 p-10 text-center">
              <i className="ri-handshake-line text-4xl text-foreground-300" aria-hidden />
              <h2 className="font-heading font-semibold text-foreground-900 mt-2">No deals yet</h2>
              <p className="text-sm text-foreground-500 mt-1 mb-4">
                Add the first brand you're pitching to start tracking your pipeline.
              </p>
              <button type="button" onClick={() => setCreating(true)} className={primaryButtonClass}>
                Add a deal
              </button>
            </div>
          ) : (
            <>
              <section aria-labelledby="by-stage" className="bg-white rounded-xl border border-background-200 shadow-ambient p-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 id="by-stage" className="font-heading font-semibold text-foreground-900">Deals by stage</h2>
                  <Link to="/pipeline" className="text-sm font-medium text-secondary-600 hover:underline">
                    Open pipeline
                  </Link>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {STAGES.map((stage) => {
                    const inStage = deals.filter((d) => d.stage === stage.id);
                    return (
                      <div key={stage.id} className="rounded-lg bg-background-50 p-3" data-testid={`stage-summary-${stage.id}`}>
                        <div className="flex items-center gap-2">
                          <span className={cn("w-2 h-2 rounded-full", stage.dot)} aria-hidden />
                          <p className="text-sm text-foreground-600">{stage.label}</p>
                        </div>
                        <p className="font-semibold text-foreground-950 mt-1 tabular-data">
                          {inStage.length} · {formatMoney(sumAmount(inStage))}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </section>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <DealList
                  title="Waiting on payment"
                  empty="Nothing is waiting on payment."
                  items={stats.awaiting.map((deal) => ({ deal, meta: deal.platform }))}
                  onOpen={(d) => setEditingId(d.id)}
                />
                <DealList
                  title="Recently paid"
                  empty="No paid deals yet."
                  items={stats.recentlyPaid.map((deal) => ({ deal, meta: `Paid ${formatDate(deal.paid_at)}` }))}
                  onOpen={(d) => setEditingId(d.id)}
                />
              </div>
            </>
          )}
        </>
      )}

      {creating && <DealModal onClose={() => setCreating(false)} />}
      {editingId && <DealModal dealId={editingId} onClose={() => setEditingId(null)} />}
    </div>
  );
}

interface DealListProps {
  title: string;
  empty: string;
  items: { deal: Deal; meta: ReactNode }[];
  onOpen: (deal: Deal) => void;
}

function DealList({ title, empty, items, onOpen }: DealListProps) {
  const headingId = title.toLowerCase().replace(/\s+/g, "-");
  return (
    <section aria-labelledby={headingId} className="bg-white rounded-xl border border-background-200 shadow-ambient p-4">
      <h2 id={headingId} className="font-heading font-semibold text-foreground-900 mb-2">{title}</h2>
      {items.length === 0 ? (
        <p className="text-sm text-foreground-500 py-4">{empty}</p>
      ) : (
        <ul className="divide-y divide-background-100">
          {items.map(({ deal, meta }) => (
            <li key={deal.id}>
              <button
                type="button"
                onClick={() => onOpen(deal)}
                className="w-full flex items-center justify-between gap-3 py-2.5 text-left hover:bg-background-50 rounded-md px-2 -mx-2 cursor-pointer"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground-900 truncate">{deal.brand}</p>
                  <p className="text-xs text-foreground-500">{meta}</p>
                </div>
                <span className="text-sm font-semibold text-foreground-900 tabular-data">{formatMoney(deal.amount)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
