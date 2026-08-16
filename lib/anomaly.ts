// Shared anomaly-detection thresholds used both by the ingestion function and the UI,
// so /health and /alerts explain triggers using the exact same rule the ingestion path used.

export interface TelemetryPayload {
  node_id: string;
  machine_id: string;
  vibration_rms: number;
  peak_current: number;
  supercap_voltage: number;
  variance?: number;
  kurtosis?: number;
  z_score?: number;
  panic?: boolean;
  firmware_version?: string;
}

export interface AnomalyResult {
  isAnomaly: boolean;
  reasons: string[];
  severity: "CRITICAL" | "WARNING" | "INFO";
}

export function evaluateAnomaly(p: TelemetryPayload): AnomalyResult {
  const reasons: string[] = [];
  if (p.panic === true) reasons.push("panic flag set by node");
  if (p.vibration_rms > 4.5) reasons.push(`vibration_rms ${p.vibration_rms.toFixed(2)} exceeds 4.5`);
  if (p.peak_current > 15.0) reasons.push(`peak_current ${p.peak_current.toFixed(2)} exceeds 15.0`);
  if (p.supercap_voltage < 3.1) reasons.push(`supercap_voltage ${p.supercap_voltage.toFixed(2)} below 3.1`);
  if ((p.z_score ?? 0) > 3.0) reasons.push(`z_score ${(p.z_score ?? 0).toFixed(2)} exceeds 3.0`);
  if ((p.kurtosis ?? 0) > 4.2) reasons.push(`kurtosis ${(p.kurtosis ?? 0).toFixed(2)} exceeds 4.2`);

  let severity: AnomalyResult["severity"] = "INFO";
  if (p.panic === true || p.supercap_voltage < 3.1 || p.vibration_rms > 4.5) severity = "CRITICAL";
  else if (reasons.length > 0) severity = "WARNING";

  return { isAnomaly: reasons.length > 0, reasons, severity };
}
