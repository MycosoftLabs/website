"use client"

const ROW_COUNT = 50
const STRIP_WIDTH = 500
const PIXEL_SIZE = 5

const GRAYSCALE_COLORS: [number, number, number][] = [
  [5, 5, 5],
  [28, 28, 28],
  [78, 78, 78],
  [178, 178, 178],
  [248, 248, 248],
]

function seededRandom(seed: number) {
  let value = seed

  return () => {
    value |= 0
    value = (value + 0x6d2b79f5) | 0
    let next = Math.imul(value ^ (value >>> 15), 1 | value)
    next = (next + Math.imul(next ^ (next >>> 7), 61 | next)) ^ next

    return ((next ^ (next >>> 14)) >>> 0) / 4294967296
  }
}

function colorFromPercent(gradientProgressPercent: number, random: () => number) {
  const bucketSize = 100 / GRAYSCALE_COLORS.length
  const randomFromBucketRange = random() * (bucketSize * 2) - bucketSize
  const colorPercent = gradientProgressPercent + randomFromBucketRange

  if (colorPercent <= 20) return GRAYSCALE_COLORS[0]
  if (colorPercent <= 40) return GRAYSCALE_COLORS[1]
  if (colorPercent <= 60) return GRAYSCALE_COLORS[2]
  if (colorPercent <= 80) return GRAYSCALE_COLORS[3]

  return GRAYSCALE_COLORS[4]
}

function createRowBackground(rowIndex: number) {
  const random = seededRandom(agaricRowSeed(rowIndex))
  const gradientProgress = (rowIndex / ROW_COUNT) * 100
  const rects: string[] = []

  for (let xIndex = 0; xIndex < STRIP_WIDTH; ) {
    const [r, g, b] = colorFromPercent(gradientProgress, random)
    const colorBlockLength = PIXEL_SIZE * Math.ceil(random() * 5)
    const width = Math.min(colorBlockLength, STRIP_WIDTH - xIndex)

    rects.push(
      `<rect x="${xIndex}" y="0" width="${width}" height="1" fill="rgb(${r},${g},${b})"/>`,
    )
    xIndex += colorBlockLength
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${STRIP_WIDTH}" height="1" viewBox="0 0 ${STRIP_WIDTH} 1" preserveAspectRatio="none">${rects.join("")}</svg>`

  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
}

function agaricRowSeed(rowIndex: number) {
  return 0x41726172 + rowIndex * 977
}

const ROWS = Array.from({ length: ROW_COUNT }, (_, rowIndex) => ({
  backgroundImage: createRowBackground(rowIndex),
  duration: Math.max(1, 5 - (rowIndex + 1) / 12.5),
}))

export function AgaricMonochromeRowBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden bg-white dark:bg-black"
    >
      <div className="absolute inset-x-0 top-0 h-[calc(50%-125px)] bg-black/10 dark:bg-black" />
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 opacity-65 dark:opacity-80">
        {ROWS.map((row, rowIndex) => (
          <div
            key={rowIndex}
            className="h-[5px] w-full bg-repeat"
            style={{
              animation: `agaric-row-move ${row.duration}s linear infinite`,
              backgroundImage: row.backgroundImage,
            }}
          />
        ))}
      </div>
      <div className="absolute inset-x-0 bottom-0 top-[calc(50%+125px)] bg-white dark:bg-black" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.58),rgba(255,255,255,0.18)_50%,rgba(255,255,255,0.70))] dark:bg-[linear-gradient(180deg,rgba(0,0,0,0.38),rgba(0,0,0,0.12)_50%,rgba(0,0,0,0.55))]" />
      <style>{`
        @keyframes agaric-row-move {
          from {
            background-position: 0 0;
          }
          to {
            background-position: -${STRIP_WIDTH}px 0;
          }
        }
      `}</style>
    </div>
  )
}
