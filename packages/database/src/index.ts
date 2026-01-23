import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres, { type Sql } from 'postgres';

import * as schema from './schema.js';

// Re-export schema for convenience
export * from './schema.js';
export { schema };

// Type for the database instance
export type Database = PostgresJsDatabase<typeof schema>;
export type SqlClient = Sql;

// Connection pool configuration type
export interface PoolConfig {
  max: number;
  idle_timeout: number;
  connect_timeout: number;
  max_lifetime: number;
  prepare: boolean;
}

// Database connection info (excluding sensitive data)
export interface DatabaseInfo {
  connected: boolean;
  poolSize: number;
  idleTimeout: number;
  host: string;
  database: string;
  ssl: boolean;
}

// Default pool configuration
const defaultPoolConfig: PoolConfig = {
  max: parseInt(process.env.DB_POOL_SIZE || '10', 10),
  idle_timeout: parseInt(process.env.DB_IDLE_TIMEOUT || '20', 10),
  connect_timeout: parseInt(process.env.DB_CONNECT_TIMEOUT || '10', 10),
  max_lifetime: parseInt(process.env.DB_MAX_LIFETIME || '3600', 10),
  prepare: true,
};

// Singleton instances
let sqlClient: Sql | null = null;
let dbInstance: Database | null = null;
let currentConfig: PoolConfig = defaultPoolConfig;

/**
 * Create a new database connection with custom configuration
 * @param connectionString - PostgreSQL connection URL
 * @param poolConfig - Connection pool configuration
 * @returns Object containing sql client and drizzle db instance
 */
export function createConnection(
  connectionString: string,
  poolConfig: Partial<PoolConfig> = {}
): { sql: Sql; db: Database } {
  const config: PoolConfig = { ...defaultPoolConfig, ...poolConfig };
  const sql = postgres(connectionString, config);
  const db = drizzle(sql, { schema });
  return { sql, db };
}

/**
 * Initialize the default database connection
 * Uses DATABASE_URL environment variable
 * @param poolConfig - Optional pool configuration overrides
 * @throws Error if DATABASE_URL is not set
 */
export function initializeDatabase(poolConfig: Partial<PoolConfig> = {}): void {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      'DATABASE_URL environment variable is required. ' +
      'Please set it in your .env file or environment.'
    );
  }

  if (sqlClient) {
    console.warn('Database already initialized. Call closeDatabase() first to reinitialize.');
    return;
  }

  currentConfig = { ...defaultPoolConfig, ...poolConfig };
  sqlClient = postgres(connectionString, currentConfig);
  dbInstance = drizzle(sqlClient, { schema });
}

/**
 * Get the database instance
 * Automatically initializes if not already done
 * @returns Drizzle database instance
 */
export function getDatabase(): Database {
  if (!dbInstance) {
    initializeDatabase();
  }
  return dbInstance!;
}

/**
 * Get the raw SQL client for advanced operations
 * @returns Postgres.js SQL client
 */
export function getSqlClient(): Sql {
  if (!sqlClient) {
    initializeDatabase();
  }
  return sqlClient!;
}

/**
 * Alias for getDatabase() - provides the db instance
 */
export const db = new Proxy({} as Database, {
  get(_, prop) {
    return getDatabase()[prop as keyof Database];
  },
});

/**
 * Alias for getSqlClient() - provides the sql instance
 */
export const sql = new Proxy({} as Sql, {
  get(_, prop) {
    return getSqlClient()[prop as keyof Sql];
  },
});

/**
 * Check database connection health
 * @returns true if connection is successful
 */
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    const client = getSqlClient();
    await client`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database connection check failed:', error);
    return false;
  }
}

/**
 * Get database connection info (safe to log, no credentials)
 * @returns Database connection information
 */
export function getDatabaseInfo(): DatabaseInfo {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    return {
      connected: false,
      poolSize: currentConfig.max,
      idleTimeout: currentConfig.idle_timeout,
      host: 'not configured',
      database: 'not configured',
      ssl: false,
    };
  }

  try {
    const url = new URL(connectionString);
    return {
      connected: sqlClient !== null,
      poolSize: currentConfig.max,
      idleTimeout: currentConfig.idle_timeout,
      host: url.hostname,
      database: url.pathname.slice(1), // Remove leading /
      ssl: url.searchParams.get('sslmode') !== 'disable',
    };
  } catch {
    return {
      connected: false,
      poolSize: currentConfig.max,
      idleTimeout: currentConfig.idle_timeout,
      host: 'invalid url',
      database: 'invalid url',
      ssl: false,
    };
  }
}

/**
 * Close database connection gracefully
 * @param timeout - Seconds to wait for connections to close (default: 5)
 */
export async function closeDatabase(timeout: number = 5): Promise<void> {
  if (sqlClient) {
    try {
      await sqlClient.end({ timeout });
      console.log('Database connection closed successfully');
    } catch (error) {
      console.error('Error closing database connection:', error);
      throw error;
    } finally {
      sqlClient = null;
      dbInstance = null;
    }
  }
}

/**
 * Execute a callback within a database transaction
 * @param callback - Function to execute within transaction
 * @returns Result of the callback
 */
export async function withTransaction<T>(
  callback: (tx: Database) => Promise<T>
): Promise<T> {
  const database = getDatabase();
  return await database.transaction(async (tx) => {
    return await callback(tx as Database);
  });
}

/**
 * Execute a raw SQL query (use sparingly)
 * @param query - SQL query string
 * @param params - Query parameters
 * @returns Query results
 */
export async function rawQuery<T>(
  query: string,
  params: unknown[] = []
): Promise<T[]> {
  const client = getSqlClient();
  const result = await client.unsafe(query, params as postgres.ParameterOrFragment<never>[]);
  return result as T[];
}

/**
 * Test database connection and return detailed status
 * Useful for health checks and debugging
 */
export async function testConnection(): Promise<{
  success: boolean;
  latencyMs: number;
  info: DatabaseInfo;
  error?: string;
}> {
  const start = Date.now();

  try {
    const connected = await checkDatabaseConnection();
    const latencyMs = Date.now() - start;
    const info = getDatabaseInfo();

    return {
      success: connected,
      latencyMs,
      info,
    };
  } catch (error) {
    return {
      success: false,
      latencyMs: Date.now() - start,
      info: getDatabaseInfo(),
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
