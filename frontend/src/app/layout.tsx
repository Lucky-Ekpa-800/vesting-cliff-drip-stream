import type { Metadata } from "next";
import "./globals.css";
import { WalletProvider } from "@/contexts/WalletContext";
import { I18nProvider } from "@/components/I18nProvider";
import { AnalyticsInit } from "@/components/AnalyticsInit";

export const metadata: Metadata = {
  title: "Vesting Stream",
  description: "Cliff + drip vesting on Stellar",
  viewport: "width=device-width, initial-scale=1",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {/* #69 — skip navigation link */}
        <a href="#main-content" className="skip-nav">
          Skip to main content
        </a>
        <I18nProvider>
          <AnalyticsInit />
          <WalletProvider>{children}</WalletProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
