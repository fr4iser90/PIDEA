#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Find all SCSS files in components, pages, themes directories
const directories = [
  'src/scss/components',
  'src/scss/pages', 
  'src/scss/themes'
];

function findScssFiles(dir) {
  const files = [];
  if (!fs.existsSync(dir)) return files;
  
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      files.push(...findScssFiles(fullPath));
    } else if (item.endsWith('.scss') && !item.startsWith('_index')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

function updateScssFile(filePath) {
  console.log(`Updating ${filePath}...`);
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Check if file already has @use statements
  if (content.includes('@use')) {
    console.log(`  Skipping ${filePath} - already has @use statements`);
    return;
  }
  
  // Determine the relative path to abstracts
  const relativePath = filePath.includes('components') ? '../abstracts' : 
                      filePath.includes('pages') ? '../abstracts' :
                      filePath.includes('themes') ? '../abstracts' : '../abstracts';
  
  // Add @use statements after the header comment
  const headerMatch = content.match(/^(\/\/ =+.*?\n\/\/ =+.*?\n)/);
  if (headerMatch) {
    const header = headerMatch[1];
    const afterHeader = content.substring(headerMatch[0].length);
    
    // Add @use statements
    const useStatements = `@use '${relativePath}/variables' as *;
@use '${relativePath}/placeholders' as *;

`;
    
    content = header + useStatements + afterHeader;
  } else {
    // No header found, add at the beginning
    const useStatements = `// =============================================================================
// ${path.basename(filePath, '.scss').toUpperCase()}
// =============================================================================

@use '${relativePath}/variables' as *;
@use '${relativePath}/placeholders' as *;

`;
    content = useStatements + content;
  }
  
  fs.writeFileSync(filePath, content);
  console.log(`  Updated ${filePath}`);
}

// Main execution
console.log('Fixing SCSS imports...');

for (const dir of directories) {
  const files = findScssFiles(dir);
  for (const file of files) {
    updateScssFile(file);
  }
}

console.log('Done!');
