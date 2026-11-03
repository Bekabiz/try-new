import { checkPin } from './_lib.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (!checkPin(req, res)) return;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'no api key configured' });

  const text = String(req.body?.text || '').trim().slice(0, 200);
  if (!text) return res.status(400).json({ error: 'empty text' });

  const r = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o-mini-tts',
      voice: process.env.TTS_VOICE || 'ash',
      input: text,
      speed: 1.15,
      response_format: 'mp3',
      instructions:
        'You are a discreet prompter speaking into one earpiece. Whisper-quiet, low pitch, fast, flat and calm. No emphasis, no emotion, just the words, quickly.',
    }),
  });
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    return res.status(502).json({ error: 'tts failed', detail: j?.error?.message || r.status });
  }
  const buf = Buffer.from(await r.arrayBuffer());
  res.setHeader('Content-Type', 'audio/mpeg');
  res.setHeader('Content-Length', String(buf.length));
  return res.status(200).send(buf);
}
