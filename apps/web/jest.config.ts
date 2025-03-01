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

  // An array of glob patterns indicating a set of files for which coverage information should be collected
  collectCoverageFrom: ['**/*.{ts,tsx}', '!**/*.d.ts', '!**/*.test.ts'],
  coveragePathIgnorePatterns: ['/node_modules/', '/.next/', '/coverage/'],
  testMatch: ['**/__tests__/**/*.ts?(x)', '**/?(*.)+(test).ts?(x)'],
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/.next/'],

  // A map from regular expressions to module names or to arrays of module names that allow to stub out resources with a single module
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    'lucide-react': require.resolve('lucide-react'),
    '^@thedaviddias/([^/]+)$': ['<rootDir>/../../packages/$1/src', '<rootDir>/../../packages/$1'],
    '^@thedaviddias/design-system/(.*)$':
      '<rootDir>/../../packages/design-system/components/shadcn/$1.tsx',
    '^@thedaviddias/([^/]+)/(.*)$': [
      '<rootDir>/../../packages/$1/src/$2',
      '<rootDir>/../../packages/$1/$2'
    ]
  },

  roots: ['<rootDir>'],
  maxWorkers: '50%',
  verbose: true,

  // Use .env.test for environment variables during tests
  testEnvironmentOptions: {
    url: 'http://localhost'
  },

  transformIgnorePatterns: [
    'node_modules/(?!(@thedaviddias|lucide-react|next-themes|sonner|@octokit|@t3-oss|@hookform|@radix-ui)/)'
  ],
  moduleDirectories: ['node_modules', '<rootDir>/'],
  watchPlugins: ['jest-watch-typeahead/filename', 'jest-watch-typeahead/testname']
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
export default createJestConfig(config)
