import type { Day } from "./api";

export function dayPresentation(day: Day, today: string) {
  const openSlots = day.slots.filter((slot) => !slot.busy).length;
  const selectable = day.inRange && openSlots > 0;
  const availabilityLabel = selectable
    ? `${openSlots} ${openSlots === 1 ? "meeting time" : "meeting times"} available`
    : day.date < today
      ? "Past date"
      : day.closed
        ? "Not available"
        : day.busy.length
          ? "Fully booked"
          : "Not available";

  return {
    openSlots,
    selectable,
    availabilityLabel,
    statusLabel: selectable
      ? `${openSlots} open ${openSlots === 1 ? "slot" : "slots"}`
      : availabilityLabel,
  };
}
