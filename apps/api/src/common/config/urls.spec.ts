import { getFrontendUrl } from './urls'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'

const ORIGINAL_FRONTEND_URL = process.env.FRONTEND_URL

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('api/common/config')
  await $allureSubSuite('urls')
  await $allureSeverity('normal')
})

describe('getFrontendUrl', () => {
  afterEach(() => {
    if (ORIGINAL_FRONTEND_URL === undefined) delete process.env.FRONTEND_URL
    else process.env.FRONTEND_URL = ORIGINAL_FRONTEND_URL
  })

  it('returns FRONTEND_URL env when set', () => {
    process.env.FRONTEND_URL = 'https://senichka.com'
    expect(getFrontendUrl()).toBe('https://senichka.com')
  })

  it('falls back to http://localhost:3000 (web dev port) when env is absent', () => {
    delete process.env.FRONTEND_URL
    expect(getFrontendUrl()).toBe('http://localhost:3000')
  })

  it('regression #284 — fallback is :3000, never :3001 (historical wrong port)', () => {
    delete process.env.FRONTEND_URL
    expect(getFrontendUrl()).not.toContain(':3001')
  })

  it('reads env lazily — picks up changes per call (Sentry tests mutate env)', () => {
    process.env.FRONTEND_URL = 'https://first.example'
    expect(getFrontendUrl()).toBe('https://first.example')
    process.env.FRONTEND_URL = 'https://second.example'
    expect(getFrontendUrl()).toBe('https://second.example')
  })
})
