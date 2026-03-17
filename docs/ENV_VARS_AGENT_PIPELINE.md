# Environment Variables — Agent Payment Pipeline

Add these to your `.env.local` on VM 192.168.0.187:

## Supabase (CRITICAL — site is broken without these)
```
NEXT_PUBLIC_SUPABASE_URL=https://hnevnsxnhfibhbsipqvz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<get from Supabase Dashboard → Settings → API → anon public>
SUPABASE_SERVICE_ROLE_KEY=<get from Supabase Dashboard → Settings → API → service_role secret>
```

## Crypto Wallet Addresses
```
MYCOSOFT_SOL_WALLET=BdmxPETu9qx3dXCPhf74C1eTaPUrDhP59DDuBWbhdGMY
MYCOSOFT_ETH_WALLET=0xb9110785C81E6e428A70Dc7C14a67dC1675b92ae
MYCOSOFT_BTC_WALLET=bc1qjksusf6mjst30cpc4489qvjhaa0xw97xhgy8s2
```

## Blockchain RPC URLs (optional — defaults are public endpoints)
```
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
ETHEREUM_RPC_URL=https://mainnet.infura.io/v3/<your-infura-key>
BASE_RPC_URL=https://mainnet.base.org
```

Note: The Solana and Base defaults are free public endpoints. For Ethereum mainnet,
you'll want an Infura or Alchemy key for reliable RPC access. The INFURA_API_KEY
env var already exists in your .env.example — use it to construct the URL:
`ETHEREUM_RPC_URL=https://mainnet.infura.io/v3/${INFURA_API_KEY}`

## How to get your Supabase keys
1. Go to https://supabase.com/dashboard
2. Select your project (hnevnsxnhfibhbsipqvz)
3. Go to Settings → API
4. Copy "anon public" key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Copy "service_role" key (click to reveal) → `SUPABASE_SERVICE_ROLE_KEY`
