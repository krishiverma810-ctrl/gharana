// Shareable deco story cards (1080×1920) for wins, streaks, challenges and reports.
// Drawn on a canvas with the app's own fonts and today's palette, then shared via the
// iPhone share sheet (Instagram story, Messages…) or downloaded.

export interface CardSpec {
  kicker: string // small caps line at the top, e.g. "ACHIEVEMENT UNLOCKED"
  big: string // the hero text, e.g. "30" or "CLOSED"
  title: string // e.g. "DAY STREAK · BOXING"
  lines?: string[] // up to ~6 supporting lines
  footer?: string
}

const css = (v: string, fallback: string) => getComputedStyle(document.documentElement).getPropertyValue(v).trim() || fallback

export async function drawCard(spec: CardSpec): Promise<Blob> {
  await document.fonts?.ready
  const W = 1080
  const H = 1920
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const g = c.getContext('2d')!
  const accent = css('--accent', '#d4af37')
  const ink = css('--ink', '#f4ead5')
  const night = css('--night', '#0b0a08')

  // Background
  const bg = g.createLinearGradient(0, 0, 0, H)
  bg.addColorStop(0, night)
  bg.addColorStop(0.55, '#14110c')
  bg.addColorStop(1, night)
  g.fillStyle = bg
  g.fillRect(0, 0, W, H)

  // Sunburst behind the hero
  g.save()
  g.translate(W / 2, 760)
  g.strokeStyle = accent
  for (let i = 0; i < 72; i++) {
    g.globalAlpha = i % 2 ? 0.08 : 0.16
    g.lineWidth = i % 6 === 0 ? 4 : 2
    g.beginPath()
    g.moveTo(0, 0)
    const a = (i / 72) * Math.PI * 2
    g.lineTo(Math.cos(a) * 900, Math.sin(a) * 900)
    g.stroke()
  }
  g.restore()
  g.globalAlpha = 1

  // Stepped skyline at the bottom
  g.fillStyle = 'rgba(0,0,0,0.55)'
  let x = 0
  let seed = 7
  const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280)
  while (x < W) {
    const w = 60 + rnd() * 90
    const h = 140 + rnd() * 260
    g.fillRect(x, H - h, w, h)
    g.fillRect(x + w * 0.2, H - h - 30, w * 0.6, 30)
    x += w + 6
  }

  // Double frame with stepped corners
  g.strokeStyle = accent
  g.lineWidth = 4
  g.strokeRect(54, 54, W - 108, H - 108)
  g.globalAlpha = 0.45
  g.lineWidth = 2
  g.strokeRect(76, 76, W - 152, H - 152)
  g.globalAlpha = 1
  g.fillStyle = accent
  for (const [cx, cy, sx, sy] of [[54, 54, 1, 1], [W - 54, 54, -1, 1], [54, H - 54, 1, -1], [W - 54, H - 54, -1, -1]]) {
    g.fillRect(cx - (sx < 0 ? 44 : 0), cy - (sy < 0 ? 10 : 0), 44, 10)
    g.fillRect(cx - (sx < 0 ? 10 : 0), cy - (sy < 0 ? 44 : 0), 10, 44)
  }

  g.textAlign = 'center'
  // Wordmark
  g.fillStyle = accent
  g.font = '92px Limelight, serif'
  g.fillText('GHARANA', W / 2, 250)
  g.fillStyle = ink
  g.font = '30px "Poiret One", sans-serif'
  g.fillText(spaced('THE HOUSE BUILDS THE NAME'), W / 2, 310)

  // Kicker
  g.fillStyle = accent
  g.font = '40px "Poiret One", sans-serif'
  g.fillText(spaced(spec.kicker.toUpperCase()), W / 2, 520)

  // Hero
  g.fillStyle = ink
  let size = 300
  g.font = `${size}px Limelight, serif`
  while (g.measureText(spec.big).width > W - 220 && size > 90) {
    size -= 10
    g.font = `${size}px Limelight, serif`
  }
  g.shadowColor = accent
  g.shadowBlur = 40
  g.fillText(spec.big, W / 2, 760 + size * 0.35)
  g.shadowBlur = 0

  // Title
  g.fillStyle = accent
  g.font = '58px Limelight, serif'
  wrap(g, spec.title.toUpperCase(), W / 2, 1080, W - 240, 70)

  // Lines
  g.fillStyle = ink
  g.font = '44px "Cormorant Garamond", serif'
  let y = 1260
  for (const line of (spec.lines ?? []).slice(0, 6)) {
    y = wrap(g, line, W / 2, y, W - 240, 56) + 66
  }

  // Footer
  g.fillStyle = accent
  g.font = '30px "Poiret One", sans-serif'
  g.fillText(spaced((spec.footer ?? new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })).toUpperCase()), W / 2, H - 120)

  return new Promise((res) => c.toBlob((b) => res(b!), 'image/png'))
}

const spaced = (s: string) => s.split('').join(' ')

function wrap(g: CanvasRenderingContext2D, text: string, x: number, y: number, max: number, lh: number) {
  const words = text.split(' ')
  let line = ''
  for (const w of words) {
    const test = line ? `${line} ${w}` : w
    if (g.measureText(test).width > max && line) {
      g.fillText(line, x, y)
      line = w
      y += lh
    } else line = test
  }
  if (line) g.fillText(line, x, y)
  return y
}

/** Open the share sheet (or download if sharing files isn't supported). */
export async function shareCard(spec: CardSpec, filename = 'gharana.png') {
  const blob = await drawCard(spec)
  const file = new File([blob], filename, { type: 'image/png' })
  const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean }
  if (nav.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'GHARANA' })
      return
    } catch {
      /* cancelled — fall through to download */
    }
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 3000)
}
