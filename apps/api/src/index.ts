import { serve } from '@hono/node-server';
import { app } from './app.js';

// Load dotenv only in development - Railway provides env vars directly in production
if (process.env.NODE_ENV !== 'production') {
  import('dotenv/config').catch(() => {});
}

const port = parseInt(process.env.PORT || '3001');

console.log(`[startup] Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`[startup] PORT env var: ${process.env.PORT}`);
console.log(`[startup] Starting server on port ${port}`);

const server = serve({
  fetch: app.fetch,
  port,
});

server.on('listening', () => {
  const addr = server.address();
  console.log(`[startup] Server is now listening:`, addr);
});

server.on('error', (err) => {
  console.error(`[startup] Server error:`, err);
});

console.log(`[startup] Server initialized`);
