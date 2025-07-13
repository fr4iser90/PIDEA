/**
 * Unified System Rollback Script
 * Provides rollback procedures to restore Categories system files from backup
 */

const fs = require('fs-extra');
const path = require('path');

class UnifiedSystemRollback {
  constructor() {
    this.backupDir = path.join(__dirname, '../../backups/unified-system');
    this.restoredFiles = [];
    this.errors = [];
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
   * Validate backup before rollback
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
        validationResults,
        metadata
      };
      
    } catch (error) {
      console.error('❌ Backup validation failed:', error.message);
      throw error;
    }
  }

  /**
   * Rollback Categories system system from backup
   */
  async rollback(backupName, options = {}) {
    try {
      console.log(`🔄 Starting rollback from backup: ${backupName}`);
      
      // Validate backup first
      const validation = await this.validateBackup(backupName);
      if (!validation.valid) {
        throw new Error(`Backup validation failed: ${validation.invalidFiles} files are invalid`);
      }
      
      const backupPath = path.join(this.backupDir, backupName);
      const metadata = validation.metadata;
      
      // Create rollback log
      const rollbackLog = {
        timestamp: new Date().toISOString(),
        backupName,
        options,
        restoredFiles: [],
        errors: [],
        summary: {
          totalFiles: 0,
          restoredFiles: 0,
          errors: 0
        }
      };
      
      // Restore files from backup
      for (const fileInfo of metadata.backupReport.files) {
        if (fileInfo.status === 'success') {
          try {
            const sourcePath = path.join(backupPath, fileInfo.path);
            const targetPath = path.join(__dirname, '../../..', fileInfo.path);
            
            // Check if target file exists and create backup if needed
            if (options.backupExisting && await fs.pathExists(targetPath)) {
              const existingBackupPath = `${targetPath}.rollback-backup-${Date.now()}`;
              await fs.copy(targetPath, existingBackupPath);
              console.log(`📦 Backed up existing file: ${fileInfo.path}`);
            }
            
            // Restore file
            await fs.ensureDir(path.dirname(targetPath));
            await fs.copy(sourcePath, targetPath);
            
            rollbackLog.restoredFiles.push({
              file: fileInfo.path,
              size: fileInfo.size,
              type: fileInfo.type,
              status: 'restored'
            });
            
            console.log(`✅ Restored: ${fileInfo.path}`);
            
          } catch (error) {
            console.error(`❌ Failed to restore ${fileInfo.path}:`, error.message);
            
            rollbackLog.errors.push({
              file: fileInfo.path,
              error: error.message
            });
          }
        }
      }
      
      // Update summary
      rollbackLog.summary.totalFiles = metadata.backupReport.files.length;
      rollbackLog.summary.restoredFiles = rollbackLog.restoredFiles.length;
      rollbackLog.summary.errors = rollbackLog.errors.length;
      
      // Save rollback log
      const logPath = path.join(__dirname, '../../backups/rollback-logs', `rollback-${Date.now()}.json`);
      await fs.ensureDir(path.dirname(logPath));
      await fs.writeJson(logPath, rollbackLog, { spaces: 2 });
      
      console.log(`\n📊 Rollback Summary:`);
      console.log(`   Total files: ${rollbackLog.summary.totalFiles}`);
      console.log(`   Restored: ${rollbackLog.summary.restoredFiles}`);
      console.log(`   Errors: ${rollbackLog.summary.errors}`);
      console.log(`   Log saved to: ${logPath}`);
      
      if (rollbackLog.summary.errors > 0) {
        console.log(`\n⚠️  Rollback completed with ${rollbackLog.summary.errors} errors:`);
        rollbackLog.errors.forEach(error => {
          console.log(`   - ${error.file}: ${error.error}`);
        });
      }
      
      return {
        success: rollbackLog.summary.errors === 0,
        rollbackLog,
        logPath
      };
      
    } catch (error) {
      console.error('❌ Rollback failed:', error.message);
      throw error;
    }
  }

  /**
   * Dry run rollback to see what would be restored
   */
  async dryRun(backupName) {
    try {
      console.log(`🔍 Dry run rollback from backup: ${backupName}`);
      
      // Validate backup first
      const validation = await this.validateBackup(backupName);
      if (!validation.valid) {
        throw new Error(`Backup validation failed: ${validation.invalidFiles} files are invalid`);
      }
      
      const backupPath = path.join(this.backupDir, backupName);
      const metadata = validation.metadata;
      
      const dryRunResults = {
        backupName,
        timestamp: new Date().toISOString(),
        files: [],
        conflicts: [],
        summary: {
          totalFiles: 0,
          wouldRestore: 0,
          conflicts: 0
        }
      };
      
      // Check each file
      for (const fileInfo of metadata.backupReport.files) {
        if (fileInfo.status === 'success') {
          const sourcePath = path.join(backupPath, fileInfo.path);
          const targetPath = path.join(__dirname, '../../..', fileInfo.path);
          
          const targetExists = await fs.pathExists(targetPath);
          const sourceExists = await fs.pathExists(sourcePath);
          
          dryRunResults.files.push({
            file: fileInfo.path,
            sourceExists,
            targetExists,
            wouldRestore: sourceExists && !targetExists,
            wouldOverwrite: sourceExists && targetExists,
            size: fileInfo.size,
            type: fileInfo.type
          });
          
          if (sourceExists && targetExists) {
            dryRunResults.conflicts.push(fileInfo.path);
          }
        }
      }
      
      // Update summary
      dryRunResults.summary.totalFiles = dryRunResults.files.length;
      dryRunResults.summary.wouldRestore = dryRunResults.files.filter(f => f.wouldRestore).length;
      dryRunResults.summary.conflicts = dryRunResults.conflicts.length;
      
      console.log(`\n📊 Dry Run Summary:`);
      console.log(`   Total files: ${dryRunResults.summary.totalFiles}`);
      console.log(`   Would restore: ${dryRunResults.summary.wouldRestore}`);
      console.log(`   Conflicts: ${dryRunResults.summary.conflicts}`);
      
      if (dryRunResults.summary.conflicts > 0) {
        console.log(`\n⚠️  Files that would be overwritten:`);
        dryRunResults.conflicts.forEach(file => {
          console.log(`   - ${file}`);
        });
      }
      
      return dryRunResults;
      
    } catch (error) {
      console.error('❌ Dry run failed:', error.message);
      throw error;
    }
  }

  /**
   * Get rollback history
   */
  async getRollbackHistory() {
    try {
      const logsDir = path.join(__dirname, '../../backups/rollback-logs');
      
      if (!await fs.pathExists(logsDir)) {
        return [];
      }
      
      const logFiles = await fs.readdir(logsDir);
      const history = [];
      
      for (const logFile of logFiles) {
        if (logFile.endsWith('.json')) {
          const logPath = path.join(logsDir, logFile);
          const logData = await fs.readJson(logPath);
          
          history.push({
            logFile,
            timestamp: logData.timestamp,
            backupName: logData.backupName,
            success: logData.success,
            summary: logData.summary
          });
        }
      }
      
      return history.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    } catch (error) {
      console.error('❌ Failed to get rollback history:', error.message);
      throw error;
    }
  }

  /**
   * Clean up old rollback logs
   */
  async cleanupLogs(keepDays = 30) {
    try {
      const logsDir = path.join(__dirname, '../../backups/rollback-logs');
      
      if (!await fs.pathExists(logsDir)) {
        return { deleted: 0, kept: 0 };
      }
      
      const logFiles = await fs.readdir(logsDir);
      const cutoffDate = new Date(Date.now() - (keepDays * 24 * 60 * 60 * 1000));
      let deleted = 0;
      let kept = 0;
      
      for (const logFile of logFiles) {
        if (logFile.endsWith('.json')) {
          const logPath = path.join(logsDir, logFile);
          const logData = await fs.readJson(logPath);
          const logDate = new Date(logData.timestamp);
          
          if (logDate < cutoffDate) {
            await fs.remove(logPath);
            deleted++;
            console.log(`🗑️  Deleted old log: ${logFile}`);
          } else {
            kept++;
          }
        }
      }
      
      console.log(`\n📊 Log cleanup summary:`);
      console.log(`   Deleted: ${deleted}`);
      console.log(`   Kept: ${kept}`);
      
      return { deleted, kept };
    } catch (error) {
      console.error('❌ Failed to cleanup logs:', error.message);
      throw error;
    }
  }
}

// CLI interface
async function main() {
  const rollback = new UnifiedSystemRollback();
  const command = process.argv[2];
  
  try {
    switch (command) {
      case 'list':
        const backups = await rollback.listBackups();
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
          console.error('❌ Please specify backup name: node rollback-unified-system.js validate <backup-name>');
          process.exit(1);
        }
        const validation = await rollback.validateBackup(backupName);
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
        
      case 'dry-run':
        const dryRunBackup = process.argv[3];
        if (!dryRunBackup) {
          console.error('❌ Please specify backup name: node rollback-unified-system.js dry-run <backup-name>');
          process.exit(1);
        }
        await rollback.dryRun(dryRunBackup);
        break;
        
      case 'rollback':
        const rollbackBackup = process.argv[3];
        if (!rollbackBackup) {
          console.error('❌ Please specify backup name: node rollback-unified-system.js rollback <backup-name>');
          process.exit(1);
        }
        const options = {
          backupExisting: process.argv.includes('--backup-existing')
        };
        const result = await rollback.rollback(rollbackBackup, options);
        if (result.success) {
          console.log('\n✅ Rollback completed successfully!');
        } else {
          console.log('\n⚠️  Rollback completed with errors.');
          process.exit(1);
        }
        break;
        
      case 'history':
        const history = await rollback.getRollbackHistory();
        console.log('\n📋 Rollback history:');
        if (history.length === 0) {
          console.log('No rollback history found.');
        } else {
          history.forEach(h => {
            console.log(`  ${h.logFile} - ${h.backupName} (${h.success ? '✅' : '❌'})`);
          });
        }
        break;
        
      case 'cleanup-logs':
        const keepDays = parseInt(process.argv[3]) || 30;
        await rollback.cleanupLogs(keepDays);
        break;
        
      default:
        console.log('Usage:');
        console.log('  node rollback-unified-system.js list                    - List available backups');
        console.log('  node rollback-unified-system.js validate <name>        - Validate backup');
        console.log('  node rollback-unified-system.js dry-run <name>         - Dry run rollback');
        console.log('  node rollback-unified-system.js rollback <name>        - Perform rollback');
        console.log('  node rollback-unified-system.js rollback <name> --backup-existing - Rollback with existing file backup');
        console.log('  node rollback-unified-system.js history                - Show rollback history');
        console.log('  node rollback-unified-system.js cleanup-logs [days]    - Clean up old logs');
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

module.exports = UnifiedSystemRollback; 