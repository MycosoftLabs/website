/**
 * Client-side Stripe utilities
 * 
 * Use this in React components for Stripe Elements and checkout
 */

import { loadStripe, Stripe } from '@stripe/stripe-js';

let stripePromise: Promise<Stripe | null> | null = null;

export function getStripeClient(): Promise<Stripe | null> {
  if (!stripePromise) {
    const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    if (!key || key === 'pk_test_placeholder') {
      console.warn('Stripe publishable key not configured');
      return Promise.resolve(null);
    }
    stripePromise = loadStripe(key);
  }
  return stripePromise;
}

// Redirect to Stripe Checkout
export async function redirectToCheckout(sessionId: string): Promise<void> {
  const stripe = await getStripeClient();
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }
  
  const { error } = await stripe.redirectToCheckout({ sessionId });
  if (error) {
    throw error;
  }
}

// Redirect to customer portal
export async function redirectToPortal(portalUrl: string): Promise<void> {
  window.location.href = portalUrl;
}
