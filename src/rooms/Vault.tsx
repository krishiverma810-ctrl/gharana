import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { motion } from 'framer-motion'
import { DecoCard } from '../components/DecoCard'
import { Empty, Field, Ring, RoomHeader, Segmented, Sheet } from '../components/ui'
import { Icon } from '../components/Icon'
import { db, uid } from '../db/db'
import { useHouse } from '../app/house'
import { useSettings } from '../store/settings'
import { celebrate, toast } from '../store/ui'
import { win } from '../lib/sound'
import { monthKey, shortDate } from '../lib/time'
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../config/defaults'
import { LOCATIONS } from '../config/lockin'
import type { Goal, Txn } from '../db/types'

// THE VAULT — goals, income, spending, wishlist, AUD ↔ INR.

const aud = (n: number) => `$${n.toLocaleString('en-AU', { maximumFractionDigits: n % 1 ? 2 : 0 })}`

function TxnForm({ kind, goals, onClose }: { kind: Txn['kind']; goals: Goal[]; onClose: () => void }) {
  const { today, location } = useHouse()
  const rate = useSettings((s) => s.inrPerAud)
  const [k, setK] = useState<Txn['kind']>(kind)
  const [amount, setAmount] = useState('')
  const [inr, setInr] = useState(location === 'india')
  const [category, setCategory] = useState(kind === 'income' ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0])
  const [goalId, setGoalId] = useState(goals[0]?.id ?? '')
  const [note, setNote] = useState('')
  const [day, setDay] = useState(today)
  const n = Number(amount) || 0
  const audAmt = inr ? Math.round((n / rate) * 100) / 100 : n

  const save = async () => {
    if (n <= 0) return
    const t: Txn = {
      id: uid(), day, amount: audAmt, kind: k, category: k === 'saving' ? 'Savings' : category, note: note.trim() || undefined,
      goalId: k === 'saving' ? goalId : undefined, inr: inr ? n : undefined, place: location, at: Date.now(),
    }
    await db.txns.add(t)
    if (k === 'saving') {
      const g = goals.find((x) => x.id === goalId)
      const saved = (await db.txns.where('goalId').equals(goalId).toArray()).reduce((a, x) => a + x.amount, 0)
      if (g && saved >= g.target && saved - t.amount < g.target) {
        win()
        celebrate()
        toast(`${g.name} — FUNDED. Secure the bag.`)
      } else toast(`${aud(audAmt)} into ${g?.name}`, () => db.txns.delete(t.id))
    } else toast(`${k === 'income' ? '+' : '−'}${aud(audAmt)} ${category}`, () => db.txns.delete(t.id))
    onClose()
  }

  return (
    <div className="flex flex-col gap-4">
      <Segmented<Txn['kind']> value={k} onChange={(v) => { setK(v); setCategory(v === 'income' ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0]) }} options={[{ value: 'expense', label: 'Spent' }, { value: 'income', label: 'Earned' }, { value: 'saving', label: 'Saved' }]} />
      <Field label={inr ? 'AMOUNT (₹ INR)' : 'AMOUNT ($ AUD)'}>
        <div className="flex gap-2">
          <input className="deco-input flex-1 font-num text-[24px]" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus placeholder="0" />
          <button className={`chip ${inr ? 'on' : ''}`} onClick={() => setInr(!inr)}>₹</button>
        </div>
        {inr && n > 0 && <span className="font-num text-[13px] text-[var(--ink-muted)]">≈ {aud(audAmt)} at ₹{rate}/$</span>}
      </Field>
      {k === 'saving' ? (
        <Field label="INTO">
          <div className="flex flex-wrap gap-2">
            {goals.map((g) => <button key={g.id} className={`chip ${goalId === g.id ? 'on' : ''}`} onClick={() => setGoalId(g.id)}>{g.emoji} {g.name}</button>)}
          </div>
        </Field>
      ) : (
        <Field label="CATEGORY">
          <div className="flex flex-wrap gap-2">
            {(k === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map((c) => <button key={c} className={`chip ${category === c ? 'on' : ''}`} onClick={() => setCategory(c)}>{c}</button>)}
          </div>
        </Field>
      )}
      <Field label="NOTE"><input className="deco-input w-full" value={note} onChange={(e) => setNote(e.target.value)} placeholder="GYG burrito, fortnight pay…" /></Field>
      <Field label="DATE"><input type="date" className="deco-input w-full font-num" value={day} onChange={(e) => setDay(e.target.value)} /></Field>
      <button className="deco-btn" onClick={save} disabled={n <= 0}>Save</button>
    </div>
  )
}

function GoalEditor({ goal, onClose }: { goal: Goal | 'new'; onClose: () => void }) {
  const [g, setG] = useState<Goal>(goal === 'new' ? { id: uid(), name: '', emoji: '💰', target: 1000, order: 99 } : goal)
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-[80px_1fr] gap-2">
        <Field label="ICON"><input className="deco-input w-full text-center text-[22px]" value={g.emoji} onChange={(e) => setG({ ...g, emoji: e.target.value })} /></Field>
        <Field label="NAME"><input className="deco-input w-full" value={g.name} onChange={(e) => setG({ ...g, name: e.target.value })} /></Field>
      </div>
      <Field label="TARGET ($ AUD)"><input className="deco-input w-full font-num" inputMode="decimal" value={g.target} onChange={(e) => setG({ ...g, target: Number(e.target.value) || 0 })} /></Field>
      <div className="flex gap-2">
        <button className="deco-btn flex-1" onClick={async () => { if (g.name.trim()) { await db.goals.put(g); onClose() } }}>Save</button>
        {goal !== 'new' && (
          <button className="deco-btn ghost" onClick={async () => { await db.goals.update(g.id, { archived: true }); toast(`${g.name} archived`, () => db.goals.update(g.id, { archived: false })); onClose() }}>Archive</button>
        )}
      </div>
    </div>
  )
}

function Converter() {
  const rate = useSettings((s) => s.inrPerAud)
  const update = useSettings((s) => s.update)
  const [a, setA] = useState('100')
  const [dir, setDir] = useState<'aud' | 'inr'>('aud')
  const n = Number(a) || 0
  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2 items-center">
        <input className="deco-input flex-1 font-num text-[22px]" inputMode="decimal" value={a} onChange={(e) => setA(e.target.value)} />
        <button className="chip on" onClick={() => setDir(dir === 'aud' ? 'inr' : 'aud')}>{dir === 'aud' ? '$ → ₹' : '₹ → $'}</button>
      </div>
      <div className="font-num text-[30px] text-[var(--accent)] text-center">
        {dir === 'aud' ? `₹${Math.round(n * rate).toLocaleString('en-IN')}` : aud(Math.round((n / rate) * 100) / 100)}
      </div>
      <label className="flex items-center gap-2 justify-center font-body text-[15px] text-[var(--ink-muted)]">
        Rate: $1 = ₹
        <input className="deco-input w-20 text-center font-num" inputMode="decimal" defaultValue={rate} onBlur={(e) => Number(e.target.value) > 0 && update({ inrPerAud: Number(e.target.value) })} />
        <span className="text-[12px]">(set manually — works offline)</span>
      </label>
    </div>
  )
}

function Wishlist() {
  const wishes = useLiveQuery(() => db.wishes.toArray(), []) ?? []
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const add = async () => {
    if (!name.trim()) return
    await db.wishes.add({ id: uid(), name: name.trim(), price: Number(price) || 0, secured: false, at: Date.now() })
    setName('')
    setPrice('')
  }
  const open = wishes.filter((w) => !w.secured)
  const done = wishes.filter((w) => w.secured)
  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <input className="deco-input flex-1" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jordan 4s, cologne…" />
        <input className="deco-input w-20 font-num" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="$" />
        <button className="deco-btn px-3" onClick={add} aria-label="Add to cop list"><Icon name="plus" size={18} /></button>
      </div>
      <ul className="flex flex-col gap-1">
        {[...open, ...done].map((w) => (
          <li key={w.id} className={`wish-row ${w.secured ? 'secured' : ''}`}>
            <span className="flex-1 font-body text-[17px]">{w.name}</span>
            <span className="font-num text-[14px] text-[var(--ink-muted)]">{w.price ? aud(w.price) : ''}</span>
            <button className={`chip ${w.secured ? 'on' : ''}`} onClick={async () => { await db.wishes.update(w.id, { secured: !w.secured }); if (!w.secured) { win(); celebrate() } }}>
              {w.secured ? 'SECURED' : 'Secure'}
            </button>
            <button className="icon-btn" aria-label="Delete" onClick={async () => { await db.wishes.delete(w.id); toast('Removed', () => db.wishes.put(w)) }}><Icon name="trash" size={16} /></button>
          </li>
        ))}
        {!wishes.length && <Empty>The cop list is empty. Dream bigger.</Empty>}
      </ul>
    </div>
  )
}

export function Vault() {
  const { today, location, away } = useHouse()
  const budget = useSettings((s) => s.monthlyBudget)
  const goals = (useLiveQuery(() => db.goals.orderBy('order').toArray(), []) ?? []).filter((g) => !g.archived)
  const txns = useLiveQuery(() => db.txns.orderBy('day').reverse().toArray(), []) ?? []
  const [form, setForm] = useState<Txn['kind'] | null>(window.location.hash === '#spend' ? 'expense' : null)
  const [editGoal, setEditGoal] = useState<Goal | 'new' | null>(null)
  const [opened, setOpened] = useState(false)

  useEffect(() => {
    if (window.location.hash) history.replaceState(null, '', window.location.pathname)
    const t = setTimeout(() => setOpened(true), 50)
    return () => clearTimeout(t)
  }, [])

  const mk = monthKey(today)
  const month = txns.filter((t) => monthKey(t.day) === mk)
  const spent = month.filter((t) => t.kind === 'expense').reduce((a, t) => a + t.amount, 0)
  const earned = month.filter((t) => t.kind === 'income').reduce((a, t) => a + t.amount, 0)
  const saved = month.filter((t) => t.kind === 'saving').reduce((a, t) => a + t.amount, 0)
  const bills = month.filter((t) => t.kind === 'expense' && t.category === 'Bills / rent').reduce((a, t) => a + t.amount, 0)
  const byCat = new Map<string, number>()
  for (const t of month) if (t.kind === 'expense') byCat.set(t.category, (byCat.get(t.category) ?? 0) + t.amount)
  const here = txns.filter((t) => t.kind === 'expense' && t.place === location)
  const savedFor = (g: Goal) => txns.filter((t) => t.goalId === g.id).reduce((a, t) => a + t.amount, 0)

  return (
    <div className="flex flex-col gap-5">
      <motion.div initial={{ rotateY: -70, opacity: 0 }} animate={opened ? { rotateY: 0, opacity: 1 } : {}} transition={{ duration: 0.7, ease: 'easeOut' }} style={{ transformOrigin: 'left center', perspective: 800 }}>
        <RoomHeader id="vault" subtitle={`${new Date(`${mk}-01T00:00:00Z`).toLocaleDateString('en-AU', { month: 'long', timeZone: 'UTC' })}: ${aud(spent)} spent of ${aud(budget)}`} />
      </motion.div>

      <div className="grid grid-cols-3 gap-2">
        <button className="deco-btn" onClick={() => setForm('expense')}>− Spent</button>
        <button className="deco-btn" onClick={() => setForm('income')}>+ Earned</button>
        <button className="deco-btn" onClick={() => setForm('saving')}>Saved</button>
      </div>

      <div className="bp-layout">
        <div className="flex flex-col gap-5">
          <DecoCard title="THE FUNDS">
            <div className="grid grid-cols-2 gap-4">
              {goals.map((g) => {
                const s = savedFor(g)
                return (
                  <button key={g.id} className="flex flex-col items-center gap-1" onClick={() => setEditGoal(g)}>
                    <Ring pct={s / g.target} size={104}>
                      <div>
                        <div className="text-[22px]">{g.emoji}</div>
                        <div className="font-num text-[13px]">{Math.round((s / g.target) * 100)}%</div>
                      </div>
                    </Ring>
                    <div className="font-body text-[15px] text-center leading-tight">{g.name}</div>
                    <div className="font-num text-[12px] text-[var(--ink-muted)]">{aud(s)} / {aud(g.target)}</div>
                  </button>
                )
              })}
            </div>
            <button className="deco-btn ghost w-full mt-4" onClick={() => setEditGoal('new')}>New fund</button>
          </DecoCard>

          <DecoCard title="THIS MONTH">
            <div className="grid grid-cols-3 text-center">
              <div><div className="font-num text-[20px] text-[#7fc48a]">{aud(earned)}</div><div className="field-label">EARNED</div></div>
              <div><div className="font-num text-[20px]">{aud(spent)}</div><div className="field-label">SPENT</div></div>
              <div><div className="font-num text-[20px] text-[var(--accent)]">{aud(saved)}</div><div className="field-label">SAVED</div></div>
            </div>
            <div className="meter mt-4"><div style={{ width: `${Math.min(100, (spent / budget) * 100)}%`, background: spent > budget ? '#c0573e' : undefined }} /></div>
            <div className="flex justify-between font-num text-[12px] text-[var(--ink-muted)] mt-1">
              <span>Budget {aud(budget)}</span>
              <span>{spent > budget ? `${aud(spent - budget)} over` : `${aud(budget - spent)} left`}</span>
            </div>
            <ul className="mt-4 flex flex-col gap-1">
              {[...byCat.entries()].sort((a, b) => b[1] - a[1]).map(([c, v]) => (
                <li key={c} className="flex justify-between font-body text-[16px]"><span>{c}</span><span className="font-num">{aud(v)}</span></li>
              ))}
            </ul>
            <div className="mt-3 font-body text-[15px] text-[var(--ink-muted)]">Bills / rent contribution this month: <span className="font-num text-[var(--ink)]">{aud(bills)}</span></div>
            {away && (
              <div className="mt-2 font-body text-[15px] text-[var(--ink-muted)]">
                Spent in {LOCATIONS[location].name} so far: <span className="font-num text-[var(--accent)]">{aud(here.reduce((a, t) => a + t.amount, 0))}</span>
              </div>
            )}
          </DecoCard>
        </div>

        <div className="flex flex-col gap-5">
          <DecoCard title="THE LEDGER">
            <ul className="flex flex-col gap-1 max-h-[360px] overflow-y-auto">
              {txns.slice(0, 40).map((t) => (
                <li key={t.id} className="flex items-center gap-2">
                  <span className="font-num text-[12px] text-[var(--ink-muted)] w-16">{t.day === today ? 'Today' : shortDate(t.day).replace(/^\w+ /, '')}</span>
                  <span className="flex-1 font-body text-[16px] truncate">{t.kind === 'saving' ? `→ ${goals.find((g) => g.id === t.goalId)?.name ?? 'Fund'}` : t.category}{t.note ? ` · ${t.note}` : ''}</span>
                  <span className={`font-num text-[15px] ${t.kind === 'income' ? 'text-[#7fc48a]' : t.kind === 'saving' ? 'text-[var(--accent)]' : ''}`}>
                    {t.kind === 'income' ? '+' : t.kind === 'expense' ? '−' : ''}{aud(t.amount)}{t.inr ? <small className="text-[var(--ink-muted)]"> ₹{t.inr}</small> : null}
                  </span>
                  <button className="icon-btn" aria-label="Delete" onClick={async () => { await db.txns.delete(t.id); toast('Entry removed', () => db.txns.put(t)) }}>
                    <Icon name="trash" size={15} />
                  </button>
                </li>
              ))}
              {!txns.length && <Empty>Log your first GYG pay to open the ledger.</Empty>}
            </ul>
          </DecoCard>
          <DecoCard title="AUD ↔ INR"><Converter /></DecoCard>
          <DecoCard title="THE COP LIST"><Wishlist /></DecoCard>
        </div>
      </div>

      <Sheet open={!!form} onClose={() => setForm(null)} title={form === 'income' ? 'MONEY IN' : form === 'saving' ? 'INTO THE VAULT' : 'MONEY OUT'}>
        {form && <TxnForm kind={form} goals={goals} onClose={() => setForm(null)} />}
      </Sheet>
      <Sheet open={!!editGoal} onClose={() => setEditGoal(null)} title={editGoal === 'new' ? 'NEW FUND' : 'EDIT FUND'}>
        {editGoal && <GoalEditor goal={editGoal} onClose={() => setEditGoal(null)} />}
      </Sheet>
    </div>
  )
}
