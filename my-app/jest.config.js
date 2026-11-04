// Pruebas automáticas de la app (ver docs/07-pruebas-y-calidad.md). Correr con: npm test
module.exports = {
  preset: 'jest-expo',
  testMatch: ['<rootDir>/__tests__/**/*.test.{ts,tsx}'],
  globalSetup: '<rootDir>/jest.global-setup.js',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  clearMocks: true,
};
