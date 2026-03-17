/**
 * Stripe Checkout API
 * 
 * Creates checkout sessions for subscriptions and products
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { 
  createSubscriptionCheckout, 
  createProductCheckout,
  createPersonaPlexCheckout,
  createAgentWorldstateCheckout,
  createGuestAgentWorldstateCheckout,
  SUBSCRIPTION_PLANS,
  type SubscriptionPlanId 
} from '@/lib/stripe';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, planId, productId, quantity, billingPeriod, addonId } = body;
    
    const origin = request.headers.get('origin') || 'http://localhost:3001';
    
    // ---- Agent worldstate: allow guest (unauthenticated) checkout ----
    // Stripe collects email at checkout; no account required.
    if (type === 'agent_worldstate') {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        // Authenticated user — use their profile for Stripe customer
        const requestedMinutes = typeof body.minutes === 'number' ? body.minutes : 1;
        const minutes = requestedMinutes === 60 ? 60 : 1;
        const { sessionId, url } = await createAgentWorldstateCheckout({
          userId: user.id,
          email: user.email!,
          minutes,
          successUrl: `${origin}/agent?success=1`,
          cancelUrl: `${origin}/agent`,
        });
        return NextResponse.json({ sessionId, url });
      } else {
        // Guest checkout — Stripe collects email, no login needed
        const requestedMinutes = typeof body.minutes === 'number' ? body.minutes : 1;
        const minutes = requestedMinutes === 60 ? 60 : 1;
        const { sessionId, url } = await createGuestAgentWorldstateCheckout({
          minutes,
          successUrl: `${origin}/agent?success=1`,
          cancelUrl: `${origin}/agent`,
        });
        return NextResponse.json({ sessionId, url });
      }
    }

    // ---- All other checkout types require authentication ----
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const successUrl = `${origin}/billing/success`;
    const cancelUrl = `${origin}/pricing`;
    
    if (type === 'subscription') {
      // Subscription checkout
      if (!planId || !billingPeriod) {
        return NextResponse.json(
          { error: 'planId and billingPeriod are required' },
          { status: 400 }
        );
      }
      
      if (planId === 'FREE') {
        return NextResponse.json(
          { error: 'Cannot checkout free plan' },
          { status: 400 }
        );
      }
      
      if (!Object.keys(SUBSCRIPTION_PLANS).includes(planId)) {
        return NextResponse.json(
          { error: 'Invalid plan' },
          { status: 400 }
        );
      }
      
      const { sessionId, url } = await createSubscriptionCheckout({
        userId: user.id,
        email: user.email!,
        planId: planId as SubscriptionPlanId,
        billingPeriod,
        successUrl,
        cancelUrl,
      });
      
      return NextResponse.json({ sessionId, url });
      
    } else if (type === 'addon') {
      // Add-on subscription (e.g. PersonaPlex Voice $29/mo)
      if (addonId !== 'personaplex_voice') {
        return NextResponse.json(
          { error: 'Unknown addon. Supported: personaplex_voice' },
          { status: 400 }
        );
      }
      const { sessionId, url } = await createPersonaPlexCheckout({
        userId: user.id,
        email: user.email!,
        successUrl: `${origin}/billing/success`,
        cancelUrl: `${origin}/pricing`,
      });
      return NextResponse.json({ sessionId, url });
      
    } else if (type === 'product') {
      // Product checkout (hardware purchase)
      if (!productId) {
        return NextResponse.json(
          { error: 'productId is required' },
          { status: 400 }
        );
      }
      
      const { sessionId, url } = await createProductCheckout({
        userId: user.id,
        email: user.email!,
        productId,
        quantity: quantity || 1,
        successUrl: `${origin}/orders/success`,
        cancelUrl: `${origin}/shop`,
      });
      
      return NextResponse.json({ sessionId, url });
      
    } else {
      return NextResponse.json(
        { error: 'Invalid checkout type. Must be "subscription", "product", "addon", or "agent_worldstate"' },
        { status: 400 }
      );
    }
    
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Checkout failed' },
      { status: 500 }
    );
  }
}