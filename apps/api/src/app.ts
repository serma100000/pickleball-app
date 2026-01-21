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

const app = new Hono();

// Global middleware
app.use('*', timing());
app.use('*', logger());
app.use('*', prettyJSON());
app.use('*', secureHeaders());

// CORS configuration
app.use(
  '*',
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
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
