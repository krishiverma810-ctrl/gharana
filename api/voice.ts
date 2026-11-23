// OPTIONAL premium voice for ALFRED — /api/voice
//
// Only used if OPENAI_API_KEY is set in Vercel. Without it, GHARANA uses the free voices built
// into the phone/browser (speech recognition + speechSynthesis), which work offline too.
//
//   POST /api/voice?op=tts   { text, voice }        → audio/mpeg (spoken reply)
//   POST /api/voice?op=stt   multipart "audio" file → { text } (transcript; Hindi/Punjabi too)
//
// Audio is never stored: it's streamed to OpenAI and the result returned.

const TTS_MODEL = process.env.OPENAI_TTS_MODEL ?? 'gpt-4o-mini-tts'
const STT_MODEL = process.env.OPENAI_STT_MODEL ?? 'gpt-4o-transcribe'
const VOICES = ['alloy', 'ash', 'ballad', 'coral', 'echo', 'fable', 'onyx', 'nova', 'sage', 'shimmer', 'verse']

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } })
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false
  let r = 0
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return r === 0
}

export async function POST(request: Request) {
  const key = process.env.OPENAI_API_KEY
  const houseKey = process.env.ALFRED_ACCESS_KEY
  if (!key || !houseKey) return json({ error: 'voice_not_configured' }, 503)
  if (!safeEqual(request.headers.get('x-house-key') ?? '', houseKey)) return json({ error: 'bad_key' }, 401)
  const op = new URL(request.url).searchParams.get('op')

  if (op === 'tts') {
    const { text, voice } = (await request.json().catch(() => ({}))) as { text?: string; voice?: string }
    if (!text) return json({ error: 'no_text' }, 400)
    const r = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        model: TTS_MODEL,
        voice: VOICES.includes(voice ?? '') ? voice : 'fable',
        input: text.slice(0, 3000),
        instructions: 'Speak as a refined, warm British butler: calm, articulate, dry wit, unhurried.',
        response_format: 'mp3',
      }),
    })
    if (!r.ok) return json({ error: 'tts_failed', status: r.status }, 502)
    return new Response(r.body, { headers: { 'content-type': 'audio/mpeg', 'cache-control': 'no-store' } })
  }

  if (op === 'stt') {
    const form = await request.formData().catch(() => null)
    const audio = form?.get('audio')
    if (!(audio instanceof Blob)) return json({ error: 'no_audio' }, 400)
    const out = new FormData()
    out.append('file', audio, 'speech.webm')
    out.append('model', STT_MODEL)
    const r = await fetch('https://api.openai.com/v1/audio/transcriptions', { method: 'POST', headers: { authorization: `Bearer ${key}` }, body: out })
    if (!r.ok) return json({ error: 'stt_failed', status: r.status }, 502)
    const data = (await r.json()) as { text?: string }
    return json({ text: data.text ?? '' })
  }

  return json({ error: 'bad_op' }, 400)
}
