#!/usr/bin/env node
// GHARANA — one-run cloud setup.  Run from the GHARANA folder:   node scripts/setup-cloud.mjs
//
// It asks for 2–3 access tokens (typed by you, never shown on screen, never saved to GitHub), then:
//  1. creates (or finds) your Supabase project "gharana" in Sydney
//  2. creates the sync + notification tables and the 5-minute reminder scheduler
//  3. points Supabase sign-up emails at the live app
//  4. puts every key into Vercel (ALFRED, sync, notifications)
//  5. redeploys the app and checks that everything reports "configured"
// Safe to run again — every step skips or updates what already exists.

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { randomBytes } from 'node:crypto'
import { createInterface } from 'node:readline'

const APP_URL = 'https://gharana-blue.vercel.app'
const PROJECT = 'gharana'
const REGION = 'ap-southeast-2' // Sydney
const ENV_FILE = '.env.local'

const gold = (s) => `\x1b[33m${s}\x1b[0m`
const green = (s) => `\x1b[32m${s}\x1b[0m`
const red = (s) => `\x1b[31m${s}\x1b[0m`
const dim = (s) => `\x1b[2m${s}\x1b[0m`
const step = (n, s) => console.log(`\n${gold(`[${n}]`)} ${s}`)
const ok = (s) => console.log(`    ${green('✓')} ${s}`)
const info = (s) => console.log(`    ${dim(s)}`)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

if (!existsSync('package.json') || !existsSync('supabase/schema.sql')) {
  console.log(red('Run this from the GHARANA folder:  cd C:\\Users\\krish\\code\\GHARANA'))
  process.exit(1)
}

// ── .env.local (local secrets, gitignored) ───────────────────────────
const envText = existsSync(ENV_FILE) ? readFileSync(ENV_FILE, 'utf8') : ''
const env = Object.fromEntries(envText.split(/\r?\n/).filter((l) => /^[A-Z_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]))
function saveEnv(key, value) {
  env[key] = value
  let t = existsSync(ENV_FILE) ? readFileSync(ENV_FILE, 'utf8') : ''
  const re = new RegExp(`^${key}=.*$`, 'm')
  t = re.test(t) ? t.replace(re, `${key}=${value}`) : `${t.replace(/\s*$/, '\n')}${key}=${value}\n`
  writeFileSync(ENV_FILE, t)
}
for (const k of ['VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY', 'PUSH_CRON_SECRET']) {
  if (!env[k]) {
    console.log(red(`${ENV_FILE} is missing ${k}. Ask Claude to regenerate the notification keys.`))
    process.exit(1)
  }
}

// ── Hidden prompt ────────────────────────────────────────────────────
const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: !!process.stdin.isTTY })
const lines = rl[Symbol.asyncIterator]()
let masking = false
const origWrite = rl._writeToOutput?.bind(rl)
rl._writeToOutput = (s) => {
  if (!masking || s === '\r\n' || s === '\n') return origWrite ? origWrite(s) : process.stdout.write(s)
  process.stdout.write('•'.repeat(s.length))
}
async function ask(question, { hidden = false } = {}) {
  process.stdout.write(question)
  masking = hidden
  const { value } = await lines.next()
  masking = false
  if (!process.stdin.isTTY) process.stdout.write('\n')
  return String(value ?? '').trim()
}

// ── HTTP helper ──────────────────────────────────────────────────────
async function call(base, token, method, path, body) {
  const res = await fetch(base + path, {
    method,
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const text = await res.text()
  let data
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = text
  }
  return { status: res.status, ok: res.ok, data }
}
const errText = (r) => (typeof r.data === 'string' ? r.data : JSON.stringify(r.data)).slice(0, 300)

console.log(gold('\n  ═══ GHARANA · CLOUD SETUP ═══\n'))
console.log('You’ll paste up to three tokens. They show as dots, and are only sent to Supabase / Vercel.\n')
console.log(`${gold('A.')} Supabase token  →  https://supabase.com/dashboard/account/tokens`)
console.log('   (sign in with GitHub if you have no account) → "Generate new token" → name it gharana → copy')
console.log(`${gold('B.')} Vercel token    →  https://vercel.com/account/settings/tokens`)
console.log('   → "Create" → name gharana, scope = your account, expiry 1 day is fine → copy')
console.log(`${gold('C.')} Anthropic key (for ALFRED) → https://console.anthropic.com/settings/keys  ${dim('(Enter to skip)')}`)
console.log('')

const SB = await ask('Paste the Supabase token: ', { hidden: true })
const VC = await ask('Paste the Vercel token:   ', { hidden: true })
const AN = await ask('Paste the Anthropic key (or Enter to skip): ', { hidden: true })
rl.close()
if (!SB || !VC) {
  console.log(red('\nNeed both the Supabase and Vercel tokens. Run it again when you have them.'))
  process.exit(1)
}

const sb = (m, p, b) => call('https://api.supabase.com', SB, m, p, b)

try {
  // ── 1. Supabase project ─────────────────────────────────────────────
  step(1, 'Supabase project')
  let r = await sb('GET', '/v1/projects')
  if (!r.ok) throw new Error(`Supabase rejected the token (${r.status}). Make a new one and try again. ${errText(r)}`)
  let project = r.data.find((p) => p.name === PROJECT)
  if (project) ok(`Found your project "${PROJECT}"`)
  else {
    r = await sb('GET', '/v1/organizations')
    if (!r.ok || !r.data.length) throw new Error('No Supabase organisation found. Open supabase.com/dashboard once, create an organisation (free plan), then run this again.')
    const org = r.data[0]
    const dbPass = randomBytes(18).toString('base64url')
    saveEnv('SUPABASE_DB_PASSWORD', dbPass)
    info(`Creating "${PROJECT}" in Sydney under "${org.name}"…`)
    r = await sb('POST', '/v1/projects', { name: PROJECT, organization_id: org.id ?? org.slug, region: REGION, db_pass: dbPass })
    if (!r.ok) throw new Error(`Couldn't create the project (${r.status}): ${errText(r)}${r.status === 402 || /limit/i.test(errText(r)) ? '\nThe free plan allows 2 active projects — pause or delete an old one in the dashboard.' : ''}`)
    project = r.data
    ok('Project created (database password saved in .env.local)')
  }
  const ref = project.id ?? project.ref
  info('Waiting for the database to be ready (first time takes 1–3 minutes)…')
  for (let i = 0; i < 90; i++) {
    r = await sb('GET', `/v1/projects/${ref}`)
    if (r.ok && r.data.status === 'ACTIVE_HEALTHY') break
    if (r.ok && /INACTIVE|PAUSED/.test(r.data.status)) {
      info('Project is paused — restoring it…')
      await sb('POST', `/v1/projects/${ref}/restore`)
    }
    await sleep(5000)
  }
  ok('Database is up')

  // ── 2. Tables + scheduler ───────────────────────────────────────────
  step(2, 'Tables for sync + notifications, and the reminder scheduler')
  const runSql = async (query, label) => {
    for (let i = 0; i < 12; i++) {
      const q = await sb('POST', `/v1/projects/${ref}/database/query`, { query })
      if (q.ok) return ok(label)
      if (q.status >= 500 || /starting|not ready|timeout/i.test(errText(q))) {
        await sleep(5000)
        continue
      }
      throw new Error(`${label} failed (${q.status}): ${errText(q)}`)
    }
    throw new Error(`${label} timed out — run this script again in a minute.`)
  }
  await runSql(readFileSync('supabase/schema.sql', 'utf8'), 'Sync + notification tables')
  const secret = env.PUSH_CRON_SECRET.replace(/'/g, "''")
  await runSql(
    `create extension if not exists pg_cron;
create extension if not exists pg_net;
select cron.unschedule(jobid) from cron.job where jobname = 'gharana-push';
select cron.schedule('gharana-push', '*/5 * * * *', $$ select net.http_post(url := '${APP_URL}/api/push', headers := jsonb_build_object('content-type', 'application/json', 'x-cron-secret', '${secret}'), body := '{}'::jsonb) $$);`,
    'Reminder scheduler (every 5 minutes)',
  )

  // ── 3. Auth emails → the live app ───────────────────────────────────
  step(3, 'Sign-up emails')
  r = await sb('PATCH', `/v1/projects/${ref}/config/auth`, { site_url: APP_URL, uri_allow_list: `${APP_URL}/**` })
  if (r.ok) ok(`Confirmation links now open ${APP_URL}`)
  else info(`Couldn't set the Site URL automatically (${r.status}). In Supabase → Authentication → URL Configuration, set Site URL to ${APP_URL}.`)

  // ── 4. Keys ─────────────────────────────────────────────────────────
  r = await sb('GET', `/v1/projects/${ref}/api-keys?reveal=true`)
  if (!r.ok) throw new Error(`Couldn't read the project keys (${r.status}): ${errText(r)}`)
  const keys = r.data
  const anon = keys.find((k) => k.name === 'anon')?.api_key ?? keys.find((k) => k.type === 'publishable')?.api_key
  const service = keys.find((k) => k.name === 'service_role')?.api_key ?? keys.find((k) => k.type === 'secret')?.api_key
  if (!anon || !service) throw new Error('Supabase didn’t return the anon / service_role keys.')

  if (!env.ALFRED_ACCESS_KEY) saveEnv('ALFRED_ACCESS_KEY', randomBytes(9).toString('base64url'))

  // ── 5. Vercel ───────────────────────────────────────────────────────
  step(4, 'Putting the keys into Vercel')
  const vc = (m, p, b, team) => call('https://api.vercel.com', VC, m, `${p}${team ? `${p.includes('?') ? '&' : '?'}teamId=${team}` : ''}`, b)
  let team = null
  r = await vc('GET', `/v9/projects/${PROJECT}`)
  if (!r.ok) {
    if (r.status === 401 || r.status === 403) {
      const t = await vc('GET', '/v2/teams')
      for (const tm of t.data?.teams ?? []) {
        const tr = await vc('GET', `/v9/projects/${PROJECT}`, undefined, tm.id)
        if (tr.ok) {
          r = tr
          team = tm.id
          break
        }
      }
    }
    if (!r.ok) throw new Error(`Couldn't find the "${PROJECT}" project in Vercel (${r.status}). Make sure the token's scope is the account that owns it. ${errText(r)}`)
  }
  const vproj = r.data
  ok(`Found Vercel project "${vproj.name}"`)
  const vars = {
    SUPABASE_URL: `https://${ref}.supabase.co`,
    SUPABASE_ANON_KEY: anon,
    SUPABASE_SERVICE_ROLE_KEY: service,
    VAPID_PUBLIC_KEY: env.VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY: env.VAPID_PRIVATE_KEY,
    PUSH_CRON_SECRET: env.PUSH_CRON_SECRET,
    ALFRED_ACCESS_KEY: env.ALFRED_ACCESS_KEY,
    ...(AN ? { ANTHROPIC_API_KEY: AN } : {}),
  }
  r = await vc('POST', `/v10/projects/${vproj.id}/env?upsert=true`, Object.entries(vars).map(([key, value]) => ({ key, value, type: 'encrypted', target: ['production', 'preview'] })), team)
  if (!r.ok) throw new Error(`Vercel didn't accept the keys (${r.status}): ${errText(r)}`)
  ok(`${Object.keys(vars).length} keys saved: ${Object.keys(vars).join(', ')}`)
  if (!AN) info('ALFRED’s Anthropic key skipped — run this again with it when you have one.')

  // ── 6. Redeploy ─────────────────────────────────────────────────────
  step(5, 'Redeploying the app with the new keys')
  r = await vc('GET', `/v6/deployments?projectId=${vproj.id}&target=production&limit=1`, undefined, team)
  const last = r.data?.deployments?.[0]
  if (!last) throw new Error('No previous deployment found to redeploy. Push any commit to GitHub and Vercel will deploy with the keys.')
  r = await vc('POST', '/v13/deployments?forceNew=1', { name: vproj.name, deploymentId: last.uid, target: 'production' }, team)
  if (!r.ok) throw new Error(`Redeploy failed (${r.status}): ${errText(r)}. In Vercel → Deployments → ⋯ → Redeploy.`)
  const depId = r.data.id
  info('Building (about a minute)…')
  for (let i = 0; i < 60; i++) {
    await sleep(5000)
    const d = await vc('GET', `/v13/deployments/${depId}`, undefined, team)
    const st = d.data?.readyState ?? d.data?.status
    if (st === 'READY') break
    if (st === 'ERROR' || st === 'CANCELED') throw new Error('The redeploy failed in Vercel — open Vercel → Deployments to see why.')
  }
  ok('Live')

  // ── 7. Check ────────────────────────────────────────────────────────
  step(6, 'Checking the live server')
  const get = async (p) => (await fetch(`${APP_URL}${p}${p.includes('?') ? '&' : '?'}t=${Date.now()}`)).json().catch(() => ({}))
  const cfg = await get('/api/config')
  const push = await get('/api/push')
  const alf = await get('/api/alfred')
  console.log(`    ${cfg.SUPABASE_URL || cfg.supabaseUrl ? green('✓') : red('✗')} Sync`)
  console.log(`    ${push.configured ? green('✓') : red('✗')} Notifications`)
  console.log(`    ${alf.configured ? green('✓') : AN ? red('✗') : dim('–')} ALFRED${AN ? '' : ' (no Anthropic key yet)'}`)

  console.log(gold('\n  ═══ DONE ═══\n'))
  console.log('Your ALFRED house passphrase is saved in .env.local on the line ALFRED_ACCESS_KEY.')
  console.log('Open it with:  notepad .env.local   — then type that passphrase into GHARANA → Settings → ALFRED on each device.\n')
} catch (e) {
  console.log(red(`\n✗ ${e instanceof Error ? e.message : e}`))
  console.log(dim('Nothing is broken — fix the issue above and run the script again. It picks up where it left off.'))
  process.exit(1)
}
