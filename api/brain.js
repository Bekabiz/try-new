import { search, contextFor, checkPin, llm, clampWords, canonKey, matchKey } from './_lib.js';

const ROUTER_MODELS = ['gpt-4.1-mini', 'gpt-4o-mini'];
const EXTRACT_MODELS = ['gpt-5-mini', 'gpt-4.1-mini', 'gpt-4o-mini'];

const ROUTER_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    action: { type: 'string', enum: ['cue', 'check', 'silent'] },
    key: { type: ['string', 'null'] },
    query: { type: ['string', 'null'] },
    list: { type: 'boolean' },
    claim: { type: ['string', 'null'] },
  },
  required: ['action', 'key', 'query', 'list', 'claim'],
};

const EXTRACT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    found: { type: 'boolean' },
    facts: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: { t: { type: 'string' }, p: { type: 'number' } },
        required: ['t', 'p'],
      },
    },
  },
  required: ['found', 'facts'],
};

const VERIFY_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    evidence: { type: ['string', 'null'] },
    wrong: { type: 'boolean' },
    fix: { type: ['string', 'null'] },
    p: { type: ['number', 'null'] },
  },
  required: ['evidence', 'wrong', 'fix', 'p'],
};

function routerPrompt(state) {
  const known = Object.keys(state.topics).slice(-40);
  return `You route utterances for a hidden earphone prompter. Bereket is explaining the book "The Lever of Riches" by Joel Mokyr (economic history of technology: inventions, watermills, windmills, printing, steam, China, Islam, Europe, Britain, Industrial Revolution, economic growth, creativity) to friends in a room. The mic hears everyone. Decide if the prompter should act.

Return action:
- "cue": someone asks a question about the book or its subject matter (any phrasing, any speaker), OR Bereket names/announces a book topic and trails off (e.g. "So, the watermills..."), OR someone asks for more / repeats an earlier question. Set "key": a short canonical id of the question/topic in 2-5 lowercase words (same meaning MUST give the same key; REUSE a key from KNOWN KEYS if the meaning matches one). Set "query": 3-8 strong search keywords for the book text. Set "list": true only if it asks to enumerate types/kinds/reasons/factors/a numbered set.
- "check": the utterance ASSERTS a specific checkable fact about the book's subject (a date, number, century, or who invented/did something) and is not a question. Set "claim" to that asserted fact, verbatim meaning. Also set "query" to keywords for it.
- "silent": everything else: greetings, chatter, jokes, logistics, incomplete fragments, talk unrelated to the book, filler while Bereket is mid-explanation with no new ask.

KNOWN KEYS: ${known.join(', ') || '(none yet)'}
CURRENT TOPIC: ${state.current || '(none)'}
RECENT UTTERANCES: ${state.recent.join(' | ') || '(none)'}

Prefer "cue" when in doubt between cue and silent only if a question mark intent is clear. Short follow-ups like "and also?", "more", "go on", "what else" are "cue" with key = CURRENT TOPIC's key.`;
}

const EXTRACT_RULES = `You write earphone cue cards from book excerpts of "The Lever of Riches" by Joel Mokyr. Use ONLY the excerpts given. Never use outside knowledge.

Rules:
- Produce 5 to 10 facts about the request, ordered: fact 1 directly answers the request; then supporting details in logical teaching order (definition/main idea, dates, names, examples, significance).
- Each fact is a telegraphic cue of AT MOST 12 words. No full sentences needed. No filler.
- Copy every number, date, century and proper name EXACTLY as written in the excerpts, digit for digit. If a number is not in the excerpts, state the fact without a number. NEVER estimate or invent.
- The excerpts contain OCR typos in words and names; write the correct standard spelling of well-known names (e.g. "Domesclay" is "Domesday"), but NEVER change any digit.
- Each fact carries "p": the page number of the excerpt it came from.
- LIST REQUESTS (types/kinds/reasons/factors/"the N ..."): fact 1 must be ONLY the names of all items, comma-separated. Then one fact per item with its detail, in order.
- Every fact must state ACTUAL book content (a thing, date, name, mechanism, consequence). NEVER write meta-descriptions, outlines or category labels like "uses, numbers, spread" — that is forbidden.
- If the excerpts do not actually cover the request, return found=false with empty facts.
- Do not repeat any fact whose meaning is already in AVOID (facts already spoken).`;

const VERIFY_RULES = `You fact-check one spoken claim against excerpts from "The Lever of Riches" by Joel Mokyr. Use ONLY the excerpts.
- FIRST: copy into "evidence" the exact excerpt sentence(s) that talk about the same fact as the claim (null if the excerpts do not cover it).
- The excerpts contain OCR typos; a near-identical name is the same thing (e.g. "Domesclay Book" = "Domesday Book"). Digits are reliable.
- THEN compare every date, number, century, name and attribution in the claim against the evidence, one by one, digit by digit.
- wrong=true if the excerpts give a DIFFERENT value for the same fact (e.g. claim says 1286 but excerpt says 1086; claim says Watt but excerpt says Savery). A single wrong digit makes it wrong.
- If wrong, "fix" is the correction in at most 8 words, using the exact value from the excerpts (e.g. "1086, not 1286" or "Savery, not Watt"), and "p" its page.
- wrong=false only if the excerpts agree with the claim, or genuinely do not cover it.`;

function freshState() {
  return { topics: {}, cues: [], current: null, recent: [] };
}

function normState(s) {
  const st = (s && typeof s === 'object') ? s : {};
  return {
    topics: st.topics && typeof st.topics === 'object' ? st.topics : {},
    cues: Array.isArray(st.cues) ? st.cues.slice(-80) : [],
    current: typeof st.current === 'string' ? st.current : null,
    recent: Array.isArray(st.recent) ? st.recent.slice(-4) : [],
  };
}

async function extractFacts(request, listMode, avoid, round) {
  const ctx = contextFor(request, round);
  if (!ctx.text) return { found: false, facts: [] };
  const user = `REQUEST: ${request}${listMode ? '\n(This is a LIST request: fact 1 = names of all items only.)' : ''}
AVOID (already spoken): ${avoid.length ? avoid.join(' // ') : '(none)'}

BOOK EXCERPTS:
${ctx.text}`;
  const { out, model } = await llm({
    models: EXTRACT_MODELS,
    system: EXTRACT_RULES,
    user,
    schema: EXTRACT_SCHEMA,
    maxTokens: 3000,
  });
  const facts = (out.facts || [])
    .map(f => ({ t: clampWords(f.t, 12), p: Number(f.p) || ctx.pages[0] }))
    .filter(f => f.t);
  return { found: !!out.found && facts.length > 0, facts, model, pages: ctx.pages };
}

function speakResponse(res, state, cue, page, why, dbg) {
  state.cues.push(cue);
  state.cues = state.cues.slice(-80);
  return res.status(200).json({ speak: true, cue, page: page || null, why, state, ...(dbg && Object.keys(dbg).length ? { debug: dbg } : {}) });
}

function silentResponse(res, state, why, dbg) {
  return res.status(200).json({ speak: false, why, state, ...(dbg && Object.keys(dbg).length ? { debug: dbg } : {}) });
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (!checkPin(req, res)) return;
  if (!process.env.OPENAI_API_KEY) return res.status(500).json({ error: 'no api key configured' });

  const utterance = String(req.body?.utterance || '').trim().slice(0, 600);
  const debug = !!req.body?.debug;
  const dbg = {};
  const state = req.body?.reset ? freshState() : normState(req.body?.state);
  if (!utterance) return silentResponse(res, state, 'empty');

  state.recent = [...state.recent, utterance].slice(-4);

  // Cheap code gate: single words that are not continuation requests stay silent.
  const lw = utterance.toLowerCase();
  const isMore = /^(more|go on|next|and|continue|again|what else|and also)\b/.test(lw) && utterance.split(/\s+/).length <= 4;
  if (utterance.split(/\s+/).length < 2 && !isMore) return silentResponse(res, state, 'too-short');

  try {
    // 1. Route
    let route;
    if (isMore && state.current) {
      route = { action: 'cue', key: state.current, query: null, list: false, claim: null };
    } else {
      const r = await llm({
        models: ROUTER_MODELS,
        system: routerPrompt(state),
        user: utterance,
        schema: ROUTER_SCHEMA,
        maxTokens: 150,
      });
      route = r.out;
      if (debug) dbg.route = { ...route, model: r.model };
    }

    if (route.action === 'silent' || (!route.key && !route.claim)) {
      return silentResponse(res, state, 'router-silent', dbg);
    }

    // 2. Fact-check path
    if (route.action === 'check') {
      if (!/\d|century|thousand|hundred|million/i.test(utterance) && !/invent|discover|built|wrote|introduc/i.test(utterance)) {
        return silentResponse(res, state, 'check-skipped');
      }
      const ctx = contextFor((route.query || '') + ' ' + (route.claim || utterance), 0);
      if (!ctx.text) return silentResponse(res, state, 'check-no-context');
      const v = await llm({
        models: EXTRACT_MODELS,
        system: VERIFY_RULES,
        user: `SPOKEN: ${utterance}\nCLAIM TO CHECK: ${route.claim || utterance}\n\nBOOK EXCERPTS:\n${ctx.text}`,
        schema: VERIFY_SCHEMA,
        maxTokens: 2000,
      });
      const out = v.out;
      if (debug) dbg.verify = { ...out, model: v.model, ctxPages: ctx.pages };
      if (out.wrong && out.fix) {
        return speakResponse(res, state, clampWords(out.fix, 12), out.p, 'correction', dbg);
      }
      return silentResponse(res, state, 'claim-ok', dbg);
    }

    // 3. Cue path with code-enforced memory
    let key = canonKey(route.key || route.query || utterance);
    if (!key) return silentResponse(res, state, 'no-key');
    const matched = state.topics[key] ? key : matchKey(key, Object.keys(state.topics));
    if (matched) key = matched;
    state.current = key;

    let topic = state.topics[key];
    if (!topic) {
      // New topic/question: extract an ordered fact list from the whole book.
      const request = `${route.key || ''} — ${utterance}`;
      const ex = await extractFacts(request, !!route.list, state.cues.slice(-20), 0);
      const { found, facts } = ex;
      if (debug) dbg.extract = { model: ex.model, pages: ex.pages, found };
      if (!found) {
        return speakResponse(res, state, 'not in the book', null, 'not-found', dbg);
      }
      topic = { facts, given: 0, round: 0, req: request, list: !!route.list };
      state.topics[key] = topic;
    }

    // Advance pointer, skipping anything already spoken this session.
    while (topic.given < topic.facts.length && state.cues.includes(topic.facts[topic.given].t)) {
      topic.given++;
    }

    if (topic.given >= topic.facts.length) {
      // Exhausted: widen retrieval and extract new facts, excluding everything given.
      topic.round = (topic.round || 0) + 1;
      if (topic.round <= 3) {
        const avoid = topic.facts.map(f => f.t).concat(state.cues.slice(-20));
        const { found, facts } = await extractFacts(topic.req, false, avoid, topic.round);
        const fresh = facts.filter(f => !state.cues.includes(f.t) && !topic.facts.some(g => g.t === f.t));
        if (found && fresh.length) {
          topic.facts = topic.facts.concat(fresh);
        }
      }
      if (topic.given >= topic.facts.length) {
        return speakResponse(res, state, 'book gives nothing more on this', null, 'exhausted');
      }
    }

    const fact = topic.facts[topic.given];
    topic.given++;
    return speakResponse(res, state, fact.t, fact.p, topic.given === 1 ? 'first-fact' : 'next-fact', dbg);
  } catch (e) {
    // Fail safe: stay silent rather than break the session.
    return res.status(200).json({ speak: false, why: 'error', error: String(e.message || e), state });
  }
}
