// src/lib/stripe.js
// ─────────────────────────────────────────────────────
// Stripe client-side integration for Partnr
//
// SETUP STEPS:
// 1. Go to stripe.com → Dashboard → Products → Add product
// 2. Create "Partnr Growth" at $299/month → copy the Price ID
// 3. Create "Partnr Team" at $599/month → copy the Price ID
// 4. Paste both Price IDs into your .env file
// 5. Go to Stripe → Developers → Webhooks → Add endpoint
//    URL: https://app.getpartnr.co/api/stripe-webhook
//    Events: checkout.session.completed, customer.subscription.deleted
// 6. Paste the webhook secret into Vercel env vars as STRIPE_WEBHOOK_SECRET
// ─────────────────────────────────────────────────────

import { loadStripe } from '@stripe/stripe-js'

let stripePromise
export const getStripe = () => {
  if (!stripePromise) {
    stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)
  }
  return stripePromise
}

// Plans config — matches your Stripe products
export const PLANS = {
  growth: {
    name: 'Growth',
    price: 299,
    priceId: import.meta.env.VITE_STRIPE_PRICE_GROWTH,
    features: [
      'Unlimited partners & programs',
      'Multi-tier hierarchy (SI chains)',
      'Weekly snapshot report',
      'AI deal registration assistant',
      'Document & evidence storage',
      'Requirements checklists',
      'Email support',
    ],
  },
  team: {
    name: 'Team',
    price: 599,
    priceId: import.meta.env.VITE_STRIPE_PRICE_TEAM,
    features: [
      'Everything in Growth',
      '5 team seats',
      'HubSpot / Salesforce sync',
      'Pipeline health AI monitor',
      'Partner performance analytics',
      'Priority Slack support',
    ],
  },
}

// Redirect to Stripe Checkout
// Call this from your pricing page or upgrade button
export async function redirectToCheckout({ priceId, userId, email }) {
  // In production, call your backend to create a Checkout Session
  // and return the session URL. Example with Supabase Edge Functions:
  //
  // const { data } = await supabase.functions.invoke('create-checkout', {
  //   body: { priceId, userId, email, successUrl, cancelUrl }
  // })
  // window.location.href = data.url
  //
  // For now, use Stripe's Payment Links as a quick alternative:
  // Stripe Dashboard → Payment Links → Create → pick your price
  // Paste the URL below per plan.
  
  const PAYMENT_LINKS = {
    [import.meta.env.VITE_STRIPE_PRICE_GROWTH]: 'https://buy.stripe.com/REPLACE_GROWTH_LINK',
    [import.meta.env.VITE_STRIPE_PRICE_TEAM]:   'https://buy.stripe.com/REPLACE_TEAM_LINK',
  }

  const url = PAYMENT_LINKS[priceId]
  if (url && email) {
    window.location.href = `${url}?prefilled_email=${encodeURIComponent(email)}`
  } else if (url) {
    window.location.href = url
  } else {
    // Fallback: Stripe Checkout via backend
    console.warn('Configure PAYMENT_LINKS in src/lib/stripe.js')
    alert('Checkout coming soon — email hello@getpartnr.co to upgrade')
  }
}
