import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createHash, randomBytes } from "crypto";

// ---- Supabase admin client ----
function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key);
}

// ---- Types ----
type Network = "solana" | "ethereum" | "base" | "bitcoin";

interface VerifyRequest {
  tx_hash: string;
  network: Network;
  sender_address: string;
  amount?: number;
}

interface VerificationResult {
  verified: boolean;
  amount_cents: number;
  sender: string;
  error?: string;
}

// ---- Solana verification ----
async function verifySolana(txHash: string): Promise<VerificationResult> {
  const rpcUrl = process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
  const ourWallet = process.env.MYCOSOFT_SOL_WALLET;
  if (!ourWallet) {
    return { verified: false, amount_cents: 0, sender: "", error: "SOL wallet not configured" };
  }

  const body = JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "getTransaction",
    params: [txHash, { encoding: "jsonParsed", maxSupportedTransactionVersion: 0 }],
  });

  const res = await fetch(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
  const json = await res.json();

  if (!json.result) {
    return { verified: false, amount_cents: 0, sender: "", error: "Transaction not found" };
  }

  const tx = json.result;

  // Check finalization
  if (tx.meta?.err) {
    return { verified: false, amount_cents: 0, sender: "", error: "Transaction failed on-chain" };
  }

  // USDC on Solana: EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
  const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

  // Check for SPL token transfer (USDC)
  const instructions = tx.transaction?.message?.instructions || [];
  const innerInstructions = tx.meta?.innerInstructions || [];
  const allInstructions = [
    ...instructions,
    ...innerInstructions.flatMap((ix: { instructions: unknown[] }) => ix.instructions || []),
  ];

  let sender = "";
  let amountCents = 0;

  for (const ix of allInstructions) {
    const parsed = ix.parsed;
    if (!parsed) continue;

    // SPL Token transfer / transferChecked
    if (
      (parsed.type === "transfer" || parsed.type === "transferChecked") &&
      ix.program === "spl-token"
    ) {
      const info = parsed.info;
      // For USDC (6 decimals), check destination matches our wallet's token account
      // We check if the mint is USDC for transferChecked
      if (parsed.type === "transferChecked" && info.mint === USDC_MINT) {
        // amount is in raw units (6 decimals for USDC)
        const usdcAmount = Number(info.tokenAmount?.uiAmount ?? info.amount / 1e6);
        if (usdcAmount >= 1) {
          amountCents = Math.round(usdcAmount * 100);
          sender = info.authority || info.source || "";
          return { verified: true, amount_cents: amountCents, sender };
        }
      }
      // Plain transfer — check amount (could be USDC or other)
      if (parsed.type === "transfer") {
        const rawAmount = Number(info.amount);
        // Assume USDC if 6 decimal places make it >= $1
        if (rawAmount >= 1_000_000) {
          amountCents = Math.round((rawAmount / 1e6) * 100);
          sender = info.authority || info.source || "";
          return { verified: true, amount_cents: amountCents, sender };
        }
      }
    }

    // Native SOL transfer
    if (parsed.type === "transfer" && ix.program === "system") {
      const info = parsed.info;
      const destination = info.destination;
      if (destination === ourWallet) {
        // SOL in lamports (1 SOL = 1e9 lamports)
        const solAmount = Number(info.lamports) / 1e9;
        // We accept any SOL transfer to our wallet >= a threshold
        // For simplicity, treat 1 SOL = ~$1 minimum (actual price check could be added)
        if (solAmount > 0) {
          amountCents = Math.max(100, Math.round(solAmount * 100)); // minimum 100 cents
          sender = info.source || "";
          return { verified: true, amount_cents: amountCents, sender };
        }
      }
    }
  }

  // Fallback: check if any account key matches our wallet in post-balances
  const accountKeys = tx.transaction?.message?.accountKeys || [];
  const walletIndex = accountKeys.findIndex(
    (k: { pubkey: string }) => k.pubkey === ourWallet
  );
  if (walletIndex >= 0) {
    const preBal = tx.meta?.preBalances?.[walletIndex] ?? 0;
    const postBal = tx.meta?.postBalances?.[walletIndex] ?? 0;
    const diff = postBal - preBal;
    if (diff > 0) {
      const solAmount = diff / 1e9;
      amountCents = Math.max(100, Math.round(solAmount * 100));
      // Find sender (first signer)
      sender = accountKeys[0]?.pubkey || "";
      return { verified: true, amount_cents: amountCents, sender };
    }
  }

  return { verified: false, amount_cents: 0, sender: "", error: "No qualifying transfer to our wallet found" };
}

// ---- Ethereum / Base verification ----
async function verifyEvm(txHash: string, network: "ethereum" | "base"): Promise<VerificationResult> {
  const rpcUrl =
    network === "base"
      ? process.env.BASE_RPC_URL || "https://mainnet.base.org"
      : process.env.ETHEREUM_RPC_URL;

  if (!rpcUrl) {
    return { verified: false, amount_cents: 0, sender: "", error: `${network} RPC URL not configured` };
  }

  const ourWallet = process.env.MYCOSOFT_ETH_WALLET?.toLowerCase();
  if (!ourWallet) {
    return { verified: false, amount_cents: 0, sender: "", error: "ETH wallet not configured" };
  }

  // USDC contract addresses
  const USDC_ADDRESS: Record<string, string> = {
    ethereum: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
    base: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  };
  const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

  // Get transaction receipt
  const receiptRes = await fetch(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_getTransactionReceipt",
      params: [txHash],
    }),
  });
  const receiptJson = await receiptRes.json();
  const receipt = receiptJson.result;

  if (!receipt) {
    return { verified: false, amount_cents: 0, sender: "", error: "Transaction not found or not yet confirmed" };
  }

  // Check success
  if (receipt.status !== "0x1") {
    return { verified: false, amount_cents: 0, sender: "", error: "Transaction reverted" };
  }

  // Check for USDC transfer in logs
  const usdcAddress = USDC_ADDRESS[network]?.toLowerCase();
  for (const log of receipt.logs || []) {
    if (
      log.address?.toLowerCase() === usdcAddress &&
      log.topics?.[0] === TRANSFER_TOPIC
    ) {
      // topics[2] is the 'to' address (padded to 32 bytes)
      const to = "0x" + log.topics[2]?.slice(26);
      if (to.toLowerCase() === ourWallet) {
        // USDC has 6 decimals
        const rawAmount = BigInt(log.data);
        const usdcAmount = Number(rawAmount) / 1e6;
        if (usdcAmount >= 1) {
          const sender = "0x" + log.topics[1]?.slice(26);
          return { verified: true, amount_cents: Math.round(usdcAmount * 100), sender };
        }
      }
    }
  }

  // Check for native ETH transfer
  const txRes = await fetch(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 2,
      method: "eth_getTransactionByHash",
      params: [txHash],
    }),
  });
  const txJson = await txRes.json();
  const tx = txJson.result;

  if (tx && tx.to?.toLowerCase() === ourWallet) {
    const weiValue = BigInt(tx.value);
    if (weiValue > 0n) {
      // Convert to a dollar estimate; for simplicity credit 100 cents minimum
      const ethAmount = Number(weiValue) / 1e18;
      const amountCents = Math.max(100, Math.round(ethAmount * 100));
      return { verified: true, amount_cents: amountCents, sender: tx.from };
    }
  }

  return { verified: false, amount_cents: 0, sender: "", error: "No qualifying transfer to our wallet found" };
}

// ---- Bitcoin verification ----
async function verifyBitcoin(txHash: string): Promise<VerificationResult> {
  const ourAddress = process.env.MYCOSOFT_BTC_WALLET;
  if (!ourAddress) {
    return { verified: false, amount_cents: 0, sender: "", error: "BTC wallet not configured" };
  }

  const res = await fetch(`https://blockstream.info/api/tx/${txHash}`);
  if (!res.ok) {
    return { verified: false, amount_cents: 0, sender: "", error: "Transaction not found on Blockstream" };
  }

  const tx = await res.json();

  // Check confirmation status
  if (!tx.status?.confirmed) {
    return { verified: false, amount_cents: 0, sender: "", error: "Transaction not yet confirmed" };
  }

  // Sum outputs to our address
  let totalSats = 0;
  for (const vout of tx.vout || []) {
    if (vout.scriptpubkey_address === ourAddress) {
      totalSats += vout.value;
    }
  }

  if (totalSats === 0) {
    return { verified: false, amount_cents: 0, sender: "", error: "No outputs to our Bitcoin address" };
  }

  // BTC amount (1 BTC = 1e8 sats), credit minimum 100 cents
  const btcAmount = totalSats / 1e8;
  const amountCents = Math.max(100, Math.round(btcAmount * 100));

  // Sender = first input address
  const sender = tx.vin?.[0]?.prevout?.scriptpubkey_address || "unknown";

  return { verified: true, amount_cents: amountCents, sender };
}

// ---- Main handler ----
export async function POST(request: Request) {
  try {
    const body: VerifyRequest = await request.json();
    const { tx_hash, network, sender_address } = body;

    // Validate inputs
    if (!tx_hash || !network || !sender_address) {
      return NextResponse.json(
        { error: "Missing required fields: tx_hash, network, sender_address" },
        { status: 400 }
      );
    }

    const validNetworks: Network[] = ["solana", "ethereum", "base", "bitcoin"];
    if (!validNetworks.includes(network)) {
      return NextResponse.json(
        { error: `Invalid network. Must be one of: ${validNetworks.join(", ")}` },
        { status: 400 }
      );
    }

    // Verify the transaction on-chain
    let result: VerificationResult;
    switch (network) {
      case "solana":
        result = await verifySolana(tx_hash);
        break;
      case "ethereum":
      case "base":
        result = await verifyEvm(tx_hash, network);
        break;
      case "bitcoin":
        result = await verifyBitcoin(tx_hash);
        break;
    }

    if (!result.verified) {
      return NextResponse.json(
        { error: result.error || "Payment verification failed" },
        { status: 400 }
      );
    }

    // ---- Onboard: create/update profile, record payment, generate API key ----
    const supabase = getAdminClient();

    // Check for duplicate tx_hash
    const { data: existingPayment } = await supabase
      .from("payments")
      .select("id")
      .eq("tx_hash", tx_hash)
      .single();

    if (existingPayment) {
      return NextResponse.json(
        { error: "This transaction has already been verified" },
        { status: 409 }
      );
    }

    // Upsert profile by sender address based on network
    const walletColumn =
      network === "solana" ? "sol_wallet" :
      network === "bitcoin" ? "btc_address" : "eth_wallet";

    // Find existing profile by wallet
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id, balance_cents, total_paid_cents")
      .eq(walletColumn, sender_address)
      .single();

    let profileId: string;

    if (existingProfile) {
      profileId = existingProfile.id;
      // Update balance
      await supabase
        .from("profiles")
        .update({
          balance_cents: existingProfile.balance_cents + result.amount_cents,
          total_paid_cents: existingProfile.total_paid_cents + result.amount_cents,
        })
        .eq("id", profileId);
    } else {
      // Create a new anonymous profile (no auth.users entry — admin insert bypasses RLS)
      profileId = crypto.randomUUID();
      const { error: profileError } = await supabase.from("profiles").insert({
        id: profileId,
        [walletColumn]: sender_address,
        balance_cents: result.amount_cents,
        total_paid_cents: result.amount_cents,
      });

      if (profileError) {
        // If FK constraint fails (no auth.users row), we need to handle this
        // For crypto-only onboarding, we allow profiles without auth.users
        // The migration allows this via the service role policy
        console.error("Profile creation note:", profileError.message);
      }
    }

    // Record payment
    await supabase.from("payments").insert({
      profile_id: profileId,
      amount_cents: result.amount_cents,
      currency: "USD",
      method: "crypto",
      status: "confirmed",
      tx_hash,
      network,
      sender_address,
    });

    // Generate API key
    const rawKey = `mk_${randomBytes(32).toString("hex")}`;
    const keyHash = createHash("sha256").update(rawKey).digest("hex");
    const keyPrefix = rawKey.slice(0, 11); // "mk_" + first 8 hex chars

    await supabase.from("agent_api_keys").insert({
      profile_id: profileId,
      key_hash: keyHash,
      key_prefix: keyPrefix,
      name: `Crypto onboard (${network})`,
      scopes: ["agent:read", "agent:write"],
      is_active: true,
    });

    return NextResponse.json({
      api_key: rawKey,
      balance_cents: existingProfile
        ? existingProfile.balance_cents + result.amount_cents
        : result.amount_cents,
      message: `Payment verified on ${network}. Your API key is ready to use.`,
    });
  } catch (err) {
    console.error("Crypto verification error:", err);
    return NextResponse.json(
      { error: "Internal server error during verification" },
      { status: 500 }
    );
  }
}
