import { NextResponse } from "next/server";
import { validateApiKey } from "@/lib/api-key-auth";

export async function GET(request: Request) {
  const result = await validateApiKey(request);

  if (!result.valid) {
    return NextResponse.json(
      { valid: false, error: result.error },
      { status: result.status }
    );
  }

  return NextResponse.json({
    valid: true,
    balance_cents: result.balance_cents,
    rate_limit_remaining: result.rate_limit_remaining,
    scopes: result.scopes,
  });
}
