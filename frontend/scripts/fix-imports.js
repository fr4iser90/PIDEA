#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SRC_DIR = path.join(__dirname, '../src');

// Fix all incorrect import paths
function fixImports(dir) {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const file of files) {
    const fullPath = path.join(dir, file.name);
    
    if (file.isDirectory()) {
      fixImports(fullPath);
    } else if (file.name.endsWith('.jsx') || file.name.endsWith('.js')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let changed = false;
      
      // Fix double scss/scss paths
      if (content.includes('@/scss/scss/')) {
        content = content.replace(/@\/scss\/scss\//g, '@/scss/');
        changed = true;
      }
      
      // Fix missing .scss extensions and underscores
      content = content.replace(/import\s+['"](@\/scss\/[^'"]*?)['"];?/g, (match, importPath) => {
        if (!importPath.endsWith('.scss')) {
          // Add underscore prefix for SCSS partials
          const pathParts = importPath.split('/');
          const fileName = pathParts[pathParts.length - 1];
          if (!fileName.startsWith('_')) {
            pathParts[pathParts.length - 1] = '_' + fileName;
          }
          return match.replace(importPath, pathParts.join('/') + '.scss');
        }
        return match;
      });
      
      if (changed) {
        fs.writeFileSync(fullPath, content);
        console.log(`✅ Fixed imports in: ${path.relative(SRC_DIR, fullPath)}`);
      }
    }
  }
}

console.log('🔧 Fixing import paths...');
fixImports(SRC_DIR);
console.log('✅ Import fixes completed!');
