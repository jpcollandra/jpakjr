import { signInAnonymously } from "firebase/auth";
import { httpsCallable } from "firebase/functions";
import { auth, functions } from "../firebase";

export interface MeetingDetails {
  name: string;
  email: string;
  company: string;
  opportunity: string;
  meetingType: "phone" | "video" | "in-person";
  contact: string;
  notes: string;
}
export interface Booking extends MeetingDetails {
  id: string;
  date: string;
  startMs: number;
  endMs: number;
  originalTimeZone: string;
  viewerTimeZone?: string;
  shortNotice: boolean;
  status: "requested" | "confirmed" | "cancelled" | "declined";
  version: number;
  createdAt: number;
  updatedAt: number;
  declineReason?: string;
}
export interface Slot {
  startMs: number;
  endMs: number;
  busy: boolean;
  shortNotice: boolean;
}
export interface Day {
  date: string;
  timeZone: string;
  startTime: string;
  endTime: string;
  closed: boolean;
  inRange: boolean;
  slots: Slot[];
  busy: { startMs: number; endMs: number; shortNotice: boolean }[];
  shortNotice: boolean;
}
export interface Session {
  role: "admin" | "recruiter" | null;
  booking?: Booking;
}
let ready: Promise<unknown> | null = null;
export async function schedulerApi<T>(
  action: string,
  data: Record<string, unknown> = {},
): Promise<T> {
  if (!ready)
    ready = auth
      .authStateReady()
      .then(async () => {
        if (!auth.currentUser) await signInAnonymously(auth);
      })
      .catch((error) => {
        ready = null;
        throw error;
      });
  await ready;
  const result = await httpsCallable<Record<string, unknown>, T>(
    functions,
    "schedulerApi",
  )({ action, ...data });
  return result.data;
}
export function errorMessage(error: unknown) {
  const value = error as { code?: string; message?: string };
  if (
    value.code === "functions/internal" ||
    value.code === "functions/unavailable" ||
    value.code?.startsWith("auth/")
  )
    return "Scheduling is temporarily unavailable. Please try again, or contact John for help.";
  if (
    value.code === "functions/deadline-exceeded" ||
    value.code === "functions/cancelled"
  )
    return "The connection timed out. Please try again. Your details are saved here; retrying will not create a duplicate request.";
  return (
    value.message || "We could not complete that action. Please try again."
  );
}

export function isAccessExpired(error: unknown) {
  return (error as { code?: string }).code === "functions/unauthenticated";
}
