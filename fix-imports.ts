// fix-imports.ts - you can run this with ts-node
import * as fs from 'fs';
import * as path from 'path';

const srcDir = './src';

function processDirectory(directory: string): void {
  const files = fs.readdirSync(directory);
  
  for (const file of files) {
    const filePath = path.join(directory, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      processDirectory(filePath);
    } else if (file.endsWith('.ts') && !file.endsWith('.d.ts')) {
      fixImports(filePath);
    }
  }
}

function fixImports(filePath: string): void {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Fix relative imports that don't have .js extension
  // This pattern looks for import statements with relative paths without extensions
  const importRegex = /from\s+['"](\.[^'"]*)['"]/g;
  content = content.replace(importRegex, (match, importPath) => {
    // Don't add .js if it's a directory import (ends with /) or already has an extension
    if (importPath.endsWith('/') || path.extname(importPath)) {
      return match;
    }
    return `from '${importPath}.js'`;
  });
  
  fs.writeFileSync(filePath, content);
  console.log(`Fixed imports in ${filePath}`);
}

processDirectory(srcDir);
console.log('All imports fixed');