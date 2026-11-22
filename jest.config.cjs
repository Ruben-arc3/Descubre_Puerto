module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/**/*.test.ts'],
  clearMocks: true,
  transform: { '^.+\\.tsx?$': 'babel-jest' },
};
