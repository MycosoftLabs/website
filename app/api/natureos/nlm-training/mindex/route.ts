import { NextResponse } from 'next/server';
import { Pool } from 'pg';

export const dynamic = 'force-dynamic';

const MINDEX_BASE_URL = process.env.MINDEX_API_URL || process.env.MINDEX_API_BASE_URL;

let pool: Pool | null = null;

function dbConfigured() {
  return Boolean(process.env.MINDEX_DB_HOST && process.env.MINDEX_DB_USER && process.env.MINDEX_DB_NAME);
}

function getPool() {
  if (!pool) {
    pool = new Pool({
      host: process.env.MINDEX_DB_HOST,
      port: parseInt(process.env.MINDEX_DB_PORT || '5432', 10),
      user: process.env.MINDEX_DB_USER,
      password: process.env.MINDEX_DB_PASSWORD,
      database: process.env.MINDEX_DB_NAME,
      ssl: process.env.MINDEX_DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
    });
  }

  return pool;
}

function withSource(data: unknown[], source: string) {
  return NextResponse.json(data, { headers: { 'x-nlm-data-source': source } });
}

function normalizeRows(payload: any): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.rows)) return payload.rows;
  return [];
}

async function fetchMindexService() {
  if (!MINDEX_BASE_URL) return [];

  const base = MINDEX_BASE_URL.replace(/\/$/, '');
  const paths = ['/api/mindex/data?limit=50', '/mindex/data?limit=50', '/data?limit=50'];

  for (const path of paths) {
    try {
      const response = await fetch(`${base}${path}`, {
        cache: 'no-store',
        signal: AbortSignal.timeout(3000),
      });

      if (!response.ok) continue;
      return normalizeRows(await response.json());
    } catch {
      // Try the next real service path before giving up.
    }
  }

  return [];
}

export async function GET() {
  if (dbConfigured()) {
    try {
      const client = await getPool().connect();

      try {
        const tableCheck = await client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = 'mindex_data'
          );
        `);

        if (tableCheck.rows[0]?.exists) {
          const result = await client.query('SELECT * FROM mindex_data ORDER BY timestamp DESC LIMIT 50');
          return withSource(result.rows, 'postgres');
        }
      } finally {
        client.release();
      }
    } catch (error: any) {
      console.warn('[NLM MINDEX] Database unavailable:', error.message);
    }
  }

  const serviceRows = await fetchMindexService();
  return withSource(serviceRows, serviceRows.length ? 'service' : 'empty');
}
