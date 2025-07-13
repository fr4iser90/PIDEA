/**
 * Unified System Backup Script
 * Creates comprehensive backup of all Categories system files before cleanup
 */

const fs = require('fs-extra');
const path = require('path');

class UnifiedSystemBackup {
  constructor() {
    this.backupDir = path.join(__dirname, '../../backups/unified-system');
    this.filesToBackup = [
      // Core Categories system files
      'backend/domain/services/CategoriesService.js',
      'backend/application/handlers/workflow/CategoriesHandler.js',
      'backend/application/handlers/CategoriesRegistry.js',
      'backend/application/handlers/workflow/index.js',
      
      // Tests
      'backend/tests/unit/domain/workflows/CategoriesFoundation.test.js',
      'backend/tests/unit/workflows/handlers/CategoriesHandler.test.js',
      
      // Examples and documentation
      'backend/examples/CategoriesFoundationExample.js',
      'backend/docs/CategoriesFoundation1B.md',
      
      // Migration scripts
      'scripts/migration/start-unified-workflow-migration.js',
      'scripts/migration/complete-unified-workflow-migration.js',
      
      // Documentation folders
      'docs/09_roadmap/features/backend/unified-workflow-system/',
      'docs/09_roadmap/implementation/UNIFIED_WORKFLOW_IMPLEMENTATION_PLAN.md',
      'docs/09_roadmap/implementation/WORKFLOW_ANALYSIS_REPORT.md',
      'docs/09_roadmap/features/unified-workflow-legacy-migration-implementation.md'
    ];
  }

  /**
   * Create comprehensive backup of Categories system system
   */
  async createBackup() {
    try {
      console.log('🔄 Starting unified system backup...');
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.join(this.backupDir, `backup-${timestamp}`);
      
      // Create backup directory
      await fs.ensureDir(backupPath);
      
      let backedUpFiles = 0;
      let skippedFiles = 0;
      const backupReport = {
        timestamp,
        backupPath,
        files: [],
        errors: []
      };
      
      // Backup individual files
      for (const file of this.filesToBackup) {
        try {
          const sourcePath = path.join(process.cwd(), file);
          const targetPath = path.join(backupPath, file);
          
          if (await fs.pathExists(sourcePath)) {
            const stats = await fs.stat(sourcePath);
            
            if (stats.isDirectory()) {
              // Copy directory
              await fs.ensureDir(path.dirname(targetPath));
              await fs.copy(sourcePath, targetPath);
              console.log(`✅ Backed up directory: ${file}`);
            } else {
              // Copy file
              await fs.ensureDir(path.dirname(targetPath));
              await fs.copy(sourcePath, targetPath);
              console.log(`✅ Backed up file: ${file}`);
            }
            
            backupReport.files.push({
              path: file,
              size: stats.size,
              type: stats.isDirectory() ? 'directory' : 'file',
              status: 'success'
            });
            
            backedUpFiles++;
          } else {
            console.log(`⚠️  File not found: ${file}`);
            backupReport.files.push({
              path: file,
              status: 'not_found'
            });
            skippedFiles++;
          }
        } catch (error) {
          console.error(`❌ Failed to backup ${file}:`, error.message);
          backupReport.errors.push({
            file,
            error: error.message
          });
        }
      }
      
      // Create backup metadata
      const metadata = {
        backupInfo: {
          timestamp,
          totalFiles: this.filesToBackup.length,
          backedUpFiles,
          skippedFiles,
          errors: backupReport.errors.length
        },
        systemInfo: {
          nodeVersion: process.version,
          platform: process.platform,
          arch: process.arch
        },
        backupReport
      };
      
      // Save backup metadata
      const metadataPath = path.join(backupPath, 'backup-metadata.json');
      await fs.writeJson(metadataPath, metadata, { spaces: 2 });
      
      console.log(`\n📊 Backup Summary:`);
      console.log(`   Total files: ${this.filesToBackup.length}`);
      console.log(`   Backed up: ${backedUpFiles}`);
      console.log(`   Skipped: ${skippedFiles}`);
      console.log(`   Errors: ${backupReport.errors.length}`);
      console.log(`   Backup location: ${backupPath}`);
      
      if (backupReport.errors.length > 0) {
        console.log(`\n⚠️  Backup completed with ${backupReport.errors.length} errors:`);
        backupReport.errors.forEach(error => {
          console.log(`   - ${error.file}: ${error.error}`);
        });
      }
      
      return {
        success: true,
        backupPath,
        metadata,
        summary: {
          totalFiles: this.filesToBackup.length,
          backedUpFiles,
          skippedFiles,
          errors: backupReport.errors.length
        }
      };
      
    } catch (error) {
      console.error('❌ Backup failed:', error.message);
      throw error;
    }
  }

  /**
   * List all available backups
   */
  async listBackups() {
    try {
      if (!await fs.pathExists(this.backupDir)) {
        return [];
      }
      
      const backups = await fs.readdir(this.backupDir);
      const backupInfo = [];
      
      for (const backup of backups) {
        const backupPath = path.join(this.backupDir, backup);
        const metadataPath = path.join(backupPath, 'backup-metadata.json');
        
        if (await fs.pathExists(metadataPath)) {
          const metadata = await fs.readJson(metadataPath);
          backupInfo.push({
            name: backup,
            path: backupPath,
            timestamp: metadata.backupInfo.timestamp,
            totalFiles: metadata.backupInfo.totalFiles,
            backedUpFiles: metadata.backupInfo.backedUpFiles,
            errors: metadata.backupInfo.errors
          });
        }
      }
      
      return backupInfo.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    } catch (error) {
      console.error('❌ Failed to list backups:', error.message);
      throw error;
    }
  }

  /**
   * Validate backup integrity
   */
  async validateBackup(backupName) {
    try {
      const backupPath = path.join(this.backupDir, backupName);
      const metadataPath = path.join(backupPath, 'backup-metadata.json');
      
      if (!await fs.pathExists(backupPath)) {
        throw new Error(`Backup not found: ${backupName}`);
      }
      
      if (!await fs.pathExists(metadataPath)) {
        throw new Error(`Backup metadata not found: ${backupName}`);
      }
      
      const metadata = await fs.readJson(metadataPath);
      const validationResults = [];
      
      // Validate each backed up file
      for (const fileInfo of metadata.backupReport.files) {
        if (fileInfo.status === 'success') {
          const filePath = path.join(backupPath, fileInfo.path);
          const exists = await fs.pathExists(filePath);
          
          validationResults.push({
            file: fileInfo.path,
            exists,
            valid: exists
          });
        }
      }
      
      const validFiles = validationResults.filter(r => r.valid).length;
      const totalFiles = validationResults.length;
      
      return {
        backupName,
        valid: validFiles === totalFiles,
        totalFiles,
        validFiles,
        invalidFiles: totalFiles - validFiles,
        validationResults
      };
      
    } catch (error) {
      console.error('❌ Backup validation failed:', error.message);
      throw error;
    }
  }
}

// CLI interface
async function main() {
  const backup = new UnifiedSystemBackup();
  const command = process.argv[2];
  
  try {
    switch (command) {
      case 'create':
        const result = await backup.createBackup();
        console.log('\n✅ Backup completed successfully!');
        console.log(`Backup location: ${result.backupPath}`);
        break;
        
      case 'list':
        const backups = await backup.listBackups();
        console.log('\n📋 Available backups:');
        if (backups.length === 0) {
          console.log('No backups found.');
        } else {
          backups.forEach(b => {
            console.log(`  ${b.name} (${b.backedUpFiles}/${b.totalFiles} files, ${b.errors} errors)`);
          });
        }
        break;
        
      case 'validate':
        const backupName = process.argv[3];
        if (!backupName) {
          console.error('❌ Please specify backup name: node backup-unified-system.js validate <backup-name>');
          process.exit(1);
        }
        const validation = await backup.validateBackup(backupName);
        console.log('\n🔍 Backup validation results:');
        console.log(`  Valid: ${validation.valid ? '✅' : '❌'}`);
        console.log(`  Files: ${validation.validFiles}/${validation.totalFiles}`);
        if (!validation.valid) {
          console.log('  Invalid files:');
          validation.validationResults
            .filter(r => !r.valid)
            .forEach(r => console.log(`    - ${r.file}`));
        }
        break;
        
      default:
        console.log('Usage:');
        console.log('  node backup-unified-system.js create    - Create new backup');
        console.log('  node backup-unified-system.js list      - List available backups');
        console.log('  node backup-unified-system.js validate <name> - Validate backup');
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

module.exports = UnifiedSystemBackup; 