import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import { timing } from 'hono/timing';
import { prettyJSON } from 'hono/pretty-json';

import { errorHandler } from './middleware/errorHandler.js';
import { rateLimiter } from './middleware/rateLimit.js';

import authRoutes from './routes/auth.js';
import usersRoutes from './routes/users.js';
import courtsRoutes from './routes/courts.js';
import gamesRoutes from './routes/games.js';
import matchmakingRoutes from './routes/matchmaking.js';
import clubsRoutes from './routes/clubs.js';
import leaguesRoutes from './routes/leagues.js';
import tournamentsRoutes from './routes/tournaments.js';
import socialRoutes from './routes/social.js';
import duprRoutes, { duprWebhookRouter } from './routes/dupr.js';
import paymentsRoutes, { paymentsWebhookRouter } from './routes/payments.js';
import referralsRoutes from './routes/referrals.js';
import partnersRoutes from './routes/partners.js';
import invitesRoutes from './routes/invites.js';
import waitlistRoutes from './routes/waitlist.js';

const app = new Hono();

// Global middleware
app.use('*', timing());
app.use('*', logger());
app.use('*', prettyJSON());
app.use('*', secureHeaders());

// CORS configuration
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://www.paddle-up.app',
  'https://paddle-up.app',
  // DUPR SSO origins
  'https://uat.dupr.gg',
  'https://dupr.gg',
  'https://dashboard.dupr.com',
  process.env.CORS_ORIGIN,
].filter(Boolean) as string[];

app.use(
  '*',
  cors({
    origin: (origin) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return 'https://www.paddle-up.app';
      // Check if origin is in allowed list
      if (allowedOrigins.includes(origin)) return origin;
      // Default to production
      return 'https://www.paddle-up.app';
    },
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    exposeHeaders: ['X-Request-Id', 'X-RateLimit-Limit', 'X-RateLimit-Remaining'],
    maxAge: 86400,
    credentials: true,
  })
);

// Rate limiting (if enabled)
if (process.env.ENABLE_RATE_LIMITING !== 'false') {
  app.use('*', rateLimiter);
}

// Global error handler
app.onError(errorHandler);

// Health check endpoint
app.get('/health', (c) => {
  return c.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '0.1.0',
    environment: process.env.NODE_ENV || 'development',
  });
});

// Webhook routes (unauthenticated — mounted before main API routes)
app.route('/api/v1/dupr', duprWebhookRouter);
app.route('/api/v1/payments', paymentsWebhookRouter);

// API version prefix
const api = new Hono();

// Mount routes
api.route('/auth', authRoutes);
api.route('/users', usersRoutes);
api.route('/courts', courtsRoutes);
api.route('/games', gamesRoutes);
api.route('/matchmaking', matchmakingRoutes);
api.route('/clubs', clubsRoutes);
api.route('/leagues', leaguesRoutes);
api.route('/tournaments', tournamentsRoutes);
api.route('/social', socialRoutes);
api.route('/dupr', duprRoutes);
api.route('/payments', paymentsRoutes);
api.route('/referrals', referralsRoutes);
api.route('/partners', partnersRoutes);
api.route('/invites', invitesRoutes);
api.route('/waitlist', waitlistRoutes);

// Mount API under /api/v1
app.route('/api/v1', api);

// 404 handler
app.notFound((c) => {
  return c.json(
    {
      error: 'Not Found',
      message: `Route ${c.req.method} ${c.req.path} not found`,
      statusCode: 404,
    },
    404
  );
});

export { app };
