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
  ],
}
