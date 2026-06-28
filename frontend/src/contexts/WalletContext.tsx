"use client";
import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import {
  isConnected,
  getAddress,
  requestAccess,
  setAllowed,
} from "@stellar/freighter-api";

const STORAGE_KEY = "vesting_wallet_address";

interface WalletCtx {
  address: string | null;
  freighterInstalled: boolean | null; // null = not yet checked
  connect: () => Promise<void>;
  disconnect: () => void;
}

export const WalletContext = createContext<WalletCtx>({
  address: null,
  freighterInstalled: null,
  connect: async () => {},
  disconnect: () => {},
});

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(() => {
    try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
  });
  const [freighterInstalled, setFreighterInstalled] = useState<boolean | null>(null);

  // Check Freighter presence on mount
  useEffect(() => {
    isConnected().then((res) => setFreighterInstalled(res.isConnected));
  }, []);

  // Re-fetch address when the user switches accounts in Freighter
  useEffect(() => {
    if (!address) return;
    const interval = setInterval(async () => {
      const res = await getAddress();
      if (!res.error && res.address && res.address !== address) {
        setAddress(res.address);
        localStorage.setItem(STORAGE_KEY, res.address);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [address]);

  const connect = useCallback(async () => {
    const connected = await isConnected();
    if (!connected.isConnected) {
      setFreighterInstalled(false);
      throw new Error("Freighter not installed");
    }
    setFreighterInstalled(true);
    await requestAccess();
    // setAllowed may not exist in all versions; guard it
    if (typeof setAllowed === "function") {
      await (setAllowed as () => Promise<unknown>)();
    }
    const addr = await getAddress();
    if (addr.error) throw new Error(addr.error);
    setAddress(addr.address);
    localStorage.setItem(STORAGE_KEY, addr.address);
  }, []);

  const disconnect = useCallback(() => {
    setAddress(null);
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  }, []);

  return (
    <WalletContext.Provider value={{ address, freighterInstalled, connect, disconnect }}>
      {children}
    </WalletContext.Provider>
  );
}

export const useWallet = () => useContext(WalletContext);
