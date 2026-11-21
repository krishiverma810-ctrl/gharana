// Generates the PNG app icons from public/favicon.svg. Run: npm run icons
import sharp from 'sharp'
import { readFileSync } from 'node:fs'

const svg = readFileSync('public/favicon.svg')
const out = [
  ['public/pwa-192.png', 192],
  ['public/pwa-512.png', 512],
  ['public/apple-touch-icon.png', 180],
]
for (const [file, size] of out) {
  await sharp(svg, { density: 300 }).resize(size, size).png().toFile(file)
  console.log('wrote', file)
}
// Maskable: shrink artwork into the safe zone on a solid background
const inner = await sharp(svg, { density: 300 }).resize(400, 400).png().toBuffer()
await sharp({ create: { width: 512, height: 512, channels: 4, background: '#070605' } })
  .composite([{ input: inner, gravity: 'centre' }])
  .png()
  .toFile('public/pwa-maskable-512.png')
console.log('wrote public/pwa-maskable-512.png')
