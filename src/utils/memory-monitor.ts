// src/utils/memory-monitor.ts
import logger from './logger.js';

// Use module augmentation instead of namespace
declare global {
  // Directly extend the global object
  interface GlobalThis {
    gc?: () => void;
  }
}

/**
 * Sets up periodic memory monitoring and optional garbage collection
 *
 * @param intervalMs - Monitoring interval in milliseconds
 * @param threshold - Memory threshold in MB to trigger GC (default: 500MB)
 * @returns Timeout handle that can be used to clear the interval
 */
export const setupMemoryMonitoring = (intervalMs = 60000, threshold = 500): NodeJS.Timeout => {
  // Only run memory monitoring in production
  if (process.env.NODE_ENV === 'production') {
    return setInterval(() => {
      try {
        const memoryUsage = process.memoryUsage();
        const usageInMB = {
          rss: Math.round(memoryUsage.rss / 1024 / 1024),
          heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
          heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
          external: Math.round(memoryUsage.external / 1024 / 1024),
          // Add ArrayBuffers tracking (available in newer Node.js versions)
          arrayBuffers: memoryUsage.arrayBuffers
            ? Math.round(memoryUsage.arrayBuffers / 1024 / 1024)
            : undefined,
        };

        // Structured logging for better metrics collection
        logger.info('Memory usage metrics', {
          metrics: usageInMB,
          unit: 'MB',
        });

        // Force garbage collection if memory usage is too high
        if (usageInMB.heapUsed > threshold) {
          logger.warn('High memory usage detected, forcing garbage collection', {
            currentUsage: usageInMB.heapUsed,
            threshold: threshold,
            unit: 'MB',
          });

          if (globalThis.gc) {
            // Record time taken for garbage collection for monitoring
            const gcStartTime = process.hrtime();
            globalThis.gc();
            const gcEndTime = process.hrtime(gcStartTime);
            const gcTimeMs = (gcEndTime[0] * 1000 + gcEndTime[1] / 1000000).toFixed(2);

            logger.info('Garbage collection completed', {
              durationMs: gcTimeMs,
              beforeUsage: usageInMB.heapUsed,
            });

            // Check memory after GC
            const afterGcUsage = process.memoryUsage();
            const afterHeapUsedMB = Math.round(afterGcUsage.heapUsed / 1024 / 1024);
            const memoryFreed = usageInMB.heapUsed - afterHeapUsedMB;

            logger.info('Memory freed by garbage collection', {
              freedMB: memoryFreed,
              afterUsage: afterHeapUsedMB,
              unit: 'MB',
            });
          } else {
            logger.warn('Garbage collection unavailable. Start with --expose-gc flag');
          }
        }
      } catch (error) {
        logger.error('Error during memory monitoring', { error });
      }
    }, intervalMs);
  }

  // Return dummy interval if not in production
  return setInterval(() => {}, Number.MAX_SAFE_INTEGER);
};

/**
 * One-time memory check and GC if needed
 * Useful to call after processing large files
 */
export const checkMemoryAndCollect = (thresholdMB = 500): void => {
  if (process.env.NODE_ENV !== 'production') return;

  try {
    const heapUsedMB = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);

    if (heapUsedMB > thresholdMB && globalThis.gc) {
      logger.info('Running on-demand garbage collection', {
        currentUsage: heapUsedMB,
        threshold: thresholdMB,
        unit: 'MB',
      });

      globalThis.gc();

      const afterHeapUsedMB = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
      logger.info('On-demand GC completed', {
        freedMB: heapUsedMB - afterHeapUsedMB,
        afterUsage: afterHeapUsedMB,
        unit: 'MB',
      });
    }
  } catch (error) {
    logger.error('Error during on-demand memory check', { error });
  }
};
