# Logging System Improvement – Phase 3: Naming Convention Implementation

## Overview
Implement automatic service name detection, validation, and correction to ensure consistent and descriptive logger names across the application.

## Objectives
- [ ] Implement automatic service name detection
- [ ] Create naming validation and correction
- [ ] Add naming patterns for different service types
- [ ] Implement naming consistency checks
- [ ] Create naming migration utilities

## Deliverables
- File: `backend/infrastructure/logging/LoggerNamingService.js` - Enhanced with advanced detection
- File: `backend/infrastructure/logging/LoggerMigrationService.js` - Migration automation
- File: `backend/scripts/logging-naming-validator.js` - Naming validation script
- File: `backend/scripts/logging-naming-migrator.js` - Automated naming migration
- Pattern: Naming patterns for different service types

## Dependencies
- Requires: Phase 2 - DI Integration
- Blocks: Phase 4 - Migration and Testing

## Estimated Time
4 hours

## Success Criteria
- [ ] All objectives completed
- [ ] Automatic service name detection works accurately
- [ ] Naming validation catches all issues
- [ ] Naming patterns are consistent across service types
- [ ] Migration utilities work correctly
- [ ] All generic 'Logger' names are replaced
- [ ] Tests pass for naming functionality

## Implementation Details

### Enhanced LoggerNamingService.js
```javascript
/**
 * LoggerNamingService - Advanced automatic service name detection and validation
 * Ensures consistent and descriptive logger names across the application
 */
const path = require('path');
const fs = require('fs');

class LoggerNamingService {
    constructor() {
        this.genericNames = ['Logger', 'Log', 'Service', 'Manager', 'Controller', 'Handler', 'Provider'];
        this.nameCache = new Map();
        this.serviceTypePatterns = this.initializeServiceTypePatterns();
        this.fileNameMappings = this.initializeFileNameMappings();
    }
    
    initializeServiceTypePatterns() {
        return {
            // Domain services
            domain: {
                pattern: /domain\/services\/(.+)/,
                prefix: '',
                suffix: 'Service'
            },
            // Infrastructure services
            infrastructure: {
                pattern: /infrastructure\/(.+)\/(.+)/,
                prefix: '',
                suffix: 'Service'
            },
            // Controllers
            controller: {
                pattern: /presentation\/api\/(.+)/,
                prefix: '',
                suffix: 'Controller'
            },
            // Repositories
            repository: {
                pattern: /domain\/repositories\/(.+)/,
                prefix: '',
                suffix: 'Repository'
            },
            // Workflows
            workflow: {
                pattern: /domain\/workflows\/(.+)/,
                prefix: '',
                suffix: 'Workflow'
            },
            // Steps
            step: {
                pattern: /domain\/steps\/(.+)/,
                prefix: '',
                suffix: 'Step'
            }
        };
    }
    
    initializeFileNameMappings() {
        return {
            // Common abbreviations
            'auth': 'Authentication',
            'config': 'Configuration',
            'db': 'Database',
            'api': 'API',
            'ui': 'UI',
            'cli': 'CLI',
            'ws': 'WebSocket',
            'ide': 'IDE',
            'git': 'Git',
            'test': 'Test',
            'util': 'Utility',
            'helper': 'Helper',
            'factory': 'Factory',
            'provider': 'Provider',
            'manager': 'Manager',
            'handler': 'Handler',
            'controller': 'Controller',
            'service': 'Service',
            'repository': 'Repository',
            'workflow': 'Workflow',
            'step': 'Step'
        };
    }
    
    validateName(name) {
        // Check cache first
        if (this.nameCache.has(name)) {
            return this.nameCache.get(name);
        }
        
        let validatedName = name;
        
        // Remove generic names
        if (this.genericNames.includes(name)) {
            validatedName = this.detectServiceName();
        }
        
        // Ensure PascalCase
        validatedName = this.toPascalCase(validatedName);
        
        // Apply service type patterns
        validatedName = this.applyServiceTypePattern(validatedName);
        
        // Cache result
        this.nameCache.set(name, validatedName);
        
        return validatedName;
    }
    
    detectServiceName() {
        try {
            const stack = new Error().stack;
            const callerLines = stack.split('\n').slice(3, 8); // Get more context
            
            for (const line of callerLines) {
                const filePath = this.extractFilePathFromStack(line);
                if (filePath) {
                    const serviceName = this.extractServiceNameFromPath(filePath);
                    if (serviceName && serviceName !== 'UnknownService') {
                        return serviceName;
                    }
                }
            }
            
            return 'UnknownService';
        } catch (error) {
            return 'UnknownService';
        }
    }
    
    extractFilePathFromStack(stackLine) {
        // Handle different stack trace formats
        const patterns = [
            /\((.+):\d+:\d+\)/, // Node.js format
            /at (.+):\d+:\d+/, // V8 format
            /(.+):\d+:\d+/ // Simple format
        ];
        
        for (const pattern of patterns) {
            const match = stackLine.match(pattern);
            if (match) {
                return match[1];
            }
        }
        
        return null;
    }
    
    extractServiceNameFromPath(filePath) {
        if (!filePath) return 'UnknownService';
        
        // Normalize path
        const normalizedPath = filePath.replace(/\\/g, '/');
        
        // Try to match service type patterns
        for (const [type, config] of Object.entries(this.serviceTypePatterns)) {
            const match = normalizedPath.match(config.pattern);
            if (match) {
                const baseName = match[1] || match[2];
                return this.buildServiceName(baseName, config);
            }
        }
        
        // Fallback to file name
        const fileName = path.basename(normalizedPath, '.js');
        return this.processFileName(fileName);
    }
    
    buildServiceName(baseName, config) {
        let name = baseName;
        
        // Apply prefix
        if (config.prefix) {
            name = config.prefix + name;
        }
        
        // Apply suffix if not already present
        if (config.suffix && !name.endsWith(config.suffix)) {
            name = name + config.suffix;
        }
        
        return this.toPascalCase(name);
    }
    
    processFileName(fileName) {
        // Handle different naming patterns
        if (fileName.includes('-')) {
            return this.kebabToPascal(fileName);
        } else if (fileName.includes('_')) {
            return this.snakeToPascal(fileName);
        } else {
            return this.toPascalCase(fileName);
        }
    }
    
    applyServiceTypePattern(name) {
        // Check if name already has a service type suffix
        const hasServiceType = Object.values(this.serviceTypePatterns)
            .some(config => name.endsWith(config.suffix));
        
        if (!hasServiceType) {
            // Try to infer service type from name
            const lowerName = name.toLowerCase();
            
            if (lowerName.includes('controller')) {
                return name.endsWith('Controller') ? name : name + 'Controller';
            } else if (lowerName.includes('repository')) {
                return name.endsWith('Repository') ? name : name + 'Repository';
            } else if (lowerName.includes('workflow')) {
                return name.endsWith('Workflow') ? name : name + 'Workflow';
            } else if (lowerName.includes('step')) {
                return name.endsWith('Step') ? name : name + 'Step';
            } else {
                // Default to Service suffix
                return name.endsWith('Service') ? name : name + 'Service';
            }
        }
        
        return name;
    }
    
    toPascalCase(str) {
        if (!str) return 'UnknownService';
        
        return str
            .replace(/[^a-zA-Z0-9]/g, ' ')
            .split(' ')
            .filter(word => word.length > 0)
            .map(word => {
                // Check if word is a known abbreviation
                const lowerWord = word.toLowerCase();
                if (this.fileNameMappings[lowerWord]) {
                    return this.fileNameMappings[lowerWord];
                }
                
                return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
            })
            .join('')
            .replace(/[^a-zA-Z0-9]/g, '');
    }
    
    kebabToPascal(str) {
        return str
            .split('-')
            .map(word => this.toPascalCase(word))
            .join('');
    }
    
    snakeToPascal(str) {
        return str
            .split('_')
            .map(word => this.toPascalCase(word))
            .join('');
    }
    
    validateNamingConsistency(filePath) {
        const issues = [];
        
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const lines = content.split('\n');
            
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                const lineNumber = i + 1;
                
                // Check for generic logger names
                const genericMatches = line.match(/new\s+(Logger|ServiceLogger)\s*\(\s*['"`](Logger|Log|Service|Manager|Controller)['"`]/g);
                if (genericMatches) {
                    issues.push({
                        line: lineNumber,
                        type: 'generic_name',
                        message: `Generic logger name found: ${genericMatches.join(', ')}`,
                        suggestion: this.suggestBetterName(filePath, lineNumber)
                    });
                }
                
                // Check for inconsistent naming
                const loggerMatches = line.match(/new\s+(Logger|ServiceLogger)\s*\(\s*['"`]([^'"`]+)['"`]/g);
                if (loggerMatches) {
                    for (const match of loggerMatches) {
                        const nameMatch = match.match(/['"`]([^'"`]+)['"`]/);
                        if (nameMatch) {
                            const name = nameMatch[1];
                            const validatedName = this.validateName(name);
                            
                            if (name !== validatedName) {
                                issues.push({
                                    line: lineNumber,
                                    type: 'inconsistent_naming',
                                    message: `Inconsistent naming: "${name}" should be "${validatedName}"`,
                                    suggestion: `Replace "${name}" with "${validatedName}"`
                                });
                            }
                        }
                    }
                }
            }
        } catch (error) {
            issues.push({
                line: 0,
                type: 'file_error',
                message: `Could not read file: ${error.message}`
            });
        }
        
        return issues;
    }
    
    suggestBetterName(filePath, lineNumber) {
        try {
            const serviceName = this.extractServiceNameFromPath(filePath);
            return `Use "${serviceName}" instead of generic name`;
        } catch (error) {
            return 'Use descriptive service name instead of generic name';
        }
    }
    
    clearCache() {
        this.nameCache.clear();
    }
    
    getCacheStats() {
        return {
            size: this.nameCache.size,
            mappings: Object.fromEntries(this.nameCache)
        };
    }
    
    getServiceTypePatterns() {
        return this.serviceTypePatterns;
    }
    
    getFileNameMappings() {
        return this.fileNameMappings;
    }
}

module.exports = LoggerNamingService;
```

### LoggerMigrationService.js
```javascript
/**
 * LoggerMigrationService - Automated migration of existing logger usage
 * Provides tools to migrate from direct instantiation to DI-based logging
 */
const fs = require('fs').promises;
const path = require('path');
const LoggerNamingService = require('./LoggerNamingService');

class LoggerMigrationService {
    constructor(options = {}) {
        this.namingService = new LoggerNamingService();
        this.options = {
            dryRun: options.dryRun || false,
            backup: options.backup !== false,
            verbose: options.verbose || false,
            ...options
        };
        
        this.migrationStats = {
            filesProcessed: 0,
            filesModified: 0,
            loggerInstancesMigrated: 0,
            errors: 0,
            warnings: 0
        };
    }
    
    async migrateService(filePath) {
        try {
            this.migrationStats.filesProcessed++;
            
            if (this.options.verbose) {
                console.log(`Processing: ${filePath}`);
            }
            
            // Read file content
            const content = await fs.readFile(filePath, 'utf8');
            
            // Find logger usages
            const loggerUsages = this.findLoggerUsages(content, filePath);
            
            if (loggerUsages.length === 0) {
                return { filePath, modified: false, usages: [] };
            }
            
            // Generate migration code
            const migrationCode = this.generateMigrationCode(loggerUsages, filePath);
            
            // Apply migration
            const modified = await this.applyMigration(filePath, content, migrationCode);
            
            if (modified) {
                this.migrationStats.filesModified++;
                this.migrationStats.loggerInstancesMigrated += loggerUsages.length;
            }
            
            return {
                filePath,
                modified,
                usages: loggerUsages,
                migrationCode
            };
            
        } catch (error) {
            this.migrationStats.errors++;
            return {
                filePath,
                modified: false,
                error: error.message
            };
        }
    }
    
    findLoggerUsages(content, filePath) {
        const usages = [];
        const lines = content.split('\n');
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const lineNumber = i + 1;
            
            // Find Logger instantiation
            const loggerMatches = line.match(/new\s+Logger\s*\(\s*['"`]([^'"`]+)['"`]/g);
            if (loggerMatches) {
                for (const match of loggerMatches) {
                    const nameMatch = match.match(/['"`]([^'"`]+)['"`]/);
                    if (nameMatch) {
                        usages.push({
                            type: 'Logger',
                            name: nameMatch[1],
                            line: lineNumber,
                            original: match,
                            validatedName: this.namingService.validateName(nameMatch[1])
                        });
                    }
                }
            }
            
            // Find ServiceLogger instantiation
            const serviceLoggerMatches = line.match(/new\s+ServiceLogger\s*\(\s*['"`]([^'"`]+)['"`]/g);
            if (serviceLoggerMatches) {
                for (const match of serviceLoggerMatches) {
                    const nameMatch = match.match(/['"`]([^'"`]+)['"`]/);
                    if (nameMatch) {
                        usages.push({
                            type: 'ServiceLogger',
                            name: nameMatch[1],
                            line: lineNumber,
                            original: match,
                            validatedName: this.namingService.validateName(nameMatch[1])
                        });
                    }
                }
            }
        }
        
        return usages;
    }
    
    generateMigrationCode(loggerUsages, filePath) {
        const serviceName = this.namingService.extractServiceNameFromPath(filePath);
        const className = this.namingService.toPascalCase(path.basename(filePath, '.js'));
        
        const migrationCode = {
            imports: [],
            constructor: '',
            propertyAssignments: [],
            replacements: []
        };
        
        // Generate imports
        migrationCode.imports.push('const { getServiceRegistry } = require(\'@infrastructure/di/ServiceRegistry\');');
        
        // Generate constructor injection
        migrationCode.constructor = `constructor(${loggerUsages.map(u => u.validatedName.toLowerCase()).join(', ')}) {
        this.logger = ${loggerUsages[0].validatedName.toLowerCase()};
    }`;
        
        // Generate property assignments
        loggerUsages.forEach(usage => {
            migrationCode.propertyAssignments.push(`this.${usage.validatedName.toLowerCase()} = ${usage.validatedName.toLowerCase()};`);
        });
        
        // Generate replacements
        loggerUsages.forEach(usage => {
            migrationCode.replacements.push({
                original: usage.original,
                replacement: `this.${usage.validatedName.toLowerCase()}`,
                line: usage.line
            });
        });
        
        return migrationCode;
    }
    
    async applyMigration(filePath, content, migrationCode) {
        if (this.options.dryRun) {
            return false;
        }
        
        // Create backup
        if (this.options.backup) {
            const backupPath = filePath + '.backup';
            await fs.writeFile(backupPath, content);
        }
        
        // Apply replacements
        let modifiedContent = content;
        const lines = modifiedContent.split('\n');
        
        // Apply line-by-line replacements
        migrationCode.replacements.forEach(replacement => {
            const lineIndex = replacement.line - 1;
            if (lineIndex < lines.length) {
                lines[lineIndex] = lines[lineIndex].replace(
                    replacement.original,
                    replacement.replacement
                );
            }
        });
        
        modifiedContent = lines.join('\n');
        
        // Write modified content
        await fs.writeFile(filePath, modifiedContent);
        
        return true;
    }
    
    async migrateDirectory(directoryPath) {
        const results = [];
        
        try {
            const files = await this.getJavaScriptFiles(directoryPath);
            
            for (const file of files) {
                const result = await this.migrateService(file);
                results.push(result);
            }
            
        } catch (error) {
            this.migrationStats.errors++;
            results.push({
                filePath: directoryPath,
                modified: false,
                error: error.message
            });
        }
        
        return results;
    }
    
    async getJavaScriptFiles(directoryPath) {
        const files = [];
        
        async function scanDirectory(dir) {
            const entries = await fs.readdir(dir, { withFileTypes: true });
            
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                
                if (entry.isDirectory()) {
                    // Skip node_modules and other common exclusions
                    if (!['node_modules', '.git', 'dist', 'build'].includes(entry.name)) {
                        await scanDirectory(fullPath);
                    }
                } else if (entry.isFile() && entry.name.endsWith('.js')) {
                    files.push(fullPath);
                }
            }
        }
        
        await scanDirectory(directoryPath);
        return files;
    }
    
    getMigrationStats() {
        return { ...this.migrationStats };
    }
    
    generateMigrationReport(results) {
        const report = {
            summary: {
                totalFiles: results.length,
                filesModified: results.filter(r => r.modified).length,
                totalUsages: results.reduce((sum, r) => sum + (r.usages?.length || 0), 0),
                errors: results.filter(r => r.error).length,
                warnings: this.migrationStats.warnings
            },
            details: results.map(result => ({
                filePath: result.filePath,
                modified: result.modified,
                usages: result.usages?.length || 0,
                error: result.error
            })),
            recommendations: this.generateRecommendations(results)
        };
        
        return report;
    }
    
    generateRecommendations(results) {
        const recommendations = [];
        
        const errors = results.filter(r => r.error);
        if (errors.length > 0) {
            recommendations.push({
                type: 'error',
                message: `${errors.length} files had errors during migration`,
                action: 'Review error logs and fix issues manually'
            });
        }
        
        const filesWithGenericNames = results.filter(r => 
            r.usages?.some(u => ['Logger', 'Log', 'Service'].includes(u.name))
        );
        
        if (filesWithGenericNames.length > 0) {
            recommendations.push({
                type: 'warning',
                message: `${filesWithGenericNames.length} files still have generic logger names`,
                action: 'Review and update logger names manually'
            });
        }
        
        return recommendations;
    }
}

module.exports = LoggerMigrationService;
```

### logging-naming-validator.js
```javascript
#!/usr/bin/env node

/**
 * Logging Naming Validator - CLI tool to validate logger naming consistency
 */
const path = require('path');
const fs = require('fs');
const LoggerNamingService = require('../infrastructure/logging/LoggerNamingService');

class LoggingNamingValidator {
    constructor() {
        this.namingService = new LoggerNamingService();
        this.stats = {
            filesProcessed: 0,
            filesWithIssues: 0,
            totalIssues: 0,
            issuesByType: {}
        };
    }
    
    async validateFile(filePath) {
        try {
            this.stats.filesProcessed++;
            
            const issues = this.namingService.validateNamingConsistency(filePath);
            
            if (issues.length > 0) {
                this.stats.filesWithIssues++;
                this.stats.totalIssues += issues.length;
                
                // Group issues by type
                issues.forEach(issue => {
                    this.stats.issuesByType[issue.type] = 
                        (this.stats.issuesByType[issue.type] || 0) + 1;
                });
                
                return {
                    filePath,
                    issues
                };
            }
            
            return { filePath, issues: [] };
            
        } catch (error) {
            return {
                filePath,
                issues: [{
                    line: 0,
                    type: 'validation_error',
                    message: error.message
                }]
            };
        }
    }
    
    async validateDirectory(directoryPath) {
        const results = [];
        const files = await this.getJavaScriptFiles(directoryPath);
        
        for (const file of files) {
            const result = await this.validateFile(file);
            results.push(result);
        }
        
        return results;
    }
    
    async getJavaScriptFiles(directoryPath) {
        const files = [];
        
        function scanDirectory(dir) {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                
                if (entry.isDirectory()) {
                    if (!['node_modules', '.git', 'dist', 'build'].includes(entry.name)) {
                        scanDirectory(fullPath);
                    }
                } else if (entry.isFile() && entry.name.endsWith('.js')) {
                    files.push(fullPath);
                }
            }
        }
        
        scanDirectory(directoryPath);
        return files;
    }
    
    generateReport(results) {
        const filesWithIssues = results.filter(r => r.issues.length > 0);
        
        console.log('\n=== Logging Naming Validation Report ===\n');
        
        console.log(`Files processed: ${this.stats.filesProcessed}`);
        console.log(`Files with issues: ${this.stats.filesWithIssues}`);
        console.log(`Total issues: ${this.stats.totalIssues}\n`);
        
        console.log('Issues by type:');
        Object.entries(this.stats.issuesByType).forEach(([type, count]) => {
            console.log(`  ${type}: ${count}`);
        });
        
        if (filesWithIssues.length > 0) {
            console.log('\nDetailed issues:');
            filesWithIssues.forEach(file => {
                console.log(`\n${file.filePath}:`);
                file.issues.forEach(issue => {
                    console.log(`  Line ${issue.line}: ${issue.message}`);
                    if (issue.suggestion) {
                        console.log(`    Suggestion: ${issue.suggestion}`);
                    }
                });
            });
        }
        
        return {
            summary: {
                filesProcessed: this.stats.filesProcessed,
                filesWithIssues: this.stats.filesWithIssues,
                totalIssues: this.stats.totalIssues,
                issuesByType: this.stats.issuesByType
            },
            details: filesWithIssues
        };
    }
}

// CLI usage
if (require.main === module) {
    const validator = new LoggingNamingValidator();
    const targetPath = process.argv[2] || './backend';
    
    validator.validateDirectory(targetPath)
        .then(results => {
            const report = validator.generateReport(results);
            
            // Exit with error code if issues found
            if (report.summary.totalIssues > 0) {
                process.exit(1);
            }
        })
        .catch(error => {
            console.error('Validation failed:', error.message);
            process.exit(1);
        });
}

module.exports = LoggingNamingValidator;
```

## Testing Strategy

### Unit Tests
- [ ] Test LoggerNamingService name detection
- [ ] Test LoggerNamingService validation
- [ ] Test LoggerMigrationService migration
- [ ] Test naming patterns for different service types
- [ ] Test CLI validation tool

### Integration Tests
- [ ] Test complete naming validation flow
- [ ] Test migration of real files
- [ ] Test CLI tools with actual codebase
- [ ] Test naming consistency across service types

## Validation Checklist
- [ ] Automatic service name detection works accurately
- [ ] Naming validation catches all issues
- [ ] Naming patterns are consistent across service types
- [ ] Migration utilities work correctly
- [ ] All generic 'Logger' names are replaced
- [ ] CLI tools function properly
- [ ] Tests pass for naming functionality
- [ ] Performance is maintained
- [ ] No false positives in validation
- [ ] Migration preserves functionality 