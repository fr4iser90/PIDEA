const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * LogMigration - Utilities for migrating legacy logging patterns
 * Provides automated tools for converting console.log and logger.info usage
 */
class LogMigration {
    constructor() {
        this.patterns = {
            consoleLog: /console\.log\s*\(/g,
            loggerLog: /logger\.log\s*\(/g,
            directConsole: /this\.logger\s*=\s*console/g,
            legacyImport: /require\s*\(\s*['"]@infrastructure\/logging\/Logger['"]\s*\)/g,
            standardImport: /const\s+Logger\s*=\s*require\s*\(\s*['"]@logging\/Logger['"]\s*\)/g
        };

        this.replacements = {
            consoleLog: 'logger.info(',
            loggerLog: 'logger.info(',
            directConsole: 'const ServiceLogger = require(\'@logging/ServiceLogger\');\n        this.logger = new ServiceLogger(\'ServiceName\');',
            legacyImport: "const Logger = require('@logging/Logger')",
            standardImport: "const Logger = require('@logging/Logger')"
        };
    }

    /**
     * Scan directory for logging patterns
     */
    scanDirectory(dirPath, patterns = null) {
        const results = {
            consoleLog: [],
            loggerLog: [],
            directConsole: [],
            legacyImport: [],
            totalFiles: 0,
            scannedFiles: 0
        };

        const scanPatterns = patterns || this.patterns;

        try {
            const files = this.getJsFiles(dirPath);
            results.totalFiles = files.length;

            for (const file of files) {
                const content = fs.readFileSync(file, 'utf8');
                results.scannedFiles++;

                for (const [patternName, pattern] of Object.entries(scanPatterns)) {
                    if (pattern.test(content)) {
                        results[patternName].push(file);
                    }
                }
            }
        } catch (error) {
            console.error('Error scanning directory:', error.message);
        }

        return results;
    }

    /**
     * Get all JavaScript files in directory recursively
     */
    getJsFiles(dirPath) {
        const files = [];
        
        function scan(currentPath) {
            const items = fs.readdirSync(currentPath);
            
            for (const item of items) {
                const fullPath = path.join(currentPath, item);
                const stat = fs.statSync(fullPath);
                
                if (stat.isDirectory()) {
                    // Skip node_modules and .git
                    if (item !== 'node_modules' && item !== '.git') {
                        scan(fullPath);
                    }
                } else if (item.endsWith('.js') || item.endsWith('.jsx')) {
                    files.push(fullPath);
                }
            }
        }
        
        scan(dirPath);
        return files;
    }

    /**
     * Migrate a single file
     */
    migrateFile(filePath, options = {}) {
        const {
            backup = true,
            dryRun = false,
            serviceName = null
        } = options;

        try {
            let content = fs.readFileSync(filePath, 'utf8');
            const originalContent = content;
            const changes = [];

            // Create backup
            if (backup && !dryRun) {
                const backupPath = `${filePath}.backup`;
                fs.writeFileSync(backupPath, originalContent);
            }

            // Detect service name from file path if not provided
            const detectedServiceName = serviceName || this.detectServiceName(filePath);

            // Replace patterns
            for (const [patternName, pattern] of Object.entries(this.patterns)) {
                const replacement = this.getReplacement(patternName, detectedServiceName);
                
                if (pattern.test(content)) {
                    const newContent = content.replace(pattern, replacement);
                    if (newContent !== content) {
                        changes.push(patternName);
                        content = newContent;
                    }
                }
            }

            // Add Logger import if needed
            if (!content.includes("require('@logging/Logger')") && 
                (content.includes('logger.info') || content.includes('logger.warn') || content.includes('logger.error'))) {
                content = this.addLoggerImport(content);
                changes.push('added_import');
            }

            // Add ServiceLogger import if needed
            if (content.includes('new ServiceLogger') && !content.includes("require('@logging/ServiceLogger')")) {
                content = this.addServiceLoggerImport(content);
                changes.push('added_service_logger_import');
            }

            // Write changes
            if (changes.length > 0 && !dryRun) {
                fs.writeFileSync(filePath, content);
            }

            return {
                file: filePath,
                changes,
                success: true,
                dryRun
            };

        } catch (error) {
            return {
                file: filePath,
                error: error.message,
                success: false,
                dryRun
            };
        }
    }

    /**
     * Get replacement for pattern
     */
    getReplacement(patternName, serviceName) {
        const replacement = this.replacements[patternName];
        
        if (patternName === 'directConsole' && serviceName) {
            return replacement.replace('ServiceName', serviceName);
        }
        
        return replacement;
    }

    /**
     * Detect service name from file path
     */
    detectServiceName(filePath) {
        const fileName = path.basename(filePath, path.extname(filePath));
        const dirName = path.basename(path.dirname(filePath));
        
        // Common patterns
        if (fileName.endsWith('Service')) {
            return fileName;
        }
        if (fileName.endsWith('System')) {
            return fileName;
        }
        if (fileName.endsWith('Manager')) {
            return fileName;
        }
        if (fileName.endsWith('Controller')) {
            return fileName;
        }
        
        return dirName.charAt(0).toUpperCase() + dirName.slice(1) + 'Service';
    }

    /**
     * Add Logger import to file
     */
    addLoggerImport(content) {
        const importLine = "const Logger = require('@logging/Logger');\n";
        const loggerInit = "const logger = new Logger('ServiceName');\n";
        
        // Find the best place to add imports
        const lines = content.split('\n');
        let insertIndex = 0;
        
        // Find first non-import line
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line && !line.startsWith('const ') && !line.startsWith('let ') && !line.startsWith('var ') && !line.startsWith('require(') && !line.startsWith('import ')) {
                insertIndex = i;
                break;
            }
        }
        
        // Insert imports
        lines.splice(insertIndex, 0, importLine, loggerInit);
        
        return lines.join('\n');
    }

    /**
     * Add ServiceLogger import to file
     */
    addServiceLoggerImport(content) {
        const importLine = "const ServiceLogger = require('@logging/ServiceLogger');\n";
        
        const lines = content.split('\n');
        let insertIndex = 0;
        
        // Find first non-import line
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line && !line.startsWith('const ') && !line.startsWith('let ') && !line.startsWith('var ') && !line.startsWith('require(') && !line.startsWith('import ')) {
                insertIndex = i;
                break;
            }
        }
        
        // Insert import
        lines.splice(insertIndex, 0, importLine);
        
        return lines.join('\n');
    }

    /**
     * Migrate multiple files
     */
    migrateFiles(filePaths, options = {}) {
        const results = {
            successful: [],
            failed: [],
            total: filePaths.length
        };

        for (const filePath of filePaths) {
            const result = this.migrateFile(filePath, options);
            
            if (result.success) {
                results.successful.push(result);
            } else {
                results.failed.push(result);
            }
        }

        return results;
    }

    /**
     * Generate migration report
     */
    generateReport(scanResults, migrationResults) {
        const report = {
            timestamp: new Date().toISOString(),
            scan: scanResults,
            migration: migrationResults,
            summary: {
                totalFiles: scanResults.totalFiles,
                scannedFiles: scanResults.scannedFiles,
                filesWithConsoleLog: scanResults.consoleLog.length,
                filesWithLoggerLog: scanResults.loggerLog.length,
                filesWithDirectConsole: scanResults.directConsole.length,
                filesWithLegacyImport: scanResults.legacyImport.length,
                migrationSuccessful: migrationResults.successful.length,
                migrationFailed: migrationResults.failed.length
            }
        };

        return report;
    }

    /**
     * Validate migration results
     */
    validateMigration(filePath) {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const issues = [];

            // Check for remaining console.log
            if (this.patterns.consoleLog.test(content)) {
                issues.push('console.log still present');
            }

            // Check for remaining logger.info
            if (this.patterns.loggerLog.test(content)) {
                issues.push('logger.info still present');
            }

            // Check for Logger import
            if (!content.includes("require('@logging/Logger')") && 
                (content.includes('logger.info') || content.includes('logger.warn') || content.includes('logger.error'))) {
                issues.push('Logger import missing');
            }

            return {
                file: filePath,
                valid: issues.length === 0,
                issues
            };

        } catch (error) {
            return {
                file: filePath,
                valid: false,
                issues: [error.message]
            };
        }
    }

    /**
     * Rollback migration for a file
     */
    rollbackFile(filePath) {
        const backupPath = `${filePath}.backup`;
        
        try {
            if (fs.existsSync(backupPath)) {
                const backupContent = fs.readFileSync(backupPath, 'utf8');
                fs.writeFileSync(filePath, backupContent);
                fs.unlinkSync(backupPath);
                
                return {
                    file: filePath,
                    success: true,
                    message: 'Rollback successful'
                };
            } else {
                return {
                    file: filePath,
                    success: false,
                    message: 'Backup file not found'
                };
            }
        } catch (error) {
            return {
                file: filePath,
                success: false,
                message: error.message
            };
        }
    }

    /**
     * Get migration statistics
     */
    getStatistics(dirPath) {
        const scanResults = this.scanDirectory(dirPath);
        
        return {
            totalFiles: scanResults.totalFiles,
            filesNeedingMigration: scanResults.consoleLog.length + scanResults.loggerLog.length + scanResults.directConsole.length,
            consoleLogFiles: scanResults.consoleLog.length,
            loggerLogFiles: scanResults.loggerLog.length,
            directConsoleFiles: scanResults.directConsole.length,
            legacyImportFiles: scanResults.legacyImport.length,
            migrationProgress: scanResults.totalFiles > 0 ? 
                ((scanResults.totalFiles - scanResults.consoleLog.length - scanResults.loggerLog.length - scanResults.directConsole.length) / scanResults.totalFiles * 100).toFixed(1) : 0
        };
    }
}

module.exports = LogMigration; 