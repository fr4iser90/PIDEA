#!/usr/bin/env node

/**
 * Logging Migration Validation Script
 * Validates compliance with new logging standards
 */

require('module-alias/register');
const fs = require('fs');
const path = require('path');
const LogMigration = require('@logging/LogMigration');
const ServiceLogger = require('@logging/ServiceLogger');

// Initialize logging
const logger = new ServiceLogger('LoggingValidation');

class LoggingValidation {
    constructor() {
        this.migration = new LogMigration();
        this.projectRoot = process.cwd();
        this.backendPath = path.join(this.projectRoot, 'backend');
        this.scriptsPath = path.join(this.projectRoot, 'scripts');
        
        this.issues = [];
        this.stats = {
            totalFiles: 0,
            compliantFiles: 0,
            nonCompliantFiles: 0,
            issues: 0
        };
    }

    /**
     * Main validation execution
     */
    async validate() {
        logger.info('🔍 Starting Logging Migration Validation...\n');

        try {
            // Scan for legacy patterns
            const scanResults = await this.scanCodebase();
            
            // Validate each file
            const validationResults = await this.validateFiles(scanResults);
            
            // Generate report
            const report = this.generateReport(scanResults, validationResults);
            
            // Display results
            this.displayResults(report);
            
            return report;

        } catch (error) {
            console.error('💥 Validation failed:', error.message);
            throw error;
        }
    }

    /**
     * Scan codebase for legacy patterns
     */
    async scanCodebase() {
        logger.info('📊 Scanning codebase for legacy logging patterns...');
        
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

        return results;
    }

    /**
     * Validate individual files
     */
    async validateFiles(scanResults) {
        logger.info('✅ Validating individual files...');
        
        const allFiles = [
            ...this.migration.getJsFiles(this.backendPath),
            ...this.migration.getJsFiles(this.scriptsPath)
        ];

        const results = {
            valid: [],
            invalid: [],
            total: allFiles.length
        };

        for (const filePath of allFiles) {
            try {
                const validation = this.validateFile(filePath);
                
                if (validation.valid) {
                    results.valid.push(validation);
                } else {
                    results.invalid.push(validation);
                    this.issues.push(...validation.issues.map(issue => ({
                        file: path.relative(this.projectRoot, filePath),
                        issue
                    })));
                }
            } catch (error) {
                results.invalid.push({
                    file: filePath,
                    valid: false,
                    issues: [error.message]
                });
                this.issues.push({
                    file: path.relative(this.projectRoot, filePath),
                    issue: error.message
                });
            }
        }

        return results;
    }

    /**
     * Validate a single file
     */
    validateFile(filePath) {
        const content = fs.readFileSync(filePath, 'utf8');
        const issues = [];

        // Check for console.log
        if (this.migration.patterns.consoleLog.test(content)) {
            issues.push('console.log usage found');
        }

        // Check for logger.info
        if (this.migration.patterns.loggerLog.test(content)) {
            issues.push('logger.info usage found (legacy pattern)');
        }

        // Check for direct console assignment
        if (this.migration.patterns.directConsole.test(content)) {
            issues.push('direct console assignment found');
        }

        // Check for legacy imports
        if (this.migration.patterns.legacyImport.test(content)) {
            issues.push('legacy import pattern found');
        }

        // Check for missing Logger import when using logger methods
        if ((content.includes('logger.info') || content.includes('logger.warn') || content.includes('logger.error')) &&
            !content.includes("require('@logging/Logger')") && !content.includes("require('@logging/ServiceLogger')")) {
            issues.push('Logger import missing but logger methods used');
        }

        // Check for missing ServiceLogger import when using ServiceLogger
        if (content.includes('new ServiceLogger') && !content.includes("require('@logging/ServiceLogger')")) {
            issues.push('ServiceLogger import missing');
        }

        // Check for sensitive data in logs
        if (this.containsSensitiveData(content)) {
            issues.push('potential sensitive data in logs');
        }

        return {
            file: filePath,
            valid: issues.length === 0,
            issues
        };
    }

    /**
     * Check for sensitive data in content
     */
    containsSensitiveData(content) {
        const sensitivePatterns = [
            /password\s*[:=]\s*['"]?[^'"\s]+['"]?/gi,
            /token\s*[:=]\s*['"]?[^'"\s]+['"]?/gi,
            /api_key\s*[:=]\s*['"]?[^'"\s]+['"]?/gi,
            /secret\s*[:=]\s*['"]?[^'"\s]+['"]?/gi
        ];

        return sensitivePatterns.some(pattern => pattern.test(content));
    }

    /**
     * Generate validation report
     */
    generateReport(scanResults, validationResults) {
        const report = {
            timestamp: new Date().toISOString(),
            scan: scanResults.total,
            validation: {
                total: validationResults.total,
                valid: validationResults.valid.length,
                invalid: validationResults.invalid.length,
                complianceRate: validationResults.total > 0 ? 
                    ((validationResults.valid.length / validationResults.total) * 100).toFixed(1) : 0
            },
            issues: this.issues,
            summary: {
                totalFiles: scanResults.total.totalFiles,
                filesWithIssues: scanResults.total.consoleLog + scanResults.total.loggerLog + scanResults.total.directConsole,
                complianceRate: scanResults.total.totalFiles > 0 ? 
                    ((scanResults.total.totalFiles - scanResults.total.consoleLog - scanResults.total.loggerLog - scanResults.total.directConsole) / scanResults.total.totalFiles * 100).toFixed(1) : 0,
                status: this.getComplianceStatus(scanResults.total, validationResults)
            }
        };

        return report;
    }

    /**
     * Get compliance status
     */
    getComplianceStatus(scan, validation) {
        const totalIssues = scan.consoleLog + scan.loggerLog + scan.directConsole;
        const complianceRate = validation.valid.length / validation.total * 100;

        if (totalIssues === 0 && complianceRate === 100) {
            return 'FULLY_COMPLIANT';
        } else if (complianceRate >= 90) {
            return 'NEARLY_COMPLIANT';
        } else if (complianceRate >= 70) {
            return 'MOSTLY_COMPLIANT';
        } else if (complianceRate >= 50) {
            return 'PARTIALLY_COMPLIANT';
        } else {
            return 'NON_COMPLIANT';
        }
    }

    /**
     * Display validation results
     */
    displayResults(report) {
        logger.info('\n📊 Validation Results');
        logger.info('===================\n');

        // Summary
        logger.info(`📁 Total Files: ${report.summary.totalFiles}`);
        logger.info(`✅ Compliant Files: ${report.validation.valid}`);
        logger.info(`❌ Non-Compliant Files: ${report.validation.invalid}`);
        logger.info(`📈 Compliance Rate: ${report.validation.complianceRate}%`);
        logger.info(`🎯 Status: ${report.summary.status}\n`);

        // Legacy patterns found
        if (report.scan.consoleLog > 0 || report.scan.loggerLog > 0 || report.scan.directConsole > 0) {
            logger.info('⚠️  Legacy Patterns Found:');
            if (report.scan.consoleLog > 0) {
                logger.info(`   - console.log: ${report.scan.consoleLog} files`);
            }
            if (report.scan.loggerLog > 0) {
                logger.info(`   - logger.info: ${report.scan.loggerLog} files`);
            }
            if (report.scan.directConsole > 0) {
                logger.info(`   - const ServiceLogger = require('@logging/ServiceLogger');
        this.logger = new ServiceLogger('Validate-logging-migrationScript');: ${report.scan.directConsole} files`);
            }
            if (report.scan.legacyImport > 0) {
                logger.info(`   - Legacy imports: ${report.scan.legacyImport} files`);
            }
            logger.info('');
        }

        // Issues
        if (report.issues.length > 0) {
            logger.info('🔍 Issues Found:');
            const issueTypes = {};
            
            report.issues.forEach(issue => {
                const type = issue.issue;
                if (!issueTypes[type]) {
                    issueTypes[type] = [];
                }
                issueTypes[type].push(issue.file);
            });

            Object.entries(issueTypes).forEach(([type, files]) => {
                logger.info(`\n   ${type}:`);
                files.slice(0, 5).forEach(file => {
                    logger.info(`     - ${file}`);
                });
                if (files.length > 5) {
                    logger.info(`     ... and ${files.length - 5} more files`);
                }
            });
            logger.info('');
        }

        // Recommendations
        logger.info('💡 Recommendations:');
        if (report.summary.status === 'FULLY_COMPLIANT') {
            logger.info('   ✅ All files are compliant with logging standards!');
        } else if (report.summary.status === 'NEARLY_COMPLIANT') {
            logger.info('   🔧 Minor issues remain. Review the issues above and fix them.');
        } else {
            logger.info('   🚨 Significant compliance issues found. Run the migration script:');
            logger.info('      node scripts/enhanced-logging-migration.js');
        }

        // Save detailed report
        const reportPath = path.join(this.projectRoot, 'logs', 'validation-report.json');
        const logsDir = path.dirname(reportPath);
        
        if (!fs.existsSync(logsDir)) {
            fs.mkdirSync(logsDir, { recursive: true });
        }
        
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        logger.info(`\n📄 Detailed report saved to: ${reportPath}`);
    }
}

// CLI interface
async function main() {
    const args = process.argv.slice(2);
    const options = {
        help: args.includes('--help') || args.includes('-h'),
        verbose: args.includes('--verbose') || args.includes('-v')
    };

    if (options.help) {
        logger.info(`
Logging Migration Validation Script

Usage: node scripts/validate-logging-migration.js [options]

Options:
  --verbose, -v    Show detailed output
  --help, -h       Show this help

Examples:
  node scripts/validate-logging-migration.js
  node scripts/validate-logging-migration.js --verbose
        `);
        return;
    }

    try {
        const validator = new LoggingValidation();
        const report = await validator.validate();
        
        // Exit with appropriate code
        if (report.summary.status === 'FULLY_COMPLIANT') {
            process.exit(0);
        } else {
            process.exit(1);
        }
        
    } catch (error) {
        console.error('💥 Validation failed:', error.message);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = LoggingValidation; 