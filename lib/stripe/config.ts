/**
 * Stripe Configuration
 * 
 * Defines all products, prices, and billing configuration for NatureOS
 */

// Subscription Plans
export const SUBSCRIPTION_PLANS = {
  FREE: {
    id: 'free',
    name: 'Free',
    description: 'Perfect for getting started with NatureOS',
    price: {
      monthly: 0,
      annual: 0,
    },
    features: [
      '100 species identifications/month',
      '5 API calls/day',
      'Basic MINDEX access',
      'Community support',
      '1 MycoBrain device',
    ],
    limits: {
      apiCallsPerDay: 5,
      speciesIdentifications: 100,
      devices: 1,
      storageGB: 1,
      aiQueries: 10,
    },
    stripePriceId: null, // Free tier doesn't need Stripe
  },
  PRO: {
    id: 'pro',
    name: 'Pro',
    description: 'For serious mycologists and researchers',
    price: {
      monthly: 29,
      annual: 278, // 20% discount
    },
    features: [
      'Unlimited species identifications',
      '1,000 API calls/day',
      'Full MINDEX database access',
      'Priority support',
      '10 MycoBrain devices',
      'Advanced AI features',
      'CREP Dashboard access',
      'Real-time analytics',
      'Export capabilities',
    ],
    limits: {
      apiCallsPerDay: 1000,
      speciesIdentifications: -1, // Unlimited
      devices: 10,
      storageGB: 50,
      aiQueries: 500,
    },
    stripePriceId: {
      monthly: 'price_1SqiwoExoi95oZvKcua6i8hJ',
      annual: 'price_1SqiwoExoi95oZvKqJbN4ZuW',
    },
  },
  ENTERPRISE: {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'For teams and organizations',
    price: {
      monthly: 99,
      annual: 950, // 20% discount
    },
    features: [
      'Everything in Pro',
      'Unlimited API calls',
      'Unlimited devices',
      'Dedicated support',
      'Custom integrations',
      'SLA guarantee',
      'Admin dashboard',
      'Team management',
      'Audit logs',
      'SSO/SAML support',
    ],
    limits: {
      apiCallsPerDay: -1, // Unlimited
      speciesIdentifications: -1,
      devices: -1,
      storageGB: 500,
      aiQueries: -1,
    },
    stripePriceId: {
      monthly: 'price_1SqiwoExoi95oZvK0hMU8j4Z',
      annual: 'price_1SqiwoExoi95oZvKbtaEPlQd',
    },
  },
} as const;

// Hardware Products (MycoBrain Devices)
export const HARDWARE_PRODUCTS = {
  MYCOBRAIN_BASIC: {
    id: 'mycobrain-basic',
    name: 'MycoBrain Basic',
    description: 'Entry-level environmental sensor for mushroom cultivation',
    price: 149,
    features: [
      'Temperature & Humidity sensors',
      'WiFi connectivity',
      'Basic telemetry',
      'Mobile app access',
    ],
    stripePriceId: 'price_1SqiwpExoi95oZvKQRRemolb',
  },
  MYCOBRAIN_PRO: {
    id: 'mycobrain-pro',
    name: 'MycoBrain Pro',
    description: 'Advanced sensor with CO2, VOC, and air quality monitoring',
    price: 299,
    features: [
      'All Basic features',
      'CO2 monitoring',
      'VOC detection',
      'BME688 dual sensors',
      'BSEC AI gas analysis',
      'Advanced analytics',
    ],
    stripePriceId: 'price_1SqiwpExoi95oZvK36WGrmuT',
  },
  MYCOBRAIN_ENTERPRISE: {
    id: 'mycobrain-enterprise',
    name: 'MycoBrain Enterprise Pack',
    description: '5-device pack with gateway for commercial operations',
    price: 1199,
    features: [
      '5 MycoBrain Pro units',
      'Mesh networking gateway',
      'Industrial-grade sensors',
      'LoRa long-range option',
      'Priority support',
      'Custom calibration',
    ],
    stripePriceId: 'price_1SqiwpExoi95oZvKvO3DS6si',
  },
} as const;

// API Usage Pricing (pay-as-you-go beyond limits)
export const API_USAGE_PRICING = {
  SPECIES_IDENTIFICATION: {
    id: 'api-species-id',
    name: 'Species Identification',
    pricePerCall: 0.05, // $0.05 per identification
    stripeMeterEventName: 'species_identification',
  },
  AI_QUERY: {
    id: 'api-ai-query',
    name: 'AI Query (MYCA)',
    pricePerCall: 0.02, // $0.02 per AI query
    stripeMeterEventName: 'ai_query',
  },
  EMBEDDING_GENERATION: {
    id: 'api-embedding',
    name: 'Embedding Generation',
    pricePerCall: 0.001, // $0.001 per embedding
    stripeMeterEventName: 'embedding_generation',
  },
  TELEMETRY_INGESTION: {
    id: 'api-telemetry',
    name: 'Telemetry Data Point',
    pricePerCall: 0.0001, // $0.0001 per data point
    stripeMeterEventName: 'telemetry_ingestion',
  },
} as const;

// Premium Features (one-time unlocks or add-ons)
export const PREMIUM_FEATURES = {
  CREP_DASHBOARD: {
    id: 'feature-crep',
    name: 'CREP Intelligence Dashboard',
    description: 'Real-time global situational awareness',
    price: 49, // One-time unlock or included in Pro+
    stripePriceId: 'price_1SqiwqExoi95oZvKyHcmNjLw',
  },
  AI_STUDIO: {
    id: 'feature-ai-studio',
    name: 'AI Studio Access',
    description: 'Train custom models on your data',
    price: 99,
    stripePriceId: 'price_1SqiwqExoi95oZvK2XtSbXBi',
  },
  DRONE_CONTROL: {
    id: 'feature-drone',
    name: 'Drone Control Module',
    description: 'Aerial monitoring and mapping',
    price: 199,
    stripePriceId: 'price_feature_drone',
  },
} as const;

export type SubscriptionPlanId = keyof typeof SUBSCRIPTION_PLANS;
export type HardwareProductId = keyof typeof HARDWARE_PRODUCTS;
export type ApiUsageType = keyof typeof API_USAGE_PRICING;
export type PremiumFeatureId = keyof typeof PREMIUM_FEATURES;
