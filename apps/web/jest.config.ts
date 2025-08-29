import type { Config } from '@jest/types'
import nextJest from 'next/jest.js'

const createJestConfig = nextJest({
  dir: './'
})

// Add any custom config to be passed to Jest
const config: Config.InitialOptions = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testEnvironment: 'jest-environment-jsdom',
  collectCoverage: false,
  coverageDirectory: 'coverage',

  // Coverage thresholds for quality gates
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 60,
      lines: 70,
      statements: 70
    },
    // Critical paths require higher coverage
    './lib/security-utils.ts': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    },
    './lib/auth-utils.ts': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },

  // An array of glob patterns indicating a set of files for which coverage information should be collected
  collectCoverageFrom: [
    'app/**/*.{ts,tsx}',
    'lib/**/*.{ts,tsx}',
    'components/**/*.{ts,tsx}',
    'hooks/**/*.{ts,tsx}',
    'contexts/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/*.test.{ts,tsx}',
    '!**/*.stories.{ts,tsx}',
    '!**/node_modules/**',
    '!**/.next/**',
    '!**/coverage/**',
    '!**/dist/**',
    '!**/build/**',
    '!**/__tests__/**',
    '!**/test-utils/**',
    '!**/mocks/**'
  ],
  coveragePathIgnorePatterns: ['/node_modules/', '/.next/', '/coverage/'],

  // Coverage report formats
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  testMatch: ['**/__tests__/**/*.test.ts?(x)', '**/?(*.)+(test).ts?(x)'],
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/.next/',
    '<rootDir>/__tests__/mocks/'
  ],

  // A map from regular expressions to module names or to arrays of module names that allow to stub out resources with a single module
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    'lucide-react': require.resolve('lucide-react'),
    'react-markdown': '<rootDir>/__mocks__/react-markdown.tsx',
    nuqs: '<rootDir>/__mocks__/nuqs.ts',
    '^@thedaviddias/([^/]+)$': ['<rootDir>/../../packages/$1/src', '<rootDir>/../../packages/$1'],
    '^@thedaviddias/design-system/lib/utils$':
      '<rootDir>/../../packages/design-system/lib/utils.ts',
    '^@thedaviddias/design-system/(.*)$':
      '<rootDir>/../../packages/design-system/components/shadcn/$1.tsx',
    '^@thedaviddias/([^/]+)/(.*)$': [
      '<rootDir>/../../packages/$1/src/$2',
      '<rootDir>/../../packages/$1/$2'
    ]
  },

  roots: ['<rootDir>'],
  maxWorkers: '50%',
  verbose: false,

  // Performance optimizations
  cache: true,
  bail: 1, // Stop running tests after the first test failure
  clearMocks: true,

  // Use .env.test for environment variables during tests
  testEnvironmentOptions: {
    url: 'http://localhost'
  },

  transformIgnorePatterns: [
    'node_modules/(?!(@thedaviddias|lucide-react|next-themes|sonner|@octokit|@t3-oss|@hookform|@radix-ui|@clerk|cheerio|normalize-url|react-markdown|remark.*|rehype.*|unified|bail|is-plain-obj|trough|vfile|nuqs)/)'
  ],
  moduleDirectories: ['node_modules', '<rootDir>/'],
  watchPlugins: ['jest-watch-typeahead/filename', 'jest-watch-typeahead/testname']
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
export default createJestConfig(config)
