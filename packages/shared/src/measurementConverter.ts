export type MeasurementSystem = 'imperial' | 'metric'

export interface ConvertedLength {
  value: number
  unit: string
  formatted: string
}

const CM_TO_INCHES = 0.393701

/**
 * Converts a length stored in centimetres to the target display system.
 *
 * Imperial rounding: nearest 0.25 inch — the jewelry industry standard
 * (e.g. chain lengths are sold as 16", 16.25", 16.5", not arbitrary decimals).
 * Metric rounding: 1 decimal place (45.7 cm).
 */
export function convertLength(valueCm: number, system: MeasurementSystem): ConvertedLength {
  if (system === 'imperial') {
    const rawInches = valueCm * CM_TO_INCHES
    const roundedInches = Math.round(rawInches * 4) / 4
    const formatted = Number.isInteger(roundedInches) ? `${roundedInches}"` : `${roundedInches}"`
    return { value: roundedInches, unit: 'in', formatted }
  }

  const roundedCm = Math.round(valueCm * 10) / 10
  return { value: roundedCm, unit: 'cm', formatted: `${roundedCm} cm` }
}

/**
 * Converts a 2-D dimension (length × width stored in cm) to the target system.
 * Returns a display string like "1.2 × 0.8"" or "3 × 2 cm".
 */
export function convertDimensions(
  lengthCm: number,
  widthCm: number,
  system: MeasurementSystem,
): string {
  if (system === 'imperial') {
    const l = Math.round(lengthCm * CM_TO_INCHES * 100) / 100
    const w = Math.round(widthCm * CM_TO_INCHES * 100) / 100
    return `${l} × ${w}"`
  }
  const l = Math.round(lengthCm * 10) / 10
  const w = Math.round(widthCm * 10) / 10
  return `${l} × ${w} cm`
}
