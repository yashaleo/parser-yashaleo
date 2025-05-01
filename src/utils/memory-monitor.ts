// src/utils/memory-monitor.ts
import logger from './logger';

// Add TypeScript declaration for global.gc
// Declare gc on global object properly
declare global {
  namespace NodeJS {
    interface Global {
      gc?: () => void;
    }
  }
}

// Note: To use this feature, start Node with --expose-gc flag:
// Example: node --expose-gc dist/server.js
export const setupMemoryMonitoring = (intervalMs = 60000): NodeJS.Timeout => {
  if (process.env.NODE_ENV === 'production') {
    return setInterval(() => {
      const memoryUsage = process.memoryUsage();
      const usageInMB = {
        rss: Math.round(memoryUsage.rss / 1024 / 1024),
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        external: Math.round(memoryUsage.external / 1024 / 1024),
      };

      logger.info(`Memory usage: ${JSON.stringify(usageInMB)} MB`);

      // Force garbage collection if memory usage is too high
      if (usageInMB.heapUsed > 500) {
        // 500MB threshold
        logger.warn('High memory usage detected, forcing garbage collection');
        if (global.gc) {
          global.gc();
        } else {
          logger.warn('Garbage collection unavailable. Start with --expose-gc flag');
        }
      }
    }, intervalMs);
  }

  // Return empty interval if not in production
  return setInterval(() => {}, Number.MAX_SAFE_INTEGER);
};
