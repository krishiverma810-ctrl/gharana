import { CORRIDOR, ROOMS, WINGS, roomById } from '../config/rooms'
import { useSettings } from '../store/settings'
import { navigate } from '../app/router'
import { Icon } from '../components/Icon'

// THE CORRIDOR — arched doorways to every room in the Estate.

export function Corridor() {
  const hidden = useSettings((s) => s.hiddenRooms)
  const names = useSettings((s) => s.roomNames)
  return (
    <div>
      <header className="text-center mb-6">
        <h1 className="font-display text-[30px] text-[var(--accent)] tracking-[0.08em]">{CORRIDOR.name}</h1>
        <p className="font-deco text-[11px] tracking-[0.35em] text-[var(--ink-muted)]">EVERY DOOR IN THE ESTATE</p>
      </header>
      {WINGS.map((w) => {
        const rooms = ROOMS.filter((r) => r.wing === w.id && !hidden.includes(r.id))
        if (!rooms.length) return null
        return (
          <section key={w.id} className="mb-7">
            <h2 className="wing-title">
              <span>WING {w.numeral}</span> {w.name}
            </h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
              {rooms.map((r) => (
                <button key={r.id} className={`door ${r.phase > 1 ? 'locked' : ''}`} style={{ ['--room' as string]: r.accent }} onClick={() => navigate(r.path)}>
                  <span className="door-arch">
                    <Icon name={r.phase > 1 ? 'lock' : r.icon} size={24} />
                  </span>
                  <span className="door-name">{(names[r.id] || r.name).replace(/^THE /, '')}</span>
                  {r.phase > 1 && <span className="door-phase">PHASE {r.phase}</span>}
                </button>
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}

/** Placeholder for rooms that open in a later phase. */
export function ComingSoon({ id }: { id: string }) {
  const r = roomById(id)
  if (!r) return null
  return (
    <div className="text-center pt-10" style={{ ['--room' as string]: r.accent }}>
      <div className="big-door mx-auto">
        <Icon name={r.icon} size={46} />
      </div>
      <h1 className="font-display text-[30px] text-[var(--room)] mt-6">{r.name}</h1>
      <p className="font-body text-[18px] text-[var(--ink-muted)] mt-1">{r.blurb}</p>
      <p className="font-deco text-[12px] tracking-[0.35em] text-[var(--accent)] mt-5">THESE DOORS OPEN IN PHASE {r.phase}</p>
      <button className="deco-btn ghost px-6 mt-8" onClick={() => navigate('/corridor')}>
        Back to the Corridor
      </button>
    </div>
  )
}
