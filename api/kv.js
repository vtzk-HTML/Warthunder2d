// /api/kv.js
// Backend simples de chave/valor compartilhado para o sistema de
// amigos e duelos do jogo "Caça a Jatos".
//
// Usa o Vercel KV (Redis via Upstash). Depois de conectar um banco
// KV ao projeto na Vercel, as variáveis de ambiente necessárias
// (KV_REST_API_URL, KV_REST_API_TOKEN etc.) são injetadas automaticamente.

const { kv } = require('@vercel/kv');

// Só permite chaves com esses prefixos, para não virar um KV público
// genérico para qualquer coisa.
const ALLOWED_PREFIXES = ['friends:', 'presence:', 'duelinvite:', 'duelroom:'];

function isAllowedKey(key) {
  return typeof key === 'string' &&
    key.length > 0 &&
    key.length < 200 &&
    ALLOWED_PREFIXES.some((p) => key.startsWith(p));
}

module.exports = async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const key = req.query.key;
      if (!isAllowedKey(key)) return res.status(400).json({ error: 'invalid key' });
      const value = await kv.get(key);
      if (value === null || value === undefined) {
        return res.status(404).json({ error: 'not found' });
      }
      return res.status(200).json({ key, value });
    }

    if (req.method === 'POST' || req.method === 'PUT') {
      const body = req.body || {};
      const { key, value } = body;
      if (!isAllowedKey(key)) return res.status(400).json({ error: 'invalid key' });
      // expira em 24h para não acumular lixo de partidas/convites antigos
      await kv.set(key, value, { ex: 60 * 60 * 24 });
      return res.status(200).json({ key, value });
    }

    if (req.method === 'DELETE') {
      const key = req.query.key;
      if (!isAllowedKey(key)) return res.status(400).json({ error: 'invalid key' });
      await kv.del(key);
      return res.status(200).json({ key, deleted: true });
    }

    res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
    return res.status(405).json({ error: 'method not allowed' });
  } catch (e) {
    return res.status(500).json({ error: String(e && e.message ? e.message : e) });
  }
};
