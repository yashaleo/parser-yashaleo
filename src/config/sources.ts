// src/config/sources.ts
interface SourceConfig {
  name: string;
  domain: string;
  selectors: {
    title?: string;
    content?: string;
    author?: string;
    date?: string;
    [key: string]: string | undefined;
  };
  paywall?: {
    indicators: string[];
    bypassStrategy?: 'article-extractor' | 'headers' | 'cookie';
  };
}

const sources: Record<string, SourceConfig> = {
  'nytimes.com': {
    name: 'The New York Times',
    domain: 'nytimes.com',
    selectors: {
      title: 'h1.css-1vxca1d',
      content: 'section[name="articleBody"]',
      author: 'span.css-1baulvz',
      date: 'time',
    },
    paywall: {
      indicators: ['subscribe', 'subscription', 'account'],
      bypassStrategy: 'article-extractor',
    },
  },
  'medium.com': {
    name: 'Medium',
    domain: 'medium.com',
    selectors: {
      title: 'h1',
      content: 'article',
      author: 'a[rel="author"]',
      date: 'time',
    },
  },
  // Default fallback
  default: {
    name: 'Default',
    domain: '*',
    selectors: {},
  },
};

export const getSourceConfig = (url: string): SourceConfig => {
  const { hostname } = new URL(url);
  // Find the most specific matching domain
  const matchingSource = Object.values(sources).find(
    source => hostname.includes(source.domain) && source.domain !== '*'
  );
  return matchingSource || sources.default;
};

export default sources;
