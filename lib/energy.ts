// Energy-aware intelligence and machine health derivations.
// All values are computed strictly from real telemetry rows - nothing here fabricates data.

export type EnergyState = "HIGH" | "NORMAL" | "ENERGY_SAVING" | "CRITICAL";
export type MachineHealth = "GOOD" | "WARNING" | "CRITICAL";

export function classifyEnergyState(supercapVoltage: number | null | undefined): EnergyState | null {
  if (supercapVoltage == null || Number.isNaN(supercapVoltage)) return null;
  if (supercapVoltage >= 3.7) return "HIGH";
  if (supercapVoltage >= 3.4) return "NORMAL";
  if (supercapVoltage >= 3.1) return "ENERGY_SAVING";
  return "CRITICAL";
}

export const ENERGY_STATE_LABEL: Record<EnergyState, string> = {
  HIGH: "HIGH ENERGY",
  NORMAL: "NORMAL",
  ENERGY_SAVING: "ENERGY SAVING",
  CRITICAL: "CRITICAL",
};

export const ENERGY_STATE_DESCRIPTION: Record<EnergyState, string> = {
  HIGH: "High-frequency telemetry",
  NORMAL: "Standard telemetry intervals",
  ENERGY_SAVING: "Reduced Wi-Fi transmission frequency",
  CRITICAL: "Essential emergency telemetry only",
};

export function isOffline(lastSeen: string | Date | null | undefined, thresholdSeconds = 30): boolean {
  if (!lastSeen) return true;
  const ts = new Date(lastSeen).getTime();
  return (Date.now() - ts) / 1000 > thresholdSeconds;
}

export function secondsSince(lastSeen: string | Date | null | undefined): number {
  if (!lastSeen) return Infinity;
  return Math.max(0, Math.floor((Date.now() - new Date(lastSeen).getTime()) / 1000));
}

export function formatDuration(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds)) return "unknown";
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const parts: string[] = [];
  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  if (minutes) parts.push(`${minutes}m`);
  if (!days && !hours) parts.push(`${seconds}s`);
  return parts.join(" ") || "0s";
}

/**
 * Machine Health Score (0-100), derived strictly from the latest telemetry row's
 * physical factors: vibration RMS, peak current, z-score, and kurtosis.
 * No randomness - a deterministic weighted penalty model.
 */
export function computeHealthScore(row: {
  vibrationRms: number | null;
  peakCurrent: number | null;
  zScore: number | null;
  kurtosis: number | null;
  panic: boolean | null;
}): number {
  let score = 100;
  if (row.vibrationRms != null) score -= Math.min(40, Math.max(0, (row.vibrationRms - 1.0) * 12));
  if (row.peakCurrent != null) score -= Math.min(25, Math.max(0, (row.peakCurrent - 5.0) * 2.2));
  if (row.zScore != null) score -= Math.min(20, Math.max(0, (row.zScore - 1.0) * 7));
  if (row.kurtosis != null) score -= Math.min(15, Math.max(0, (row.kurtosis - 3.0) * 5));
  if (row.panic) score -= 30;
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function healthFromScore(score: number): MachineHealth {
  if (score >= 75) return "GOOD";
  if (score >= 45) return "WARNING";
  return "CRITICAL";
}

/**
 * Dynamic Monitoring Strategy = f(Machine Health, Energy State)
 * This is the signature "Energy-Aware Intelligence" behavior requested for /energy.
 */
export function monitoringStrategy(health: MachineHealth, energy: EnergyState): string {
  const table: Record<MachineHealth, Record<EnergyState, string>> = {
    GOOD: {
      HIGH: "Maintain standard sampling; surplus energy available for diagnostics logging.",
      NORMAL: "Maintain standard telemetry interval; no adjustment required.",
      ENERGY_SAVING: "Reduce Wi-Fi transmission frequency while machine remains healthy.",
      CRITICAL: "Conserve supercapacitor; enter minimum beacon rate.",
    },
    WARNING: {
      HIGH: "Accelerate sample rate to capture defect signature.",
      NORMAL: "Increase sampling moderately to track developing anomaly.",
      ENERGY_SAVING: "Prioritize anomaly-triggered bursts over periodic telemetry.",
      CRITICAL: "Send single high-priority diagnostic burst, then fall back to minimum beacon rate.",
    },
    CRITICAL: {
      HIGH: "Maximize sample rate; capture full waveform for failure analysis.",
      NORMAL: "Escalate to high-frequency telemetry despite normal energy state.",
      ENERGY_SAVING: "Force emergency telemetry burst; override energy-saving throttle.",
      CRITICAL: "Transmit only panic/emergency packet; shut down non-essential sensing.",
    },
  };
  return table[health][energy];
}
