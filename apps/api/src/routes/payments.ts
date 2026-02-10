/**
 * Payment Routes (Stripe)
 *
 * - POST /payments/create-intent  (authenticated)
 * - GET  /payments/status/:id     (authenticated)
 * - POST /payments/webhook        (unauthenticated)
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { HTTPException } from 'hono/http-exception';
import { validateBody } from '../middleware/validation.js';
import { authMiddleware } from '../middleware/auth.js';
import { stripeService } from '../services/stripeService.js';

// ============================================================================
// AUTHENTICATED ROUTES
// ============================================================================

const paymentsRouter = new Hono();

const createIntentSchema = z.object({
  amount: z.number().int().positive('Amount must be a positive integer (in cents)'),
  currency: z.string().length(3).default('usd'),
  registrationId: z.string().uuid().optional(),
  eventType: z.enum(['tournament', 'club_event', 'league']).optional(),
  eventId: z.string().uuid().optional(),
  description: z.string().max(500).optional(),
});

/** POST /payments/create-intent — Create a Stripe PaymentIntent */
paymentsRouter.post('/create-intent', authMiddleware, validateBody(createIntentSchema), async (c) => {
  if (!stripeService.isConfigured()) {
    throw new HTTPException(503, { message: 'Payment processing is not configured' });
  }

  const { userId } = c.get('user');
  const body = c.req.valid('json');

  const result = await stripeService.createPaymentIntent({
    amount: body.amount,
    currency: body.currency,
    description: body.description,
    metadata: {
      userId,
      ...(body.registrationId && { registrationId: body.registrationId }),
      ...(body.eventType && { eventType: body.eventType }),
      ...(body.eventId && { eventId: body.eventId }),
    },
  });

  return c.json({
    clientSecret: result.clientSecret,
    paymentIntentId: result.paymentIntentId,
  });
});

/** GET /payments/status/:id — Check payment status */
paymentsRouter.get('/status/:id', authMiddleware, async (c) => {
  if (!stripeService.isConfigured()) {
    throw new HTTPException(503, { message: 'Payment processing is not configured' });
  }

  const paymentIntentId = c.req.param('id');

  try {
    const intent = await stripeService.getPaymentIntent(paymentIntentId);
    return c.json({
      id: intent.id,
      status: intent.status,
      amount: intent.amount,
      currency: intent.currency,
    });
  } catch {
    throw new HTTPException(404, { message: 'Payment not found' });
  }
});

// ============================================================================
// UNAUTHENTICATED WEBHOOK ROUTE
// ============================================================================

const paymentsWebhookRouter = new Hono();

/** POST /payments/webhook — Stripe webhook handler */
paymentsWebhookRouter.post('/webhook', async (c) => {
  if (!stripeService.isConfigured()) {
    throw new HTTPException(503, { message: 'Payment processing is not configured' });
  }

  const signature = c.req.header('stripe-signature');
  if (!signature) {
    throw new HTTPException(400, { message: 'Missing Stripe signature' });
  }

  const rawBody = await c.req.text();

  let event;
  try {
    event = stripeService.constructWebhookEvent(rawBody, signature);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    throw new HTTPException(400, { message: `Webhook signature verification failed: ${msg}` });
  }

  switch (event.type) {
    case 'payment_intent.succeeded': {
      const intent = event.data.object;
      console.log('Payment succeeded:', intent.id, intent.metadata);
      // TODO: Update registration status to 'confirmed' based on metadata
      break;
    }
    case 'payment_intent.payment_failed': {
      const intent = event.data.object;
      console.log('Payment failed:', intent.id);
      break;
    }
    default:
      console.log('Unhandled Stripe event:', event.type);
  }

  return c.json({ received: true });
});

// ============================================================================
// EXPORTS
// ============================================================================

export default paymentsRouter;
export { paymentsWebhookRouter };
