import { createMemo, createSignal, For } from "solid-js";

type Props = {
  selected: Date | null;
  onSelect: (date: Date | null) => void;
  maxDate?: Date;
};

const DOW = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

export function CalendarPicker(props: Props) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [viewYear, setViewYear] = createSignal(today.getFullYear());
  const [viewMonth, setViewMonth] = createSignal(today.getMonth());

  const maxDate = createMemo(() => {
    const d = props.maxDate ?? today;
    const copy = new Date(d);
    copy.setHours(0, 0, 0, 0);
    return copy;
  });

  const monthLabel = createMemo(() =>
    new Date(viewYear(), viewMonth(), 1).toLocaleDateString([], {
      month: "long",
      year: "numeric"
    })
  );

  // Build calendar grid: weeks × 7, padded with prev/next month days
  const cells = createMemo(() => {
    const year = viewYear();
    const month = viewMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // Monday-first: 0=Mon … 6=Sun
    let startDow = firstDay.getDay() - 1;
    if (startDow < 0) startDow = 6;

    const result: Array<{ date: Date; otherMonth: boolean }> = [];

    // Previous month fill
    for (let i = startDow - 1; i >= 0; i--) {
      const d = new Date(year, month, -i);
      result.push({ date: d, otherMonth: true });
    }

    // Current month
    for (let d = 1; d <= lastDay.getDate(); d++) {
      result.push({ date: new Date(year, month, d), otherMonth: false });
    }

    // Next month fill to complete last row
    const remaining = 7 - (result.length % 7);
    if (remaining < 7) {
      for (let d = 1; d <= remaining; d++) {
        result.push({ date: new Date(year, month + 1, d), otherMonth: true });
      }
    }

    return result;
  });

  function prevMonth() {
    if (viewMonth() === 0) {
      setViewMonth(11);
      setViewYear(y => y - 1);
    } else {
      setViewMonth(m => m - 1);
    }
  }

  function nextMonth() {
    const nextY = viewMonth() === 11 ? viewYear() + 1 : viewYear();
    const nextM = viewMonth() === 11 ? 0 : viewMonth() + 1;
    if (new Date(nextY, nextM, 1) > maxDate()) return;
    setViewMonth(nextM);
    setViewYear(nextY);
  }

  function isSelected(date: Date): boolean {
    if (!props.selected) return false;
    const s = new Date(props.selected);
    s.setHours(0, 0, 0, 0);
    return s.getTime() === date.getTime();
  }

  function isToday(date: Date): boolean {
    return date.getTime() === today.getTime();
  }

  function isDisabled(date: Date): boolean {
    return date > maxDate();
  }

  function handleSelect(date: Date) {
    if (isDisabled(date)) return;
    if (isSelected(date)) {
      props.onSelect(null);
    } else {
      props.onSelect(new Date(date));
    }
  }

  const canGoNext = createMemo(() => {
    const nextY = viewMonth() === 11 ? viewYear() + 1 : viewYear();
    const nextM = viewMonth() === 11 ? 0 : viewMonth() + 1;
    return new Date(nextY, nextM, 1) <= maxDate();
  });

  return (
    <div class="calendar-panel" aria-label="Select historical date">
      <div class="calendar-nav">
        <button
          type="button"
          class="calendar-nav-btn"
          onClick={prevMonth}
          aria-label="Previous month"
        >
          ‹
        </button>
        <span class="calendar-month-label">{monthLabel()}</span>
        <button
          type="button"
          class="calendar-nav-btn"
          onClick={nextMonth}
          disabled={!canGoNext()}
          aria-label="Next month"
        >
          ›
        </button>
      </div>

      <div class="calendar-grid" role="grid" aria-label={monthLabel()}>
        <For each={DOW}>
          {(d) => (
            <div class="calendar-dow" role="columnheader" aria-label={d}>
              {d}
            </div>
          )}
        </For>

        <For each={cells()}>
          {({ date, otherMonth }) => (
            <button
              type="button"
              role="gridcell"
              class={[
                "calendar-day",
                otherMonth ? "other-month" : "",
                isToday(date) ? "today" : "",
                isSelected(date) ? "selected" : ""
              ]
                .filter(Boolean)
                .join(" ")}
              disabled={isDisabled(date)}
              aria-selected={isSelected(date)}
              aria-label={date.toLocaleDateString([], {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric"
              })}
              onClick={() => handleSelect(date)}
            >
              {date.getDate()}
            </button>
          )}
        </For>
      </div>

      <div class="calendar-clear">
        <button
          type="button"
          class="icon-btn"
          onClick={() => props.onSelect(null)}
          disabled={!props.selected}
          aria-label="Clear date selection, return to live mode"
        >
          ↺ Live mode
        </button>
      </div>
    </div>
  );
}
