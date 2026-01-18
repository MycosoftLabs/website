/**
 * Stripe Billing Utilities
 * 
 * Core billing logic for subscriptions, products, and usage metering
 */

import { getStripe } from './server';
import { createClient } from '@/lib/supabase/server';
import { 
  SUBSCRIPTION_PLANS, 
  HARDWARE_PRODUCTS, 
  API_USAGE_PRICING,
  type SubscriptionPlanId 
} from './config';
import type Stripe from 'stripe';

// ============================================
// CUSTOMER MANAGEMENT
// ============================================

/**
 * Get or create a Stripe customer for a user
 */
export async function getOrCreateCustomer(userId: string, email: string, name?: string): Promise<string> {
  const stripe = getStripe();
  const supabase = await createClient();
  
  // Check if user already has a Stripe customer ID
  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', userId)
    .single();
  
  if (profile?.stripe_customer_id) {
    return profile.stripe_customer_id;
  }
  
  // Create new Stripe customer
  const customer = await stripe.customers.create({
    email,
    name: name || undefined,
    metadata: {
      supabase_user_id: userId,
    },
  });
  
  // Save customer ID to profile
  await supabase
    .from('profiles')
    .update({ stripe_customer_id: customer.id })
    .eq('id', userId);
  
  return customer.id;
}

// ============================================
// SUBSCRIPTION CHECKOUT
// ============================================

interface CreateSubscriptionCheckoutParams {
  userId: string;
  email: string;
  planId: SubscriptionPlanId;
  billingPeriod: 'monthly' | 'annual';
  successUrl: string;
  cancelUrl: string;
}

/**
 * Create a Stripe Checkout session for subscription
 */
export async function createSubscriptionCheckout({
  userId,
  email,
  planId,
  billingPeriod,
  successUrl,
  cancelUrl,
}: CreateSubscriptionCheckoutParams): Promise<{ sessionId: string; url: string }> {
  const stripe = getStripe();
  
  const plan = SUBSCRIPTION_PLANS[planId];
  if (!plan || planId === 'FREE') {
    throw new Error('Invalid plan or free plan selected');
  }
  
  const customerId = await getOrCreateCustomer(userId, email);
  
  // Get the price ID for the selected plan and billing period
  const priceId = plan.stripePriceId?.[billingPeriod];
  if (!priceId) {
    throw new Error('Price not configured for this plan');
  }
  
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: cancelUrl,
    subscription_data: {
      metadata: {
        supabase_user_id: userId,
        plan_id: planId,
      },
      trial_period_days: 14, // 14-day free trial
    },
    metadata: {
      supabase_user_id: userId,
      type: 'subscription',
      plan_id: planId,
    },
    allow_promotion_codes: true,
  });
  
  return {
    sessionId: session.id,
    url: session.url!,
  };
}

// ============================================
// PRODUCT CHECKOUT (One-time purchases)
// ============================================

interface CreateProductCheckoutParams {
  userId: string;
  email: string;
  productId: string;
  quantity: number;
  successUrl: string;
  cancelUrl: string;
  shippingRequired?: boolean;
}

/**
 * Create a Stripe Checkout session for product purchase
 */
export async function createProductCheckout({
  userId,
  email,
  productId,
  quantity,
  successUrl,
  cancelUrl,
  shippingRequired = true,
}: CreateProductCheckoutParams): Promise<{ sessionId: string; url: string }> {
  const stripe = getStripe();
  
  // Find the product
  const product = Object.values(HARDWARE_PRODUCTS).find(p => p.id === productId);
  if (!product) {
    throw new Error('Product not found');
  }
  
  const customerId = await getOrCreateCustomer(userId, email);
  
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [
      {
        price: product.stripePriceId,
        quantity,
      },
    ],
    success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: cancelUrl,
    shipping_address_collection: shippingRequired ? {
      allowed_countries: ['US', 'CA', 'GB', 'AU', 'DE', 'FR', 'NL', 'BE', 'AT', 'CH'],
    } : undefined,
    metadata: {
      supabase_user_id: userId,
      type: 'product',
      product_id: productId,
    },
    allow_promotion_codes: true,
  });
  
  return {
    sessionId: session.id,
    url: session.url!,
  };
}

// ============================================
// CUSTOMER PORTAL
// ============================================

/**
 * Create a Stripe Customer Portal session
 */
export async function createPortalSession(
  customerId: string,
  returnUrl: string
): Promise<{ url: string }> {
  const stripe = getStripe();
  
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
  
  return { url: session.url };
}

// ============================================
// USAGE METERING
// ============================================

/**
 * Record API usage for metered billing
 */
export async function recordApiUsage(
  customerId: string,
  usageType: keyof typeof API_USAGE_PRICING,
  quantity: number = 1,
  timestamp?: Date
): Promise<void> {
  const stripe = getStripe();
  
  const usage = API_USAGE_PRICING[usageType];
  if (!usage) {
    throw new Error('Invalid usage type');
  }
  
  // Get the customer's active subscription with metered component
  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: 'active',
    limit: 1,
  });
  
  if (subscriptions.data.length === 0) {
    // No subscription - this usage might be pay-as-you-go or should be blocked
    console.warn(`No active subscription for customer ${customerId}`);
    return;
  }
  
  const subscription = subscriptions.data[0];
  
  // Find the metered subscription item
  const meteredItem = subscription.items.data.find(item => {
    // Check if this is a metered price
    return item.price.recurring?.usage_type === 'metered';
  });
  
  if (meteredItem) {
    await stripe.subscriptionItems.createUsageRecord(meteredItem.id, {
      quantity,
      timestamp: timestamp ? Math.floor(timestamp.getTime() / 1000) : 'now',
      action: 'increment',
    });
  }
}

// ============================================
// SUBSCRIPTION MANAGEMENT
// ============================================

/**
 * Get user's current subscription
 */
export async function getUserSubscription(customerId: string): Promise<Stripe.Subscription | null> {
  const stripe = getStripe();
  
  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: 'all',
    limit: 1,
    expand: ['data.default_payment_method'],
  });
  
  return subscriptions.data[0] || null;
}

/**
 * Cancel a subscription
 */
export async function cancelSubscription(
  subscriptionId: string,
  cancelAtPeriodEnd: boolean = true
): Promise<Stripe.Subscription> {
  const stripe = getStripe();
  
  if (cancelAtPeriodEnd) {
    return stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });
  }
  
  return stripe.subscriptions.cancel(subscriptionId);
}

/**
 * Resume a cancelled subscription
 */
export async function resumeSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
  const stripe = getStripe();
  
  return stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: false,
  });
}

/**
 * Change subscription plan
 */
export async function changeSubscriptionPlan(
  subscriptionId: string,
  newPriceId: string
): Promise<Stripe.Subscription> {
  const stripe = getStripe();
  
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  
  return stripe.subscriptions.update(subscriptionId, {
    items: [
      {
        id: subscription.items.data[0].id,
        price: newPriceId,
      },
    ],
    proration_behavior: 'create_prorations',
  });
}

// ============================================
// INVOICE MANAGEMENT
// ============================================

/**
 * Get customer's invoices
 */
export async function getCustomerInvoices(
  customerId: string,
  limit: number = 10
): Promise<Stripe.Invoice[]> {
  const stripe = getStripe();
  
  const invoices = await stripe.invoices.list({
    customer: customerId,
    limit,
  });
  
  return invoices.data;
}

/**
 * Get upcoming invoice
 */
export async function getUpcomingInvoice(customerId: string): Promise<Stripe.UpcomingInvoice | null> {
  const stripe = getStripe();
  
  try {
    return await stripe.invoices.retrieveUpcoming({
      customer: customerId,
    });
  } catch (error) {
    // No upcoming invoice (e.g., no active subscription)
    return null;
  }
}
