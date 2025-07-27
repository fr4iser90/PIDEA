#!/usr/bin/env node

/**
 * SIMPLE Active to Selected Naming Refactor Script
 * Only does basic string replacements - NO complex validation
 */

const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  directories: ['backend', 'frontend/src', 'tests', 'docs'],
  extensions: ['.js', '.jsx', '.md', '.json'],
  exclude: ['node_modules', '.git', 'dist', 'build', 'coverage', '*.log', 'package-lock.json', 'yarn.lock']
};

// SIMPLE naming mappings - NO complex patterns
const NAMING_MAPPINGS = {
  // Variables
  'activePort': 'selectedIDE',
  'activeIDE': 'selectedIDE',
  'isActive': 'isSelected',
  
  // Methods
  'setActivePort': 'setSelectedIDE',
  'getActivePort': 'getSelectedIDE',
  'loadActivePort': 'loadSelectedIDE',
  'switchToActiveIDE': 'selectIDE',
  'selectActivePort': 'selectIDE',
  
  // Events
  'activeIDEChanged': 'ideSelectedChanged',
  'activePortChanged': 'selectedIDEChanged',
  
  // UI Text
  'Active IDE': 'Selected IDE',
  'Active Port': 'Selected Port',
  'Set Active': 'Select',
  'IDE is active': 'IDE is selected',
  
  // Mocks
  'mockSetActivePort': 'mockSetSelectedIDE',
  'mockGetActivePort': 'mockGetSelectedIDE',
  'mockActivePort': 'mockSelectedIDE',
  'mockActiveIDE': 'mockSelectedIDE',
  
  // Test variables
  'testActivePort': 'testSelectedIDE',
  'testActiveIDE': 'testSelectedIDE',
  'sampleActivePort': 'sampleSelectedIDE',
  'sampleActiveIDE': 'sampleSelectedIDE'
};

class SimpleRefactorScript {
  constructor() {
    this.stats = {
      filesProcessed: 0,
      filesModified: 0,
      replacements: 0
    };
  }

  async run() {
    console.log('🚀 Starting SIMPLE Active to Selected Refactor...\n');
    
    try {
      await this.processDirectories();
      this.generateReport();
    } catch (error) {
      console.error('❌ Refactoring failed:', error.message);
      process.exit(1);
    }
  }

  async processDirectories() {
    console.log('🔧 Processing files...\n');
    
    for (const dir of CONFIG.directories) {
      if (fs.existsSync(dir)) {
        await this.processDirectory(dir);
      }
    }
  }

  async processDirectory(dirPath) {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      
      if (this.shouldExclude(fullPath)) {
        continue;
      }
      
      if (entry.isDirectory()) {
        await this.processDirectory(fullPath);
      } else if (this.shouldProcessFile(fullPath)) {
        await this.processFile(fullPath);
      }
    }
  }

  shouldExclude(filePath) {
    return CONFIG.exclude.some(exclude => {
      if (exclude.includes('*')) {
        const pattern = exclude.replace('*', '.*');
        return new RegExp(pattern).test(path.basename(filePath));
      }
      return filePath.includes(exclude);
    });
  }

  shouldProcessFile(filePath) {
    const ext = path.extname(filePath);
    return CONFIG.extensions.includes(ext);
  }

  async processFile(filePath) {
    try {
      this.stats.filesProcessed++;
      
      const content = fs.readFileSync(filePath, 'utf8');
      let modifiedContent = content;
      let fileModified = false;
      
      // SIMPLE string replacements - NO complex logic
      for (const [oldName, newName] of Object.entries(NAMING_MAPPINGS)) {
        const regex = new RegExp(oldName, 'g');
        if (regex.test(modifiedContent)) {
          modifiedContent = modifiedContent.replace(regex, newName);
          this.stats.replacements++;
          fileModified = true;
        }
      }
      
      // SIMPLE duplicate declaration check
      if (fileModified && modifiedContent !== content) {
        // Check for duplicate const selectedIDE declarations
        const lines = modifiedContent.split('\n');
        const selectedIDEDeclarations = [];
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (line.startsWith('const selectedIDE')) {
            selectedIDEDeclarations.push(i);
          }
        }
        
        // If we have multiple declarations, keep only the first one
        if (selectedIDEDeclarations.length > 1) {
          console.warn(`⚠️  Multiple selectedIDE declarations found in ${filePath}, keeping only the first`);
          for (let i = selectedIDEDeclarations.length - 1; i > 0; i--) {
            const lineIndex = selectedIDEDeclarations[i];
            lines[lineIndex] = lines[lineIndex].replace('const selectedIDE', '// const selectedIDE'); // Comment out duplicates
          }
          modifiedContent = lines.join('\n');
        }
        
        fs.writeFileSync(filePath, modifiedContent, 'utf8');
        this.stats.filesModified++;
        console.log(`✅ Modified: ${filePath}`);
      }
      
    } catch (error) {
      console.error(`❌ Error processing ${filePath}:`, error.message);
    }
  }

  generateReport() {
    console.log('\n📊 Simple Refactoring Report:');
    console.log('============================');
    console.log(`Files processed: ${this.stats.filesProcessed}`);
    console.log(`Files modified: ${this.stats.filesModified}`);
    console.log(`Total replacements: ${this.stats.replacements}`);
  }
}

// Run the script
if (require.main === module) {
  const script = new SimpleRefactorScript();
  script.run().catch(console.error);
}

module.exports = SimpleRefactorScript; 