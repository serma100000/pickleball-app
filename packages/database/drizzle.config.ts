import { defineConfig } from 'drizzle-kit';
import 'dotenv/config';

// Validate environment
if (!process.env.DATABASE_URL) {
  console.warn('Warning: DATABASE_URL is not set. Using default local connection.');
}

export default defineConfig({
  // Schema location
  schema: './src/schema.ts',

  // Migration output directory
  out: './drizzle',

  // Database dialect
  dialect: 'postgresql',

  // Database connection
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/pickleball_db',
  },

  // Enable verbose logging during development
  verbose: process.env.NODE_ENV !== 'production',

  // Enable strict mode for safer migrations
  strict: true,

  // Introspection settings (for db pull)
  introspect: {
    casing: 'camel',
  },

  // Migration settings
  migrations: {
    prefix: 'timestamp',
    table: '__drizzle_migrations',
    schema: 'public',
  },
});
