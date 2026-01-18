/**
 * Setup Stripe Products
 * 
 * Creates all NatureOS products and prices in Stripe
 * Run with: npx tsx scripts/setup-stripe-products.ts
 */

import Stripe from 'stripe';
import * as fs from 'fs';
import * as path from 'path';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

if (!STRIPE_SECRET_KEY) {
  console.error('❌ STRIPE_SECRET_KEY environment variable is required');
  console.log('Set it with: $env:STRIPE_SECRET_KEY="your_key"');
  process.exit(1);
}

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
});

interface CreatedPrice {
  productId: string;
  priceId: string;
  name: string;
  type: string;
}

const createdPrices: CreatedPrice[] = [];

async function createSubscriptionProducts() {
  console.log('\n📦 Creating Subscription Products...\n');
  
  // Pro Plan
  console.log('Creating Pro subscription...');
  const proProduct = await stripe.products.create({
    name: 'NatureOS Pro',
    description: 'For serious mycologists and researchers. Includes unlimited species identifications, 1,000 API calls/day, full MINDEX access, priority support, and CREP Dashboard.',
    metadata: {
      tier: 'pro',
    },
  });
  
  const proMonthly = await stripe.prices.create({
    product: proProduct.id,
    unit_amount: 2900, // $29.00
    currency: 'usd',
    recurring: { interval: 'month' },
    metadata: { plan: 'pro', period: 'monthly' },
  });
  
  const proAnnual = await stripe.prices.create({
    product: proProduct.id,
    unit_amount: 27800, // $278.00 (20% off)
    currency: 'usd',
    recurring: { interval: 'year' },
    metadata: { plan: 'pro', period: 'annual' },
  });
  
  console.log(`  ✅ Pro Product: ${proProduct.id}`);
  console.log(`     Monthly: ${proMonthly.id} ($29/mo)`);
  console.log(`     Annual: ${proAnnual.id} ($278/yr)`);
  
  createdPrices.push(
    { productId: proProduct.id, priceId: proMonthly.id, name: 'Pro Monthly', type: 'subscription' },
    { productId: proProduct.id, priceId: proAnnual.id, name: 'Pro Annual', type: 'subscription' },
  );
  
  // Enterprise Plan
  console.log('Creating Enterprise subscription...');
  const enterpriseProduct = await stripe.products.create({
    name: 'NatureOS Enterprise',
    description: 'For teams and organizations. Everything in Pro plus unlimited API calls, unlimited devices, dedicated support, team management, custom integrations, and SLA guarantee.',
    metadata: {
      tier: 'enterprise',
    },
  });
  
  const enterpriseMonthly = await stripe.prices.create({
    product: enterpriseProduct.id,
    unit_amount: 9900, // $99.00
    currency: 'usd',
    recurring: { interval: 'month' },
    metadata: { plan: 'enterprise', period: 'monthly' },
  });
  
  const enterpriseAnnual = await stripe.prices.create({
    product: enterpriseProduct.id,
    unit_amount: 95000, // $950.00 (20% off)
    currency: 'usd',
    recurring: { interval: 'year' },
    metadata: { plan: 'enterprise', period: 'annual' },
  });
  
  console.log(`  ✅ Enterprise Product: ${enterpriseProduct.id}`);
  console.log(`     Monthly: ${enterpriseMonthly.id} ($99/mo)`);
  console.log(`     Annual: ${enterpriseAnnual.id} ($950/yr)`);
  
  createdPrices.push(
    { productId: enterpriseProduct.id, priceId: enterpriseMonthly.id, name: 'Enterprise Monthly', type: 'subscription' },
    { productId: enterpriseProduct.id, priceId: enterpriseAnnual.id, name: 'Enterprise Annual', type: 'subscription' },
  );
  
  return {
    pro: { monthly: proMonthly.id, annual: proAnnual.id },
    enterprise: { monthly: enterpriseMonthly.id, annual: enterpriseAnnual.id },
  };
}

async function createHardwareProducts() {
  console.log('\n📦 Creating Hardware Products...\n');
  
  // MycoBrain Basic
  console.log('Creating MycoBrain Basic...');
  const basicProduct = await stripe.products.create({
    name: 'MycoBrain Basic',
    description: 'Entry-level environmental sensor for mushroom cultivation. Includes temperature & humidity sensors, WiFi connectivity, and mobile app access.',
    images: ['https://mycosoft.com/images/mycobrain-basic.png'],
    metadata: {
      type: 'hardware',
      sku: 'MYCOBRAIN-BASIC',
    },
  });
  
  const basicPrice = await stripe.prices.create({
    product: basicProduct.id,
    unit_amount: 14900, // $149.00
    currency: 'usd',
  });
  
  console.log(`  ✅ MycoBrain Basic: ${basicProduct.id}`);
  console.log(`     Price: ${basicPrice.id} ($149)`);
  
  createdPrices.push(
    { productId: basicProduct.id, priceId: basicPrice.id, name: 'MycoBrain Basic', type: 'hardware' },
  );
  
  // MycoBrain Pro
  console.log('Creating MycoBrain Pro...');
  const proProduct = await stripe.products.create({
    name: 'MycoBrain Pro',
    description: 'Advanced sensor with CO2, VOC, and air quality monitoring. Features dual BME688 sensors with BSEC AI gas analysis.',
    images: ['https://mycosoft.com/images/mycobrain-pro.png'],
    metadata: {
      type: 'hardware',
      sku: 'MYCOBRAIN-PRO',
    },
  });
  
  const proPrice = await stripe.prices.create({
    product: proProduct.id,
    unit_amount: 29900, // $299.00
    currency: 'usd',
  });
  
  console.log(`  ✅ MycoBrain Pro: ${proProduct.id}`);
  console.log(`     Price: ${proPrice.id} ($299)`);
  
  createdPrices.push(
    { productId: proProduct.id, priceId: proPrice.id, name: 'MycoBrain Pro', type: 'hardware' },
  );
  
  // MycoBrain Enterprise Pack
  console.log('Creating MycoBrain Enterprise Pack...');
  const enterpriseProduct = await stripe.products.create({
    name: 'MycoBrain Enterprise Pack',
    description: '5-device pack with gateway for commercial operations. Includes mesh networking, industrial-grade sensors, and priority support.',
    images: ['https://mycosoft.com/images/mycobrain-enterprise.png'],
    metadata: {
      type: 'hardware',
      sku: 'MYCOBRAIN-ENTERPRISE',
    },
  });
  
  const enterprisePrice = await stripe.prices.create({
    product: enterpriseProduct.id,
    unit_amount: 119900, // $1,199.00
    currency: 'usd',
  });
  
  console.log(`  ✅ MycoBrain Enterprise Pack: ${enterpriseProduct.id}`);
  console.log(`     Price: ${enterprisePrice.id} ($1,199)`);
  
  createdPrices.push(
    { productId: enterpriseProduct.id, priceId: enterprisePrice.id, name: 'MycoBrain Enterprise Pack', type: 'hardware' },
  );
  
  return {
    basic: basicPrice.id,
    pro: proPrice.id,
    enterprise: enterprisePrice.id,
  };
}

async function createPremiumFeatures() {
  console.log('\n📦 Creating Premium Feature Products...\n');
  
  // CREP Dashboard
  console.log('Creating CREP Dashboard...');
  const crepProduct = await stripe.products.create({
    name: 'CREP Intelligence Dashboard',
    description: 'Real-time global situational awareness. Access the Common Relevant Environmental Picture dashboard.',
    metadata: {
      type: 'feature',
      feature_key: 'crep_dashboard',
    },
  });
  
  const crepPrice = await stripe.prices.create({
    product: crepProduct.id,
    unit_amount: 4900, // $49.00
    currency: 'usd',
  });
  
  console.log(`  ✅ CREP Dashboard: ${crepProduct.id}`);
  console.log(`     Price: ${crepPrice.id} ($49)`);
  
  createdPrices.push(
    { productId: crepProduct.id, priceId: crepPrice.id, name: 'CREP Dashboard', type: 'feature' },
  );
  
  // AI Studio
  console.log('Creating AI Studio...');
  const aiStudioProduct = await stripe.products.create({
    name: 'AI Studio Access',
    description: 'Train custom models on your data. Advanced AI tools for species identification and environmental analysis.',
    metadata: {
      type: 'feature',
      feature_key: 'ai_studio',
    },
  });
  
  const aiStudioPrice = await stripe.prices.create({
    product: aiStudioProduct.id,
    unit_amount: 9900, // $99.00
    currency: 'usd',
  });
  
  console.log(`  ✅ AI Studio: ${aiStudioProduct.id}`);
  console.log(`     Price: ${aiStudioPrice.id} ($99)`);
  
  createdPrices.push(
    { productId: aiStudioProduct.id, priceId: aiStudioPrice.id, name: 'AI Studio', type: 'feature' },
  );
  
  return {
    crep: crepPrice.id,
    aiStudio: aiStudioPrice.id,
  };
}

async function updateConfigFile(subscriptionPrices: any, hardwarePrices: any, featurePrices: any) {
  console.log('\n📝 Generating updated config...\n');
  
  const configUpdate = `
// ====================================
// STRIPE PRICE IDS - AUTO-GENERATED
// Generated: ${new Date().toISOString()}
// ====================================

// Update lib/stripe/config.ts with these values:

export const STRIPE_PRICE_IDS = {
  // Subscriptions
  PRO: {
    monthly: '${subscriptionPrices.pro.monthly}',
    annual: '${subscriptionPrices.pro.annual}',
  },
  ENTERPRISE: {
    monthly: '${subscriptionPrices.enterprise.monthly}',
    annual: '${subscriptionPrices.enterprise.annual}',
  },
  
  // Hardware
  MYCOBRAIN_BASIC: '${hardwarePrices.basic}',
  MYCOBRAIN_PRO: '${hardwarePrices.pro}',
  MYCOBRAIN_ENTERPRISE: '${hardwarePrices.enterprise}',
  
  // Features
  CREP_DASHBOARD: '${featurePrices.crep}',
  AI_STUDIO: '${featurePrices.aiStudio}',
};
`;
  
  // Save to file
  const outputPath = path.join(__dirname, 'stripe-price-ids.ts');
  fs.writeFileSync(outputPath, configUpdate);
  console.log(`✅ Saved price IDs to: ${outputPath}`);
  
  console.log('\n📋 Created Products Summary:');
  console.log('─'.repeat(60));
  createdPrices.forEach(p => {
    console.log(`  ${p.type.padEnd(12)} | ${p.name.padEnd(25)} | ${p.priceId}`);
  });
  console.log('─'.repeat(60));
}

async function main() {
  console.log('🚀 NatureOS Stripe Products Setup');
  console.log('==================================\n');
  
  try {
    // Check Stripe connection
    const account = await stripe.accounts.retrieve();
    console.log(`✅ Connected to Stripe: ${account.business_profile?.name || account.id}`);
    console.log(`   Mode: ${STRIPE_SECRET_KEY.startsWith('sk_live') ? '🔴 LIVE' : '🟢 TEST'}`);
    
    const subscriptionPrices = await createSubscriptionProducts();
    const hardwarePrices = await createHardwareProducts();
    const featurePrices = await createPremiumFeatures();
    
    await updateConfigFile(subscriptionPrices, hardwarePrices, featurePrices);
    
    console.log('\n✅ Setup complete! Update lib/stripe/config.ts with the generated price IDs.\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

main();
