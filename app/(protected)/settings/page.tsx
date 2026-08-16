"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function SettingsPage() {
  const [webhookUrl, setWebhookUrl] = useState("");
  const [emailTo, setEmailTo] = useState("");
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((rows: { key: string; value: string }[]) => {
        setWebhookUrl(rows.find((r) => r.key === "emergency_webhook_url")?.value ?? "");
        setEmailTo(rows.find((r) => r.key === "alert_email_to")?.value ?? "");
      });
  }, []);

  async function save(key: string, value: string) {
    await fetch("/api/settings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ key, value }),
    });
    setSaved(key);
    setTimeout(() => setSaved(null), 1500);
  }

  return (
    <div className="p-8 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold">Settings</h1>
        <p className="text-sm text-muted">
          Configure notification targets. Note: these values are stored for reference — the effective
          production values for the ingestion function are the <span className="font-mono">RESEND_API_KEY</span>,
          <span className="font-mono"> ALERT_EMAIL_TO</span>, and <span className="font-mono"> EMERGENCY_WEBHOOK_URL</span> environment
          variables set on the Netlify site.
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle>Emergency Webhook (SMS gateway)</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <input
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            placeholder="https://sms-gateway.example.com/hook"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
          <Button onClick={() => save("emergency_webhook_url", webhookUrl)}>
            {saved === "emergency_webhook_url" ? "Saved" : "Save"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Resend Alert Email Targets</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <input
            value={emailTo}
            onChange={(e) => setEmailTo(e.target.value)}
            placeholder="ops@example.com, oncall@example.com"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
          <Button onClick={() => save("alert_email_to", emailTo)}>
            {saved === "alert_email_to" ? "Saved" : "Save"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Alert Thresholds (fixed, hardware-derived)</CardTitle></CardHeader>
        <CardContent className="text-sm space-y-1 font-mono text-foreground/90">
          <div>panic === true</div>
          <div>vibration_rms &gt; 4.5 g</div>
          <div>peak_current &gt; 15.0 A</div>
          <div>supercap_voltage &lt; 3.1 V</div>
          <div>z_score &gt; 3.0</div>
          <div>kurtosis &gt; 4.2</div>
          <div className="pt-2 text-muted">Cooldown window: 5 minutes per node/trigger-reason combination.</div>
        </CardContent>
      </Card>
    </div>
  );
}
