import { NextResponse } from "next/server";

export async function GET() {
  const wallets = {
    solana: {
      address: process.env.MYCOSOFT_SOL_WALLET || null,
      networks: ["solana"],
      tokens: ["SOL", "USDC"],
    },
    ethereum: {
      address: process.env.MYCOSOFT_ETH_WALLET || null,
      networks: ["ethereum", "base"],
      tokens: ["ETH", "USDC"],
    },
    bitcoin: {
      address: process.env.MYCOSOFT_BTC_WALLET || null,
      networks: ["bitcoin"],
      tokens: ["BTC"],
    },
  };

  const supported_networks = ["solana", "ethereum", "base", "bitcoin"];

  return NextResponse.json({ wallets, supported_networks });
}
