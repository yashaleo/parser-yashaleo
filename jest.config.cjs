/** @type {import('jest').Config} */
module.exports = {
    preset: 'ts-jest/presets/default-esm',
    testEnvironment: 'node',
    extensionsToTreatAsEsm: ['.ts'],
    transform: {
      '^.+\\.tsx?$': [
        'ts-jest', 
        {
          useESM: true,
        }
      ]
    },
    moduleNameMapper: {
      '^(\\.{1,2}/.*)\\.js$': '$1'
    },
    setupFilesAfterEnv: ['./jest-setup.ts']
  };