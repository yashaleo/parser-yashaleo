// Main entry point for AWS Lambda
import parser from './handlers/parser';
import parseHtml from './handlers/parse-html';

// Export handlers
export { 
  parser,
  parseHtml 
};

// For local development with express server
if (process.env.NODE_ENV === 'development') {
  import('./server').then(({ default: app }) => {
    const port = process.env.PORT || 4000;
    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  }).catch(err => {
    console.error('Failed to start development server:', err);
  });
}