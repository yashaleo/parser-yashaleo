// Type definitions for @extractus/article-extractor

declare module '@extractus/article-extractor' {
  export interface Article {
    title?: string;
    content?: string;
    author?: string;
    description?: string;
    image?: string;
    source?: string;
    published?: string;
    ttr?: number;
    domain?: string;
    url?: string;
    [key: string]: any;
  }

  export interface ParserOptions {
    descriptionLengthThreshold?: number;
    contentLengthThreshold?: number;
    linkLengthThreshold?: number;
    [key: string]: any;
  }

  export interface FetchOptions {
    headers?: Record<string, string>;
    proxy?: string;
    timeout?: number;
    [key: string]: any;
  }

  /**
   * Extract article content from a URL or HTML string
   */
  export function extract(
    input: string,
    parserOptions?: ParserOptions,
    fetchOptions?: FetchOptions
  ): Promise<Article>;
}
