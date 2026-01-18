# Stripe Payment Integration

**Created:** January 17, 2026  
**Status:** ✅ Complete

## Overview

Full Stripe payment integration for NatureOS including:
- Subscription billing (Free, Pro, Enterprise tiers)
- Hardware sales (MycoBrain devices)
- API usage metering
- Customer portal
- Webhook handling

## Configuration

### Environment Variables

Add these to `.env.local`:

```env
# Stripe Keys
STRIPE_SECRET_KEY=rk_test_51Sqidz...  # Your secret key (starts with sk_ or rk_)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...  # Publishable key
STRIPE_WEBHOOK_SECRET=whsec_...  # Webhook signing secret
```

### Getting Webhook Secret

1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://yourdomain.com/api/stripe/webhooks`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `customer.subscription.trial_will_end`
   - `invoice.paid`
   - `invoice.payment_failed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
4. Copy the signing secret to `STRIPE_WEBHOOK_SECRET`

## Stripe Products Setup

You need to create these products/prices in Stripe Dashboard:

### Subscription Products

| Product | Monthly Price ID | Annual Price ID |
|---------|-----------------|-----------------|
| Pro | `price_pro_monthly` ($29/mo) | `price_pro_annual` ($278/yr) |
| Enterprise | `price_enterprise_monthly` ($99/mo) | `price_enterprise_annual` ($950/yr) |

### Hardware Products

| Product | Price ID | Amount |
|---------|----------|--------|
| MycoBrain Basic | `price_mycobrain_basic` | $149 |
| MycoBrain Pro | `price_mycobrain_pro` | $299 |
| MycoBrain Enterprise Pack | `price_mycobrain_enterprise` | $1,199 |

### Creating Products via Stripe Dashboard

1. Go to Products → Add Product
2. Set name and description
3. Add pricing (recurring for subscriptions, one-time for hardware)
4. Copy the Price ID and update `lib/stripe/config.ts`

### Creating Products via API

```typescript
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Create Pro subscription
const proProduct = await stripe.products.create({
  name: 'NatureOS Pro',
  description: 'For serious mycologists and researchers',
});

const proMonthly = await stripe.prices.create({
  product: proProduct.id,
  unit_amount: 2900, // $29.00
  currency: 'usd',
  recurring: { interval: 'month' },
});

const proAnnual = await stripe.prices.create({
  product: proProduct.id,
  unit_amount: 27800, // $278.00
  currency: 'usd',
  recurring: { interval: 'year' },
});
```

## API Endpoints

### Checkout

```
POST /api/stripe/checkout
```

**Request:**
```json
{
  "type": "subscription",
  "planId": "PRO",
  "billingPeriod": "monthly"
}
```

or

```json
{
  "type": "product",
  "productId": "mycobrain-pro",
  "quantity": 1
}
```

**Response:**
```json
{
  "sessionId": "cs_...",
  "url": "https://checkout.stripe.com/..."
}
```

### Customer Portal

```
POST /api/stripe/portal
```

**Response:**
```json
{
  "url": "https://billing.stripe.com/..."
}
```

### Billing Info

```
GET /api/billing
```

**Response:**
```json
{
  "subscription": {
    "id": "sub_...",
    "status": "active",
    "currentPeriodEnd": "2026-02-17T00:00:00Z"
  },
  "tier": "pro",
  "invoices": [...],
  "upcomingInvoice": {...}
}
```

### Usage Tracking

```
POST /api/usage/track
```

**Request:**
```json
{
  "usageType": "SPECIES_IDENTIFICATION",
  "quantity": 1
}
```

```
GET /api/usage/track
```

**Response:**
```json
{
  "tier": "pro",
  "usage": [
    {
      "type": "SPECIES_IDENTIFICATION",
      "name": "Species Identification",
      "used": 45,
      "limit": -1,
      "unlimited": true
    }
  ]
}
```

## Database Schema

The following tables are created for billing:

### profiles (updated)
- `stripe_customer_id` - Stripe customer ID
- `stripe_subscription_id` - Active subscription ID
- `subscription_status` - active, trialing, canceled, etc.
- `subscription_period_end` - When current period ends

### orders
- For hardware purchases
- Tracks order status, shipping, etc.

### payments
- Payment history
- Links to Stripe invoices

### api_usage
- Tracks API usage per user
- Used for metered billing and limits

### notifications
- Payment-related notifications
- Trial ending, payment failed, etc.

## Frontend Components

### Pages

- `/pricing` - Pricing page with checkout
- `/billing` - Billing dashboard
- `/billing/success` - Subscription success page
- `/shop` - Hardware store
- `/orders/success` - Order success page

### Key Files

```
lib/stripe/
├── config.ts     # Products, prices, and limits
├── server.ts     # Server-side Stripe client
├── client.ts     # Client-side utilities
├── billing.ts    # Core billing functions
└── index.ts      # Exports

app/api/stripe/
├── checkout/route.ts  # Checkout sessions
├── portal/route.ts    # Customer portal
└── webhooks/route.ts  # Webhook handler

app/api/usage/
└── track/route.ts     # Usage tracking

app/api/
└── billing/route.ts   # Billing info
```

## Testing

### Test Cards

| Card | Number | Result |
|------|--------|--------|
| Visa (Success) | 4242 4242 4242 4242 | Succeeds |
| Visa (Decline) | 4000 0000 0000 0002 | Declined |
| 3D Secure | 4000 0025 0000 3155 | Requires auth |

### Test Webhook Events

Use Stripe CLI:

```bash
stripe listen --forward-to localhost:3001/api/stripe/webhooks
```

## Security Considerations

1. **Never expose `STRIPE_SECRET_KEY`** - Only use server-side
2. **Validate webhooks** - Always verify webhook signatures
3. **Use Supabase RLS** - Billing data is protected by RLS
4. **Service role for webhooks** - Webhooks use service role key

## Monetization Tiers

| Feature | Free | Pro ($29/mo) | Enterprise ($99/mo) |
|---------|------|--------------|---------------------|
| Species IDs | 100/mo | Unlimited | Unlimited |
| API Calls | 5/day | 1,000/day | Unlimited |
| Devices | 1 | 10 | Unlimited |
| AI Queries | 10/mo | 500/mo | Unlimited |
| CREP Dashboard | ❌ | ✅ | ✅ |
| Priority Support | ❌ | ✅ | ✅ |
| Team Features | ❌ | ❌ | ✅ |

## Next Steps

1. ✅ Configure Stripe webhook endpoint
2. ✅ Create products in Stripe Dashboard
3. ✅ Add publishable key to environment
4. ⏳ Enable Customer Portal in Stripe settings
5. ⏳ Configure Customer Portal products
6. ⏳ Set up email notifications in Stripe
