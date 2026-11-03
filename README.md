# Book Voice Helper

A phone web app that listens to a live conversation about **The Lever of Riches** (Joel Mokyr)
and whispers short factual cues (3–12 words) into Bereket's earphone. Live at
https://book-voice-helper.vercel.app (PIN-gated).

## Architecture: 3 stages, deterministic where it matters

```
phone mic ──WebRTC──> OpenAI Realtime (TRANSCRIBE ONLY, never thinks, never speaks)
                 │ transcript of every utterance
                 ▼
          POST /api/brain  ──  router model: question / topic / claim / ignore
                 │             BM25 search over the WHOLE book (602 passages, pages 3–461)
                 │             extractor model: ordered fact list, ≤12 words, verbatim numbers
                 │             CODE-enforced pointer: repeat question => NEXT fact, always
                 ▼
          POST /api/tts  ──  gpt-4o-mini-tts whisper voice reads the cue verbatim
```

Why it can't repeat itself or invent numbers anymore:

- **Memory is code, not model memory.** The client carries a state object
  (topics → ordered facts → pointer of facts already given). The pointer only moves
  forward; a repeated question is matched to its topic key and served `facts[pointer++]`.
- **Facts are extracted once per topic** from the book's own pages, with the page number
  attached, and numbers/dates/names copied verbatim. Topic not covered → "not in the book".
- **List questions** ("the four types of economic growth") return all item names as the
  first cue, then one item's details per repeat.
- **Wrong spoken facts** (date/number/name/attribution) are checked against retrieved
  pages; only a short fix is whispered ("1086, not 1286").
- The realtime voice model is configured with `create_response: false` — it transcribes
  and nothing else, so it cannot improvise.

## Files

- `api/_chunks.js` — the whole book, 602 text passages with page + chapter numbers
- `api/_lib.js` — BM25 index, retrieval context builder, OpenAI helper, PIN check
- `api/brain.js` — router → memory → extraction → verification pipeline
- `api/session.js` — mints ephemeral realtime token (transcription-only session)
- `api/tts.js` — whisper-voice TTS proxy
- `api/search.js` — raw book search (debugging)
- `public/index.html` — phone UI: PIN gate, start/stop, auto-reconnect, wake lock,
  cue display, reset-memory button

## Models

- Transcription: `gpt-4o-mini-transcribe` (via realtime session, far-field noise reduction)
- Router: `gpt-4.1-mini` (fallback `gpt-4o-mini`)
- Extractor/verifier: `gpt-5-mini` (fallback `gpt-4.1-mini`, `gpt-4o-mini`)
- Voice: `gpt-4o-mini-tts`, whisper instructions

Rough cost: ≈ $0.20–0.35 per 30-minute session.

## Env vars (set on Vercel)

- `OPENAI_API_KEY`
- `APP_PIN`

## Debugging

```
GET  /api/session?pin=XXXX                  -> { secret, model }
POST /api/brain  { pin, utterance, state, debug:true }
POST /api/tts    { pin, text }              -> mp3
GET  /api/search?q=watermill                -> raw passages
```
