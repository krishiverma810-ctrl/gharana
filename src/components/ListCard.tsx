import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, uid } from '../db/db'
import type { Item } from '../db/types'
import { toast } from '../store/ui'
import { Icon } from './Icon'
import { Empty } from './ui'
import { shortDate } from '../lib/time'

// A reusable list for any room: "things to bring back", "date ideas", "relatives"…
// Backed by the generic `items` table, so new lists never need a database change.

export function useItems(room: string, kind: string): Item[] {
  return useLiveQuery(() => db.items.where('[room+kind]').equals([room, kind]).toArray(), [room, kind]) ?? []
}

export async function addItem(room: string, kind: string, p: Partial<Item> & { text: string }) {
  const it: Item = { id: uid(), room, kind, at: Date.now(), ...p }
  await db.items.add(it)
  return it
}

export async function removeItem(it: Item) {
  await db.items.delete(it.id)
  toast(`Removed “${it.text}”`, () => db.items.put(it))
}

interface Props {
  room: string
  kind: string
  placeholder: string
  /** Show a second input (relation, note, place…). */
  subPlaceholder?: string
  /** Show a date picker; list is sorted by date. */
  withDate?: boolean
  /** Items can be ticked off. */
  checkable?: boolean
  empty?: string
  sort?: 'date' | 'added'
}

export function ListCard({ room, kind, placeholder, subPlaceholder, withDate, checkable, empty, sort }: Props) {
  const items = useItems(room, kind)
  const [text, setText] = useState('')
  const [sub, setSub] = useState('')
  const [date, setDate] = useState('')
  const sorted = [...items].sort((a, b) =>
    sort === 'date' || withDate ? (a.date ?? '9999').localeCompare(b.date ?? '9999') : Number(!!a.done) - Number(!!b.done) || b.at - a.at,
  )
  const add = async () => {
    if (!text.trim()) return
    await addItem(room, kind, { text: text.trim(), sub: sub.trim() || undefined, date: date || undefined, done: checkable ? false : undefined })
    setText('')
    setSub('')
    setDate('')
  }
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <input className="deco-input flex-1 min-w-0" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && !subPlaceholder && add()} placeholder={placeholder} />
          <button className="deco-btn px-3" onClick={add} aria-label="Add"><Icon name="plus" size={18} /></button>
        </div>
        {(subPlaceholder || withDate) && (
          <div className="flex gap-2">
            {subPlaceholder && <input className="deco-input flex-1 min-w-0" value={sub} onChange={(e) => setSub(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} placeholder={subPlaceholder} />}
            {withDate && <input type="date" className="deco-input font-num w-[150px]" value={date} onChange={(e) => setDate(e.target.value)} />}
          </div>
        )}
      </div>
      <ul className="flex flex-col">
        {sorted.map((it) => (
          <li key={it.id} className={`list-row ${it.done ? 'done' : ''}`}>
            {checkable && (
              <button className={`mini-check ${it.done ? 'on' : ''}`} aria-label={it.done ? 'Mark not done' : 'Mark done'} onClick={() => db.items.update(it.id, { done: !it.done })}>
                {it.done ? '✓' : ''}
              </button>
            )}
            <div className="flex-1 min-w-0">
              <div className="font-body text-[17px] leading-tight">{it.text}</div>
              {(it.sub || it.date) && (
                <div className="font-body text-[13px] text-[var(--ink-muted)]">
                  {it.date && <span className="font-num mr-2">{shortDate(it.date)}</span>}
                  {it.sub}
                </div>
              )}
            </div>
            <button className="icon-btn" aria-label="Delete" onClick={() => removeItem(it)}><Icon name="trash" size={15} /></button>
          </li>
        ))}
        {!items.length && <Empty>{empty ?? 'Nothing here yet.'}</Empty>}
      </ul>
    </div>
  )
}
