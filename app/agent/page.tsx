"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import {
  Copy,
  Check,
  Wallet,
  Zap,
  Shield,
  Globe,
  ChevronDown,
  Loader2,
  ExternalLink,
  Key,
} from "lucide-react";

// ---- Types ----
interface WalletInfo {
  address: string | null;
  networks: string[];
  tokens: string[];
}

interface WalletsResponse {
  wallets: {
    solana: WalletInfo;
    ethereum: WalletInfo;
    bitcoin: WalletInfo;
  };
  supported_networks: string[];
}

interface VerifyResponse {
  api_key: string;
  balance_cents: number;
  message: string;
}

type Network = "solana" | "ethereum" | "base" | "bitcoin";

// ---- QR Code component (inline SVG generation) ----
function QRCode({ value, size = 128 }: { value: string; size?: number }) {
  // Simple QR-like placeholder that shows the address
  // In production you'd use a real QR library, but we avoid extra deps
  const encoded = encodeURIComponent(value);
  return (
    <img
      src={`https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encoded}&margin=1`}
      alt={`QR code for ${value}`}
      width={size}
      height={size}
      className="rounded-lg"
    />
  );
}

// ---- Copy button ----
function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [text]);

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleCopy}
      className="gap-2"
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      {label ?? (copied ? "Copied" : "Copy")}
    </Button>
  );
}

// ---- Network badge ----
const networkColors: Record<string, string> = {
  solana: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  ethereum: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  base: "bg-blue-400/20 text-blue-200 border-blue-400/30",
  bitcoin: "bg-orange-500/20 text-orange-300 border-orange-500/30",
};

function NetworkBadge({ network }: { network: string }) {
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded-full border ${networkColors[network] ?? "bg-zinc-700 text-zinc-300 border-zinc-600"}`}
    >
      {network.charAt(0).toUpperCase() + network.slice(1)}
    </span>
  );
}

// ---- Main page ----
export default function AgentPage() {
  const [wallets, setWallets] = useState<WalletsResponse | null>(null);
  const [txHash, setTxHash] = useState("");
  const [network, setNetwork] = useState<Network>("solana");
  const [senderAddress, setSenderAddress] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<VerifyResponse | null>(null);
  const [verifyError, setVerifyError] = useState("");
  const [stripeLoading, setStripeLoading] = useState(false);
  const [showCrypto, setShowCrypto] = useState(false);

  // Fetch wallet addresses on mount
  useEffect(() => {
    fetch("/api/crypto/wallets")
      .then((res) => res.json())
      .then(setWallets)
      .catch(() => {});
  }, []);

  // Handle Stripe checkout (existing flow)
  const handleStripeCheckout = async () => {
    setStripeLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "agent_worldstate" }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      // Stripe checkout error
    } finally {
      setStripeLoading(false);
    }
  };

  // Handle crypto verification
  const handleVerify = async () => {
    setVerifying(true);
    setVerifyError("");
    setVerifyResult(null);

    try {
      const res = await fetch("/api/crypto/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tx_hash: txHash.trim(),
          network,
          sender_address: senderAddress.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setVerifyError(data.error || "Verification failed");
        return;
      }

      setVerifyResult(data);
    } catch {
      setVerifyError("Network error. Please try again.");
    } finally {
      setVerifying(false);
    }
  };

  const features = [
    {
      icon: <Zap className="h-5 w-5" />,
      title: "Real-time World State",
      description:
        "Access live agent world state data via the MINDEX API with sub-second latency.",
    },
    {
      icon: <Shield className="h-5 w-5" />,
      title: "Secure API Access",
      description:
        "SHA-256 hashed API keys with per-minute and per-day rate limiting.",
    },
    {
      icon: <Globe className="h-5 w-5" />,
      title: "Multi-chain Payments",
      description:
        "Pay with Solana, Ethereum, Base, or Bitcoin. No account required.",
    },
    {
      icon: <Wallet className="h-5 w-5" />,
      title: "Pay-as-you-go",
      description:
        "Credit-based system. $1 minimum to get started. No subscriptions.",
    },
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-4xl mx-auto px-4 py-16 sm:py-24">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <h1 className="text-4xl sm:text-5xl font-bold mb-4 bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
            Agent Access
          </h1>
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
            Connect to the MINDEX world state API. Pay $1 to get your API key
            and start building.
          </p>
        </motion.div>

        {/* Features grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-16">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/50"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-zinc-800 text-zinc-300">
                  {feature.icon}
                </div>
                <h3 className="font-semibold">{feature.title}</h3>
              </div>
              <p className="text-sm text-zinc-400">{feature.description}</p>
            </motion.div>
          ))}
        </div>

        {/* Payment Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-6"
        >
          {/* Stripe Payment */}
          <div className="p-6 rounded-xl border border-zinc-800 bg-zinc-900/50">
            <h2 className="text-xl font-semibold mb-2">Pay with Card</h2>
            <p className="text-sm text-zinc-400 mb-4">
              Quick checkout via Stripe. $1 connection fee.
            </p>
            <Button
              onClick={handleStripeCheckout}
              disabled={stripeLoading}
              className="w-full sm:w-auto"
            >
              {stripeLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Wallet className="h-4 w-4 mr-2" />
              )}
              {stripeLoading ? "Redirecting..." : "$1 Connection Fee — Pay with Card"}
            </Button>
          </div>

          {/* Crypto Payment */}
          <div className="p-6 rounded-xl border border-zinc-800 bg-zinc-900/50">
            <button
              onClick={() => setShowCrypto(!showCrypto)}
              className="flex items-center justify-between w-full text-left"
            >
              <div>
                <h2 className="text-xl font-semibold">Pay with Crypto</h2>
                <p className="text-sm text-zinc-400 mt-1">
                  Send payment to one of our wallets, then verify your
                  transaction.
                </p>
              </div>
              <ChevronDown
                className={`h-5 w-5 text-zinc-400 transition-transform ${showCrypto ? "rotate-180" : ""}`}
              />
            </button>

            {showCrypto && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="mt-6 space-y-6"
              >
                {/* Wallet Addresses */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-zinc-300 uppercase tracking-wider">
                    Send minimum $1 to any address
                  </h3>

                  {wallets ? (
                    <div className="grid grid-cols-1 gap-4">
                      {/* Solana */}
                      {wallets.wallets.solana.address && (
                        <WalletCard
                          label="Solana"
                          address={wallets.wallets.solana.address}
                          tokens={wallets.wallets.solana.tokens}
                          network="solana"
                        />
                      )}
                      {/* Ethereum */}
                      {wallets.wallets.ethereum.address && (
                        <WalletCard
                          label="Ethereum / Base"
                          address={wallets.wallets.ethereum.address}
                          tokens={wallets.wallets.ethereum.tokens}
                          network="ethereum"
                        />
                      )}
                      {/* Bitcoin */}
                      {wallets.wallets.bitcoin.address && (
                        <WalletCard
                          label="Bitcoin"
                          address={wallets.wallets.bitcoin.address}
                          tokens={wallets.wallets.bitcoin.tokens}
                          network="bitcoin"
                        />
                      )}
                    </div>
                  ) : (
                    <div className="text-sm text-zinc-500">
                      Loading wallet addresses...
                    </div>
                  )}
                </div>

                {/* Verification Form */}
                <div className="pt-4 border-t border-zinc-800 space-y-4">
                  <h3 className="text-sm font-medium text-zinc-300 uppercase tracking-wider">
                    Verify your payment
                  </h3>

                  {/* Network Selector */}
                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">
                      Network
                    </label>
                    <select
                      value={network}
                      onChange={(e) => setNetwork(e.target.value as Network)}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-zinc-600"
                    >
                      <option value="solana">Solana</option>
                      <option value="ethereum">Ethereum</option>
                      <option value="base">Base</option>
                      <option value="bitcoin">Bitcoin</option>
                    </select>
                  </div>

                  {/* Sender Address */}
                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">
                      Your wallet address (sender)
                    </label>
                    <input
                      type="text"
                      value={senderAddress}
                      onChange={(e) => setSenderAddress(e.target.value)}
                      placeholder="Your wallet address"
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-600"
                    />
                  </div>

                  {/* Transaction Hash */}
                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">
                      Transaction hash
                    </label>
                    <input
                      type="text"
                      value={txHash}
                      onChange={(e) => setTxHash(e.target.value)}
                      placeholder="Paste your transaction hash here"
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-600"
                    />
                  </div>

                  {/* Verify Button */}
                  <Button
                    onClick={handleVerify}
                    disabled={verifying || !txHash.trim() || !senderAddress.trim()}
                    className="w-full"
                  >
                    {verifying ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Shield className="h-4 w-4 mr-2" />
                    )}
                    {verifying ? "Verifying on-chain..." : "Verify Payment"}
                  </Button>

                  {/* Error */}
                  {verifyError && (
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                      {verifyError}
                    </div>
                  )}

                  {/* Success — API Key */}
                  {verifyResult && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 rounded-lg bg-green-500/10 border border-green-500/20 space-y-3"
                    >
                      <div className="flex items-center gap-2 text-green-400">
                        <Check className="h-5 w-5" />
                        <span className="font-semibold">
                          {verifyResult.message}
                        </span>
                      </div>

                      <div>
                        <p className="text-sm text-zinc-400 mb-1">
                          Your API Key:
                        </p>
                        <div className="flex items-center gap-2 bg-zinc-900 rounded-lg p-3 border border-zinc-700">
                          <Key className="h-4 w-4 text-zinc-500 flex-shrink-0" />
                          <code className="text-sm text-green-300 break-all flex-1">
                            {verifyResult.api_key}
                          </code>
                          <CopyButton text={verifyResult.api_key} />
                        </div>
                      </div>

                      <div className="text-sm text-zinc-400">
                        Balance:{" "}
                        <span className="text-white font-medium">
                          ${(verifyResult.balance_cents / 100).toFixed(2)}
                        </span>
                      </div>

                      <div className="text-xs text-zinc-500 space-y-1">
                        <p>
                          Save this key securely — it won&apos;t be shown again.
                        </p>
                        <p>
                          Use it in the <code>Authorization: Bearer &lt;key&gt;</code>{" "}
                          header when calling the API.
                        </p>
                      </div>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* How it works */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-16"
        >
          <h2 className="text-2xl font-semibold mb-6 text-center">
            How it works
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              {
                step: "1",
                title: "Pay $1",
                description:
                  "Use Stripe or send crypto to one of our wallet addresses. Minimum $1.",
              },
              {
                step: "2",
                title: "Get your API key",
                description:
                  "After payment verification, you receive a unique API key instantly.",
              },
              {
                step: "3",
                title: "Start building",
                description:
                  "Call the MINDEX API with your key. Pay-as-you-go, no subscriptions.",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="text-center p-4 rounded-xl border border-zinc-800 bg-zinc-900/50"
              >
                <div className="w-8 h-8 rounded-full bg-zinc-800 text-zinc-300 flex items-center justify-center mx-auto mb-3 text-sm font-bold">
                  {item.step}
                </div>
                <h3 className="font-semibold mb-1">{item.title}</h3>
                <p className="text-sm text-zinc-400">{item.description}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* API Docs link */}
        <div className="mt-12 text-center">
          <a
            href="/docs/api"
            className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
          >
            View API Documentation
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </div>
    </div>
  );
}

// ---- Wallet Card sub-component ----
function WalletCard({
  label,
  address,
  tokens,
  network,
}: {
  label: string;
  address: string;
  tokens: string[];
  network: string;
}) {
  const [showQR, setShowQR] = useState(false);

  return (
    <div className="p-4 rounded-lg border border-zinc-700 bg-zinc-800/50 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <NetworkBadge network={network} />
          <span className="text-sm font-medium">{label}</span>
        </div>
        <div className="flex items-center gap-1">
          {tokens.map((t) => (
            <span
              key={t}
              className="text-xs px-1.5 py-0.5 bg-zinc-700 rounded text-zinc-300"
            >
              {t}
            </span>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <code className="text-xs text-zinc-300 break-all flex-1 bg-zinc-900 px-2 py-1.5 rounded">
          {address}
        </code>
        <CopyButton text={address} />
      </div>

      <button
        onClick={() => setShowQR(!showQR)}
        className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        {showQR ? "Hide QR" : "Show QR Code"}
      </button>

      {showQR && (
        <div className="flex justify-center pt-2">
          <QRCode value={address} size={160} />
        </div>
      )}
    </div>
  );
}
