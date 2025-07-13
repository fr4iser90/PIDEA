/**
 * Unified File Remover
 * Removes all Categories system system files and components
 * Part of Phase 2: Core System Removal
 */

const fs = require('fs-extra');
const path = require('path');

class UnifiedFileRemover {
  constructor() {
    this.filesToRemove = [
      'backend/domain/services/CategoriesService.js',
      'backend/application/handlers/workflow/CategoriesHandler.js',
      'backend/application/handlers/CategoriesRegistry.js',
      'backend/application/handlers/workflow/index.js',
      'backend/tests/unit/domain/workflows/CategoriesFoundation.test.js',
      'backend/tests/unit/workflows/handlers/CategoriesHandler.test.js',
      'backend/examples/CategoriesFoundationExample.js',
      'backend/docs/CategoriesFoundation1B.md',
      'scripts/migration/start-unified-workflow-migration.js',
      'scripts/migration/complete-unified-workflow-migration.js'
    ];
    
    this.directoriesToCheck = [
      'backend/application/handlers/workflow',
      'backend/tests/unit/workflows',
      'scripts/migration'
    ];
  }

  async removeUnifiedFiles() {
    console.log('🗑️ Starting Categories system file removal...');
    
    const removedFiles = [];
    const errors = [];

    for (const file of this.filesToRemove) {
      try {
        const filePath = path.join(__dirname, '../../..', file);
        
        if (await fs.pathExists(filePath)) {
          await fs.remove(filePath);
          removedFiles.push(file);
          console.log(`✅ Removed: ${file}`);
        } else {
          console.log(`⚠️  File not found: ${file}`);
        }
      } catch (error) {
        errors.push({ file, error: error.message });
        console.error(`❌ Failed to remove ${file}:`, error.message);
      }
    }

    // Clean up empty directories
    await this.cleanupEmptyDirectories();

    console.log(`\n📊 Removal Summary:`);
    console.log(`   Files removed: ${removedFiles.length}`);
    console.log(`   Errors: ${errors.length}`);
    
    if (errors.length > 0) {
      console.log(`\n❌ Errors encountered:`);
      errors.forEach(({ file, error }) => {
        console.log(`   - ${file}: ${error}`);
      });
    }

    return { removedFiles, errors };
  }

  async cleanupEmptyDirectories() {
    console.log('\n🧹 Cleaning up empty directories...');
    
    for (const dir of this.directoriesToCheck) {
      const dirPath = path.join(__dirname, '../../..', dir);
      
      if (await fs.pathExists(dirPath)) {
        const files = await fs.readdir(dirPath);
        if (files.length === 0) {
          await fs.remove(dirPath);
          console.log(`✅ Removed empty directory: ${dir}`);
        } else {
          console.log(`ℹ️  Directory not empty, keeping: ${dir} (${files.length} files)`);
        }
      }
    }
  }

  async validateRemoval() {
    console.log('\n🔍 Validating file removal...');
    
    const remainingFiles = [];
    
    for (const file of this.filesToRemove) {
      const filePath = path.join(__dirname, '../../..', file);
      if (await fs.pathExists(filePath)) {
        remainingFiles.push(file);
      }
    }

    if (remainingFiles.length === 0) {
      console.log('✅ All Categories system files successfully removed');
      return true;
    } else {
      console.log('❌ Some files still exist:');
      remainingFiles.forEach(file => console.log(`   - ${file}`));
      return false;
    }
  }
}

// CLI interface
async function main() {
  const remover = new UnifiedFileRemover();
  const command = process.argv[2];
  
  try {
    switch (command) {
      case 'remove':
        const result = await remover.removeUnifiedFiles();
        const validation = await remover.validateRemoval();
        
        if (validation && result.errors.length === 0) {
          console.log('\n✅ Categories system file removal completed successfully');
          process.exit(0);
        } else {
          console.log('\n⚠️  Categories system file removal completed with issues');
          process.exit(1);
        }
        break;
        
      case 'validate':
        const isValid = await remover.validateRemoval();
        process.exit(isValid ? 0 : 1);
        break;
        
      default:
        console.log('Usage:');
        console.log('  node remove-unified-files.js remove - Remove Categories system files');
        console.log('  node remove-unified-files.js validate - Validate removal status');
        break;
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = UnifiedFileRemover; 