/**
 * Ring size conversion data — US ↔ EU ↔ UK with inner diameter in mm.
 *
 * Source: industry-standard chart matching the conversion tables used by
 * Catbird, Mejuri, and Aurate. EU size is the inner circumference in mm
 * (international standard); UK uses the alphabet system; US is its own scale.
 *
 * Rows are sorted ascending by US size — UI tables can iterate as-is.
 *
 * Issue #118 (#118-ring-size-guide).
 */
export interface RingSize {
  us: number // 4–13, in 0.5 increments
  uk: string // letter (and optional half — "L 1/2")
  eu: number // inner circumference in mm — also the EU size number
  diameterMm: number // inner diameter in mm
}

export const RING_SIZES: readonly RingSize[] = [
  { us: 4, uk: 'H', eu: 47, diameterMm: 14.86 },
  { us: 4.5, uk: 'I', eu: 48, diameterMm: 15.27 },
  { us: 5, uk: 'J 1/2', eu: 49, diameterMm: 15.7 },
  { us: 5.5, uk: 'K', eu: 50, diameterMm: 16.1 },
  { us: 6, uk: 'L', eu: 52, diameterMm: 16.51 },
  { us: 6.5, uk: 'M', eu: 53, diameterMm: 16.92 },
  { us: 7, uk: 'N', eu: 54, diameterMm: 17.32 },
  { us: 7.5, uk: 'O', eu: 56, diameterMm: 17.73 },
  { us: 8, uk: 'P', eu: 57, diameterMm: 18.14 },
  { us: 8.5, uk: 'Q', eu: 58, diameterMm: 18.54 },
  { us: 9, uk: 'R', eu: 59, diameterMm: 18.95 },
  { us: 9.5, uk: 'S', eu: 61, diameterMm: 19.35 },
  { us: 10, uk: 'T 1/2', eu: 62, diameterMm: 19.76 },
  { us: 10.5, uk: 'U', eu: 63, diameterMm: 20.17 },
  { us: 11, uk: 'V', eu: 64, diameterMm: 20.57 },
  { us: 11.5, uk: 'W', eu: 65, diameterMm: 20.98 },
  { us: 12, uk: 'X', eu: 67, diameterMm: 21.39 },
  { us: 12.5, uk: 'Y', eu: 68, diameterMm: 21.79 },
  { us: 13, uk: 'Z', eu: 69, diameterMm: 22.2 },
] as const

/**
 * Convert mm-diameter (e.g. measured from an existing ring) to the closest US size.
 * Returns null if the diameter falls outside the standard table range.
 */
export function findUsSizeByDiameter(diameterMm: number): number | null {
  if (diameterMm < RING_SIZES[0].diameterMm - 0.4) return null
  if (diameterMm > RING_SIZES[RING_SIZES.length - 1].diameterMm + 0.4) return null

  let closest = RING_SIZES[0]
  let minDelta = Math.abs(closest.diameterMm - diameterMm)
  for (const size of RING_SIZES) {
    const delta = Math.abs(size.diameterMm - diameterMm)
    if (delta < minDelta) {
      minDelta = delta
      closest = size
    }
  }
  return closest.us
}
