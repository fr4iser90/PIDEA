#!/usr/bin/env node

/**
 * Enhanced Logging Migration Script
 * Automates migration of console.log, logger.info, and direct console assignments
 * to the new standardized logging system
 */

require('module-alias/register');
const fs = require('fs');
const path = require('path');
const LogMigration = require('@logging/LogMigration');
const LogStandardizer = require('@logging/LogStandardizer');
const ServiceLogger = require('@logging/ServiceLogger');

// Initialize logging
const logger = new ServiceLogger('LoggingMigration');

class EnhancedLoggingMigration {
    constructor() {
        this.migration = new LogMigration();
        this.standardizer = new LogStandardizer();
        this.projectRoot = process.cwd();
        this.backendPath = path.join(this.projectRoot, 'backend');
        this.scriptsPath = path.join(this.projectRoot, 'scripts');
        
        this.results = {
            scan: null,
            migration: null,
            validation: null,
            summary: null
        };
    }

    /**
     * Main migration execution
     */
    async execute(options = {}) {
        const {
            dryRun = false,
            backup = true,
            validate = true,
            generateReport = true
        } = options;

        logger.info('🚀 Starting Enhanced Logging Migration', { dryRun, backup, validate });

        try {
            // Phase 1: Scan for patterns
            logger.info('📊 Phase 1: Scanning for legacy logging patterns...');
            this.results.scan = await this.scanCodebase();

            // Phase 2: Execute migration
            logger.info('🔧 Phase 2: Executing migration...');
            this.results.migration = await this.migrateCodebase(dryRun, backup);

            // Phase 3: Validate results
            if (validate) {
                logger.info('✅ Phase 3: Validating migration results...');
                this.results.validation = await this.validateMigration();
            }

            // Phase 4: Generate summary
            this.results.summary = this.generateSummary();

            // Phase 5: Generate report
            if (generateReport) {
                await this.generateReport();
            }

            logger.success('🎉 Enhanced Logging Migration completed successfully!', this.results.summary);

            return this.results;

        } catch (error) {
            logger.serviceError('execute', error, { options });
            throw error;
        }
    }

    /**
     * Scan codebase for legacy logging patterns
     */
    async scanCodebase() {
        const results = {
            backend: this.migration.scanDirectory(this.backendPath),
            scripts: this.migration.scanDirectory(this.scriptsPath),
            total: {}
        };

        // Calculate totals
        results.total = {
            totalFiles: results.backend.totalFiles + results.scripts.totalFiles,
            scannedFiles: results.backend.scannedFiles + results.scripts.scannedFiles,
            consoleLog: results.backend.consoleLog.length + results.scripts.consoleLog.length,
            loggerLog: results.backend.loggerLog.length + results.scripts.loggerLog.length,
            directConsole: results.backend.directConsole.length + results.scripts.directConsole.length,
            legacyImport: results.backend.legacyImport.length + results.scripts.legacyImport.length
        };

        logger.info('📊 Codebase scan completed', results.total);

        return results;
    }

    /**
     * Migrate codebase files
     */
    async migrateCodebase(dryRun, backup) {
        const allFiles = [
            ...this.results.scan.backend.consoleLog,
            ...this.results.scan.backend.loggerLog,
            ...this.results.scan.backend.directConsole,
            ...this.results.scan.scripts.consoleLog,
            ...this.results.scan.scripts.loggerLog,
            ...this.results.scan.scripts.directConsole
        ];

        // Remove duplicates
        const uniqueFiles = [...new Set(allFiles)];

        logger.info(`🔧 Migrating ${uniqueFiles.length} files...`, { dryRun, backup });

        const results = {
            successful: [],
            failed: [],
            total: uniqueFiles.length,
            dryRun
        };

        for (const filePath of uniqueFiles) {
            try {
                const result = this.migration.migrateFile(filePath, {
                    backup,
                    dryRun,
                    serviceName: this.detectServiceName(filePath)
                });

                if (result.success) {
                    results.successful.push(result);
                    logger.debug(`✅ Migrated: ${path.relative(this.projectRoot, filePath)}`, {
                        changes: result.changes
                    });
                } else {
                    results.failed.push(result);
                    logger.warn(`❌ Failed to migrate: ${path.relative(this.projectRoot, filePath)}`, {
                        error: result.error
                    });
                }
            } catch (error) {
                results.failed.push({
                    file: filePath,
                    error: error.message,
                    success: false
                });
                logger.error(`💥 Error migrating: ${path.relative(this.projectRoot, filePath)}`, {
                    error: error.message
                });
            }
        }

        logger.info('🔧 Migration completed', {
            successful: results.successful.length,
            failed: results.failed.length,
            total: results.total
        });

        return results;
    }

    /**
     * Validate migration results
     */
    async validateMigration() {
        const allMigratedFiles = this.results.migration.successful.map(r => r.file);
        const results = {
            valid: [],
            invalid: [],
            total: allMigratedFiles.length
        };

        logger.info(`✅ Validating ${allMigratedFiles.length} migrated files...`);

        for (const filePath of allMigratedFiles) {
            try {
                const validation = this.migration.validateMigration(filePath);
                
                if (validation.valid) {
                    results.valid.push(validation);
                } else {
                    results.invalid.push(validation);
                    logger.warn(`⚠️ Validation issues in: ${path.relative(this.projectRoot, filePath)}`, {
                        issues: validation.issues
                    });
                }
            } catch (error) {
                results.invalid.push({
                    file: filePath,
                    valid: false,
                    issues: [error.message]
                });
                logger.error(`💥 Validation error in: ${path.relative(this.projectRoot, filePath)}`, {
                    error: error.message
                });
            }
        }

        logger.info('✅ Validation completed', {
            valid: results.valid.length,
            invalid: results.invalid.length,
            total: results.total
        });

        return results;
    }

    /**
     * Generate migration summary
     */
    generateSummary() {
        if (!this.results.scan || !this.results.migration) {
            return {
                timestamp: new Date().toISOString(),
                scan: {},
                migration: {},
                validation: {},
                overall: { status: 'INCOMPLETE', migrationProgress: 0 }
            };
        }
        const scan = this.results.scan.total;
        const migration = this.results.migration;
        const validation = this.results.validation;
        const summary = {
            timestamp: new Date().toISOString(),
            scan: {
                totalFiles: scan.totalFiles,
                filesNeedingMigration: scan.consoleLog + scan.loggerLog + scan.directConsole,
                consoleLogFiles: scan.consoleLog,
                loggerLogFiles: scan.loggerLog,
                directConsoleFiles: scan.directConsole,
                legacyImportFiles: scan.legacyImport
            },
            migration: {
                totalFiles: migration.total,
                successful: migration.successful.length,
                failed: migration.failed.length,
                successRate: migration.total > 0 ? 
                    ((migration.successful.length / migration.total) * 100).toFixed(1) : 0
            },
            validation: validation ? {
                totalFiles: validation.total,
                valid: validation.valid.length,
                invalid: validation.invalid.length,
                validationRate: validation.total > 0 ? 
                    ((validation.valid.length / validation.total) * 100).toFixed(1) : 0
            } : null,
            overall: {
                migrationProgress: scan.totalFiles > 0 ? 
                    ((scan.totalFiles - scan.consoleLog - scan.loggerLog - scan.directConsole) / scan.totalFiles * 100).toFixed(1) : 0,
                status: this.getOverallStatus()
            }
        };
        return summary;
    }

    /**
     * Generate detailed migration report
     */
    async generateReport() {
        const report = {
            ...this.results.summary,
            details: {
                scan: this.results.scan,
                migration: this.results.migration,
                validation: this.results.validation
            },
            recommendations: this.generateRecommendations()
        };

        const reportPath = path.join(this.projectRoot, 'logs', 'migration-report.json');
        const logsDir = path.dirname(reportPath);

        // Ensure logs directory exists
        if (!fs.existsSync(logsDir)) {
            fs.mkdirSync(logsDir, { recursive: true });
        }

        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        logger.info(`📄 Migration report saved to: ${reportPath}`);

        // Generate manual review TODOs
        await this.generateManualReviewTodos();

        return reportPath;
    }

    /**
     * Generate manual review TODOs
     */
    async generateManualReviewTodos() {
        const todos = [];
        const migration = this.results.migration;

        // Files that failed migration
        for (const failed of migration.failed) {
            todos.push({
                file: path.relative(this.projectRoot, failed.file),
                type: 'migration_failed',
                issue: failed.error,
                action: 'Review and manually migrate this file'
            });
        }

        // Files with validation issues
        if (this.results.validation) {
            for (const invalid of this.results.validation.invalid) {
                todos.push({
                    file: path.relative(this.projectRoot, invalid.file),
                    type: 'validation_failed',
                    issues: invalid.issues,
                    action: 'Fix validation issues in this file'
                });
            }
        }

        // Complex patterns that might need manual review
        const complexFiles = this.findComplexPatterns();
        for (const file of complexFiles) {
            todos.push({
                file: path.relative(this.projectRoot, file),
                type: 'complex_pattern',
                action: 'Review for complex logging patterns that may need manual attention'
            });
        }

        const todosPath = path.join(this.projectRoot, 'logs', 'manual-review-todos.md');
        const logsDir = path.dirname(todosPath);

        if (!fs.existsSync(logsDir)) {
            fs.mkdirSync(logsDir, { recursive: true });
        }

        let todosContent = '# Manual Review TODOs\n\n';
        todosContent += `Generated: ${new Date().toISOString()}\n\n`;

        for (const todo of todos) {
            todosContent += `## ${todo.file}\n\n`;
            todosContent += `**Type:** ${todo.type}\n\n`;
            if (todo.issue) {
                todosContent += `**Issue:** ${todo.issue}\n\n`;
            }
            if (todo.issues) {
                todosContent += `**Issues:**\n`;
                for (const issue of todo.issues) {
                    todosContent += `- ${issue}\n`;
                }
                todosContent += '\n';
            }
            todosContent += `**Action:** ${todo.action}\n\n`;
            todosContent += '---\n\n';
        }

        fs.writeFileSync(todosPath, todosContent);
        logger.info(`📝 Manual review TODOs saved to: ${todosPath}`);

        return todosPath;
    }

    /**
     * Find files with complex patterns
     */
    findComplexPatterns() {
        const complexFiles = [];
        const patterns = [
            /logger\.log\s*\(\s*`[^`]*\$\{[^}]*\}[^`]*`/g, // Template literals
            /console\.log\s*\(\s*`[^`]*\$\{[^}]*\}[^`]*`/g, // Template literals
            /logger\.log\s*\(\s*chalk\.[^)]+\)/g, // Chalk formatting
            /console\.log\s*\(\s*chalk\.[^)]+\)/g // Chalk formatting
        ];

        const allFiles = [
            ...this.results.scan.backend.consoleLog,
            ...this.results.scan.backend.loggerLog,
            ...this.results.scan.scripts.consoleLog,
            ...this.results.scan.scripts.loggerLog
        ];

        for (const filePath of allFiles) {
            try {
                const content = fs.readFileSync(filePath, 'utf8');
                for (const pattern of patterns) {
                    if (pattern.test(content)) {
                        complexFiles.push(filePath);
                        break;
                    }
                }
            } catch (error) {
                // Skip files that can't be read
            }
        }

        return [...new Set(complexFiles)];
    }

    /**
     * Detect service name from file path
     */
    detectServiceName(filePath) {
        const fileName = path.basename(filePath, path.extname(filePath));
        const dirName = path.basename(path.dirname(filePath));
        
        // Common patterns
        if (fileName.endsWith('Service')) return fileName;
        if (fileName.endsWith('System')) return fileName;
        if (fileName.endsWith('Manager')) return fileName;
        if (fileName.endsWith('Controller')) return fileName;
        if (fileName.endsWith('Handler')) return fileName;
        if (fileName.endsWith('Repository')) return fileName;
        
        // Script patterns
        if (filePath.includes('/scripts/')) {
            return fileName.charAt(0).toUpperCase() + fileName.slice(1) + 'Script';
        }
        
        return dirName.charAt(0).toUpperCase() + dirName.slice(1) + 'Service';
    }

    /**
     * Get overall migration status
     */
    getOverallStatus() {
        if (!this.results.summary || !this.results.summary.migration) {
            return 'INCOMPLETE';
        }
        const summary = this.results.summary;
        
        if (summary.migration.successRate === 100 && 
            (!summary.validation || summary.validation.validationRate === 100)) {
            return 'COMPLETE';
        } else if (summary.migration.successRate >= 90) {
            return 'NEARLY_COMPLETE';
        } else if (summary.migration.successRate >= 70) {
            return 'MOSTLY_COMPLETE';
        } else if (summary.migration.successRate >= 50) {
            return 'PARTIALLY_COMPLETE';
        } else {
            return 'INCOMPLETE';
        }
    }

    /**
     * Generate recommendations
     */
    generateRecommendations() {
        const recommendations = [];
        const summary = this.results.summary;

        if (summary.migration.failed > 0) {
            recommendations.push({
                priority: 'high',
                action: 'Review failed migrations',
                description: `${summary.migration.failed} files failed to migrate. Check the manual review TODOs.`
            });
        }

        if (summary.validation && summary.validation.invalid > 0) {
            recommendations.push({
                priority: 'high',
                action: 'Fix validation issues',
                description: `${summary.validation.invalid} files have validation issues.`
            });
        }

        if (summary.scan.legacyImportFiles > 0) {
            recommendations.push({
                priority: 'medium',
                action: 'Update legacy imports',
                description: `${summary.scan.legacyImportFiles} files still use legacy import patterns.`
            });
        }

        if (summary.overall.migrationProgress < 100) {
            recommendations.push({
                priority: 'medium',
                action: 'Complete remaining migrations',
                description: `Migration progress is ${summary.overall.migrationProgress}%.`
            });
        }

        recommendations.push({
            priority: 'low',
            action: 'Update documentation',
            description: 'Update project documentation with new logging standards.'
        });

        return recommendations;
    }
}

// CLI interface
async function main() {
    const args = process.argv.slice(2);
    const options = {
        dryRun: args.includes('--dry-run') || args.includes('-d'),
        backup: !args.includes('--no-backup'),
        validate: !args.includes('--no-validate'),
        generateReport: !args.includes('--no-report'),
        help: args.includes('--help') || args.includes('-h')
    };

    if (options.help) {
        logger.info(`
Enhanced Logging Migration Script

Usage: node scripts/enhanced-logging-migration.js [options]

Options:
  --dry-run, -d           Run migration without making changes
  --no-backup            Skip creating backup files
  --no-validate          Skip validation step
  --no-report            Skip generating reports
  --help, -h             Show this help

Examples:
  node scripts/enhanced-logging-migration.js --dry-run
  node scripts/enhanced-logging-migration.js --no-backup
  node scripts/enhanced-logging-migration.js
        `);
        return;
    }

    try {
        const migration = new EnhancedLoggingMigration();
        const results = await migration.execute(options);
        
        logger.info('\n📊 Migration Summary:');
        logger.info(`Total Files: ${results.summary.scan.totalFiles}`);
        logger.info(`Files Needing Migration: ${results.summary.scan.filesNeedingMigration}`);
        logger.info(`Migration Success Rate: ${results.summary.migration.successRate}%`);
        logger.info(`Overall Progress: ${results.summary.overall.migrationProgress}%`);
        logger.info(`Status: ${results.summary.overall.status}`);
        
        if (results.summary.migration.failed > 0) {
            logger.info(`\n⚠️  ${results.summary.migration.failed} files failed to migrate.`);
            logger.info('Check logs/manual-review-todos.md for details.');
        }
        
        if (results.summary.validation && results.summary.validation.invalid > 0) {
            logger.info(`\n⚠️  ${results.summary.validation.invalid} files have validation issues.`);
        }
        
    } catch (error) {
        console.error('💥 Migration failed:', error.message);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = EnhancedLoggingMigration; 