"use client";

import { useEffect, useState } from "react";
import type { LogRow } from "./telemetry-line-chart";

export function useLiveLogs(nodeId?: string, intervalMs = 4000) {
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const qs = new URLSearchParams({ limit: "100" });
        if (nodeId) qs.set("nodeId", nodeId);
        const res = await fetch(`/api/logs?${qs.toString()}`, { cache: "no-store" });
        const data = await res.json();
        if (!cancelled) setLogs(data);
      } catch {
        // network hiccup - keep previous data, do not fabricate
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    poll();
    const id = setInterval(poll, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [nodeId, intervalMs]);

  return { logs, loading };
}
