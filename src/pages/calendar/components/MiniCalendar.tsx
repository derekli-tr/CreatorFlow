interface MiniCalendarProps {
  currentDate: Date;
  onDateSelect: (date: Date) => void;
  eventsByDate: Record<string, number>;
}

const DAYS_OF_WEEK = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export default function MiniCalendar({ currentDate, onDateSelect, eventsByDate }: MiniCalendarProps) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startOffset = firstDay.getDay();
  const totalDays = lastDay.getDate();

  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const days: (number | null)[] = [];
  for (let i = 0; i < startOffset; i++) days.push(null);
  for (let d = 1; d <= totalDays; d++) days.push(d);

  const handlePrev = () => onDateSelect(new Date(year, month - 1, 1));
  const handleNext = () => onDateSelect(new Date(year, month + 1, 1));

  const isSelected = (d: number) => {
    return currentDate.getDate() === d && currentDate.getMonth() === month && currentDate.getFullYear() === year;
  };

  const isToday = (d: number) => {
    const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    return key === todayKey;
  };

  return (
    <div className="bg-white rounded-xl border border-background-200 shadow-ambient p-4">
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={handlePrev}
          className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-background-100 text-foreground-500 cursor-pointer transition-colors"
        >
          <i className="ri-arrow-left-s-line text-sm" />
        </button>
        <span className="text-sm font-semibold text-foreground-900">
          {currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
        </span>
        <button
          onClick={handleNext}
          className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-background-100 text-foreground-500 cursor-pointer transition-colors"
        >
          <i className="ri-arrow-right-s-line text-sm" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {DAYS_OF_WEEK.map((d) => (
          <div key={d} className="text-center text-[10px] font-semibold text-foreground-400 py-1">
            {d}
          </div>
        ))}
        {days.map((d, i) => {
          if (d === null) return <div key={`empty-${i}`} className="aspect-square" />;
          const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
          const eventCount = eventsByDate[dateKey] || 0;
          const selected = isSelected(d);
          const todayFlag = isToday(d);

          return (
            <button
              key={d}
              onClick={() => onDateSelect(new Date(year, month, d))}
              className={`aspect-square flex flex-col items-center justify-center rounded-md text-xs cursor-pointer transition-colors relative ${
                selected
                  ? "bg-secondary-500 text-white"
                  : todayFlag
                  ? "bg-secondary-100 text-secondary-700 font-bold"
                  : "text-foreground-700 hover:bg-background-100"
              }`}
            >
              {d}
              {eventCount > 0 && (
                <div className="flex gap-0.5 mt-0.5">
                  {eventCount <= 3 ? (
                    Array.from({ length: eventCount }).map((_, j) => (
                      <span
                        key={j}
                        className={`w-1 h-1 rounded-full ${selected ? "bg-white" : "bg-secondary-400"}`}
                      />
                    ))
                  ) : (
                    <span className={`text-[9px] font-semibold ${selected ? "text-white" : "text-secondary-500"}`}>
                      {eventCount}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}