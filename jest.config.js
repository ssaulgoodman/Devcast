const nextJest = require('next/jest');

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
});

// Add any custom config to be passed to Jest
/** @type {import('jest').Config} */
const customJestConfig = {
  // Add more setup options before each test is run
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  // if using TypeScript with a baseUrl set to the root directory then you need the below for alias' to work
  moduleDirectories: ['node_modules', '<rootDir>/'],
  testEnvironment: 'jest-environment-jsdom',
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/.next/'],
  moduleNameMapper: {
    '^@/components/(.*)$': '<rootDir>/src/components/$1',
    '^@/pages/(.*)$': '<rootDir>/pages/$1',
    '^@/hooks/(.*)$': '<rootDir>/src/hooks/$1',
    '^@/models/(.*)$': '<rootDir>/src/models/$1',
    '^@/services/(.*)$': '<rootDir>/src/services/$1',
    '^@/utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@/styles/(.*)$': '<rootDir>/src/styles/$1',
    '^@/types/(.*)$': '<rootDir>/src/types/$1',
    '^@/(.*)$': '<rootDir>/$1',
  },
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    'pages/**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
  coverageThreshold: {
    global: {
      branches: 15,
      functions: 15,
      lines: 12,
      statements: 12,
    },
  },
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig); 