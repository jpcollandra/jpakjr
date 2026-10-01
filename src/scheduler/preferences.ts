import { useEffect, useState } from "react";
import { browserZone } from "./time";

const zoneKey = "scheduler-timezone";
export function savedTimezone() {
  try {
    const zone = localStorage.getItem(zoneKey);
    if (zone) {
      new Intl.DateTimeFormat("en-US", { timeZone: zone });
      return zone;
    }
  } catch {
    /* Storage may be unavailable in private browsing. */
  }
  return browserZone();
}
export function useSchedulerTimezone() {
  const [zone, setZone] = useState(savedTimezone);
  useEffect(() => {
    const update = (event: Event) => {
      const value = (event as CustomEvent<string>).detail;
      if (typeof value === "string") setZone(value);
    };
    const storage = (event: StorageEvent) => {
      if (event.key === zoneKey) setZone(savedTimezone());
    };
    window.addEventListener("scheduler-timezone-change", update);
    window.addEventListener("storage", storage);
    return () => {
      window.removeEventListener("scheduler-timezone-change", update);
      window.removeEventListener("storage", storage);
    };
  }, []);
  return [
    zone,
    (value: string) => {
      try {
        localStorage.setItem(zoneKey, value);
      } catch {
        /* Keep the in-memory preference. */
      }
      setZone(value);
      window.dispatchEvent(
        new CustomEvent("scheduler-timezone-change", { detail: value }),
      );
    },
  ] as const;
}
export function managementCode() {
  // Sixteen unbiased characters from a 32-character alphabet: 80 bits of entropy.
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from(
    crypto.getRandomValues(new Uint8Array(16)),
    (byte) => alphabet[byte & 31],
  ).join("");
}
