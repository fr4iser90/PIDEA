#!/usr/bin/env node

/**
 * Safe CSS Modernization Script (No Colors)
 * Very conservative approach - only exact property matches
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Very safe mappings - only exact property matches
const SAFE_MAPPINGS = {
  // Spacing - only in padding/margin properties
  spacing: {
    'padding: 4px': 'padding: var(--space-xs)',
    'padding: 8px': 'padding: var(--space-sm)',
    'padding: 12px': 'padding: var(--space-sm)',
    'padding: 16px': 'padding: var(--space-md)',
    'padding: 20px': 'padding: var(--space-md)',
    'padding: 24px': 'padding: var(--space-lg)',
    'padding: 32px': 'padding: var(--space-xl)',
    'padding: 40px': 'padding: var(--space-xl)',
    'padding: 48px': 'padding: var(--space-2xl)',
    'padding: 64px': 'padding: var(--space-2xl)',
    
    'margin: 4px': 'margin: var(--space-xs)',
    'margin: 8px': 'margin: var(--space-sm)',
    'margin: 12px': 'margin: var(--space-sm)',
    'margin: 16px': 'margin: var(--space-md)',
    'margin: 20px': 'margin: var(--space-md)',
    'margin: 24px': 'margin: var(--space-lg)',
    'margin: 32px': 'margin: var(--space-xl)',
    'margin: 40px': 'margin: var(--space-xl)',
    'margin: 48px': 'margin: var(--space-2xl)',
    'margin: 64px': 'margin: var(--space-2xl)',
  },

  // Typography - only font-size and font-weight
  typography: {
    'font-size: 12px': 'font-size: var(--font-size-xs)',
    'font-size: 14px': 'font-size: var(--font-size-sm)',
    'font-size: 16px': 'font-size: var(--font-size-base)',
    'font-size: 18px': 'font-size: var(--font-size-lg)',
    'font-size: 20px': 'font-size: var(--font-size-xl)',
    'font-size: 24px': 'font-size: var(--font-size-2xl)',
    
    'font-weight: 400': 'font-weight: var(--font-weight-normal)',
    'font-weight: 500': 'font-weight: var(--font-weight-medium)',
    'font-weight: 600': 'font-weight: var(--font-weight-semibold)',
    'font-weight: 700': 'font-weight: var(--font-weight-bold)',
  },

  // Border radius - only border-radius property
  borderRadius: {
    'border-radius: 4px': 'border-radius: var(--radius-sm)',
    'border-radius: 6px': 'border-radius: var(--radius-sm)',
    'border-radius: 8px': 'border-radius: var(--radius-md)',
    'border-radius: 12px': 'border-radius: var(--radius-lg)',
    'border-radius: 16px': 'border-radius: var(--radius-xl)',
    'border-radius: 20px': 'border-radius: var(--radius-xl)',
  },

  // Shadows - exact shadow matches
  shadows: {
    'box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05)': 'box-shadow: var(--shadow-xs)',
    'box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4)': 'box-shadow: var(--shadow-sm)',
    'box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5)': 'box-shadow: var(--shadow-md)',
    'box-shadow: 0 8px 24px rgba(0, 0, 0, 0.7)': 'box-shadow: var(--shadow-lg)',
    'box-shadow: 0 20px 40px rgba(0, 0, 0, 0.8)': 'box-shadow: var(--shadow-xl)',
  },

  // Transitions - exact transition matches
  transitions: {
    'transition: all 0.15s ease': 'transition: all var(--transition-fast)',
    'transition: all 0.2s ease': 'transition: all var(--transition-normal)',
    'transition: all 0.3s ease': 'transition: all var(--transition-slow)',
    'transition: all 0.5s ease': 'transition: all var(--transition-slower)',
  },

  // Z-index - exact z-index matches
  zIndex: {
    'z-index: 1000': 'z-index: var(--z-dropdown)',
    'z-index: 1020': 'z-index: var(--z-sticky)',
    'z-index: 1030': 'z-index: var(--z-fixed)',
    'z-index: 1040': 'z-index: var(--z-modal-backdrop)',
    'z-index: 1050': 'z-index: var(--z-modal)',
    'z-index: 1060': 'z-index: var(--z-popover)',
    'z-index: 1070': 'z-index: var(--z-tooltip)',
  }
};

class SafeCSSModernizer {
  constructor() {
    this.stats = {
      filesProcessed: 0,
      replacements: 0,
      errors: 0
    };
  }

  // Find all CSS files
  findCSSFiles(directory) {
    return glob.sync('**/*.css', { 
      cwd: directory,
      ignore: ['node_modules/**', 'dist/**', 'build/**', 'coverage/**']
    });
  }

  // Apply safe mappings
  applySafeMappings(content) {
    let processedContent = content;
    let replacements = 0;

    // Apply all safe mappings
    Object.entries(SAFE_MAPPINGS).forEach(([category, mappings]) => {
      Object.entries(mappings).forEach(([oldValue, newValue]) => {
        const regex = new RegExp(this.escapeRegExp(oldValue), 'g');
        const matches = processedContent.match(regex);
        if (matches) {
          processedContent = processedContent.replace(regex, newValue);
          replacements += matches.length;
        }
      });
    });

    return { content: processedContent, replacements };
  }

  // Process a single CSS file
  processFile(filePath) {
    try {
      console.log(`Processing: ${filePath}`);
      
      let content = fs.readFileSync(filePath, 'utf8');
      let totalReplacements = 0;

      // Apply safe mappings
      const { content: mappedContent, replacements: mappingReplacements } = 
        this.applySafeMappings(content);
      content = mappedContent;
      totalReplacements += mappingReplacements;

      // Write back if changes were made
      if (totalReplacements > 0) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`  ✓ ${totalReplacements} replacements made`);
        this.stats.replacements += totalReplacements;
      } else {
        console.log(`  - No changes needed`);
      }

      this.stats.filesProcessed++;
      return true;

    } catch (error) {
      console.error(`  ✗ Error processing ${filePath}:`, error.message);
      this.stats.errors++;
      return false;
    }
  }

  // Process all CSS files
  processAll(directory) {
    console.log('🎨 Starting Safe CSS Modernization (No Colors)...\n');
    console.log('📋 What will be modernized:');
    console.log('  ✓ Spacing (padding, margin) - exact matches only');
    console.log('  ✓ Typography (font-size, font-weight) - exact matches only');
    console.log('  ✓ Border radius - exact matches only');
    console.log('  ✓ Shadows - exact matches only');
    console.log('  ✓ Transitions - exact matches only');
    console.log('  ✓ Z-index - exact matches only');
    console.log('  ❌ Colors (left untouched)');
    console.log('  ❌ Complex values (left untouched)\n');
    
    const cssFiles = this.findCSSFiles(directory);
    console.log(`Found ${cssFiles.length} CSS files to process\n`);

    cssFiles.forEach(file => {
      const fullPath = path.join(directory, file);
      this.processFile(fullPath);
    });

    this.printSummary();
  }

  // Print processing summary
  printSummary() {
    console.log('\n📊 Safe Modernization Summary:');
    console.log(`Files processed: ${this.stats.filesProcessed}`);
    console.log(`Total replacements: ${this.stats.replacements}`);
    console.log(`Errors: ${this.stats.errors}`);
    
    if (this.stats.replacements > 0) {
      console.log('\n✅ Safe CSS modernization completed successfully!');
      console.log('Your CSS files now use modern design system variables.');
      console.log('Colors and complex values were left untouched.');
    } else {
      console.log('\n✨ All CSS files are already using the modern design system!');
    }
  }

  // Utility: Escape regex special characters
  escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);
  const directory = args[0] || './frontend/src/css';
  
  if (!fs.existsSync(directory)) {
    console.error(`❌ Directory not found: ${directory}`);
    process.exit(1);
  }

  const modernizer = new SafeCSSModernizer();
  modernizer.processAll(directory);
}

module.exports = SafeCSSModernizer;
