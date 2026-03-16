import { serve } from '@hono/node-server';
import { app } from './app.js';
import { retryFailedSubmissions } from './services/duprRetryWorker.js';

const port = parseInt(process.env.PORT || '3001');
const host = process.env.HOST || '0.0.0.0';

console.log(`[startup] Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`[startup] PORT: ${port}, HOST: ${host}`);

const server = serve({
  fetch: app.fetch,
  port,
  hostname: host,
});

server.on('listening', () => {
  const addr = server.address();
  console.log(`[startup] Server listening on:`, JSON.stringify(addr));
});

server.on('error', (err) => {
  console.error(`[startup] Server error:`, err);
});

// DUPR retry worker: retry failed submissions every 5 minutes
const DUPR_RETRY_INTERVAL_MS = 5 * 60 * 1000;
setInterval(() => {
  retryFailedSubmissions().catch((err) => {
    console.error('[dupr-retry] Unhandled error in retry worker:', err);
  });
}, DUPR_RETRY_INTERVAL_MS);
console.log(`[startup] DUPR retry worker scheduled (every ${DUPR_RETRY_INTERVAL_MS / 1000}s)`);

console.log(`[startup] Server initialized`);
