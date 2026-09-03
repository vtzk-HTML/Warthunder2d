// /api/kv.js
// Backend simples de chave/valor compartilhado para o sistema de
// amigos e duelos do jogo "Caça a Jatos".
//
// Usa Postgres via a integração Neon do Vercel Marketplace.
// Guardamos tudo numa única tabela genérica (kv_store), imitando
// um key-value store, pra não precisar desenhar um schema
// relacional completo pra esse projeto simples.
//
// Depois de instalar a integração "Neon" no seu projeto na Vercel,
// a variável de ambiente de conexão (normalmente DATABASE_URL,
// mas às vezes POSTGRES_URL dependendo da versão da integração) é
// injetada automaticamente.

const { neon } = require('@neondatabase/serverless');

const connectionString =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.POSTGRES_URL_NON_POOLING;

const sql = connectionString ? neon(connectionString) : null;

// Só permite chaves com esses prefixos, para não virar um KV público
// genérico para qualquer coisa.
const ALLOWED_PREFIXES = ['friends:', 'presence:', 'gift:', 'duelinvite:', 'duelroom:', 'duellobby:', 'duelrank:'];
const EXPIRE_MS = 24 * 60 * 60 * 1000; // 24h

function isAllowedKey(key) {
  return typeof key === 'string' &&
    key.length > 0 &&
    key.length < 200 &&
    ALLOWED_PREFIXES.some((p) => key.startsWith(p));
}

let tableReady = false;
async function ensureTable() {
  if (tableReady) return;
  await sql`
    CREATE TABLE IF NOT EXISTS kv_store (
      key TEXT PRIMARY KEY,
      value JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  tableReady = true;
}

module.exports = async function handler(req, res) {
  if (!sql) {
    return res.status(500).json({
      error: 'DATABASE_URL não configurada. Instale a integração Neon no projeto da Vercel e faça um redeploy.',
    });
  }

  try {
    await ensureTable();

    if (req.method === 'GET') {
      const key = req.query.key;
      if (!isAllowedKey(key)) return res.status(400).json({ error: 'invalid key' });
      const rows = await sql`SELECT value, updated_at FROM kv_store WHERE key = ${key}`;
      if (rows.length === 0) return res.status(404).json({ error: 'not found' });
      const row = rows[0];
      const ageMs = Date.now() - new Date(row.updated_at).getTime();
      if (ageMs > EXPIRE_MS) {
        await sql`DELETE FROM kv_store WHERE key = ${key}`;
        return res.status(404).json({ error: 'expired' });
      }
      return res.status(200).json({ key, value: row.value });
    }

    if (req.method === 'POST' || req.method === 'PUT') {
      const body = req.body || {};
      const { key, value } = body;
      if (!isAllowedKey(key)) return res.status(400).json({ error: 'invalid key' });
      await sql`
        INSERT INTO kv_store (key, value, updated_at)
        VALUES (${key}, ${JSON.stringify(value)}::jsonb, now())
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
      `;
      return res.status(200).json({ key, value });
    }

    if (req.method === 'DELETE') {
      const key = req.query.key;
      if (!isAllowedKey(key)) return res.status(400).json({ error: 'invalid key' });
      await sql`DELETE FROM kv_store WHERE key = ${key}`;
      return res.status(200).json({ key, deleted: true });
    }

    res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
    return res.status(405).json({ error: 'method not allowed' });
  } catch (e) {
    return res.status(500).json({ error: String(e && e.message ? e.message : e) });
  }
};
