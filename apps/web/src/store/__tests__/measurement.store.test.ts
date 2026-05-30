import { describe, it, expect, beforeEach } from 'vitest'
import { useMeasurementStore } from '../measurement.store'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'

beforeEach(() => {
  useMeasurementStore.setState({ measurementSystem: 'imperial' })
})

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('web/store/__tests__')
  await $allureSubSuite('measurement.store')
  await $allureSeverity('normal')
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
