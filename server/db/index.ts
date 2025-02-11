import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '@db/schema';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Configure connection pool with less restrictive settings
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10, // Increase max connections
  idleTimeoutMillis: 30000, // Increase idle timeout
  connectionTimeoutMillis: 10000, // Increase connection timeout
  keepAlive: true // Keep TCP connection alive
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