import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';

// Environment validation
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

// Create postgres connection with connection pooling
const connectionString = process.env.DATABASE_URL;

// Connection pool configuration
const poolConfig = {
  max: parseInt(process.env.DB_POOL_SIZE || '10', 10), // Maximum connections in pool
  idle_timeout: parseInt(process.env.DB_IDLE_TIMEOUT || '20', 10), // Seconds before idle connection is closed
  connect_timeout: parseInt(process.env.DB_CONNECT_TIMEOUT || '10', 10), // Seconds to wait for connection
  max_lifetime: parseInt(process.env.DB_MAX_LIFETIME || '3600', 10), // Max connection lifetime in seconds
  prepare: true, // Use prepared statements
};

// Create postgres client
export const sql = postgres(connectionString, poolConfig);

// Create drizzle database instance with full schema
export const db = drizzle(sql, { schema });

// Export schema for use in queries
export { schema };

// Export all schema tables and types for convenience
export * from './schema.js';

// Health check function
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await sql`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database connection check failed:', error);
    return false;
  }
}

// Get database connection info (for debugging, excludes sensitive data)
export function getDatabaseInfo(): {
  connected: boolean;
  poolSize: number;
  idleTimeout: number;
  host: string;
} {
  const url = new URL(connectionString);
  return {
    connected: true,
    poolSize: poolConfig.max,
    idleTimeout: poolConfig.idle_timeout,
    host: url.hostname,
  };
}

// Close database connection gracefully
export async function closeDatabase(): Promise<void> {
  try {
    await sql.end({ timeout: 5 }); // Wait up to 5 seconds for connections to close
    console.log('Database connection closed successfully');
  } catch (error) {
    console.error('Error closing database connection:', error);
    throw error;
  }
}

// Transaction helper for complex operations
export async function withTransaction<T>(
  callback: (tx: typeof db) => Promise<T>
): Promise<T> {
  return await db.transaction(async (tx) => {
    return await callback(tx as typeof db);
  });
}

// Utility to run raw SQL queries (use sparingly)
export async function rawQuery<T>(query: string, params: unknown[] = []): Promise<T[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await sql.unsafe(query, params as any);
  return result as unknown as T[];
}
