// src/config/index.ts
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

interface Config {
  env: string;
  port: number;
  corsOptions: {
    origin: string | string[];
    methods: string;
    allowedHeaders: string;
  };
  parser: {
    timeout: number;
    retries: number;
    cacheEnabled: boolean;
    cacheTTL: number;
  };
  puppeteer: {
    enabled: boolean;
    headless: 'new' | boolean;
    userAgent: string;
    timeout: number;
  };
  ai: {
    enabled: boolean;
    provider: 'openai' | 'local';
    apiKey: string | null;
    model: string;
  };
  logging: {
    level: string;
    file: boolean;
  };
}

const config: Config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '10000', 10),
  corsOptions: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type,Authorization',
  },
  parser: {
    timeout: parseInt(process.env.PARSER_TIMEOUT || '15000', 10),
    retries: parseInt(process.env.PARSER_RETRIES || '3', 10),
    cacheEnabled: process.env.CACHE_ENABLED === 'true',
    cacheTTL: parseInt(process.env.CACHE_TTL || '3600', 10),
  },
  puppeteer: {
    enabled: process.env.PUPPETEER_ENABLED !== 'false',
    headless: 'new',
    userAgent: process.env.PUPPETEER_USER_AGENT || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    timeout: parseInt(process.env.PUPPETEER_TIMEOUT || '30000', 10),
  },
  ai: {
    enabled: process.env.AI_ENABLED === 'true',
    provider: (process.env.AI_PROVIDER as 'openai' | 'local') || 'openai',
    apiKey: process.env.OPENAI_API_KEY || null,
    model: process.env.AI_MODEL || 'gpt-3.5-turbo',
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE === 'true',
  },
};

export default config;