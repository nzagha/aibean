"use client";
import { useEffect } from "react";
import type { AnalyticsInput } from "@/lib/discovery/analytics-contracts";
export function emitAnalytics(value: AnalyticsInput) {
  if (navigator.doNotTrack === "1") return;
  void fetch("/api/analytics", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(value),
    keepalive: true,
  }).catch(() => {});
}
export function AnalyticsBeacon({ value }: { value: AnalyticsInput }) {
  const payload = JSON.stringify(value);
  useEffect(() => {
    emitAnalytics(JSON.parse(payload));
  }, [payload]);
  return null;
}
