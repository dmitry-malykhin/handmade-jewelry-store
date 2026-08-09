export type MeasurementSystem = 'imperial' | 'metric'

interface ConvertedLength {
  value: number
  unit: string
  formatted: string
}

const CM_TO_INCHES = 0.393701

export function convertLength(valueCm: number, system: MeasurementSystem): ConvertedLength {
  if (system === 'imperial') {
    // Nearest 0.25" — jewelry industry standard (chains sold as 16", 16.25", 16.5").
    const rawInches = valueCm * CM_TO_INCHES
    const roundedInches = Math.round(rawInches * 4) / 4
    const formatted = Number.isInteger(roundedInches) ? `${roundedInches}"` : `${roundedInches}"`
    return { value: roundedInches, unit: 'in', formatted }
  }

  const roundedCm = Math.round(valueCm * 10) / 10
  return { value: roundedCm, unit: 'cm', formatted: `${roundedCm} cm` }
}
