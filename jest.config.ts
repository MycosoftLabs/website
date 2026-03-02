import type { Config } from 'jest';
import nextJest from 'next/jest.js';

const createJestConfig = nextJest({
  dir: './',
});

const config: Config = {
  coverageProvider: 'v8',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/.next/',
    '<rootDir>/e2e/',
    '<rootDir>/tests/e2e/',
    '<rootDir>/tests/docker-container-actions.test.ts',
    '<rootDir>/lib/security/tests/incident-chain.test.ts',
    '<rootDir>/__tests__/api/myca/',
    '<rootDir>/__tests__/lib/services/auto-connector.test.ts',
    '<rootDir>/__tests__/lib/services/nlq-connectors.test.ts',
    '<rootDir>/__tests__/lib/services/connection-validator.test.ts',
    '<rootDir>/__tests__/lib/services/myca-nlq.test.ts',
  ],
  collectCoverageFrom: [
    'components/**/*.{ts,tsx}',
    'lib/**/*.{ts,tsx}',
    'hooks/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
};

export default createJestConfig(config);
