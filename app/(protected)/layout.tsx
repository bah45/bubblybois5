"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { getUser, logout } from "@/lib/auth-client";
import {
  LayoutDashboard,
  Activity,
  HeartPulse,
  BatteryCharging,
  History,
  Siren,
  Settings,
  Network,
  LogOut,
} from "lucide-react";
import { EvaAssistant } from "@/components/eva-assistant";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/telemetry", label: "Telemetry", icon: Activity },
  { href: "/health", label: "Health", icon: HeartPulse },
  { href: "/energy", label: "Energy", icon: BatteryCharging },
  { href: "/history", label: "History", icon: History },
  { href: "/alerts", label: "Alerts", icon: Siren },
  { href: "/fleet", label: "Fleet", icon: Network },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const [checked, setChecked] = useState(false);
  const [authed, setAuthed] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let cancelled = false;
    getUser().then((user) => {
      if (cancelled) return;
      if (!user) {
        router.replace("/login");
        return;
      }
      setAuthed(true);
      setChecked(true);
    });
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!checked) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-muted">Checking session…</div>;
  }
  if (!authed) return null;

  return (
    <div className="min-h-screen grid grid-cols-[240px_1fr]">
      <aside className="border-r border-border bg-card/40 flex flex-col">
        <div className="px-5 py-5 border-b border-border">
          <div className="text-xs uppercase tracking-widest text-muted">Bubbly Bois</div>
          <div className="text-sm font-semibold">Predictive Maintenance</div>
        </div>
        <nav className="flex-1 py-3">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 px-5 py-2.5 text-sm ${
                  active ? "text-primary bg-primary/10 border-r-2 border-primary" : "text-foreground/80 hover:bg-white/5"
                }`}
              >
                <Icon size={16} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <button
          onClick={() => {
            logout().finally(() => router.replace("/login"));
          }}
          className="flex items-center gap-2.5 px-5 py-3 text-sm text-muted hover:text-foreground border-t border-border"
        >
          <LogOut size={16} /> Sign out
        </button>
      </aside>
      <main className="overflow-y-auto">{children}</main>
      <EvaAssistant />
    </div>
  );
}
