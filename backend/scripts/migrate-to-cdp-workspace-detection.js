#!/usr/bin/env node

/**
 * Migration Script: Legacy to CDP Workspace Detection
 * 
 * This script helps migrate from the legacy terminal-based workspace detection
 * to the new CDP-based detection system.
 * 
 * Usage: node scripts/migrate-to-cdp-workspace-detection.js [options]
 * 
 * Options:
 *   --dry-run     Show what would be migrated without making changes
 *   --backup      Create backup of legacy files before migration
 *   --cleanup     Remove legacy files after successful migration
 *   --help        Show this help message
 */

const fs = require('fs').promises;
const path = require('path');
const Logger = require('@logging/Logger');

const logger = new Logger('CDPWorkspaceMigration');

class CDPWorkspaceMigration {
  constructor(options = {}) {
    this.options = {
      dryRun: options.dryRun || false,
      backup: options.backup || false,
      cleanup: options.cleanup || false,
      ...options
    };

    this.migrationResults = {
      filesProcessed: 0,
      filesBackedUp: 0,
      filesMigrated: 0,
      filesCleanedUp: 0,
      errors: []
    };

    // Files to migrate/cleanup (already removed)
    this.legacyFiles = [
      // Legacy files have been removed
    ];

    this.newFiles = [
      'backend/infrastructure/external/cdp/CDPConnectionManager.js',
      'backend/domain/services/workspace/CDPWorkspaceDetector.js',
      'backend/domain/services/git/CDPGitDetector.js',
      'backend/tests/unit/CDPConnectionManager.test.js',
      'backend/tests/unit/CDPWorkspaceDetector.test.js',
      'backend/tests/unit/CDPGitDetector.test.js',
      'backend/tests/integration/CDPWorkspaceDetection.test.js'
    ];

    this.modifiedFiles = [
      'backend/infrastructure/external/ide/IDEManager.js',
      'backend/infrastructure/dependency-injection/ServiceRegistry.js'
    ];
  }

  /**
   * Run the migration process
   */
  async run() {
    try {
      logger.info('🚀 Starting CDP Workspace Detection Migration');
      logger.info(`Mode: ${this.options.dryRun ? 'DRY RUN' : 'LIVE'}`);
      
      // Step 1: Validate new files exist
      await this.validateNewFiles();
      
      // Step 2: Backup legacy files if requested
      if (this.options.backup) {
        await this.backupLegacyFiles();
      }
      
      // Step 3: Update configuration files
      await this.updateConfigurationFiles();
      
      // Step 4: Cleanup legacy files if requested
      if (this.options.cleanup) {
        await this.cleanupLegacyFiles();
      }
      
      // Step 5: Generate migration report
      await this.generateMigrationReport();
      
      logger.info('✅ Migration completed successfully');
      
    } catch (error) {
      logger.error('❌ Migration failed:', error.message);
      this.migrationResults.errors.push(error.message);
      throw error;
    }
  }

  /**
   * Validate that all new files exist
   */
  async validateNewFiles() {
    logger.info('📋 Validating new CDP files...');
    
    for (const file of this.newFiles) {
      try {
        await fs.access(file);
        logger.info(`✅ Found: ${file}`);
      } catch (error) {
        const errorMsg = `Missing required file: ${file}`;
        logger.error(`❌ ${errorMsg}`);
        this.migrationResults.errors.push(errorMsg);
        throw new Error(errorMsg);
      }
    }
    
    logger.info(`✅ All ${this.newFiles.length} new files validated`);
  }

  /**
   * Backup legacy files
   */
  async backupLegacyFiles() {
    logger.info('💾 Backing up legacy files...');
    
    const backupDir = 'backup/legacy-workspace-detection';
    
    try {
      await fs.mkdir(backupDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
    
    for (const file of this.legacyFiles) {
      try {
        await fs.access(file);
        
        const backupPath = path.join(backupDir, path.basename(file));
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const timestampedBackup = `${backupPath}.${timestamp}`;
        
        if (!this.options.dryRun) {
          await fs.copyFile(file, timestampedBackup);
        }
        
        logger.info(`💾 Backed up: ${file} -> ${timestampedBackup}`);
        this.migrationResults.filesBackedUp++;
        
      } catch (error) {
        logger.warn(`⚠️  Could not backup ${file}: ${error.message}`);
      }
    }
    
    logger.info(`✅ Backed up ${this.migrationResults.filesBackedUp} files`);
  }

  /**
   * Update configuration files
   */
  async updateConfigurationFiles() {
    logger.info('⚙️  Updating configuration files...');
    
    // Check if IDEManager has been updated
    try {
      const ideManagerPath = 'backend/infrastructure/external/ide/IDEManager.js';
      const ideManagerContent = await fs.readFile(ideManagerPath, 'utf8');
      
      if (ideManagerContent.includes('CDPConnectionManager') && ideManagerContent.includes('CDPWorkspaceDetector')) {
        logger.info('✅ IDEManager already updated with CDP integration');
      } else {
        const errorMsg = 'IDEManager has not been updated with CDP integration';
        logger.error(`❌ ${errorMsg}`);
        this.migrationResults.errors.push(errorMsg);
        throw new Error(errorMsg);
      }
    } catch (error) {
      const errorMsg = `Could not validate IDEManager: ${error.message}`;
      logger.error(`❌ ${errorMsg}`);
      this.migrationResults.errors.push(errorMsg);
      throw new Error(errorMsg);
    }
    
    // Check if ServiceRegistry has been updated
    try {
      const serviceRegistryPath = 'backend/infrastructure/dependency-injection/ServiceRegistry.js';
      const serviceRegistryContent = await fs.readFile(serviceRegistryPath, 'utf8');
      
      if (serviceRegistryContent.includes('cdpConnectionManager') && serviceRegistryContent.includes('cdpWorkspaceDetector')) {
        logger.info('✅ ServiceRegistry already updated with CDP services');
      } else {
        const errorMsg = 'ServiceRegistry has not been updated with CDP services';
        logger.error(`❌ ${errorMsg}`);
        this.migrationResults.errors.push(errorMsg);
        throw new Error(errorMsg);
      }
    } catch (error) {
      const errorMsg = `Could not validate ServiceRegistry: ${error.message}`;
      logger.error(`❌ ${errorMsg}`);
      this.migrationResults.errors.push(errorMsg);
      throw new Error(errorMsg);
    }
    
    logger.info('✅ Configuration files validated');
  }

  /**
   * Cleanup legacy files
   */
  async cleanupLegacyFiles() {
    logger.info('🧹 Cleaning up legacy files...');
    
    for (const file of this.legacyFiles) {
      try {
        await fs.access(file);
        
        if (!this.options.dryRun) {
          await fs.unlink(file);
        }
        
        logger.info(`🗑️  ${this.options.dryRun ? 'Would remove' : 'Removed'}: ${file}`);
        this.migrationResults.filesCleanedUp++;
        
      } catch (error) {
        logger.warn(`⚠️  Could not cleanup ${file}: ${error.message}`);
      }
    }
    
    // Cleanup legacy directory structure
    const legacyDir = '/tmp/IDEWEB';
    try {
      const stats = await fs.stat(legacyDir);
      if (stats.isDirectory()) {
        if (!this.options.dryRun) {
          await fs.rm(legacyDir, { recursive: true, force: true });
        }
        logger.info(`🗑️  ${this.options.dryRun ? 'Would remove' : 'Removed'} legacy directory: ${legacyDir}`);
      }
    } catch (error) {
      logger.debug(`Legacy directory ${legacyDir} not found or already removed`);
    }
    
    logger.info(`✅ ${this.options.dryRun ? 'Would cleanup' : 'Cleaned up'} ${this.migrationResults.filesCleanedUp} files`);
  }

  /**
   * Generate migration report
   */
  async generateMigrationReport() {
    logger.info('📊 Generating migration report...');
    
    const report = {
      timestamp: new Date().toISOString(),
      mode: this.options.dryRun ? 'dry-run' : 'live',
      results: this.migrationResults,
      summary: {
        newFilesAdded: this.newFiles.length,
        filesModified: this.modifiedFiles.length,
        filesBackedUp: this.migrationResults.filesBackedUp,
        filesCleanedUp: this.migrationResults.filesCleanedUp,
        errors: this.migrationResults.errors.length
      },
      recommendations: this.generateRecommendations()
    };
    
    const reportPath = `migration-report-${Date.now()}.json`;
    
    if (!this.options.dryRun) {
      await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
      logger.info(`📊 Migration report saved: ${reportPath}`);
    }
    
    // Log summary
    logger.info('📊 Migration Summary:');
    logger.info(`   New files added: ${report.summary.newFilesAdded}`);
    logger.info(`   Files modified: ${report.summary.filesModified}`);
    logger.info(`   Files backed up: ${report.summary.filesBackedUp}`);
    logger.info(`   Files cleaned up: ${report.summary.filesCleanedUp}`);
    logger.info(`   Errors: ${report.summary.errors}`);
    
    if (report.recommendations.length > 0) {
      logger.info('💡 Recommendations:');
      report.recommendations.forEach((rec, index) => {
        logger.info(`   ${index + 1}. ${rec}`);
      });
    }
  }

  /**
   * Generate recommendations based on migration results
   */
  generateRecommendations() {
    const recommendations = [];
    
    if (this.migrationResults.errors.length === 0) {
      recommendations.push('Migration completed successfully - no action required');
    } else {
      recommendations.push('Review and fix errors before proceeding with cleanup');
    }
    
    if (this.options.dryRun) {
      recommendations.push('Run without --dry-run to perform actual migration');
    }
    
    if (!this.options.backup) {
      recommendations.push('Consider running with --backup to create safety copies');
    }
    
    if (this.migrationResults.filesCleanedUp === 0 && !this.options.dryRun) {
      recommendations.push('Run with --cleanup to remove legacy files');
    }
    
    recommendations.push('Test the new CDP-based workspace detection thoroughly');
    recommendations.push('Monitor system performance after migration');
    recommendations.push('Update documentation to reflect new CDP-based approach');
    
    return recommendations;
  }

  /**
   * Show help information
   */
  static showHelp() {
    console.log(`
CDP Workspace Detection Migration Script

Usage: node scripts/migrate-to-cdp-workspace-detection.js [options]

Options:
  --dry-run     Show what would be migrated without making changes
  --backup      Create backup of legacy files before migration
  --cleanup     Remove legacy files after successful migration
  --help        Show this help message

Examples:
  # Dry run to see what would be migrated
  node scripts/migrate-to-cdp-workspace-detection.js --dry-run

  # Full migration with backup
  node scripts/migrate-to-cdp-workspace-detection.js --backup --cleanup

  # Migration without cleanup (safer)
  node scripts/migrate-to-cdp-workspace-detection.js --backup
`);
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help')) {
    CDPWorkspaceMigration.showHelp();
    return;
  }
  
  const options = {
    dryRun: args.includes('--dry-run'),
    backup: args.includes('--backup'),
    cleanup: args.includes('--cleanup')
  };
  
  const migration = new CDPWorkspaceMigration(options);
  
  try {
    await migration.run();
  } catch (error) {
    logger.error('Migration failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = CDPWorkspaceMigration;
