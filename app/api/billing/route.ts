/**
 * Billing API
 * 
 * Get billing information, invoices, and subscription details
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { 
  getUserSubscription, 
  getCustomerInvoices, 
  getUpcomingInvoice,
  SUBSCRIPTION_PLANS 
} from '@/lib/stripe';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Get profile with Stripe info
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id, subscription_tier, subscription_status, subscription_period_end')
      .eq('id', user.id)
      .single();
    
    if (!profile?.stripe_customer_id) {
      // No Stripe customer - return free tier info
      return NextResponse.json({
        subscription: null,
        tier: 'free',
        plan: SUBSCRIPTION_PLANS.FREE,
        invoices: [],
        upcomingInvoice: null,
      });
    }
    
    // Get subscription details from Stripe
    const subscription = await getUserSubscription(profile.stripe_customer_id);
    const invoices = await getCustomerInvoices(profile.stripe_customer_id);
    const upcomingInvoice = await getUpcomingInvoice(profile.stripe_customer_id);
    
    // Map tier to plan
    const tier = profile.subscription_tier || 'free';
    const plan = SUBSCRIPTION_PLANS[tier.toUpperCase() as keyof typeof SUBSCRIPTION_PLANS] || SUBSCRIPTION_PLANS.FREE;
    
    return NextResponse.json({
      subscription: subscription ? {
        id: subscription.id,
        status: subscription.status,
        currentPeriodStart: new Date(subscription.current_period_start * 1000).toISOString(),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        trialEnd: subscription.trial_end 
          ? new Date(subscription.trial_end * 1000).toISOString() 
          : null,
      } : null,
      tier,
      plan,
      invoices: invoices.map(inv => ({
        id: inv.id,
        number: inv.number,
        amount: inv.amount_paid,
        currency: inv.currency,
        status: inv.status,
        created: new Date(inv.created * 1000).toISOString(),
        pdfUrl: inv.invoice_pdf,
        hostedUrl: inv.hosted_invoice_url,
      })),
      upcomingInvoice: upcomingInvoice ? {
        amount: upcomingInvoice.amount_due,
        currency: upcomingInvoice.currency,
        dueDate: upcomingInvoice.due_date 
          ? new Date(upcomingInvoice.due_date * 1000).toISOString() 
          : null,
      } : null,
    });
    
  } catch (error) {
    console.error('Billing fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch billing info' },
      { status: 500 }
    );
  }
}
