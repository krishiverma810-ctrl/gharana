import Anthropic from '@anthropic-ai/sdk'

// ALFRED's brain — a Vercel serverless function at /api/alfred.
//
// • The Anthropic API key lives ONLY in Vercel → Settings → Environment Variables (ANTHROPIC_API_KEY).
// • ALFRED_ACCESS_KEY is a passphrase you choose; the app sends it in the `x-house-key` header so
//   strangers who find the URL can't spend your money.
// • The app runs the conversation loop and executes ALFRED's tools on the phone, so your data never
//   leaves the device except as the context snapshot inside each message.
//
// The system prompt below is frozen per deploy. Per-turn facts (date, mode, today's ticks…) arrive as
// mid-conversation system messages, so the conversation history stays append-only.

const MODEL = 'claude-opus-5-5'

const SYSTEM = `You are ALFRED, the butler and confidant who runs GHARANA — Krishi's personal self-improvement app. GHARANA means house / lineage; its motto is "THE HOUSE BUILDS THE NAME." Aesthetic: art deco, jazz age, Indian heritage.

WHO KRISHI IS
- 20, lives in Craigieburn, Melbourne. Second-year BSc at Monash (Physiology major), aiming for postgraduate dentistry (Melbourne DDS) — GAMSAT, GPA and experience matter.
- Works casual at Guzman y Gomez (GYG). Co-founded NAZARA, a heritage streetwear brand ("Under the Gaze"), with his mate Sidak. Starting a TikTok page, K.S. VOL. 1, with Sidak. Designs posters for the Melbourne Punjabi Association (MPA). Planning a TikTok-style educational "Scroll App".
- Long-term: become the man he needed at 14 — a family man with financial freedom, a garage of cars (an MX-5 first) and a lavish home. Right now he calls himself "bummy"; this app is how he fixes that.
- Girlfriend: Deepali. Family: Mum, Dad, a brother, Nonna. Mates include Sidak, Arnav, Syed, Nathan, Ravdeep, Aditya, Harkie.
- Lock-in: Melbourne → Gold Coast with the boys (2–8 Dec 2026) → reset → India with family and weddings (12 Dec 2026 – ~20 Jan 2027) → pre-semester. He is vegetarian-friendly, bulking, learns by explanation + retrieval (not note-taking).

YOUR CHARACTER
- A refined British butler: dry wit, formal warmth, unwavering loyalty. Call him "sir" or "Master Krishi" now and then, not every line.
- You are his ally, not his judge. Specific, practical, brief. On a phone screen: usually 2–6 sentences. Lists only when they help.
- Each turn a system message tells you the current MODE, whether DELULU is on, the reply LANGUAGE, and a snapshot of his day. Follow them:
  • butler — default, dry wit, formal.
  • coach — short, punchy, hype; training and discipline.
  • tutor — big picture first, then details, then quiz him with one question before moving on.
  • strategist — NAZARA, content, money, career moves; concrete next steps.
  • mate — casual banter; Aussie and desi slang allowed.
  • calm — slow, warm, gentle; for late nights or rough days.
- DELULU ON: you may roast his EXCUSES with affectionate wit — never him, his looks, his worth, family or relationships.
- If he seems genuinely low, drop every bit immediately and talk to him properly, like someone who cares. If anything suggests he might be in danger, self-harming or in crisis, be honest that you are an app, encourage him to reach out to family or a mate right now, and give the numbers: in Australia Lifeline 13 11 14 (or 000 in an emergency); in India Tele-MANAS 14416 (or 112 in an emergency).
- Language: reply in the requested language (English, Hindi, Punjabi in Gurmukhi script, or Hinglish). Always understand all of them.

USING THE HOUSE
- The snapshot is the truth about his day. Never invent numbers, streaks or data that isn't in it. If you don't know, say so or ask.
- You can act on the app with tools (log water/protein, tick or skip habits, log money and workouts, set the Big 3, start a focus timer, capture ideas, open rooms, add Wildcard missions). When he asks you to do something, do it with the tool rather than describing it, then confirm in one short line. Use habit ids exactly as given in the snapshot.
- Money: log only what he tells you; never guess amounts. You are not a licensed financial adviser — for investing questions, give general education only and suggest a qualified adviser.
- Health: general fitness and nutrition guidance is fine; for injuries, symptoms or medication, tell him to see a doctor or physio.
- Photos: when he sends a fit, food or progress photo, give honest, kind, specific feedback.`

/** Tools ALFRED can call. They run on the phone (see src/lib/alfred.ts → TOOL_RUNNERS). */
const TOOLS: Anthropic.Beta.BetaTool[] = [
  {
    name: 'log_fuel',
    description: 'Add water (ml) or protein (g) to today’s Fuel Station. Use a negative amount to correct a mistake.',
    input_schema: { type: 'object', properties: { kind: { type: 'string', enum: ['water', 'protein'] }, amount: { type: 'number', description: 'ml for water, grams for protein' } }, required: ['kind', 'amount'] },
  },
  {
    name: 'set_habit',
    description: 'Tick or untick one of today’s habits. For yes/no habits use value 1 (done) or 0 (undo). For minute/count habits, value is the new total for today.',
    input_schema: { type: 'object', properties: { habit_id: { type: 'string' }, value: { type: 'number' } }, required: ['habit_id', 'value'] },
  },
  {
    name: 'skip_habit',
    description: 'Skip a habit today with a reason (uses a streak freeze if he has one).',
    input_schema: { type: 'object', properties: { habit_id: { type: 'string' }, reason: { type: 'string' } }, required: ['habit_id', 'reason'] },
  },
  {
    name: 'log_money',
    description: 'Log money spent, earned, or saved into a fund. Amount in AUD unless currency is INR.',
    input_schema: {
      type: 'object',
      properties: {
        kind: { type: 'string', enum: ['expense', 'income', 'saving'] },
        amount: { type: 'number' },
        currency: { type: 'string', enum: ['AUD', 'INR'] },
        category: { type: 'string', description: 'e.g. Food, Transport, Fits, Going out, GYG pay' },
        note: { type: 'string' },
        goal_id: { type: 'string', description: 'For savings: the fund id from the snapshot' },
      },
      required: ['kind', 'amount'],
    },
  },
  {
    name: 'log_workout',
    description: 'Log a training session.',
    input_schema: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['gym', 'boxing', 'sport', 'run', 'swim', 'walk', 'mobility', 'other'] },
        minutes: { type: 'number' },
        intensity: { type: 'number', description: '1–5' },
        notes: { type: 'string' },
      },
      required: ['type', 'minutes'],
    },
  },
  {
    name: 'set_big3',
    description: 'Set today’s Big 3 — the three things that make today a win.',
    input_schema: { type: 'object', properties: { items: { type: 'array', items: { type: 'string' }, maxItems: 3 } }, required: ['items'] },
  },
  {
    name: 'start_focus',
    description: 'Start a focus timer.',
    input_schema: { type: 'object', properties: { minutes: { type: 'number' }, label: { type: 'string' } }, required: ['minutes'] },
  },
  {
    name: 'capture',
    description: 'Save an idea or note to a destination.',
    input_schema: { type: 'object', properties: { text: { type: 'string' }, dest: { type: 'string', enum: ['inbox', 'nazara', 'ksvol1', 'scrollapp'] } }, required: ['text', 'dest'] },
  },
  {
    name: 'open_room',
    description: 'Open a room in the app.',
    input_schema: { type: 'object', properties: { room: { type: 'string', description: 'room id, e.g. lounge, rites, blueprint, patrol, vault, concierge, calendar, wildcard, family, deepali, settings' } }, required: ['room'] },
  },
  {
    name: 'add_missions',
    description: 'Add new Wildcard missions to the deck.',
    input_schema: {
      type: 'object',
      properties: {
        missions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              suit: { type: 'string', enum: ['cook', 'boxing', 'keys', 'sport', 'mind', 'style', 'reset', 'social', 'travel', 'family', 'content'] },
              text: { type: 'string' },
              where: { type: 'string', enum: ['a', 'h', 'g', 'i'], description: 'a anywhere, h home Melbourne, g Gold Coast, i India' },
              minutes: { type: 'number' },
            },
            required: ['suit', 'text', 'where', 'minutes'],
          },
        },
      },
      required: ['missions'],
    },
  },
]

const client = new Anthropic() // reads ANTHROPIC_API_KEY from the environment

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } })
}

/** Constant-time string compare so the passphrase can't be guessed by timing. */
function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false
  let r = 0
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return r === 0
}

export async function GET() {
  return json({ ok: true, configured: Boolean(process.env.ANTHROPIC_API_KEY && process.env.ALFRED_ACCESS_KEY), model: MODEL })
}

export async function POST(request: Request) {
  const houseKey = process.env.ALFRED_ACCESS_KEY
  if (!process.env.ANTHROPIC_API_KEY || !houseKey) return json({ error: 'not_configured', message: 'ALFRED isn’t set up on the server yet (missing environment variables).' }, 503)
  if (!safeEqual(request.headers.get('x-house-key') ?? '', houseKey)) return json({ error: 'bad_key', message: 'Wrong house key. Check Settings → ALFRED.' }, 401)

  let body: { messages?: unknown; effort?: string }
  try {
    body = await request.json()
  } catch {
    return json({ error: 'bad_request', message: 'Invalid JSON.' }, 400)
  }
  if (!Array.isArray(body.messages) || body.messages.length === 0 || body.messages.length > 600) {
    return json({ error: 'bad_request', message: 'Messages must be a non-empty list.' }, 400)
  }
  const effort = (['low', 'medium', 'high'] as const).find((e) => e === body.effort) ?? 'low'

  try {
    const response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      system: SYSTEM,
      tools: TOOLS,
      messages: body.messages as Anthropic.Beta.BetaMessageParam[],
      cache_control: { type: 'ephemeral' },
      output_config: { effort },
      // If a thinking block can't be replayed (e.g. the system prompt changed in a new deploy),
      // drop it instead of failing the request.
      thinking: { type: 'adaptive', block_binding: { prefix_mismatch_behavior: 'drop_block' } },
      // On a safety decline, the API retries on a fallback model automatically.
      fallbacks: 'default',
      betas: ['server-side-fallback-2026-07-01', 'thinking-binding-controls-2026-08-01'],
    })
    return json({
      content: response.content,
      stop_reason: response.stop_reason,
      stop_details: response.stop_details ?? null,
      model: response.model,
      usage: {
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens,
        cache_creation_input_tokens: response.usage.cache_creation_input_tokens ?? 0,
        cache_read_input_tokens: response.usage.cache_read_input_tokens ?? 0,
      },
    })
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) return json({ error: 'anthropic_auth', message: 'The Anthropic API key on the server is invalid.' }, 502)
    if (error instanceof Anthropic.PermissionDeniedError) return json({ error: 'anthropic_permission', message: 'The Anthropic account can’t use this model (check billing / credits).' }, 502)
    if (error instanceof Anthropic.RateLimitError) return json({ error: 'rate_limited', message: 'ALFRED is being rate-limited. Try again in a minute.' }, 429)
    if (error instanceof Anthropic.BadRequestError) return json({ error: 'bad_request', message: error.message }, 400)
    if (error instanceof Anthropic.APIError) return json({ error: 'anthropic_error', message: `Anthropic error ${error.status ?? ''}`.trim() }, 502)
    return json({ error: 'server_error', message: 'Something went wrong on the server.' }, 500)
  }
}
