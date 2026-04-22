"use client";

import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import {
  metaMaskWallet,
  rainbowWallet,
  walletConnectWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { fallback, http } from "viem";
import { sepolia } from "wagmi/chains";

const primaryRpc = process.env.NEXT_PUBLIC_RPC_URL;

// Fallback transport: primary (private RPC if configured) → public endpoints.
// Viem tries each in order, only advancing on retryable errors (429, 5xx, timeout).
// `rank: false` keeps ordering fixed — no background health-check pings.
const transport = fallback(
  [
    http(primaryRpc ?? undefined, {
      batch: true,
      retryCount: 2,
      retryDelay: 250,
      timeout: 15_000,
    }),
    http("https://ethereum-sepolia-rpc.publicnode.com", {
      batch: true,
      retryCount: 1,
      retryDelay: 300,
    }),
    http("https://sepolia.gateway.tenderly.co", {
      batch: true,
      retryCount: 1,
      retryDelay: 300,
    }),
    http("https://rpc.sepolia.org", {
      batch: true,
      retryCount: 0,
    }),
  ],
  { rank: false }
);

export const wagmiConfig = getDefaultConfig({
  appName: "Prediction Market Demo",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "demo",
  chains: [sepolia],
  transports: {
    [sepolia.id]: transport,
  },
  pollingInterval: 12_000,
  ssr: true,
  wallets: [
    {
      groupName: "Popular",
      wallets: [metaMaskWallet, rainbowWallet, walletConnectWallet],
    },
  ],
});
