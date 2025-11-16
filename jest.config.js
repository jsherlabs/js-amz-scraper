module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!**/node_modules/**',
    // Exclude API code from coverage until Phase 5B tests are added
    '!src/api/**/*.js'
  ],
  testMatch: [
    '**/test/**/*.test.js',
    '**/test/**/*.spec.js'
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    // Skip database tests until sqlite3 is installed
    // Remove this line after running: npm install
    'test/unit/database.test.js'
  ],
  coverageThreshold: {
    global: {
      branches: 10,
      functions: 15,
      lines: 25,
      statements: 25
    }
  },
  verbose: true,
  testTimeout: 30000
};
