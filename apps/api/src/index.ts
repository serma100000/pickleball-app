import { serve } from '@hono/node-server';
import { app } from './app.js';

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

console.log(`[startup] Server initialized`);
