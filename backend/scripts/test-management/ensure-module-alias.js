#!/usr/bin/env node
require('module-alias/register');

/**
 * Ensure Module Alias Script
 * Automatically adds require('module-alias/register') to all entry point files
 * to ensure module aliases work correctly across the test management system
 */

const fs = require('fs');
const path = require('path');
// Use simple console colors if chalk is not available
const chalk = {
  blue: (text) => `\x1b[34m${text}\x1b[0m`,
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
  red: (text) => `\x1b[31m${text}\x1b[0m`
};

class ModuleAliasEnsurer {
  constructor() {
    this.targetDirs = [
      path.join(__dirname, '../'), // scripts/
      path.join(__dirname, '../../tests/reporters/'), // tests/reporters/
      path.join(__dirname, '../../cli/'), // cli/
      path.join(__dirname, '../../server.js'), // server.js
      path.join(__dirname, '../../Application.js') // Application.js
    ];
    
    this.processedFiles = [];
    this.skippedFiles = [];
    this.errors = [];
  }

  /**
   * Process a single file to ensure module-alias/register is included
   * @param {string} filePath - Path to the file to process
   */
  processFile(filePath) {
    try {
      if (!fs.existsSync(filePath)) {
        return;
      }

      let content = fs.readFileSync(filePath, 'utf8');
      
      // Skip if already has module-alias/register
      if (content.includes("require('module-alias/register')") || 
          content.includes('require("module-alias/register")')) {
        this.skippedFiles.push(filePath);
        return;
      }

      // Skip test files and node_modules
      if (filePath.includes('.test.js') || 
          filePath.includes('.spec.js') || 
          filePath.includes('node_modules')) {
        return;
      }

      let modified = false;
      let newContent = '';

      // Handle shebang files
      if (content.startsWith('#!')) {
        const firstNewline = content.indexOf('\n');
        const shebang = content.slice(0, firstNewline + 1);
        const rest = content.slice(firstNewline + 1);
        
        newContent = shebang + "require('module-alias/register');\n" + rest;
        modified = true;
      } else {
        // Regular files
        newContent = "require('module-alias/register');\n" + content;
        modified = true;
      }

      if (modified) {
        fs.writeFileSync(filePath, newContent, 'utf8');
        this.processedFiles.push(filePath);
        console.log(chalk.green(`✅ Patched: ${path.relative(process.cwd(), filePath)}`));
      }

    } catch (error) {
      this.errors.push({ file: filePath, error: error.message });
      console.log(chalk.red(`❌ Error processing ${filePath}: ${error.message}`));
    }
  }

  /**
   * Recursively walk through directories
   * @param {string} dir - Directory to walk
   */
  walkDirectory(dir) {
    if (!fs.existsSync(dir)) {
      return;
    }

    const stats = fs.statSync(dir);
    if (!stats.isDirectory()) {
      // It's a file, process it
      this.processFile(dir);
      return;
    }

    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const fileStats = fs.statSync(fullPath);
      
      if (fileStats.isDirectory()) {
        // Skip node_modules and other non-relevant directories
        if (file !== 'node_modules' && !file.startsWith('.')) {
          this.walkDirectory(fullPath);
        }
      } else if (file.endsWith('.js') && !file.endsWith('.test.js') && !file.endsWith('.spec.js')) {
        this.processFile(fullPath);
      }
    }
  }

  /**
   * Run the module alias ensurer
   */
  async run() {
    console.log(chalk.blue('🔧 Ensuring module-alias/register in all entry points...\n'));

    for (const target of this.targetDirs) {
      this.walkDirectory(target);
    }

    // Print summary
    console.log(chalk.blue('\n📊 Module Alias Ensurer Summary:'));
    console.log(chalk.green(`✅ Processed: ${this.processedFiles.length} files`));
    console.log(chalk.yellow(`⏭️  Skipped: ${this.skippedFiles.length} files (already patched)`));
    console.log(chalk.red(`❌ Errors: ${this.errors.length} files`));

    if (this.processedFiles.length > 0) {
      console.log(chalk.green('\n🎉 Successfully patched the following files:'));
      this.processedFiles.forEach(file => {
        console.log(chalk.green(`   - ${path.relative(process.cwd(), file)}`));
      });
    }

    if (this.errors.length > 0) {
      console.log(chalk.red('\n⚠️  Errors occurred:'));
      this.errors.forEach(({ file, error }) => {
        console.log(chalk.red(`   - ${path.relative(process.cwd(), file)}: ${error}`));
      });
    }

    console.log(chalk.blue('\n✨ Module alias registration complete!'));
    
    return {
      processed: this.processedFiles.length,
      skipped: this.skippedFiles.length,
      errors: this.errors.length
    };
  }

  /**
   * Check if files need patching without modifying them
   * @returns {Object} Analysis results
   */
  async analyze() {
    console.log(chalk.blue('🔍 Analyzing module-alias/register usage...\n'));

    const needsPatching = [];
    const alreadyPatched = [];

    for (const target of this.targetDirs) {
      if (!fs.existsSync(target)) continue;

      const stats = fs.statSync(target);
      if (!stats.isDirectory()) {
        // It's a file
        const content = fs.readFileSync(target, 'utf8');
        if (content.includes("require('module-alias/register')") || 
            content.includes('require("module-alias/register")')) {
          alreadyPatched.push(target);
        } else if (target.endsWith('.js') && !target.endsWith('.test.js') && !target.endsWith('.spec.js')) {
          needsPatching.push(target);
        }
        continue;
      }

      // Walk directory
      const walk = (dir) => {
        const files = fs.readdirSync(dir);
        for (const file of files) {
          const fullPath = path.join(dir, file);
          const fileStats = fs.statSync(fullPath);
          
          if (fileStats.isDirectory()) {
            if (file !== 'node_modules' && !file.startsWith('.')) {
              walk(fullPath);
            }
          } else if (file.endsWith('.js') && !file.endsWith('.test.js') && !file.endsWith('.spec.js')) {
            const content = fs.readFileSync(fullPath, 'utf8');
            if (content.includes("require('module-alias/register')") || 
                content.includes('require("module-alias/register")')) {
              alreadyPatched.push(fullPath);
            } else {
              needsPatching.push(fullPath);
            }
          }
        }
      };

      walk(target);
    }

    console.log(chalk.blue('📊 Analysis Results:'));
    console.log(chalk.green(`✅ Already patched: ${alreadyPatched.length} files`));
    console.log(chalk.yellow(`🔧 Needs patching: ${needsPatching.length} files`));

    if (needsPatching.length > 0) {
      console.log(chalk.yellow('\n📝 Files that need patching:'));
      needsPatching.forEach(file => {
        console.log(chalk.yellow(`   - ${path.relative(process.cwd(), file)}`));
      });
    }

    return {
      needsPatching: needsPatching.length,
      alreadyPatched: alreadyPatched.length,
      files: needsPatching
    };
  }
}

// CLI interface
async function main() {
  const ensurer = new ModuleAliasEnsurer();
  const args = process.argv.slice(2);

  try {
    if (args.includes('--analyze') || args.includes('-a')) {
      await ensurer.analyze();
    } else {
      await ensurer.run();
    }
  } catch (error) {
    console.error(chalk.red(`❌ Fatal error: ${error.message}`));
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = ModuleAliasEnsurer; 