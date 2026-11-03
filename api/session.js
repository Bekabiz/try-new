import { checkPin } from './_lib.js';

// Mints an ephemeral client secret for a realtime session that is used ONLY as a
// transcriber: server VAD with create_response=false means the model never speaks
// and never thinks — the client just receives input_audio_transcription events.
// All reasoning happens in /api/brain, all speech in /api/tts.
async function mint(model, apiKey) {
  const r = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      expires_after: { anchor: 'created_at', seconds: 3600 },
      session: {
        type: 'realtime',
        model,
        instructions: 'You are muted. Never respond.',
        output_modalities: ['text'],
        audio: {
          input: {
            noise_reduction: { type: 'far_field' },
            transcription: { model: 'gpt-4o-mini-transcribe', language: 'en' },
            turn_detection: {
              type: 'server_vad',
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 600,
              create_response: false,
              interrupt_response: false,
            },
          },
        },
      },
    }),
  });
  const body = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, body };
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST' && req.method !== 'GET') return res.status(405).json({ error: 'POST only' });
  if (!checkPin(req, res)) return;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'no api key configured' });

  const models = [process.env.REALTIME_MODEL || 'gpt-realtime-mini', 'gpt-realtime'];
  let last = null;
  for (const model of models) {
    const r = await mint(model, apiKey);
    if (r.ok && r.body?.value) {
      return res.status(200).json({ secret: r.body.value, model });
    }
    last = r;
  }
  return res.status(502).json({ error: 'openai session failed', detail: last?.body?.error?.message || last?.status });
}
