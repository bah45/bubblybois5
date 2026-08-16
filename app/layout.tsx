import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bubbly Bois: Energy-Aware Self-Powered Predictive Maintenance Node",
  description: "Real-hardware industrial predictive maintenance monitoring for ESP32-C3 self-powered vibration nodes.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="font-sans antialiased min-h-screen">{children}</body>
    </html>
  );
}
