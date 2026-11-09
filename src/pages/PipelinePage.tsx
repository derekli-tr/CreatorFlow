import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { PLATFORM_ICONS, STAGES, formatDate, formatMoney, sumAmount, type Deal, type DealStage, type StageInfo } from "@/lib/deals";
import { primaryButtonClass } from "@/lib/ui";
import { useDealsStore } from "@/stores/dealsStore";
import DealModal from "@/components/DealModal";
import PageHeader from "@/components/PageHeader";
import LoadState from "@/components/LoadState";

type ModalState = { mode: "closed" } | { mode: "create" } | { mode: "edit"; dealId: string };

export default function PipelinePage() {
  const { deals, hasLoaded } = useDealsStore();
  const [modal, setModal] = useState<ModalState>({ mode: "closed" });

  const byStage = useMemo(() => {
    const groups = Object.fromEntries(STAGES.map((s) => [s.id, [] as Deal[]])) as Record<DealStage, Deal[]>;
    for (const deal of [...deals].sort((a, b) => b.position - a.position)) {
      groups[deal.stage].push(deal);
    }
    return groups;
  }, [deals]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pipeline"
        subtitle="Every brand deal, from first pitch to payment."
        action={
          <button type="button" onClick={() => setModal({ mode: "create" })} className={primaryButtonClass}>
            <i className="ri-add-line" />
            New deal
          </button>
        }
      />

      <LoadState />

      {hasLoaded && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
          {STAGES.map((stage) => (
            <StageColumn
              key={stage.id}
              stage={stage}
              deals={byStage[stage.id]}
              onOpen={(deal) => setModal({ mode: "edit", dealId: deal.id })}
            />
          ))}
        </div>
      )}

      {modal.mode === "create" && <DealModal onClose={() => setModal({ mode: "closed" })} />}
      {modal.mode === "edit" && <DealModal dealId={modal.dealId} onClose={() => setModal({ mode: "closed" })} />}
    </div>
  );
}

function StageColumn({ stage, deals, onOpen }: { stage: StageInfo; deals: Deal[]; onOpen: (deal: Deal) => void }) {
  return (
    <section
      aria-labelledby={`column-${stage.id}`}
      data-testid={`column-${stage.id}`}
      className="rounded-xl bg-background-100 p-3 min-h-[200px]"
    >
      <header className="px-1 pb-3">
        <div className="flex items-center gap-2">
          <span className={cn("w-2.5 h-2.5 rounded-full", stage.dot)} aria-hidden />
          <h2 id={`column-${stage.id}`} className="font-heading font-semibold text-sm text-foreground-900">
            {stage.label}
          </h2>
          <span className="ml-auto text-xs font-medium text-foreground-500 tabular-data whitespace-nowrap" data-testid={`column-total-${stage.id}`}>
            {deals.length} · {formatMoney(sumAmount(deals))}
          </span>
        </div>
        <p className="text-xs text-foreground-500 mt-0.5">{stage.description}</p>
      </header>

      <ul className="space-y-2">
        {deals.map((deal) => (
          <li key={deal.id}>
            <DealCard deal={deal} onOpen={() => onOpen(deal)} />
          </li>
        ))}
      </ul>

      {deals.length === 0 && <p className="text-xs text-foreground-400 text-center py-6">No deals</p>}
    </section>
  );
}

function DealCard({ deal, onOpen }: { deal: Deal; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      data-testid="deal-card"
      className="w-full text-left bg-white rounded-lg border border-background-200 p-3 shadow-ambient hover:border-background-300 cursor-pointer focus-visible:outline-2 focus-visible:outline-primary-400"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold text-sm text-foreground-950 truncate">{deal.brand}</p>
        <p className="font-semibold text-sm text-foreground-900 tabular-data shrink-0">
          {deal.amount > 0 ? formatMoney(deal.amount) : "No offer yet"}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-foreground-500">
        <span className="inline-flex items-center gap-1">
          <i className={PLATFORM_ICONS[deal.platform]} aria-hidden />
          {deal.platform}
        </span>
        {deal.stage === "paid" && deal.paid_at && (
          <span className="inline-flex items-center gap-1 text-accent-700">
            <i className="ri-check-line" aria-hidden />
            Paid {formatDate(deal.paid_at)}
          </span>
        )}
      </div>
    </button>
  );
}
