import "./globals.css";
import { WalletProvider } from "@/contexts/WalletContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ErrorFallback, WalletErrorPage } from "@/components/ErrorPages";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <title>Vesting Stream</title>
        <meta name="description" content="Cliff + drip vesting on Stellar" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        {/* Top-level boundary: catches any render error in the whole tree */}
        <ErrorBoundary fallback={(reset) => <ErrorFallback reset={reset} />}>
          {/* Inner boundary: isolates wallet connection errors */}
          <ErrorBoundary fallback={(reset) => <WalletErrorPage reset={reset} />}>
            <WalletProvider>{children}</WalletProvider>
          </ErrorBoundary>
        </ErrorBoundary>
      </body>
    </html>
  );
}
