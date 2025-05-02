// jest-setup.ts
import { jest } from '@jest/globals';

// Make global.fetch available
global.fetch = jest.fn();

// Export jest for use in test files
export { jest };
