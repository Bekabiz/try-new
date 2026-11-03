import { search } from './_lib.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const query = (req.method === 'POST' ? req.body?.query : req.query?.q) || '';
  if (!String(query).trim()) return res.status(400).json({ error: 'empty query' });
  const results = search(String(query).slice(0, 300), 3).map(r => ({
    page: r.page,
    chapter: r.chapter,
    text: r.text.length > 900 ? r.text.slice(0, 900) + '…' : r.text,
  }));
  return res.status(200).json({ results });
}
