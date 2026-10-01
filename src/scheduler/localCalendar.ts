import { Day, Slot } from "./api";
import { localDate } from "./time";

export interface LocalSlot extends Slot {
  scheduleDate: string;
  timeZone: string;
}
export function localSlots(days: Day[], zone: string): LocalSlot[] {
  const slots = new Map<number, LocalSlot>();
  days.forEach((day) =>
    day.slots.forEach((slot) => {
      const candidate = {
        ...slot,
        scheduleDate: day.date,
        timeZone: day.timeZone,
      };
      const existing = slots.get(slot.startMs);
      if (!existing || (existing.busy && !candidate.busy))
        slots.set(slot.startMs, candidate);
    }),
  );
  return Array.from(slots.values()).sort((a, b) => a.startMs - b.startMs);
}
export function slotsOnDate(slots: LocalSlot[], date: string, zone: string) {
  return slots.filter((slot) => localDate(slot.startMs, zone) === date);
}

export function slotsByLocalDate(slots: LocalSlot[], zone: string) {
  const dates = new Map<string, LocalSlot[]>();
  for (const slot of slots) {
    const date = localDate(slot.startMs, zone);
    const group = dates.get(date);
    if (group) group.push(slot);
    else dates.set(date, [slot]);
  }
  return dates;
}
