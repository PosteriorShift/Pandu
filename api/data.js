const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
});

let tableReady = false;
async function ensureTable() {
  if (tableReady) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS portfolio (
      id INTEGER PRIMARY KEY DEFAULT 1,
      data JSONB NOT NULL DEFAULT '{}'::jsonb,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  tableReady = true;
}

function checkAuth(req) {
  const auth = req.headers.authorization || '';
  const expected = 'Basic ' + Buffer.from(
    `${process.env.ADMIN_USER}:${process.env.ADMIN_PASS}`
  ).toString('base64');
  return auth === expected;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    await ensureTable();

    if (req.method === 'HEAD') {
      return checkAuth(req) ? res.status(200).end() : res.status(401).end();
    }

    if (req.method === 'GET') {
      const { rows } = await pool.query('SELECT data FROM portfolio WHERE id = 1');
      return res.status(200).json(rows[0]?.data || {});
    }

    if (req.method === 'POST') {
      if (!checkAuth(req)) return res.status(401).json({ error: 'Unauthorized' });

      // Vercel parses JSON automatically for application/json
      const body = req.body && typeof req.body === 'object' ? req.body : JSON.parse(req.body || '{}');

      await pool.query(
        `INSERT INTO portfolio (id, data, updated_at)
         VALUES (1, $1::jsonb, NOW())
         ON CONFLICT (id) DO UPDATE
         SET data = EXCLUDED.data, updated_at = NOW()`,
        [JSON.stringify(body)]
      );
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('API error:', err);
    return res.status(500).json({ error: err.message });
  }
};

// Allow large payloads (for base64 images)
module.exports.config = { api: { bodyParser: { sizeLimit: '15mb' } } };
