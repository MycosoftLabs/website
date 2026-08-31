import { redirect } from 'next/navigation';

/**
 * Legacy waitlist URL. Buyers go to Stripe checkout.
 * Query keys plan / billing / item are preserved so old marketing links still
 * land on the SKU they selected.
 */

function first(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export default async function GetStartedToCheckout({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string; billing?: string; item?: string }>;
}) {
  const params = await searchParams;
  const q = new URLSearchParams();
  const plan = first(params.plan);
  const billing = first(params.billing);
  const item = first(params.item);
  if (plan) q.set('plan', plan);
  if (billing) q.set('billing', billing);
  if (item) q.set('item', item);
  const qs = q.toString();
  redirect(qs ? `/fusarium/launchpad/checkout?${qs}` : '/fusarium/launchpad/checkout');
}
