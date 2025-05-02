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
  specialCleaning?: boolean; // Added to interface definition
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
    specialCleaning: true, // Mark for special handling
  },
  // New site configurations
  'substack.com': {
    name: 'Substack',
    domain: 'substack.com',
    selectors: {
      title: 'h1.post-title',
      content: 'div.available-content',
      author: 'a.avatar',
      date: 'time',
    },
    specialCleaning: true,
    paywall: {
      indicators: ['subscribe', 'subscription', 'account'],
      bypassStrategy: 'article-extractor',
    },
  },
  'washingtonpost.com': {
    name: 'Washington Post',
    domain: 'washingtonpost.com',
    selectors: {
      title: 'h1[data-qa="headline"]',
      content: 'div.article-body',
      author: 'a[data-qa="author-name"]',
      date: 'span.display-date',
    },
    paywall: {
      indicators: ['subscribe', 'subscription', 'account', 'paywall'],
      bypassStrategy: 'article-extractor',
    },
  },
  'bloomberg.com': {
    name: 'Bloomberg',
    domain: 'bloomberg.com',
    selectors: {
      title: 'h1.lede-headline',
      content: 'div.body-content',
      author: 'div.byline-details__wrapper',
      date: 'time.article-timestamp',
    },
    paywall: {
      indicators: ['subscribe', 'subscription', 'paywall'],
      bypassStrategy: 'article-extractor',
    },
  },
  'techcrunch.com': {
    name: 'TechCrunch',
    domain: 'techcrunch.com',
    selectors: {
      title: 'h1.article__heading',
      content: 'div.article-content',
      author: 'span.article__byline-author',
      date: 'time',
    },
  },
  'wordpress.com': {
    name: 'WordPress',
    domain: 'wordpress.com',
    selectors: {
      title: 'h1.entry-title',
      content: 'div.entry-content',
      author: 'a.author',
      date: 'time.entry-date',
    },
    specialCleaning: true,
  },
  'dev.to': {
    name: 'DEV Community',
    domain: 'dev.to',
    selectors: {
      title: 'h1#article-title',
      content: 'div.article-body',
      author: 'a.crayons-link',
      date: 'time',
    },
  },
  'hashnode.com': {
    name: 'Hashnode',
    domain: 'hashnode.com',
    selectors: {
      title: 'h1.blog-title',
      content: 'div.blog-content',
      author: 'a.author-name',
      date: 'time',
    },
    specialCleaning: true,
  },
  'theverge.com': {
    name: 'The Verge',
    domain: 'theverge.com',
    selectors: {
      title: 'h1.duet--article--feature-headline',
      content: 'div.duet--article--article-body-component',
      author: 'span.duet--article--byline-author',
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
