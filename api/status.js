import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

// Initialize table if it doesn't exist
async function initTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS deployment_status (
      id TEXT PRIMARY KEY DEFAULT 'default',
      checkboxes JSONB DEFAULT '{}',
      fields JSONB DEFAULT '{}',
      sandbox_url TEXT,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;
}

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    await initTable();

    if (req.method === 'GET') {
      const result = await sql`
        SELECT checkboxes, fields, sandbox_url, updated_at
        FROM deployment_status
        WHERE id = 'default'
      `;

      if (result.length === 0) {
        return res.status(200).json({
          checkboxes: {},
          fields: {},
          sandbox_url: null,
          updated_at: null
        });
      }

      return res.status(200).json(result[0]);
    }

    if (req.method === 'POST') {
      const { checkboxes, fields, sandbox_url } = req.body;

      await sql`
        INSERT INTO deployment_status (id, checkboxes, fields, sandbox_url, updated_at)
        VALUES ('default', ${JSON.stringify(checkboxes || {})}, ${JSON.stringify(fields || {})}, ${sandbox_url || null}, NOW())
        ON CONFLICT (id) DO UPDATE SET
          checkboxes = ${JSON.stringify(checkboxes || {})},
          fields = ${JSON.stringify(fields || {})},
          sandbox_url = ${sandbox_url || null},
          updated_at = NOW()
      `;

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Database error:', error);
    return res.status(500).json({ error: 'Database error', details: error.message });
  }
}
