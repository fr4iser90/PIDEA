#!/usr/bin/env node

/**
 * CSS to SCSS Migration Script
 * Automatically migrates all CSS files to SCSS components
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SRC_DIR = path.join(__dirname, '../src');
const CSS_DIR = path.join(SRC_DIR, 'css');
const SCSS_DIR = path.join(SRC_DIR, 'scss');

// Create backup
console.log('🔄 Creating backup...');
const backupDir = path.join(SRC_DIR, 'css_backup_' + Date.now());
fs.cpSync(CSS_DIR, backupDir, { recursive: true });
console.log(`✅ Backup created: ${backupDir}`);

// Find all CSS imports in JSX files
console.log('🔍 Finding CSS imports...');
const cssImports = new Map();

function findCssImports(dir) {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const file of files) {
    const fullPath = path.join(dir, file.name);
    
    if (file.isDirectory()) {
      findCssImports(fullPath);
    } else if (file.name.endsWith('.jsx') || file.name.endsWith('.js')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const importRegex = /import\s+['"]([^'"]*\.css)['"]/g;
      let match;
      
      while ((match = importRegex.exec(content)) !== null) {
        let cssPath = match[1];
        
        // Convert @/ alias to relative path
        if (cssPath.startsWith('@/')) {
          cssPath = cssPath.replace('@/', '');
        }
        
        if (!cssImports.has(cssPath)) {
          cssImports.set(cssPath, []);
        }
        cssImports.get(cssPath).push(fullPath);
      }
    }
  }
}

findCssImports(SRC_DIR);

console.log(`📊 Found ${cssImports.size} unique CSS files with ${Array.from(cssImports.values()).flat().length} imports`);

// Convert CSS to SCSS components
console.log('🔄 Converting CSS to SCSS components...');

for (const [cssPath, jsxFiles] of cssImports) {
  const fullCssPath = path.join(SRC_DIR, cssPath);
  
  if (!fs.existsSync(fullCssPath)) {
    console.log(`⚠️  CSS file not found: ${fullCssPath}`);
    continue;
  }
  
  // Read CSS content
  let cssContent = fs.readFileSync(fullCssPath, 'utf8');
  
  // Convert to SCSS component
  const cssFileName = path.basename(cssPath, '.css');
  const scssFileName = `_${cssFileName}.scss`;
  
  // Determine SCSS directory based on CSS path
  let scssDir;
  if (cssPath.includes('components/')) {
    scssDir = path.join(SCSS_DIR, 'components');
  } else if (cssPath.includes('global/')) {
    scssDir = path.join(SCSS_DIR, 'base');
  } else if (cssPath.includes('panel/')) {
    scssDir = path.join(SCSS_DIR, 'components');
  } else if (cssPath.includes('main/')) {
    scssDir = path.join(SCSS_DIR, 'pages');
  } else if (cssPath.includes('modal/')) {
    scssDir = path.join(SCSS_DIR, 'components');
  } else {
    scssDir = path.join(SCSS_DIR, 'components');
  }
  
  // Ensure directory exists
  fs.mkdirSync(scssDir, { recursive: true });
  
  // Convert CSS to SCSS with BEM methodology
  const scssContent = convertCssToScss(cssContent, cssFileName);
  
  // Write SCSS file
  const scssPath = path.join(scssDir, scssFileName);
  fs.writeFileSync(scssPath, scssContent);
  
  console.log(`✅ Converted: ${cssPath} → ${scssPath}`);
  
  // Update JSX imports
  for (const jsxFile of jsxFiles) {
    const jsxContent = fs.readFileSync(jsxFile, 'utf8');
    const relativePath = path.relative(SRC_DIR, scssDir).replace(/\\/g, '/');
    const newImportPath = `@/scss/${relativePath}/${cssFileName}`;
    
    // Handle both @/ alias and relative paths
    const originalImport = jsxContent.match(new RegExp(`import\\s+['"]([^'"]*${cssPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})['"]`, 'g'));
    if (originalImport) {
      const updatedContent = jsxContent.replace(
        new RegExp(`import\\s+['"]([^'"]*${cssPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})['"]`, 'g'),
        `import '${newImportPath}';`
      );
      
      fs.writeFileSync(jsxFile, updatedContent);
      console.log(`  📝 Updated import in: ${path.relative(SRC_DIR, jsxFile)}`);
    }
  }
}

// Update components index
console.log('🔄 Updating SCSS components index...');
updateComponentsIndex();

// Update main.jsx to remove old CSS imports
console.log('🔄 Updating main.jsx...');
updateMainJsx();

console.log('🎉 Migration completed!');
console.log('📋 Next steps:');
console.log('1. Run: npm run build');
console.log('2. Run: npm run dev');
console.log('3. Test your application');
console.log('4. If everything works: rm -rf src/css');

function convertCssToScss(cssContent, componentName) {
  // Add SCSS header
  let scssContent = `// =============================================================================
// ${componentName.toUpperCase()} COMPONENT
// =============================================================================

// Auto-generated from CSS migration
// TODO: Review and optimize this component

`;

  // Convert CSS to SCSS with basic BEM structure
  scssContent += cssContent
    // Convert CSS custom properties to SCSS variables where possible
    .replace(/var\(--([^)]+)\)/g, 'var(--$1)')
    // Add basic BEM structure
    .replace(/\.([a-zA-Z][a-zA-Z0-9_-]*)\s*{/g, (match, className) => {
      // Skip if already BEM-like
      if (className.includes('__') || className.includes('--')) {
        return match;
      }
      // Convert to BEM block
      return `.${componentName}__${className} {`;
    });

  return scssContent;
}

function updateComponentsIndex() {
  const componentsIndexPath = path.join(SCSS_DIR, 'components/_index.scss');
  let indexContent = fs.readFileSync(componentsIndexPath, 'utf8');
  
  // Find all new SCSS files
  const componentsDir = path.join(SCSS_DIR, 'components');
  const scssFiles = fs.readdirSync(componentsDir)
    .filter(file => file.startsWith('_') && file.endsWith('.scss'))
    .map(file => file.replace('_', '').replace('.scss', ''))
    .filter(file => !['index', 'buttons', 'cards', 'forms', 'modals', 'tabs', 'panels'].includes(file));
  
  // Add imports for new files
  for (const file of scssFiles) {
    const importLine = `@import '${file}';`;
    if (!indexContent.includes(importLine)) {
      indexContent += `\n${importLine}`;
    }
  }
  
  fs.writeFileSync(componentsIndexPath, indexContent);
}

function updateMainJsx() {
  const mainJsxPath = path.join(SRC_DIR, 'main.jsx');
  let mainContent = fs.readFileSync(mainJsxPath, 'utf8');
  
  // Remove old CSS imports
  mainContent = mainContent
    .replace(/\/\/ Legacy CSS imports - to be removed after migration\n/g, '')
    .replace(/import\s+['"]@\/css\/[^'"]*\.css['"];\n/g, '');
  
  fs.writeFileSync(mainJsxPath, mainContent);
}
