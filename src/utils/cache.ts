// src/utils/cache.ts
import NodeCache from 'node-cache';
import config from '../config/index.js';

const cache = new NodeCache({
  stdTTL: config.parser.cacheTTL, // Time to live in seconds
  checkperiod: 120, // Check for expired every 2 minutes
  maxKeys: 1000, // Maximum number of keys in cache
});

export const getCachedContent = (url: string): any => {
  if (!config.parser.cacheEnabled) return null;
  return cache.get(url);
};

export const setCachedContent = (url: string, content: any): void => {
  if (!config.parser.cacheEnabled) return;
  cache.set(url, content);
};

export const removeCachedContent = (url: string): void => {
  if (!config.parser.cacheEnabled) return;
  cache.del(url);
};

export const clearCache = (): void => {
  cache.flushAll();
};

export default cache;
