// src/server.ts

// src/server.ts
import express, { Request, Response } from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import swaggerJsDoc from 'swagger-jsdoc';
import helmet from 'helmet';
// Fix the imports to use .js extension (required for ESM)
import parser from './handlers/parser.js';
import parseHtml from './handlers/parse-html.js';
import logger from './utils/logger.js';

const app = express();
const port = process.env.PORT || 10000;

// Add security headers
app.use(helmet());

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Web Content Parser API',
      version: '1.0.0',
      description: 'API for parsing and extracting clean content from web pages',
      contact: {
        name: 'API Support',
        email: 'support@example.com',
      },
    },
    servers: [
      {
        url: process.env.API_URL || `http://localhost:${port}`,
        description: 'Development server',
      },
    ],
  },
  apis: ['./src/routes/*.ts'], // optional: adjust if your route handlers are defined elsewhere
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);

// ✅ Type-safe fix for Express + swaggerUi.serve
app.use('/api-docs', ...swaggerUi.serve, swaggerUi.setup(swaggerDocs));

app.use(cors());
app.use(express.json({ limit: '5mb' }));

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).send('OK');
});

/**
 * @swagger
 * /parser:
 *   get:
 *     summary: Parse content from a URL
 *     parameters:
 *       - in: query
 *         name: url
 *         required: true
 *         schema:
 *           type: string
 *         description: URL to parse
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [html, markdown, text]
 *         description: Output format
 *       - in: query
 *         name: summarize
 *         schema:
 *           type: boolean
 *         description: Include AI-generated summary
 *     responses:
 *       200:
 *         description: Successfully parsed content
 *       400:
 *         description: Invalid parameters
 *       500:
 *         description: Server error
 */
app.get('/parser', async (req: Request, res: Response) => {
  try {
    const event = {
      queryStringParameters: req.query,
    };
    const result = await parser(event as any, {} as any);
    res.status(result.statusCode).json(JSON.parse(result.body));
  } catch (error) {
    logger.error('Parser error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /parse-html:
 *   post:
 *     summary: Parse content from provided HTML
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - url
 *               - html
 *             properties:
 *               url:
 *                 type: string
 *                 description: Source URL for the HTML
 *               html:
 *                 type: string
 *                 description: HTML content to parse
 *               format:
 *                 type: string
 *                 enum: [html, markdown, text]
 *                 description: Output format
 *               summarize:
 *                 type: boolean
 *                 description: Include AI-generated summary
 *     responses:
 *       200:
 *         description: Successfully parsed content
 *       400:
 *         description: Invalid parameters
 *       500:
 *         description: Server error
 */
app.post('/parse-html', async (req: Request, res: Response) => {
  try {
    const event = {
      body: JSON.stringify(req.body),
    };
    const result = await parseHtml(event as any, {} as any);
    res.status(result.statusCode).json(JSON.parse(result.body));
  } catch (error) {
    logger.error('Parse HTML error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(port, () => {
  logger.info(`Parser API running on port ${port}`);
});

export default app;
