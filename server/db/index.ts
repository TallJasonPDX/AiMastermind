import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '@db/schema';

if (!process.env.REMOTE_DATABASE_URL && !process.env.DATABASE_URL) {
  throw new Error('Neither REMOTE_DATABASE_URL nor DATABASE_URL environment variable is set');
}

const connectionString = process.env.REMOTE_DATABASE_URL || process.env.DATABASE_URL;

// Configure connection pool for remote database
const pool = new Pool({
  connectionString,
  max: 5, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
});

// Add error handler for the pool
pool.on('error', (err) => {
  console.error('Unexpected error on idle database client', err);
  process.exit(-1);
});

export const db = drizzle(pool, { schema });
