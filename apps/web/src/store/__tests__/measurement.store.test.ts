import { describe, it, expect, beforeEach } from 'vitest'
import { useMeasurementStore } from '../measurement.store'

beforeEach(() => {
  useMeasurementStore.setState({ measurementSystem: 'imperial' })
})

describe('useMeasurementStore — initial state', () => {
  it('defaults to imperial for US market', () => {
    expect(useMeasurementStore.getState().measurementSystem).toBe('imperial')
  })
})

describe('useMeasurementStore — setMeasurementSystem', () => {
  it('switches from imperial to metric', () => {
    useMeasurementStore.getState().setMeasurementSystem('metric')

    expect(useMeasurementStore.getState().measurementSystem).toBe('metric')
  })

  it('switches from metric back to imperial', () => {
    useMeasurementStore.setState({ measurementSystem: 'metric' })

    useMeasurementStore.getState().setMeasurementSystem('imperial')

    expect(useMeasurementStore.getState().measurementSystem).toBe('imperial')
  })
})
