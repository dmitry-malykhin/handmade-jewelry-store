import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { MeasurementSystem } from '@jewelry/shared'

interface MeasurementStore {
  measurementSystem: MeasurementSystem
  setMeasurementSystem: (system: MeasurementSystem) => void
}

export const useMeasurementStore = create<MeasurementStore>()(
  persist(
    (set) => ({
      // Default: imperial — primary target market is US (docs/10_MEASUREMENT_SYSTEMS.md)
      measurementSystem: 'imperial',
      setMeasurementSystem: (measurementSystem) => set({ measurementSystem }),
    }),
    {
      name: 'measurement-system',
      // skipHydration prevents SSR/client mismatch — store.ts hydrates manually after mount
      skipHydration: true,
    },
  ),
)
