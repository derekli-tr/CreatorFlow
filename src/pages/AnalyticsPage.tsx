import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { PLATFORMS, PLATFORM_ICONS, formatMoney, sumAmount, type Deal } from "@/lib/deals";
import { useDealsStore } from "@/stores/dealsStore";
import LoadState from "@/components/LoadState";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";

const RANGES = [
  { months: 3, label: "3 months" },
  { months: 6, label: "6 months" },
  { months: 12, label: "12 months" },
];

interface MonthBucket {
  key: string;
  label: string;
  fullLabel: string;
  total: number;
  count: number;
}

function buildMonths(paid: Deal[], months: number): MonthBucket[] {
  const now = new Date();
  const buckets: MonthBucket[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({
      key: `${date.getFullYear()}-${date.getMonth()}`,
      label: date.toLocaleDateString("en-US", { month: "short" }),
      fullLabel: date.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
      total: 0,
      count: 0,
    });
  }
  for (const deal of paid) {
    const date = new Date(deal.paid_at!);
    const bucket = buckets.find((b) => b.key === `${date.getFullYear()}-${date.getMonth()}`);
    if (bucket) {
      bucket.total += deal.amount;
      bucket.count += 1;
    }
  }
  return buckets;
}

/** Rounds the axis max up to a "nice" number so gridlines land on round values. */
function niceMax(value: number): number {
  if (value <= 0) return 1000;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 2.5, 5, 10].find((s) => s * magnitude >= value)!;
  return step * magnitude;
}

export default function AnalyticsPage() {
  const { deals, hasLoaded } = useDealsStore();
  const [months, setMonths] = useState(6);

  const data = useMemo(() => {
    const start = new Date();
    start.setMonth(start.getMonth() - (months - 1), 1);
    start.setHours(0, 0, 0, 0);

    // Earnings are grouped by the date each deal was marked paid
    const paid = deals.filter((d) => d.paid_at && new Date(d.paid_at) >= start);
    const total = sumAmount(paid);

    const byPlatform = PLATFORMS.map((platform) => {
      const inPlatform = paid.filter((d) => d.platform === platform);
      return { platform, total: sumAmount(inPlatform), count: inPlatform.length };
    })
      .filter((p) => p.count > 0)
      .sort((a, b) => b.total - a.total);

    const brandMap = new Map<string, { brand: string; total: number; count: number }>();
    for (const deal of paid) {
      const key = deal.brand.trim().toLowerCase();
      const entry = brandMap.get(key) ?? { brand: deal.brand, total: 0, count: 0 };
      entry.total += deal.amount;
      entry.count += 1;
      brandMap.set(key, entry);
    }
    const topBrands = [...brandMap.values()].sort((a, b) => b.total - a.total).slice(0, 5);

    // Close rate is all-time: share of all deals that reached Paid
    const closed = deals.filter((d) => d.stage === "paid").length;

    return {
      paid,
      total,
      average: paid.length ? total / paid.length : 0,
      closeRate: deals.length > 0 ? Math.round((closed / deals.length) * 100) : null,
      closed,
      monthly: buildMonths(paid, months),
      byPlatform,
      topBrands,
    };
  }, [deals, months]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        subtitle="Earnings from paid deals, by the date you were paid."
        action={
          <div role="group" aria-label="Time range" className="inline-flex rounded-lg bg-background-100 p-1">
            {RANGES.map((r) => (
              <button
                key={r.months}
                type="button"
                aria-pressed={months === r.months}
                onClick={() => setMonths(r.months)}
                className={cn(
                  "px-3 py-1.5 rounded-md text-sm font-medium cursor-pointer",
                  months === r.months ? "bg-white text-foreground-900 shadow-ambient" : "text-foreground-500 hover:text-foreground-700"
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
        }
      />

      <LoadState />

      {hasLoaded && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard testId="analytics-total-earned" label="Total earned" icon="ri-money-dollar-circle-line" value={formatMoney(data.total)} />
            <StatCard testId="analytics-paid-deals" label="Paid deals" icon="ri-checkbox-circle-line" value={String(data.paid.length)} />
            <StatCard testId="analytics-average-deal" label="Average deal" icon="ri-scales-3-line" value={formatMoney(data.average)} />
            <StatCard
              testId="analytics-close-rate"
              label="Close rate (all time)"
              icon="ri-trophy-line"
              value={data.closeRate === null ? "—" : `${data.closeRate}%`}
              hint={data.closeRate === null ? "No deals yet" : `${data.closed} of ${deals.length} deals paid`}
            />
          </div>

          <MonthlyChart buckets={data.monthly} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <section aria-labelledby="by-platform" className="bg-white rounded-xl border border-background-200 shadow-ambient p-4">
              <h2 id="by-platform" className="font-heading font-semibold text-foreground-900 mb-4">Earnings by platform</h2>
              {data.byPlatform.length === 0 ? (
                <p className="text-sm text-foreground-500 py-4">No paid deals in this range.</p>
              ) : (
                <ul className="space-y-3">
                  {data.byPlatform.map((p) => (
                    <li key={p.platform} data-testid={`platform-${p.platform}`}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="inline-flex items-center gap-1.5 text-foreground-700">
                          <i className={PLATFORM_ICONS[p.platform]} aria-hidden />
                          {p.platform}
                          <span className="text-foreground-400">· {p.count} deal{p.count === 1 ? "" : "s"}</span>
                        </span>
                        <span className="font-semibold text-foreground-900 tabular-data">{formatMoney(p.total)}</span>
                      </div>
                      <div className="h-2 rounded-full bg-background-100">
                        <div
                          className="h-2 rounded-full bg-primary-400"
                          style={{ width: `${(p.total / data.byPlatform[0].total) * 100}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section aria-labelledby="top-brands" className="bg-white rounded-xl border border-background-200 shadow-ambient p-4">
              <h2 id="top-brands" className="font-heading font-semibold text-foreground-900 mb-2">Top brands</h2>
              {data.topBrands.length === 0 ? (
                <p className="text-sm text-foreground-500 py-4">No paid deals in this range.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-foreground-500">
                      <th className="py-2 font-semibold">Brand</th>
                      <th className="py-2 font-semibold text-right">Deals</th>
                      <th className="py-2 font-semibold text-right">Earned</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topBrands.map((b) => (
                      <tr key={b.brand} className="border-t border-background-100">
                        <td className="py-2 font-medium text-foreground-900">{b.brand}</td>
                        <td className="py-2 text-right text-foreground-600 tabular-data">{b.count}</td>
                        <td className="py-2 text-right font-semibold text-foreground-900 tabular-data">{formatMoney(b.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>

          </div>
        </>
      )}
    </div>
  );
}

function MonthlyChart({ buckets }: { buckets: MonthBucket[] }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);

  const max = niceMax(Math.max(...buckets.map((b) => b.total)));
  const ticks = [max, max * 0.75, max * 0.5, max * 0.25, 0];

  return (
    <section aria-labelledby="monthly-earnings" className="bg-white rounded-xl border border-background-200 shadow-ambient p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 id="monthly-earnings" className="font-heading font-semibold text-foreground-900">Monthly earnings</h2>
        <button
          type="button"
          onClick={() => setShowTable((v) => !v)}
          className="text-sm font-medium text-secondary-600 hover:underline cursor-pointer"
        >
          {showTable ? "Show chart" : "Show table"}
        </button>
      </div>

      {showTable ? (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-foreground-500">
              <th className="py-2 font-semibold">Month</th>
              <th className="py-2 font-semibold text-right">Paid deals</th>
              <th className="py-2 font-semibold text-right">Earned</th>
            </tr>
          </thead>
          <tbody>
            {buckets.map((b) => (
              <tr key={b.key} className="border-t border-background-100">
                <td className="py-2 text-foreground-900">{b.fullLabel}</td>
                <td className="py-2 text-right text-foreground-600 tabular-data">{b.count}</td>
                <td className="py-2 text-right font-semibold text-foreground-900 tabular-data">{formatMoney(b.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="flex gap-2">
          {/* Y axis */}
          <div className="flex flex-col justify-between h-56 text-[11px] text-foreground-400 tabular-data text-right w-12 shrink-0 -my-1.5">
            {ticks.map((t) => (
              <span key={t}>{formatMoney(t)}</span>
            ))}
          </div>

          <div className="flex-1 min-w-0">
            <div className="relative h-56">
              {/* Gridlines */}
              {ticks.map((t) => (
                <div
                  key={t}
                  className={cn("absolute left-0 right-0 border-t", t === 0 ? "border-background-300" : "border-background-100")}
                  style={{ bottom: `${(t / max) * 100}%` }}
                />
              ))}

              {/* Bars: each column is the full-height hover target */}
              <div className="absolute inset-0 flex">
                {buckets.map((b, i) => (
                  <div
                    key={b.key}
                    tabIndex={0}
                    aria-label={`${b.fullLabel}: ${formatMoney(b.total)} from ${b.count} deal${b.count === 1 ? "" : "s"}`}
                    onMouseEnter={() => setHovered(i)}
                    onMouseLeave={() => setHovered(null)}
                    onFocus={() => setHovered(i)}
                    onBlur={() => setHovered(null)}
                    className="relative flex-1 h-full flex items-end justify-center px-[1px] outline-none"
                  >
                    <div
                      className={cn(
                        "w-full max-w-10 rounded-t transition-colors",
                        hovered === i ? "bg-primary-600" : "bg-primary-400"
                      )}
                      style={{ height: b.total > 0 ? `max(${(b.total / max) * 100}%, 2px)` : 0 }}
                    />
                    {hovered === i && (
                      <div
                        role="tooltip"
                        style={{ bottom: `calc(${(b.total / max) * 100}% + 6px)` }}
                        className={cn(
                          "absolute z-10 whitespace-nowrap rounded-lg bg-foreground-950 px-2.5 py-1.5 text-xs text-white shadow-elevated pointer-events-none",
                          i < 2 ? "left-0" : i >= buckets.length - 2 ? "right-0" : "left-1/2 -translate-x-1/2"
                        )}
                      >
                        <p className="font-semibold">{b.fullLabel}</p>
                        <p className="tabular-data">
                          {formatMoney(b.total)} · {b.count} deal{b.count === 1 ? "" : "s"}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* X axis */}
            <div className="flex mt-2">
              {buckets.map((b) => (
                <span key={b.key} className="flex-1 text-center text-[11px] text-foreground-500">
                  {b.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
