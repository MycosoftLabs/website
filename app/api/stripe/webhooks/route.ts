/**
 * Stripe Webhooks Handler
 * 
 * Handles all Stripe webhook events for subscriptions, payments, and billing
 */

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { getStripe } from '@/lib/stripe/server';
import { createClient } from '@supabase/supabase-js';

// Force dynamic to avoid build-time errors
export const dynamic = 'force-dynamic';

// Lazy Supabase client to avoid build-time env var issues
let _supabaseAdmin: ReturnType<typeof createClient> | null = null;

function getSupabaseAdmin() {
  if (_supabaseAdmin) return _supabaseAdmin;
  
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!url || !key) {
    throw new Error('Supabase not configured');
  }
  
  _supabaseAdmin = createClient(url, key);
  return _supabaseAdmin;
}

// Alias for easier usage
const supabaseAdmin = { get: getSupabaseAdmin };

export async function POST(request: NextRequest) {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature');
  
  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    );
  }
  
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret || webhookSecret === 'whsec_placeholder') {
    console.warn('Stripe webhook secret not configured');
    return NextResponse.json(
      { error: 'Webhook secret not configured' },
      { status: 500 }
    );
  }
  
  let event: Stripe.Event;
  
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    return NextResponse.json(
      { error: 'Webhook signature verification failed' },
      { status: 400 }
    );
  }
  
  try {
    switch (event.type) {
      // ============================================
      // CHECKOUT EVENTS
      // ============================================
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }
      
      // ============================================
      // SUBSCRIPTION EVENTS
      // ============================================
      case 'customer.subscription.created': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionCreated(subscription);
        break;
      }
      
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription);
        break;
      }
      
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }
      
      case 'customer.subscription.trial_will_end': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleTrialWillEnd(subscription);
        break;
      }
      
      // ============================================
      // INVOICE EVENTS
      // ============================================
      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaid(invoice);
        break;
      }
      
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentFailed(invoice);
        break;
      }
      
      // ============================================
      // PAYMENT EVENTS
      // ============================================
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentSucceeded(paymentIntent);
        break;
      }
      
      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentFailed(paymentIntent);
        break;
      }
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
    
    return NextResponse.json({ received: true });
    
  } catch (error) {
    console.error('Webhook handler error:', error);
    return NextResponse.json(
      { error: 'Webhook handler error' },
      { status: 500 }
    );
  }
}

// ============================================
// WEBHOOK HANDLERS
// ============================================

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.supabase_user_id;
  const type = session.metadata?.type;
  
  if (!userId) {
    console.error('No user ID in checkout session metadata');
    return;
  }
  
  if (type === 'subscription') {
    // Subscription checkout completed - handled by subscription.created event
    console.log(`Subscription checkout completed for user ${userId}`);
    
  } else if (type === 'product') {
    // Product purchase completed
    const productId = session.metadata?.product_id;
    
    // Create order record
    await getSupabaseAdmin().from('orders').insert({
      user_id: userId,
      stripe_session_id: session.id,
      stripe_payment_intent_id: session.payment_intent as string,
      product_id: productId,
      amount: session.amount_total,
      currency: session.currency,
      status: 'paid',
      shipping_address: session.shipping_details,
    });
    
    console.log(`Order created for user ${userId}, product ${productId}`);
  }
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.supabase_user_id;
  const planId = subscription.metadata?.plan_id;
  
  if (!userId) {
    // Try to get user ID from customer
    const stripe = getStripe();
    const customer = await stripe.customers.retrieve(subscription.customer as string);
    if (!customer.deleted && customer.metadata?.supabase_user_id) {
      await updateUserSubscription(customer.metadata.supabase_user_id, subscription, planId);
    }
    return;
  }
  
  await updateUserSubscription(userId, subscription, planId);
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.supabase_user_id;
  const planId = subscription.metadata?.plan_id;
  
  if (!userId) {
    const stripe = getStripe();
    const customer = await stripe.customers.retrieve(subscription.customer as string);
    if (!customer.deleted && customer.metadata?.supabase_user_id) {
      await updateUserSubscription(customer.metadata.supabase_user_id, subscription, planId);
    }
    return;
  }
  
  await updateUserSubscription(userId, subscription, planId);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.supabase_user_id;
  
  if (!userId) {
    const stripe = getStripe();
    const customer = await stripe.customers.retrieve(subscription.customer as string);
    if (!customer.deleted && customer.metadata?.supabase_user_id) {
      await downgradeToFree(customer.metadata.supabase_user_id);
    }
    return;
  }
  
  await downgradeToFree(userId);
}

async function handleTrialWillEnd(subscription: Stripe.Subscription) {
  // Send notification to user about trial ending
  const userId = subscription.metadata?.supabase_user_id;
  if (!userId) return;
  
  // Could send email or create notification
  console.log(`Trial ending soon for user ${userId}`);
  
  // You could insert a notification record here
  await getSupabaseAdmin().from('notifications').insert({
    user_id: userId,
    type: 'trial_ending',
    title: 'Your trial is ending soon',
    message: 'Your NatureOS Pro trial will end in 3 days. Add a payment method to continue.',
    read: false,
  });
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;
  
  // Record successful payment
  const stripe = getStripe();
  const customer = await stripe.customers.retrieve(customerId);
  
  if (!customer.deleted && customer.metadata?.supabase_user_id) {
    await supabaseAdmin.from('payments').insert({
      user_id: customer.metadata.supabase_user_id,
      stripe_invoice_id: invoice.id,
      stripe_payment_intent_id: invoice.payment_intent as string,
      amount: invoice.amount_paid,
      currency: invoice.currency,
      status: 'succeeded',
      description: invoice.description || 'Subscription payment',
    });
  }
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;
  
  const stripe = getStripe();
  const customer = await stripe.customers.retrieve(customerId);
  
  if (!customer.deleted && customer.metadata?.supabase_user_id) {
    const userId = customer.metadata.supabase_user_id;
    
    // Create notification about failed payment
    await supabaseAdmin.from('notifications').insert({
      user_id: userId,
      type: 'payment_failed',
      title: 'Payment Failed',
      message: 'Your payment could not be processed. Please update your payment method.',
      read: false,
    });
    
    // Record failed payment
    await supabaseAdmin.from('payments').insert({
      user_id: userId,
      stripe_invoice_id: invoice.id,
      amount: invoice.amount_due,
      currency: invoice.currency,
      status: 'failed',
      description: 'Payment failed',
    });
  }
}

async function handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  console.log(`Payment succeeded: ${paymentIntent.id}`);
  // Additional handling if needed
}

async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  console.log(`Payment failed: ${paymentIntent.id}`);
  // Additional handling if needed
}

// ============================================
// HELPER FUNCTIONS
// ============================================

async function updateUserSubscription(
  userId: string, 
  subscription: Stripe.Subscription,
  planId?: string
) {
  // Map subscription status to tier
  let tier = 'free';
  
  if (subscription.status === 'active' || subscription.status === 'trialing') {
    tier = planId?.toLowerCase() || 'pro';
  }
  
  await supabaseAdmin
    .from('profiles')
    .update({
      subscription_tier: tier,
      stripe_subscription_id: subscription.id,
      subscription_status: subscription.status,
      subscription_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    })
    .eq('id', userId);
  
  console.log(`Updated user ${userId} subscription to ${tier}`);
}

async function downgradeToFree(userId: string) {
  await supabaseAdmin
    .from('profiles')
    .update({
      subscription_tier: 'free',
      stripe_subscription_id: null,
      subscription_status: 'canceled',
    })
    .eq('id', userId);
  
  console.log(`Downgraded user ${userId} to free tier`);
}
