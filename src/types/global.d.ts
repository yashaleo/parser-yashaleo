// src/types/global.d.ts
import { AbortSignal } from 'node-fetch';

declare global {
  namespace NodeJS {
    interface Global {
      fetch: (url: string, init?: {
        signal?: AbortSignal,
        headers?: Record<string, string>,
        [key: string]: any
      }) => Promise<{
        ok: boolean;
        status?: number;
        statusText?: string;
        text: () => Promise<string>;
      }>;
    }
  }
}

export {};