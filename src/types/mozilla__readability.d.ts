// src/types/mozilla__readability.d.ts
declare module '@mozilla/readability' {
    export class Readability {
      constructor(document: Document);
      parse(): {
        title: string;
        content: string;
        textContent: string;
        length: number;
        excerpt: string;
        byline: string;
        dir: string;
        siteName: string;
        lang: string;
        publishedTime: string | null;
      } | null;
    }
  }