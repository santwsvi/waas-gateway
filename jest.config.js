/** @type {import('jest').Config} */

const pathAliases = {
  '^@domain/(.*)\\.[jt]s$': '<rootDir>/src/domain/$1',
  '^@domain/(.*)$': '<rootDir>/src/domain/$1',
  '^@app/(.*)\\.[jt]s$': '<rootDir>/src/application/$1',
  '^@app/(.*)$': '<rootDir>/src/application/$1',
  '^@infra/(.*)\\.[jt]s$': '<rootDir>/src/infrastructure/$1',
  '^@infra/(.*)$': '<rootDir>/src/infrastructure/$1',
  '^@shared/(.*)\\.[jt]s$': '<rootDir>/src/shared/$1',
  '^@shared/(.*)$': '<rootDir>/src/shared/$1',
  '^@interfaces/(.*)\\.[jt]s$': '<rootDir>/src/interfaces/$1',
  '^@interfaces/(.*)$': '<rootDir>/src/interfaces/$1',
  '^(\\.{1,2}/.*)\\.js$': '$1',
};

const config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  testEnvironment: 'node',
  moduleNameMapper: pathAliases,
  projects: [
    {
      displayName: 'unit',
      testMatch: ['<rootDir>/src/**/*.spec.ts'],
      transform: { '^.+\\.ts$': 'ts-jest' },
      moduleNameMapper: pathAliases,
      coverageDirectory: '<rootDir>/coverage/unit',
      collectCoverageFrom: [
        'src/domain/**/*.ts',
        'src/application/**/*.ts',
        '!src/**/*.spec.ts',
        '!src/**/*.module.ts',
        '!src/**/index.ts',
      ],
    },
    {
      displayName: 'contract',
      testMatch: ['<rootDir>/test/contract/**/*.spec.ts'],
      transform: { '^.+\\.ts$': 'ts-jest' },
      moduleNameMapper: pathAliases,
    },
    {
      displayName: 'integration',
      testMatch: ['<rootDir>/test/integration/**/*.spec.ts'],
      transform: { '^.+\\.ts$': 'ts-jest' },
      moduleNameMapper: pathAliases,
    },
    {
      displayName: 'e2e',
      testMatch: ['<rootDir>/test/e2e/**/*.spec.ts'],
      transform: { '^.+\\.ts$': 'ts-jest' },
      moduleNameMapper: pathAliases,
    },
  ],
};

module.exports = config;
