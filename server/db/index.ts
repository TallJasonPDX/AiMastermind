import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '@db/schema';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Configure connection pool with proper settings for remote database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 3, // Reduce max connections to prevent overwhelming remote DB
  idleTimeoutMillis: 10000, // Close idle clients after 10 seconds
  connectionTimeoutMillis: 5000, // Return an error after 5 seconds if connection could not be established
  query_timeout: 5000, // Timeout queries after 5 seconds
  keepAlive: true // Add TCP keepalive
});

// Add error handler for the pool
pool.on('error', (err) => {
  console.error('Unexpected error on idle database client', err);
  // Don't exit process on connection error, just log it
});

// Add connection validation
pool.on('connect', (client) => {
  console.log('New database client connected');
  client.on('error', (err) => {
    console.error('Database client error:', err);
  });
});

// Export configured drizzle instance
export const db = drizzle(pool, { schema });