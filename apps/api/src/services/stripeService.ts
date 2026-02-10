/**
 * Stripe Payment Service
 * Handles PaymentIntent creation and webhook processing.
 */

import Stripe from 'stripe';

function getStripeClient(): Stripe | null {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) return null;
  return new Stripe(secretKey, { apiVersion: '2025-01-27.acacia' as Stripe.LatestApiVersion });
}

export const stripeService = {
  /**
   * Check if Stripe is configured
   */
  isConfigured(): boolean {
    return !!process.env.STRIPE_SECRET_KEY;
  },

  /**
   * Create a PaymentIntent for event registration
   */
  async createPaymentIntent(params: {
    amount: number; // in cents
    currency?: string;
    metadata?: Record<string, string>;
    description?: string;
  }): Promise<{ clientSecret: string; paymentIntentId: string }> {
    const stripe = getStripeClient();
    if (!stripe) throw new Error('Stripe is not configured');

    const paymentIntent = await stripe.paymentIntents.create({
      amount: params.amount,
      currency: params.currency || 'usd',
      metadata: params.metadata || {},
      description: params.description,
      automatic_payment_methods: { enabled: true },
    });

    if (!paymentIntent.client_secret) {
      throw new Error('Failed to create payment intent');
    }

    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    };
  },

  /**
   * Retrieve a PaymentIntent to check its status
   */
  async getPaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    const stripe = getStripeClient();
    if (!stripe) throw new Error('Stripe is not configured');
    return stripe.paymentIntents.retrieve(paymentIntentId);
  },

  /**
   * Construct and verify a webhook event from raw body + signature
   */
  constructWebhookEvent(rawBody: string, signature: string): Stripe.Event {
    const stripe = getStripeClient();
    if (!stripe) throw new Error('Stripe is not configured');

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) throw new Error('STRIPE_WEBHOOK_SECRET is not configured');

    return stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  },
};
