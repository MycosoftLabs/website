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
  SUBSCRIPTION_PLANS,
  type SubscriptionPlanId 
} from '@/lib/stripe';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    const { type, planId, productId, quantity, billingPeriod, addonId } = body;
    
    const origin = request.headers.get('origin') || 'http://localhost:3001';
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
      
    } else if (type === 'agent_worldstate') {
      // Agent live worldstate access — prepaid minutes at $1/min (MYCA/AVANI)
      const minutes = body.minutes === 60 ? 60 : 60; // only 60-min pack supported for launch
      const { sessionId, url } = await createAgentWorldstateCheckout({
        userId: user.id,
        email: user.email!,
        minutes,
        successUrl: `${origin}/agent?success=1`,
        cancelUrl: `${origin}/agent`,
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
