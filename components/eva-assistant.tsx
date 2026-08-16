"use client";

import { useState } from "react";
import { Bot, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Message {
  role: "user" | "eva";
  text: string;
}

export function EvaAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "eva", text: "I am EVA — Energy & Vibration Analyst. Ask me about machine health, vibration, current, or energy state in English, Tamil, or Hindi." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function ask() {
    const question = input.trim();
    if (!question || loading) return;
    setMessages((m) => [...m, { role: "user", text: question }]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/eva", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const data = await res.json();
      setMessages((m) => [...m, { role: "eva", text: data.answer ?? "No response." }]);
    } catch {
      setMessages((m) => [...m, { role: "eva", text: "EVA is unavailable right now — check server configuration." }]);
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 flex items-center gap-2 rounded-full bg-primary text-black px-4 py-3 shadow-lg text-sm font-medium"
      >
        <Bot size={18} /> Ask EVA
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-80 h-[26rem] rounded-xl border border-border bg-card shadow-xl flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Bot size={16} className="text-primary" /> EVA
        </div>
        <button onClick={() => setOpen(false)} className="text-muted hover:text-foreground">
          <X size={16} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2 text-sm">
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "text-right" : "text-left"}>
            <span
              className={`inline-block max-w-[85%] rounded-lg px-3 py-1.5 ${
                m.role === "user" ? "bg-primary/20 text-foreground" : "bg-white/5 text-foreground/90"
              }`}
            >
              {m.text}
            </span>
          </div>
        ))}
        {loading && <div className="text-xs text-muted">EVA is analyzing telemetry…</div>}
      </div>
      <div className="flex items-center gap-2 border-t border-border p-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && ask()}
          placeholder="Ask about vibration, energy, health…"
          className="flex-1 rounded-md bg-background border border-border px-2 py-1.5 text-sm"
        />
        <Button onClick={ask} disabled={loading}>
          <Send size={14} />
        </Button>
      </div>
    </div>
  );
}
