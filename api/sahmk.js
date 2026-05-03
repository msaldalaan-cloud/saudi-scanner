// api/sahmk.js — Vercel Serverless Proxy
const API_KEY  = process.env.SAHMK_API_KEY;
const BASE_URL = 'https://app.sahmk.sa/api/v1';

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!API_KEY) return res.status(500).json({ error: 'SAHMK_API_KEY غير مضبوط' });

  const { path = 'quote/2222', ...queryParams } = req.query;

  // إذا ما في from/to، نحسبهم تلقائياً لجلب ~300 شمعة
  if (path.includes('historical') && !queryParams.from) {
    const to   = new Date();
    const from = new Date();
    const period = queryParams.period || 'daily';

    if (period === 'daily') {
      from.setFullYear(from.getFullYear() - 2);   // سنتين = ~500 يوم تداول
    } else if (period === 'weekly') {
      from.setFullYear(from.getFullYear() - 7);   // 7 سنوات = ~350 أسبوع
    } else if (period === 'monthly') {
      from.setFullYear(from.getFullYear() - 25);  // 25 سنة = 300 شهر
    }

    queryParams.from = from.toISOString().split('T')[0];
    queryParams.to   = to.toISOString().split('T')[0];
    delete queryParams.limit;
  }

  const url = new URL(`${BASE_URL}/${path}/`);
  // تأكد إن from/to يحتويان على تاريخ فقط (بدون وقت)
  if(queryParams.from) queryParams.from = queryParams.from.split('T')[0].split(' ')[0];
  if(queryParams.to)   queryParams.to   = queryParams.to.split('T')[0].split(' ')[0];
  Object.entries(queryParams).forEach(([k, v]) => url.searchParams.set(k, v));

  try {
    const response = await fetch(url.toString(), {
      headers: { 'X-API-Key': API_KEY, 'Accept': 'application/json' },
    });
    const text = await response.text();
    if (!text || text.trim().startsWith('<')) {
      return res.status(502).json({ error: 'sahmk رجع HTML', url: url.toString() });
    }
    const data = JSON.parse(text);
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60');
    return res.status(response.status).json(data);
  } catch (err) {
    return res.status(502).json({ error: 'فشل الاتصال', details: err.message });
  }
}
