//"start": "node --expose-gc dist/server.js"
// src/utils/memory-monitor.ts
import logger from './logger';

export const setupMemoryMonitoring = (intervalMs = 60000) => {
  if (process.env.NODE_ENV === 'production') {
    setInterval(() => {
      const memoryUsage = process.memoryUsage();
      const usageInMB = {
        rss: Math.round(memoryUsage.rss / 1024 / 1024),
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        external: Math.round(memoryUsage.external / 1024 / 1024),
      };
      
      logger.info(`Memory usage: ${JSON.stringify(usageInMB)} MB`);
      
      // Force garbage collection if memory usage is too high
      if (usageInMB.heapUsed > 500) { // 500MB threshold
        logger.warn('High memory usage detected, forcing garbage collection');
        if (global.gc) {
          global.gc();
        } else {
          logger.warn('Garbage collection unavailable. Start with --expose-gc flag');
        }
      }
    }, intervalMs);
  }
};