import { useDealsStore } from "@/stores/dealsStore";
import { secondaryButtonClass } from "@/lib/ui";

/** Shows the initial loading spinner, or the load error with a retry button. */
export default function LoadState() {
  const { isLoading, hasLoaded, loadError: error, fetchDeals } = useDealsStore();

  if (hasLoaded) return null;

  if (error) {
    return (
      <div role="alert" className="rounded-xl border border-status-deleted/30 bg-white p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <p className="font-medium text-foreground-900">Couldn't load your deals</p>
          <p className="text-sm text-foreground-500 mt-0.5">{error}</p>
        </div>
        <button type="button" onClick={fetchDeals} className={secondaryButtonClass}>
          Try again
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-foreground-500">
        <span className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        Loading deals...
      </div>
    );
  }

  return null;
}
