/**
 * API Usage Tracking
 * 
 * Records API usage for metered billing
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { API_USAGE_PRICING } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get auth header for API key authentication
    const authHeader = request.headers.get('authorization');
    let userId: string | null = null;
    
    if (authHeader?.startsWith('Bearer ')) {
      // Verify user session
      const { data: { user }, error } = await supabase.auth.getUser();
      if (!error && user) {
        userId = user.id;
      }
    }
    
    // Also check for API key authentication
    const apiKey = request.headers.get('x-api-key');
    if (apiKey && !userId) {
      // Look up user by API key
      const { data: apiKeyData } = await supabase
        .from('api_keys')
        .select('user_id')
        .eq('key', apiKey)
        .eq('active', true)
        .single();
      
      if (apiKeyData) {
        userId = apiKeyData.user_id;
      }
    }
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    const { usageType, quantity = 1, metadata } = body;
    
    // Validate usage type
    if (!usageType || !Object.keys(API_USAGE_PRICING).includes(usageType)) {
      return NextResponse.json(
        { error: 'Invalid usage type' },
        { status: 400 }
      );
    }
    
    // Get user's subscription tier to check limits
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier, stripe_customer_id')
      .eq('id', userId)
      .single();
    
    const tier = profile?.subscription_tier || 'free';
    
    // Get current month usage
    const { data: currentUsage } = await supabase
      .rpc('get_user_monthly_usage', { 
        p_user_id: userId, 
        p_usage_type: usageType 
      });
    
    const currentCount = currentUsage?.[0]?.total_count || 0;
    
    // Check if user has exceeded limits based on tier
    const limits: Record<string, Record<string, number>> = {
      free: {
        SPECIES_IDENTIFICATION: 100,
        AI_QUERY: 10,
        EMBEDDING_GENERATION: 50,
        TELEMETRY_INGESTION: 1000,
        ENTITY_SEARCH: 200,
        MEMORY_OPERATIONS: 500
      },
      pro: {
        SPECIES_IDENTIFICATION: 10000,
        AI_QUERY: 500,
        EMBEDDING_GENERATION: 5000,
        TELEMETRY_INGESTION: 100000,
        ENTITY_SEARCH: 10000,
        MEMORY_OPERATIONS: 50000
      },
      enterprise: {} // Unlimited
    };
    
    const tierLimits = limits[tier as keyof typeof limits] || {};
    const limit = tierLimits[usageType as keyof typeof tierLimits];
    
    if (limit && currentCount + quantity > limit) {
      return NextResponse.json(
        { 
          error: 'Usage limit exceeded',
          limit,
          current: currentCount,
          requested: quantity,
          upgrade_url: '/pricing'
        },
        { status: 429 }
      );
    }
    
    // Record usage
    const { error: insertError } = await supabase
      .from('api_usage')
      .insert({
        user_id: userId,
        usage_type: usageType,
        quantity,
        metadata,
      });
    
    if (insertError) {
      throw insertError;
    }
    
    return NextResponse.json({
      success: true,
      usage: {
        type: usageType,
        quantity,
        total_this_month: currentCount + quantity,
      },
    });
    
  } catch (error) {
    console.error('Usage tracking error:', error);
    return NextResponse.json(
      { error: 'Failed to track usage' },
      { status: 500 }
    );
  }
}

// Get current usage stats
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
    
    // Get all usage for current month
    const { data: usage } = await supabase
      .rpc('get_user_monthly_usage', { p_user_id: user.id });
    
    // Get user's tier and limits
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .single();
    
    const tier = profile?.subscription_tier || 'free';
    
    // Build usage response with limits
    const usageWithLimits = Object.entries(API_USAGE_PRICING).map(([key, config]) => {
      const used = usage?.find((u: { usage_type: string }) => u.usage_type === key)?.total_count || 0;
      
      // Get limit based on tier
      let limit = -1; // Unlimited
      if (tier === 'free') {
        switch (key) {
          case 'SPECIES_IDENTIFICATION': limit = 100; break;
          case 'AI_QUERY': limit = 10; break;
          case 'EMBEDDING_GENERATION': limit = 50; break;
          case 'TELEMETRY_INGESTION': limit = 1000; break;
        }
      } else if (tier === 'pro') {
        switch (key) {
          case 'AI_QUERY': limit = 500; break;
          case 'TELEMETRY_INGESTION': limit = 100000; break;
        }
      }
      
      return {
        type: key,
        name: config.name,
        used,
        limit,
        unlimited: limit === -1,
        percentUsed: limit > 0 ? Math.round((used / limit) * 100) : 0,
      };
    });
    
    return NextResponse.json({
      tier,
      usage: usageWithLimits,
      billingPeriod: {
        start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(),
        end: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString(),
      },
    });
    
  } catch (error) {
    console.error('Usage fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch usage' },
      { status: 500 }
    );
  }
}
