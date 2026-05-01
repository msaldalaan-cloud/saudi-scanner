// api/strategies.js — إدارة الاستراتيجيات في Upstash Redis

const KV_URL   = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;
const KEY      = 'saudi_scanner_strategies';

async function kvGet(key) {
  const res = await fetch(`${KV_URL}/get/${key}`, {
    headers: { Authorization: `Bearer ${KV_TOKEN}` },
  });
  const data = await res.json();
  if (data.result === null || data.result === undefined) return null;
  let val = data.result;
  if (typeof val === 'string') {
    try { val = JSON.parse(val); } catch {}
    if (typeof val === 'string') {
      try { val = JSON.parse(val); } catch {}
    }
  }
  return val;
}

async function kvSet(key, value) {
  // نخزّن كـ JSON string مرة واحدة فقط
  await fetch(`${KV_URL}/set/${key}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KV_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(JSON.stringify(value)),
  });
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!KV_URL || !KV_TOKEN) {
    return res.status(500).json({ error: 'Upstash غير مضبوط — تأكد من KV_REST_API_URL و KV_REST_API_TOKEN' });
  }

  if (req.method === 'GET') {
    try {
      const strategies = await kvGet(KEY) || [];
      return res.status(200).json({ strategies });
    } catch (err) {
      return res.status(500).json({ error: 'فشل جلب الاستراتيجيات', details: err.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const strategy = req.body;
      if (!strategy?.name || !strategy?.alertEmail) {
        return res.status(400).json({ error: 'الاسم والإيميل مطلوبان' });
      }
      const strategies = await kvGet(KEY) || [];
      const newStrategy = {
        ...strategy,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        active: true,
      };
      strategies.push(newStrategy);
      await kvSet(KEY, strategies);
      return res.status(200).json({ success: true, strategy: newStrategy });
    } catch (err) {
      return res.status(500).json({ error: 'فشل حفظ الاستراتيجية', details: err.message });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: 'id مطلوب' });
      const strategies = await kvGet(KEY) || [];
      const filtered = strategies.filter(s => s.id !== id);
      await kvSet(KEY, filtered);
      return res.status(200).json({ success: true, remaining: filtered.length });
    } catch (err) {
      return res.status(500).json({ error: 'فشل حذف الاستراتيجية', details: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
