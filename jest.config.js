module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!**/node_modules/**'
  ],
  testMatch: [
    '**/test/**/*.test.js',
    '**/test/**/*.spec.js'
  ],
  coverageThreshold: {
    global: {
      branches: 10,
      functions: 15,
      lines: 38,
      statements: 38
    }
  },
  verbose: true,
  testTimeout: 30000
};
