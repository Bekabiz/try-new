import CHUNKS from './_chunks.js';

const STOP = new Set(('a,an,the,and,or,but,of,to,in,on,for,with,as,by,at,from,is,was,were,are,be,been,that,this,these,those,it,its,he,his,she,her,they,their,we,our,you,your,i,my,not,no,do,did,does,had,has,have,will,would,can,could,what,which,who,when,where,how,why,about,into,than,then,there,also,more,most,some,such,so,if,s,t,book,says,said,tell,me,us,know').split(','));

export function tokens(s) {
  return (String(s).toLowerCase().match(/[a-z0-9]+/g) || []).filter(w => w.length > 1 && !STOP.has(w));
}

// Precomputed BM25 index over the whole book (602 chunks, pages 3-461)
const docs = CHUNKS.map(c => tokens(c.t));
const df = new Map();
for (const d of docs) for (const w of new Set(d)) df.set(w, (df.get(w) || 0) + 1);
const N = docs.length;
const avgLen = docs.reduce((a, d) => a + d.length, 0) / N;

export function search(query, k = 5, skip = 0) {
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
  const phrase = q.join(' ');
  const idx = [...scores.keys()].filter(i => scores[i] > 0);
  idx.sort((a, b) => scores[b] - scores[a]);
  const top = idx.slice(0, 24);
  for (const i of top) {
    if (q.length > 1 && CHUNKS[i].t.toLowerCase().includes(phrase)) scores[i] *= 1.5;
  }
  top.sort((a, b) => scores[b] - scores[a]);
  return top.slice(skip, skip + k).map(i => ({
    i,
    page: CHUNKS[i].p,
    chapter: CHUNKS[i].c,
    score: scores[i],
    text: CHUNKS[i].t,
  }));
}

// Retrieval context for the extractor: top chunks + their next neighbor, deduped,
// formatted with page markers. `round` widens the window on re-extraction.
export function contextFor(query, round = 0) {
  const hits = search(query, 5, round * 4);
  if (!hits.length) return { text: '', pages: [], topScore: 0 };
  const seen = new Set();
  const parts = [];
  const pages = [];
  for (const h of hits) {
    for (const j of [h.i, h.i + 1]) {
      if (j >= N || seen.has(j)) continue;
      seen.add(j);
      parts.push(`[page ${CHUNKS[j].p}]\n${CHUNKS[j].t}`);
      pages.push(CHUNKS[j].p);
    }
    if (parts.length >= 8) break;
  }
  return { text: parts.join('\n\n').slice(0, 24000), pages, topScore: hits[0].score };
}

export function checkPin(req, res) {
  const pin = String(req.body?.pin || req.query?.pin || req.headers['x-pin'] || '');
  if (!process.env.APP_PIN || pin !== process.env.APP_PIN) {
    res.status(401).json({ error: 'wrong pin' });
    return false;
  }
  return true;
}

// OpenAI chat call with JSON schema output and model fallback.
export async function llm({ models, system, user, schema, maxTokens = 500 }) {
  const apiKey = process.env.OPENAI_API_KEY;
  let lastErr = null;
  for (const model of models) {
    const body = {
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      max_completion_tokens: maxTokens,
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'out', strict: true, schema },
      },
    };
    if (/^gpt-5/.test(model)) body.reasoning_effort = 'minimal';
    else body.temperature = 0;
    try {
      const r = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { lastErr = j?.error?.message || `http ${r.status}`; continue; }
      const txt = j.choices?.[0]?.message?.content;
      if (!txt) { lastErr = 'empty completion'; continue; }
      return { out: JSON.parse(txt), model };
    } catch (e) {
      lastErr = String(e.message || e);
    }
  }
  throw new Error('llm failed: ' + lastErr);
}

export function clampWords(s, max = 12) {
  const words = String(s || '').trim().replace(/\s+/g, ' ').split(' ');
  return words.slice(0, max).join(' ');
}

export function canonKey(s) {
  return tokens(s).sort().join('-').slice(0, 64);
}

// Fuzzy-match a new key against existing state keys (token Jaccard).
export function matchKey(key, existing) {
  const a = new Set(key.split('-'));
  let best = null, bestScore = 0;
  for (const k of existing) {
    const b = new Set(k.split('-'));
    let inter = 0;
    for (const w of a) if (b.has(w)) inter++;
    const score = inter / (a.size + b.size - inter);
    if (score > bestScore) { bestScore = score; best = k; }
  }
  return bestScore >= 0.6 ? best : null;
}
