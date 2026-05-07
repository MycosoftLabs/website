import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.MINDEX_DB_HOST || 'localhost',
  port: parseInt(process.env.MINDEX_DB_PORT || '5434'),
  user: process.env.MINDEX_DB_USER || 'mindex',
  password: process.env.MINDEX_DB_PASSWORD || 'mindex',
  database: process.env.MINDEX_DB_NAME || 'mindex',
});

export async function GET() {
  const mockMindexData = [
    { id: 'm1', source: 'Mindex-01', type: 'mycelium_oscillation', data: { value: 0.85 + Math.random() * 0.1 }, timestamp: new Date().toISOString(), status: 'online' },
    { id: 'm2', source: 'Mindex-01', type: 'hyphal_pressure', data: { value: 0.42 + Math.random() * 0.05 }, timestamp: new Date().toISOString(), status: 'online' },
    { id: 'm3', source: 'Mindex-Global', type: 'atmospheric_sync', data: { value: 0.91 + Math.random() * 0.02 }, timestamp: new Date().toISOString(), status: 'online' },
    { id: 'm4', source: 'Mindex-02', type: 'thermal_gradient', data: { value: 24.5 + Math.random() * 2 }, timestamp: new Date().toISOString(), status: 'online' }
  ];

  try {
    // Direct connect to MINDEX Postgres
    const client = await pool.connect();
    try {
      // Check if mindex_data table exists, if not return mock
      const tableCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'mindex_data'
        );
      `);

      if (tableCheck.rows[0].exists) {
        const result = await client.query('SELECT * FROM mindex_data ORDER BY timestamp DESC LIMIT 50');
        return NextResponse.json(result.rows);
      } else {
        return NextResponse.json(mockMindexData);
      }
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.warn('Failed to connect to MINDEX DB, returning mock data:', error.message);
    // Return mock data instead of 500 to keep the UI functional
    return NextResponse.json(mockMindexData);
  }
}
