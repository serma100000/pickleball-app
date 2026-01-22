import { serve } from '@hono/node-server';
import { app } from './app.js';

// Load dotenv only in development - Railway provides env vars directly in production
if (process.env.NODE_ENV !== 'production') {
  import('dotenv/config').catch(() => {});
}

const port = parseInt(process.env.PORT || '3001');

console.log(`Server starting on port ${port}`);

serve({
  fetch: app.fetch,
  port,
  hostname: '0.0.0.0',
});

console.log(`Server running at http://localhost:${port}`);
