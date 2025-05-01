import dotenv from 'dotenv';
dotenv.config({ path: '.env.test' });

export default {
  preset: 'ts-jest/presets/default-esm',
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { useESM: true }],
  },
  extensionsToTreatAsEsm: ['.ts'],
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  transformIgnorePatterns: [
    '/node_modules/(?!node-fetch|whatwg-url|fetch-blob|formdata-polyfill)/',
  ],
};