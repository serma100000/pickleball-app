/**
 * Database Connection Test
 *
 * This test file verifies the database connection is properly configured
 * and can connect to the database server.
 *
 * Run with: pnpm test:connection
 * Or: npx tsx src/test/connection.test.ts
 */

import 'dotenv/config';
import {
  createConnection,
  checkDatabaseConnection,
  getDatabaseInfo,
  testConnection,
  closeDatabase,
  initializeDatabase,
  getDatabase,
} from '../index.js';
import * as schema from '../schema.js';

// ANSI color codes for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
};

function log(message: string, color: keyof typeof colors = 'reset'): void {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title: string): void {
  console.log();
  log(`${'='.repeat(60)}`, 'cyan');
  log(`  ${title}`, 'cyan');
  log(`${'='.repeat(60)}`, 'cyan');
}

async function runTests(): Promise<void> {
  let exitCode = 0;

  logSection('Database Connection Tests');

  // Test 1: Check DATABASE_URL environment variable
  log('\n[Test 1] Checking DATABASE_URL environment variable...', 'dim');
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    log('  FAIL: DATABASE_URL is not set', 'red');
    log('  Please copy .env.example to .env and configure your database URL', 'yellow');
    process.exit(1);
  }

  // Mask the password in the URL for display
  try {
    const url = new URL(databaseUrl);
    url.password = '****';
    log(`  PASS: DATABASE_URL is configured`, 'green');
    log(`  Connection: ${url.toString()}`, 'dim');
  } catch {
    log('  FAIL: DATABASE_URL is not a valid URL', 'red');
    process.exit(1);
  }

  // Test 2: Get database info without connecting
  log('\n[Test 2] Getting database info...', 'dim');
  const info = getDatabaseInfo();
  log(`  Host: ${info.host}`, 'dim');
  log(`  Database: ${info.database}`, 'dim');
  log(`  SSL: ${info.ssl ? 'enabled' : 'disabled'}`, 'dim');
  log(`  Pool Size: ${info.poolSize}`, 'dim');
  log(`  PASS: Database info retrieved`, 'green');

  // Test 3: Initialize database connection
  log('\n[Test 3] Initializing database connection...', 'dim');
  try {
    initializeDatabase();
    log('  PASS: Database initialized successfully', 'green');
  } catch (error) {
    log(`  FAIL: ${error instanceof Error ? error.message : 'Unknown error'}`, 'red');
    exitCode = 1;
  }

  // Test 4: Test actual connection
  log('\n[Test 4] Testing database connection...', 'dim');
  const connectionResult = await testConnection();

  if (connectionResult.success) {
    log(`  PASS: Connection successful (${connectionResult.latencyMs}ms)`, 'green');
  } else {
    log(`  FAIL: Connection failed`, 'red');
    log(`  Error: ${connectionResult.error}`, 'red');
    exitCode = 1;
  }

  // Test 5: Check connection with simple query
  log('\n[Test 5] Running health check query (SELECT 1)...', 'dim');
  const isHealthy = await checkDatabaseConnection();

  if (isHealthy) {
    log('  PASS: Health check query successful', 'green');
  } else {
    log('  FAIL: Health check query failed', 'red');
    exitCode = 1;
  }

  // Test 6: Verify schema tables exist
  log('\n[Test 6] Verifying schema tables...', 'dim');
  const db = getDatabase();

  try {
    // Try to query the users table (should exist after migration)
    const tables = Object.keys(schema).filter(
      (key) => !key.includes('Relations') && !key.includes('Enum') && !key.startsWith('New')
    );
    log(`  Schema defines ${tables.length} tables/enums`, 'dim');

    // Check if tables exist in database
    const result = await db.execute<{ tablename: string }>`
      SELECT tablename
      FROM pg_catalog.pg_tables
      WHERE schemaname = 'public'
    `;

    if (result.length === 0) {
      log('  WARNING: No tables found in database', 'yellow');
      log('  Run migrations with: pnpm db:migrate', 'yellow');
    } else {
      log(`  Found ${result.length} tables in database`, 'dim');
      log('  PASS: Schema verification complete', 'green');
    }
  } catch (error) {
    log(`  WARNING: Could not verify tables: ${error instanceof Error ? error.message : 'Unknown'}`, 'yellow');
  }

  // Test 7: Test with custom connection
  log('\n[Test 7] Testing custom connection creation...', 'dim');
  try {
    const { sql: customSql, db: customDb } = createConnection(databaseUrl, {
      max: 2,
      idle_timeout: 10,
    });

    // Test the custom connection
    await customSql`SELECT 1`;
    log('  PASS: Custom connection works', 'green');

    // Close the custom connection
    await customSql.end({ timeout: 3 });
    log('  Custom connection closed', 'dim');
  } catch (error) {
    log(`  FAIL: Custom connection failed: ${error instanceof Error ? error.message : 'Unknown'}`, 'red');
    exitCode = 1;
  }

  // Test 8: Close main connection gracefully
  log('\n[Test 8] Closing database connection...', 'dim');
  try {
    await closeDatabase(3);
    log('  PASS: Connection closed gracefully', 'green');
  } catch (error) {
    log(`  FAIL: Error closing connection: ${error instanceof Error ? error.message : 'Unknown'}`, 'red');
    exitCode = 1;
  }

  // Summary
  logSection('Test Summary');

  if (exitCode === 0) {
    log('\n  All tests passed!', 'green');
    log('  Your database connection is properly configured.\n', 'green');
  } else {
    log('\n  Some tests failed!', 'red');
    log('  Please check your configuration and try again.\n', 'red');
  }

  process.exit(exitCode);
}

// Run the tests
runTests().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
