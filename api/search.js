import CHUNKS from './_chunks.js';

const STOP = new Set(('a,an,the,and,or,but,of,to,in,on,for,with,as,by,at,from,is,was,were,are,be,been,that,this,these,those,it,its,he,his,she,her,they,their,we,our,you,your,i,my,not,no,do,did,does,had,has,have,will,would,can,could,what,which,who,when,where,how,why,about,into,than,then,there,also,more,most,some,such,so,if,s,t').split(','));

function tokens(s) {
  return (s.toLowerCase().match(/[a-z0-9]+/g) || []).filter(w => w.length > 1 && !STOP.has(w));
}

// Precompute document frequencies and token lists once per cold start
const docs = CHUNKS.map(c => tokens(c.t));
const df = new Map();
for (const d of docs) {
  for (const w of new Set(d)) df.set(w, (df.get(w) || 0) + 1);
}
const N = docs.length;
const avgLen = docs.reduce((a, d) => a + d.length, 0) / N;

function search(query, k = 3) {
  const q = tokens(query);
  if (!q.length) return [];
  const scores = new Float64Array(N);
  for (const w of new Set(q)) {
    const n = df.get(w);
    if (!n) continue;
    const idf = Math.log(1 + (N - n + 0.5) / (n + 0.5));
    for (let i = 0; i < N; i++) {
      let tf = 0;
      const d = docs[i];
      for (let j = 0; j < d.length; j++) if (d[j] === w) tf++;
      if (!tf) continue;
      scores[i] += idf * (tf * 2.2) / (tf + 1.2 * (0.25 + 0.75 * d.length / avgLen));
    }
  }
  // phrase bonus for consecutive query words
  const phrase = q.join(' ');
  const idx = [...scores.keys()].filter(i => scores[i] > 0);
  idx.sort((a, b) => scores[b] - scores[a]);
  const top = idx.slice(0, 12);
  for (const i of top) {
    if (q.length > 1 && CHUNKS[i].t.toLowerCase().includes(phrase)) scores[i] *= 1.5;
  }
  top.sort((a, b) => scores[b] - scores[a]);
  return top.slice(0, k).map(i => ({
    page: CHUNKS[i].p,
    chapter: CHUNKS[i].c,
    text: CHUNKS[i].t.length > 900 ? CHUNKS[i].t.slice(0, 900) + '…' : CHUNKS[i].t
  }));
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const query = (req.method === 'POST' ? req.body?.query : req.query?.q) || '';
  if (!query.trim()) return res.status(400).json({ error: 'empty query' });
  const results = search(String(query).slice(0, 300));
  return res.status(200).json({ results });
}
