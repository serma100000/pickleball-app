import { defineConfig } from 'drizzle-kit';
import 'dotenv/config';

// Validate DATABASE_URL in development
if (!process.env.DATABASE_URL && process.env.NODE_ENV !== 'production') {
  console.warn(
    'Warning: DATABASE_URL is not set. Using default local connection.\n' +
    'Copy .env.example to .env and configure your database URL.'
  );
}

export default defineConfig({
  // Schema location
  schema: './src/db/schema.ts',

  // Migration output directory
  out: './src/db/migrations',

  // Database dialect
  dialect: 'postgresql',

  // Database connection
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/pickleball_db',
  },

  // Enable verbose logging in development
  verbose: process.env.NODE_ENV !== 'production',

  // Enable strict mode for safer migrations
  strict: true,

  // Introspection settings
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
