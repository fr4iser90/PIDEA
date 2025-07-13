
#!/usr/bin/env node
require('module-alias/register');

/**
 * Test Versioner
 * Manages test file versioning and migration tracking
 */

const TestManagementService = require('@services/TestManagementService');
const path = require('path');
const fs = require('fs').promises;
const { exec } = require('child_process');
const { promisify } = require('util');
const Logger = require('@logging/Logger');
const logger = new Logger('Logger');

const execAsync = promisify(exec);

class TestVersioner {
  constructor() {
    this.testManagementService = new TestManagementService();
    this.versionHistory = new Map();
    this.migrationLog = [];
  }

  /**
   * Version a test file
   * @param {string} filePath - Path to the test file
   * @param {string} version - New version
   * @param {string} reason - Version reason
   * @returns {Promise<Object>} - Versioning result
   */
  async versionTest(filePath, version, reason = '') {
    logger.debug(`🔄 Versioning test file: ${path.basename(filePath)}`);
    
    try {
      // Validate file exists
      await fs.access(filePath);
      
      // Get current file stats
      const stats = await fs.stat(filePath);
      const content = await fs.readFile(filePath, 'utf8');
      
      // Create backup
      const backupPath = await this.createBackup(filePath, version);
      
      // Update test metadata
      const testMetadata = await this.testManagementService.versionTest(filePath, version);
      
      // Record version history
      this.recordVersionHistory(filePath, version, reason, stats, content);
      
      // Log migration
      this.logMigration('version', filePath, version, reason);
      
      const result = {
        success: true,
        filePath,
        version,
        reason,
        backupPath,
        testMetadata: testMetadata.toJSON()
      };
      
      logger.log(`✅ Successfully versioned to ${version}`);
      return result;
      
    } catch (error) {
      logger.error(`❌ Failed to version test: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create backup of test file
   * @param {string} filePath - Original file path
   * @param {string} version - Version for backup
   * @returns {Promise<string>} - Backup file path
   */
  async createBackup(filePath, version) {
    const dir = path.dirname(filePath);
    const name = path.basename(filePath, path.extname(filePath));
    const ext = path.extname(filePath);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    const backupPath = path.join(dir, `${name}.v${version}.${timestamp}${ext}`);
    
    await fs.copyFile(filePath, backupPath);
    logger.log(`💾 Backup created: ${path.basename(backupPath)}`);
    
    return backupPath;
  }

  /**
   * Record version history
   * @param {string} filePath - File path
   * @param {string} version - Version
   * @param {string} reason - Version reason
   * @param {Object} stats - File stats
   * @param {string} content - File content
   */
  recordVersionHistory(filePath, version, reason, stats, content) {
    if (!this.versionHistory.has(filePath)) {
      this.versionHistory.set(filePath, []);
    }
    
    const history = this.versionHistory.get(filePath);
    history.push({
      version,
      reason,
      timestamp: new Date(),
      fileSize: stats.size,
      lastModified: stats.mtime,
      contentHash: this.hashContent(content)
    });
    
    // Keep only last 10 versions
    if (history.length > 10) {
      history.splice(0, history.length - 10);
    }
  }

  /**
   * Simple content hash
   * @param {string} content - File content
   * @returns {string} - Hash
   */
  hashContent(content) {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(16);
  }

  /**
   * Log migration
   * @param {string} type - Migration type
   * @param {string} filePath - File path
   * @param {string} version - Version
   * @param {string} reason - Reason
   */
  logMigration(type, filePath, version, reason) {
    this.migrationLog.push({
      type,
      filePath,
      version,
      reason,
      timestamp: new Date()
    });
  }

  /**
   * Get version history for a file
   * @param {string} filePath - File path
   * @returns {Array} - Version history
   */
  getVersionHistory(filePath) {
    return this.versionHistory.get(filePath) || [];
  }

  /**
   * Compare versions of a test file
   * @param {string} filePath - File path
   * @param {string} version1 - First version
   * @param {string} version2 - Second version
   * @returns {Promise<Object>} - Comparison result
   */
  async compareVersions(filePath, version1, version2) {
    try {
      const history = this.getVersionHistory(filePath);
      const v1 = history.find(h => h.version === version1);
      const v2 = history.find(h => h.version === version2);
      
      if (!v1 || !v2) {
        throw new Error(`Version not found in history`);
      }
      
      const comparison = {
        filePath,
        version1,
        version2,
        v1Info: {
          timestamp: v1.timestamp,
          reason: v1.reason,
          fileSize: v1.fileSize,
          contentHash: v1.contentHash
        },
        v2Info: {
          timestamp: v2.timestamp,
          reason: v2.reason,
          fileSize: v2.fileSize,
          contentHash: v2.contentHash
        },
        changes: {
          contentChanged: v1.contentHash !== v2.contentHash,
          sizeChanged: v1.fileSize !== v2.fileSize,
          timeDiff: Math.abs(new Date(v2.timestamp) - new Date(v1.timestamp))
        }
      };
      
      return comparison;
    } catch (error) {
      logger.error(`❌ Failed to compare versions: ${error.message}`);
      throw error;
    }
  }

  /**
   * Rollback to previous version
   * @param {string} filePath - File path
   * @param {string} version - Version to rollback to
   * @returns {Promise<Object>} - Rollback result
   */
  async rollbackToVersion(filePath, version) {
    logger.log(`🔄 Rolling back ${path.basename(filePath)} to version ${version}`);
    
    try {
      const history = this.getVersionHistory(filePath);
      const targetVersion = history.find(h => h.version === version);
      
      if (!targetVersion) {
        throw new Error(`Version ${version} not found in history`);
      }
      
      // Create backup of current version
      const currentBackup = await this.createBackup(filePath, 'rollback');
      
      // Find backup file for target version
      const dir = path.dirname(filePath);
      const name = path.basename(filePath, path.extname(filePath));
      const ext = path.extname(filePath);
      
      // Look for backup file
      const backupPattern = new RegExp(`^${name}\\.v${version.replace(/\./g, '\\.')}\\..*${ext}$`);
      const files = await fs.readdir(dir);
      const backupFile = files.find(f => backupPattern.test(f));
      
      if (!backupFile) {
        throw new Error(`Backup file for version ${version} not found`);
      }
      
      const backupPath = path.join(dir, backupFile);
      
      // Restore from backup
      await fs.copyFile(backupPath, filePath);
      
      // Update test metadata
      const testMetadata = await this.testManagementService.versionTest(filePath, `${version}-rollback`);
      
      // Log migration
      this.logMigration('rollback', filePath, version, `Rollback from ${testMetadata.version}`);
      
      const result = {
        success: true,
        filePath,
        rollbackVersion: version,
        currentBackup,
        restoredFrom: backupPath,
        testMetadata: testMetadata.toJSON()
      };
      
      logger.log(`✅ Successfully rolled back to version ${version}`);
      return result;
      
    } catch (error) {
      logger.error(`❌ Failed to rollback: ${error.message}`);
      throw error;
    }
  }

  /**
   * Migrate test to new framework
   * @param {string} filePath - File path
   * @param {string} targetFramework - Target framework
   * @param {Object} migrationRules - Migration rules
   * @returns {Promise<Object>} - Migration result
   */
  async migrateTest(filePath, targetFramework, migrationRules = {}) {
    logger.log(`🔄 Migrating ${path.basename(filePath)} to ${targetFramework}`);
    
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const originalContent = content;
      
      // Apply migration rules
      let migratedContent = content;
      
      if (targetFramework === 'jest') {
        migratedContent = this.migrateToJest(content, migrationRules);
      } else if (targetFramework === 'mocha') {
        migratedContent = this.migrateToMocha(content, migrationRules);
      } else if (targetFramework === 'vitest') {
        migratedContent = this.migrateToVitest(content, migrationRules);
      } else {
        throw new Error(`Unsupported target framework: ${targetFramework}`);
      }
      
      // Create backup
      const backupPath = await this.createBackup(filePath, 'pre-migration');
      
      // Write migrated content
      await fs.writeFile(filePath, migratedContent);
      
      // Update test metadata
      const testMetadata = await this.testManagementService.versionTest(filePath, `migrated-to-${targetFramework}`);
      testMetadata.addTag('migrated');
      testMetadata.setMetadata('migrationTarget', targetFramework);
      testMetadata.setMetadata('migrationDate', new Date().toISOString());
      
      await this.testManagementService.testMetadataRepository.save(testMetadata);
      
      // Record version history
      this.recordVersionHistory(filePath, `migrated-to-${targetFramework}`, `Migration to ${targetFramework}`, 
        await fs.stat(filePath), migratedContent);
      
      // Log migration
      this.logMigration('framework-migration', filePath, targetFramework, 'Framework migration');
      
      const result = {
        success: true,
        filePath,
        targetFramework,
        originalContent,
        migratedContent,
        backupPath,
        testMetadata: testMetadata.toJSON(),
        changes: {
          contentChanged: originalContent !== migratedContent,
          linesChanged: this.countLineChanges(originalContent, migratedContent)
        }
      };
      
      logger.log(`✅ Successfully migrated to ${targetFramework}`);
      return result;
      
    } catch (error) {
      logger.error(`❌ Failed to migrate test: ${error.message}`);
      throw error;
    }
  }

  /**
   * Migrate to Jest
   * @param {string} content - Original content
   * @param {Object} rules - Migration rules
   * @returns {string} - Migrated content
   */
  migrateToJest(content, rules = {}) {
    let migrated = content;
    
    // Replace describe blocks
    migrated = migrated.replace(/describe\(['"`]([^'"`]+)['"`],\s*function\s*\(\)/g, 'describe(\'$1\', () =>');
    migrated = migrated.replace(/describe\(['"`]([^'"`]+)['"`],\s*function\s*\(\)/g, 'describe(\'$1\', () =>');
    
    // Replace it/test blocks
    migrated = migrated.replace(/it\(['"`]([^'"`]+)['"`],\s*function\s*\(\)/g, 'it(\'$1\', () =>');
    migrated = migrated.replace(/test\(['"`]([^'"`]+)['"`],\s*function\s*\(\)/g, 'test(\'$1\', () =>');
    
    // Replace beforeEach/afterEach
    migrated = migrated.replace(/beforeEach\(function\s*\(\)/g, 'beforeEach(() =>');
    migrated = migrated.replace(/afterEach\(function\s*\(\)/g, 'afterEach(() =>');
    migrated = migrated.replace(/before\(function\s*\(\)/g, 'beforeAll(() =>');
    migrated = migrated.replace(/after\(function\s*\(\)/g, 'afterAll(() =>');
    
    // Replace assertions
    migrated = migrated.replace(/expect\(([^)]+)\)\.to\.equal\(([^)]+)\)/g, 'expect($1).toBe($2)');
    migrated = migrated.replace(/expect\(([^)]+)\)\.to\.deep\.equal\(([^)]+)\)/g, 'expect($1).toEqual($2)');
    migrated = migrated.replace(/expect\(([^)]+)\)\.to\.be\.true/g, 'expect($1).toBe(true)');
    migrated = migrated.replace(/expect\(([^)]+)\)\.to\.be\.false/g, 'expect($1).toBe(false)');
    migrated = migrated.replace(/expect\(([^)]+)\)\.to\.be\.null/g, 'expect($1).toBeNull()');
    migrated = migrated.replace(/expect\(([^)]+)\)\.to\.be\.undefined/g, 'expect($1).toBeUndefined()');
    
    return migrated;
  }

  /**
   * Migrate to Mocha
   * @param {string} content - Original content
   * @param {Object} rules - Migration rules
   * @returns {string} - Migrated content
   */
  migrateToMocha(content, rules = {}) {
    let migrated = content;
    
    // Replace Jest-specific syntax with Mocha
    migrated = migrated.replace(/beforeAll\(/g, 'before(');
    migrated = migrated.replace(/afterAll\(/g, 'after(');
    migrated = migrated.replace(/expect\(([^)]+)\)\.toBe\(([^)]+)\)/g, 'expect($1).to.equal($2)');
    migrated = migrated.replace(/expect\(([^)]+)\)\.toEqual\(([^)]+)\)/g, 'expect($1).to.deep.equal($2)');
    migrated = migrated.replace(/expect\(([^)]+)\)\.toBe\(true\)/g, 'expect($1).to.be.true');
    migrated = migrated.replace(/expect\(([^)]+)\)\.toBe\(false\)/g, 'expect($1).to.be.false');
    migrated = migrated.replace(/expect\(([^)]+)\)\.toBeNull\(\)/g, 'expect($1).to.be.null');
    migrated = migrated.replace(/expect\(([^)]+)\)\.toBeUndefined\(\)/g, 'expect($1).to.be.undefined');
    
    return migrated;
  }

  /**
   * Migrate to Vitest
   * @param {string} content - Original content
   * @param {Object} rules - Migration rules
   * @returns {string} - Migrated content
   */
  migrateToVitest(content, rules = {}) {
    let migrated = content;
    
    // Vitest is mostly compatible with Jest, but we can make some optimizations
    migrated = migrated.replace(/describe\(/g, 'describe(');
    migrated = migrated.replace(/it\(/g, 'it(');
    migrated = migrated.replace(/test\(/g, 'test(');
    
    // Add Vitest-specific imports if needed
    if (!migrated.includes('import') && !migrated.includes('require')) {
      migrated = `import { describe, it, expect } from 'vitest';\n\n${migrated}`;
    }
    
    return migrated;
  }

  /**
   * Count line changes between two contents
   * @param {string} original - Original content
   * @param {string} migrated - Migrated content
   * @returns {Object} - Change statistics
   */
  countLineChanges(original, migrated) {
    const originalLines = original.split('\n');
    const migratedLines = migrated.split('\n');
    
    return {
      originalLines: originalLines.length,
      migratedLines: migratedLines.length,
      addedLines: migratedLines.length - originalLines.length,
      changedLines: 0 // This would require more sophisticated diffing
    };
  }

  /**
   * Get migration log
   * @returns {Array} - Migration log
   */
  getMigrationLog() {
    return [...this.migrationLog];
  }

  /**
   * Export versioning data
   * @param {string} outputPath - Output file path
   * @returns {Promise<void>}
   */
  async exportVersioningData(outputPath) {
    try {
      const exportData = {
        exportDate: new Date().toISOString(),
        versionHistory: Object.fromEntries(this.versionHistory),
        migrationLog: this.migrationLog
      };
      
      await fs.writeFile(outputPath, JSON.stringify(exportData, null, 2));
      logger.log(`📄 Versioning data exported to: ${outputPath}`);
    } catch (error) {
      logger.error(`❌ Failed to export versioning data: ${error.message}`);
    }
  }

  /**
   * Generate versioning report
   * @returns {Promise<Object>} - Versioning report
   */
  async generateVersioningReport() {
    try {
      const report = {
        generatedAt: new Date().toISOString(),
        totalFiles: this.versionHistory.size,
        totalVersions: 0,
        totalMigrations: this.migrationLog.length,
        files: [],
        recentMigrations: []
      };
      
      // Process version history
      for (const [filePath, history] of this.versionHistory) {
        report.totalVersions += history.length;
        
        report.files.push({
          filePath,
          fileName: path.basename(filePath),
          versionCount: history.length,
          latestVersion: history[history.length - 1]?.version || 'unknown',
          lastModified: history[history.length - 1]?.timestamp || null
        });
      }
      
      // Get recent migrations
      report.recentMigrations = this.migrationLog
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 10);
      
      return report;
    } catch (error) {
      logger.error(`❌ Error generating versioning report: ${error.message}`);
      throw error;
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const versioner = new TestVersioner();
  
  if (args.length === 0) {
    logger.debug('Usage: node test-versioner.js <command> [options]');
    logger.log('');
    logger.log('Commands:');
    logger.debug('  version <file> <version> [reason]     Version a test file');
    logger.log('  compare <file> <v1> <v2>             Compare two versions');
    logger.log('  rollback <file> <version>             Rollback to version');
    logger.log('  migrate <file> <framework>            Migrate to framework');
    logger.log('  history <file>                        Show version history');
    logger.log('  report                                 Generate versioning report');
    logger.log('  export <output-file>                  Export versioning data');
    logger.log('');
    logger.log('Examples:');
    logger.debug('  node test-versioner.js version test.js 2.0.0 "Major refactor"');
    logger.debug('  node test-versioner.js migrate test.js jest');
    logger.debug('  node test-versioner.js rollback test.js 1.0.0');
    return;
  }
  
  const command = args[0];
  
  try {
    switch (command) {
      case 'version':
        if (args.length < 3) {
          logger.error('❌ File path and version required');
          process.exit(1);
        }
        const reason = args[3] || '';
        const result = await versioner.versionTest(args[1], args[2], reason);
        logger.log(JSON.stringify(result, null, 2));
        break;
        
      case 'compare':
        if (args.length < 4) {
          logger.error('❌ File path and two versions required');
          process.exit(1);
        }
        const comparison = await versioner.compareVersions(args[1], args[2], args[3]);
        logger.log(JSON.stringify(comparison, null, 2));
        break;
        
      case 'rollback':
        if (args.length < 3) {
          logger.error('❌ File path and version required');
          process.exit(1);
        }
        const rollbackResult = await versioner.rollbackToVersion(args[1], args[2]);
        logger.log(JSON.stringify(rollbackResult, null, 2));
        break;
        
      case 'migrate':
        if (args.length < 3) {
          logger.error('❌ File path and framework required');
          process.exit(1);
        }
        const migrationResult = await versioner.migrateTest(args[1], args[2]);
        logger.log(JSON.stringify(migrationResult, null, 2));
        break;
        
      case 'history':
        if (args.length < 2) {
          logger.error('❌ File path required');
          process.exit(1);
        }
        const history = versioner.getVersionHistory(args[1]);
        logger.log(JSON.stringify(history, null, 2));
        break;
        
      case 'report':
        const report = await versioner.generateVersioningReport();
        logger.log(JSON.stringify(report, null, 2));
        break;
        
      case 'export':
        if (args.length < 2) {
          logger.error('❌ Output file path required');
          process.exit(1);
        }
        await versioner.exportVersioningData(args[1]);
        break;
        
      default:
        logger.error(`❌ Unknown command: ${command}`);
        process.exit(1);
    }
  } catch (error) {
    logger.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = TestVersioner; 