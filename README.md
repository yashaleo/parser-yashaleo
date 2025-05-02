# Modern Web Content Parser API

A modern, robust web content parser API built with Node.js and TypeScript. This API extracts clean, readable content from web pages, handling common challenges like paywalls, lazy-loading, and complex layouts.

## Features

- **Clean Content Extraction** - Extract the main content, title, author, and metadata from any web page
- **Multiple Output Formats** - Get your content in HTML, Markdown, or plain text
- **AI-powered Summarization** - Generate concise summaries of extracted content
- **Support for Dynamic Content** - Handle JavaScript-rendered content with headless browser integration
- **Robust Error Handling** - Automatic retries and comprehensive error reporting
- **Flexible Deployment** - Deploy on Render.com, AWS, or other platforms

## Getting Started

### Prerequisites

- Node.js 18.18.2 or higher
- Yarn package manager

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/web-content-parser-api.git

# Navigate to the project directory
cd web-content-parser-api

# Install dependencies
yarn install
```

### Configuration

Create a `.env` file in the root directory with the following variables:

```env
# Required
NODE_ENV=development
PORT=4000

# Optional - for AI summarization
OPENAI_API_KEY=your_openai_api_key
```

### Development

```bash
# Run in development mode
yarn dev

# Lint code
yarn lint

# Run tests
yarn test
```

### Deployment

#### Deploy to Render.com

1. Fork this repository
2. Create a new Web Service on Render
3. Connect your forked repository
4. Use the following settings:
   - **Build Command**: `yarn build`
   - **Start Command**: `yarn start`
   - **Add the following environment variables**:
     - `NODE_ENV`: `production`
     - `PORT`: `10000`
     - `OPENAI_API_KEY`: (if using AI summarization)

## API Usage

### Parse URL

```
GET /parser?url=https://example.com/article
```

#### Query Parameters

- `url` (required): The URL to parse
- `format`: Output format (`html`, `markdown`, or `text`). Default: `html`
- `summarize`: Set to `true` to include AI-generated summary (requires OpenAI API key)

#### Response

```json
{
  "title": "Article Title",
  "byline": "Author Name",
  "content": "<p>The article content...</p>",
  "textContent": "The article content...",
  "excerpt": "A short excerpt...",
  "siteName": "Example Site",
  "publishedTime": "2025-04-25T12:00:00Z",
  "summary": "AI-generated summary of the content (if requested)"
}
```

### Parse HTML

```
POST /parse-html
```

#### Request Body

```json
{
  "url": "https://example.com/article",
  "html": "<html>...</html>"
}
```

#### Response

Same as Parse URL endpoint.

## License

Licensed under either of the below, at your preference:

- Apache License, Version 2.0
  ([LICENSE-APACHE](LICENSE-APACHE) or http://www.apache.org/licenses/LICENSE-2.0)
- MIT license
  ([LICENSE-MIT](LICENSE-MIT) or http://opensource.org/licenses/MIT)

## Contribution

Unless it is explicitly stated otherwise, any contribution intentionally submitted for inclusion in the work, as defined in the Apache-2.0 license, shall be dual licensed as above without any additional terms or conditions.
