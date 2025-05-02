// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        // This allows your TS files to use ESM syntax but convert to CommonJS for Jest
        useESM: false,
      },
    ],
  },
  setupFilesAfterEnv: ['./jest.setup.ts'],
  transformIgnorePatterns: [
    '/node_modules/(?!node-fetch|whatwg-url|fetch-blob|formdata-polyfill)/',
  ],
  moduleNameMapper: {
    // This helps resolve imports with .js extensions in your TS files
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
};
