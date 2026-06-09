import fs from 'fs'
import path from 'path'
import zlib from 'zlib'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.resolve(__dirname, '..', 'public')

function crc32(buf) {
  let crc = 0xFFFFFFFF
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i]
    for (let j = 0; j < 8; j++) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xEDB88320 : crc >>> 1
    }
  }
  return (crc ^ 0xFFFFFFFF) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const t = Buffer.from(type, 'ascii')
  const raw = Buffer.concat([t, data])
  const c = Buffer.alloc(4)
  c.writeUInt32BE(crc32(raw))
  return Buffer.concat([len, t, data, c])
}

function solidPNG(w, h, bgR, bgG, bgB, circleR, circleG, circleB, radius) {
  const raw = Buffer.alloc(w * h * 3 + h)
  const cx = w / 2
  const cy = h / 2
  let off = 0
  for (let y = 0; y < h; y++) {
    raw[off++] = 0
    for (let x = 0; x < w; x++) {
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2)
      if (dist < radius) {
        raw[off++] = circleR
        raw[off++] = circleG
        raw[off++] = circleB
      } else {
        raw[off++] = bgR
        raw[off++] = bgG
        raw[off++] = bgB
      }
    }
  }

  const compressed = zlib.deflateSync(raw)
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0)
  ihdr.writeUInt32BE(h, 4)
  ihdr[8] = 8
  ihdr[9] = 2
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0

  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', compressed), chunk('IEND', Buffer.alloc(0))])
}

function createIcon(size) {
  const r = Math.round(size * 0.38)
  return solidPNG(size, size, 0x25, 0x63, 0xEB, 0xFF, 0xFF, 0xFF, r)
}

fs.mkdirSync(OUT, { recursive: true })

for (const size of [192, 512]) {
  const png = createIcon(size)
  const outPath = path.join(OUT, `icon-${size}x${size}.png`)
  fs.writeFileSync(outPath, png)
  console.log(`Generated ${outPath} (${png.length} bytes)`)
}

console.log('PWA icons generated successfully')
