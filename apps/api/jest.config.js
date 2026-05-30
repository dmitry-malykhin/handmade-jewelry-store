/** @type {import('jest').Config} */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@jewelry/shared$': '<rootDir>/../../../packages/shared/src/index.ts',
  },
  // jest-junit emits a JUnit-format XML so CI (dorny/test-reporter) can show
  // per-PR test results. Default reporter stays on for local readable output.
  // jest-allure2-reporter generates Allure native results — only on CI to
  // keep local `pnpm test` snappy. The gh-pages workflow merges its
  // allure-results/ with the web package and publishes the dashboard.
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: '<rootDir>/../reports',
        outputName: 'junit.xml',
        suiteName: 'API Unit Tests',
        classNameTemplate: '{filepath}',
        titleTemplate: '{title}',
        ancestorSeparator: ' > ',
      },
    ],
    ...(process.env.CI
      ? [['jest-allure2-reporter', { resultsDir: '<rootDir>/../allure-results' }]]
      : []),
  ],
}
