type ViewMode = "month" | "week" | "day";

interface CalendarHeaderProps {
  viewMode: ViewMode;
  onViewChange: (mode: ViewMode) => void;
  currentDate: Date;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  title: string;
}

const views: { key: ViewMode; label: string }[] = [
  { key: "month", label: "Month" },
  { key: "week", label: "Week" },
  { key: "day", label: "Day" },
];

export default function CalendarHeader({
  viewMode,
  onViewChange,
  currentDate,
  onPrev,
  onNext,
  onToday,
  title,
}: CalendarHeaderProps) {
  return (
    <div className="flex items-center justify-between flex-wrap gap-3">
      <div className="flex items-center gap-3">
        <h2 className="font-heading font-semibold text-headline-md text-foreground-950">{title}</h2>
        <div className="flex items-center gap-1 bg-white border border-background-200 rounded-lg p-1">
          <button
            onClick={onPrev}
            className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-background-100 text-foreground-500 cursor-pointer transition-colors"
          >
            <i className="ri-arrow-left-s-line" />
          </button>
          <button
            onClick={onToday}
            className="px-3 py-1.5 text-xs font-semibold text-foreground-600 hover:bg-background-100 rounded-md cursor-pointer transition-colors whitespace-nowrap"
          >
            Today
          </button>
          <button
            onClick={onNext}
            className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-background-100 text-foreground-500 cursor-pointer transition-colors"
          >
            <i className="ri-arrow-right-s-line" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-1 bg-white border border-background-200 rounded-full px-1 py-1">
        {views.map((v) => (
          <button
            key={v.key}
            onClick={() => onViewChange(v.key)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
              viewMode === v.key
                ? "bg-secondary-500 text-white"
                : "text-foreground-500 hover:text-foreground-800"
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>
    </div>
  );
}