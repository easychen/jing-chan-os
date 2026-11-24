// Zero-dependency ISO/IEC 18004 QR Code encoder (Byte mode, Error Correction Level L, Versions 1..10)
const GF_EXP = new Uint8Array(512)
const GF_LOG = new Uint8Array(256)
{
  let x = 1
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x
    GF_LOG[x] = i
    x <<= 1
    if (x & 0x100) x ^= 0x11d
  }
  for (let i = 255; i < 512; i++) GF_EXP[i] = GF_EXP[i - 255]
}

function gfMul(a, b) {
  if (a === 0 || b === 0) return 0
  return GF_EXP[GF_LOG[a] + GF_LOG[b]]
}

function rsGeneratorPoly(ecCount) {
  let poly = [1]
  for (let i = 0; i < ecCount; i++) {
    const next = new Array(poly.length + 1).fill(0)
    const factor = GF_EXP[i]
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= poly[j]
      next[j + 1] ^= gfMul(poly[j], factor)
    }
    poly = next
  }
  return poly
}

function rsRemainder(data, ecCount) {
  const gen = rsGeneratorPoly(ecCount)
  const buf = new Uint8Array(data.length + ecCount)
  buf.set(data)
  for (let i = 0; i < data.length; i++) {
    const coef = buf[i]
    if (coef !== 0) {
      for (let j = 1; j < gen.length; j++) {
        buf[i + j] ^= gfMul(gen[j], coef)
      }
    }
  }
  return buf.slice(data.length)
}

// Version specs for EC Level L: [totalCodewords, ecPerBlock, g1Blocks, g1Data, g2Blocks, g2Data, alignCoords]
const VERSION_L = {
  1:  [26,   7, 1, 19, 0, 0, []],
  2:  [44,  10, 1, 34, 0, 0, [6, 18]],
  3:  [70,  15, 1, 55, 0, 0, [6, 22]],
  4:  [100, 20, 1, 80, 0, 0, [6, 26]],
  5:  [134, 26, 1, 108, 0, 0, [6, 30]],
  6:  [172, 18, 2, 68, 0, 0, [6, 34]],
  7:  [196, 20, 2, 78, 0, 0, [6, 22, 38]],
  8:  [242, 24, 2, 97, 0, 0, [6, 24, 42]],
  9:  [292, 30, 2, 116, 0, 0, [6, 26, 46]],
  10: [346, 18, 2, 68, 2, 69, [6, 28, 50]],
}

// Precomputed 15-bit format info for EC Level L (01) and masks 0..7 (with BCH + XOR 0x5412)
const FORMAT_BITS_L = [
  0x77c4, 0x72f3, 0x7daa, 0x789d, 0x662f, 0x6318, 0x6c41, 0x6976,
]

// Version info bits for versions 7..10
const VERSION_BITS = {
  7: 0x07c94,
  8: 0x085bc,
  9: 0x09a99,
  10: 0x0a4d3,
}

function chooseVersion(byteLen) {
  for (let v = 1; v <= 10; v++) {
    const [, , g1b, g1d, g2b, g2d] = VERSION_L[v]
    const totalDataBytes = g1b * g1d + g2b * g2d
    const countBits = v <= 9 ? 8 : 16
    const overheadBits = 4 + countBits
    if (overheadBits + byteLen * 8 <= totalDataBytes * 8) return v
  }
  throw new Error('QR payload too long (max ~271 bytes for V10-L)')
}

function encodeDataCodewords(bytes, version) {
  const [, ecPerBlock, g1b, g1d, g2b, g2d] = VERSION_L[version]
  const totalData = g1b * g1d + g2b * g2d
  const bits = []
  const pushBits = (val, len) => {
    for (let i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1)
  }
  pushBits(0b0100, 4) // Byte mode
  pushBits(bytes.length, version <= 9 ? 8 : 16)
  for (const b of bytes) pushBits(b, 8)
  // Terminator up to 4 zeros
  const capBits = totalData * 8
  for (let i = 0; i < 4 && bits.length < capBits; i++) bits.push(0)
  while (bits.length % 8 !== 0) bits.push(0)
  const data = new Uint8Array(totalData)
  for (let i = 0; i < bits.length / 8; i++) {
    let v = 0
    for (let j = 0; j < 8; j++) v = (v << 1) | bits[i * 8 + j]
    data[i] = v
  }
  let padIdx = bits.length / 8
  const pads = [0xec, 0x11]
  let p = 0
  while (padIdx < totalData) {
    data[padIdx++] = pads[p++ & 1]
  }

  // Split into blocks & compute RS EC
  const dataBlocks = []
  const ecBlocks = []
  let offset = 0
  for (let i = 0; i < g1b; i++) {
    const blk = data.slice(offset, offset + g1d)
    offset += g1d
    dataBlocks.push(blk)
    ecBlocks.push(rsRemainder(blk, ecPerBlock))
  }
  for (let i = 0; i < g2b; i++) {
    const blk = data.slice(offset, offset + g2d)
    offset += g2d
    dataBlocks.push(blk)
    ecBlocks.push(rsRemainder(blk, ecPerBlock))
  }

  // Interleave
  const out = []
  const maxDataLen = Math.max(g1d, g2d)
  for (let i = 0; i < maxDataLen; i++) {
    for (const blk of dataBlocks) if (i < blk.length) out.push(blk[i])
  }
  for (let i = 0; i < ecPerBlock; i++) {
    for (const ec of ecBlocks) out.push(ec[i])
  }
  return out
}

export function generateQrMatrix(text) {
  const bytes = Buffer.from(String(text || ''), 'utf8')
  const version = chooseVersion(bytes.length)
  const size = version * 4 + 17
  const mat = Array.from({ length: size }, () => new Int8Array(size).fill(-1))
  const isFunc = Array.from({ length: size }, () => new Uint8Array(size))

  const setFunc = (r, c, val) => {
    if (r < 0 || c < 0 || r >= size || c >= size) return
    mat[r][c] = val ? 1 : 0
    isFunc[r][c] = 1
  }

  // Finder patterns + separators
  const drawFinder = (tr, tc) => {
    for (let dr = -1; dr <= 7; dr++) {
      for (let dc = -1; dc <= 7; dc++) {
        const r = tr + dr
        const c = tc + dc
        if (r < 0 || c < 0 || r >= size || c >= size) continue
        const inOuter = dr >= 0 && dr <= 6 && dc >= 0 && dc <= 6
        const onBorder = dr === 0 || dr === 6 || dc === 0 || dc === 6
        const inCore = dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4
        setFunc(r, c, inOuter && (onBorder || inCore) ? 1 : 0)
      }
    }
  }
  drawFinder(0, 0)
  drawFinder(0, size - 7)
  drawFinder(size - 7, 0)

  // Alignment patterns
  const aligns = VERSION_L[version][6]
  for (const ar of aligns) {
    for (const ac of aligns) {
      if ((ar <= 8 && ac <= 8) || (ar <= 8 && ac >= size - 9) || (ar >= size - 9 && ac <= 8)) continue
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          const dist = Math.max(Math.abs(dr), Math.abs(dc))
          setFunc(ar + dr, ac + dc, dist !== 1 ? 1 : 0)
        }
      }
    }
  }

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    setFunc(6, i, (i & 1) === 0 ? 1 : 0)
    setFunc(i, 6, (i & 1) === 0 ? 1 : 0)
  }

  // Dark module
  setFunc(size - 8, 8, 1)

  // Reserve format info areas
  for (let i = 0; i <= 8; i++) {
    if (!isFunc[8][i]) setFunc(8, i, 0)
    if (!isFunc[i][8]) setFunc(i, 8, 0)
  }
  for (let i = size - 8; i < size; i++) {
    setFunc(8, i, 0)
    setFunc(i, 8, 0)
  }

  // Version info (V >= 7)
  if (version >= 7 && VERSION_BITS[version]) {
    const vb = VERSION_BITS[version]
    for (let i = 0; i < 18; i++) {
      const bit = (vb >>> i) & 1
      const r = Math.floor(i / 3)
      const c = size - 11 + (i % 3)
      setFunc(r, c, bit)
      setFunc(c, r, bit)
    }
  }

  // Place data bits in zigzag
  const codewords = encodeDataCodewords(bytes, version)
  const bitStream = []
  for (const cw of codewords) {
    for (let b = 7; b >= 0; b--) bitStream.push((cw >>> b) & 1)
  }

  let bitIdx = 0
  let up = true
  for (let col = size - 1; col >= 1; col -= 2) {
    if (col === 6) col = 5
    for (let step = 0; step < size; step++) {
      const row = up ? (size - 1 - step) : step
      for (let dc = 0; dc < 2; dc++) {
        const c = col - dc
        if (!isFunc[row][c]) {
          mat[row][c] = bitIdx < bitStream.length ? bitStream[bitIdx++] : 0
        }
      }
    }
    up = !up
  }

  // Apply mask 0 (clean & universally scannable) or pick lowest-penalty mask 0..7
  const maskFn = [
    (r, c) => ((r + c) % 2) === 0,
    (r) => (r % 2) === 0,
    (_, c) => (c % 3) === 0,
    (r, c) => ((r + c) % 3) === 0,
    (r, c) => ((Math.floor(r / 2) + Math.floor(c / 3)) % 2) === 0,
    (r, c) => (((r * c) % 2) + ((r * c) % 3)) === 0,
    (r, c) => ((((r * c) % 2) + ((r * c) % 3)) % 2) === 0,
    (r, c) => ((((r + c) % 2) + ((r * c) % 3)) % 2) === 0,
  ]

  const applyMask = (mIdx) => {
    const out = mat.map((row) => Int8Array.from(row))
    const fn = maskFn[mIdx]
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (!isFunc[r][c] && fn(r, c)) out[r][c] ^= 1
      }
    }
    // Write format bits
    const fmt = FORMAT_BITS_L[mIdx]
    const coords1 = [
      [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 7], [8, 8],
      [7, 8], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8],
    ]
    const coords2 = [
      [size - 1, 8], [size - 2, 8], [size - 3, 8], [size - 4, 8], [size - 5, 8], [size - 6, 8], [size - 7, 8],
      [8, size - 8], [8, size - 7], [8, size - 6], [8, size - 5], [8, size - 4], [8, size - 3], [8, size - 2], [8, size - 1],
    ]
    for (let i = 0; i < 15; i++) {
      const bit = (fmt >>> (14 - i)) & 1
      out[coords1[i][0]][coords1[i][1]] = bit
      out[coords2[i][0]][coords2[i][1]] = bit
    }
    return out
  }

  let best = null
  let bestScore = Infinity
  for (let m = 0; m < 8; m++) {
    const cand = applyMask(m)
    let score = 0
    for (let r = 0; r < size; r++) {
      let run = 1
      for (let c = 1; c < size; c++) {
        if (cand[r][c] === cand[r][c - 1]) run++
        else { if (run >= 5) score += 3 + (run - 5); run = 1 }
      }
      if (run >= 5) score += 3 + (run - 5)
    }
    for (let c = 0; c < size; c++) {
      let run = 1
      for (let r = 1; r < size; r++) {
        if (cand[r][c] === cand[r - 1][c]) run++
        else { if (run >= 5) score += 3 + (run - 5); run = 1 }
      }
      if (run >= 5) score += 3 + (run - 5)
    }
    if (score < bestScore) {
      bestScore = score
      best = cand
    }
  }
  return best.map((row) => Array.from(row))
}

export function renderQrSvg(text, { margin = 3, dark = '#0F172A', light = '#FFFFFF' } = {}) {
  const matrix = generateQrMatrix(text)
  const n = matrix.length
  const total = n + margin * 2
  const rects = []
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (matrix[r][c] === 1) {
        rects.push(`<rect x="${c + margin}" y="${r + margin}" width="1" height="1" fill="${dark}"/>`)
      }
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" shape-rendering="crispEdges"><rect width="${total}" height="${total}" fill="${light}"/>${rects.join('')}</svg>`
}
