# Logging-Sanitization Automated Migration – Phase 2: Automated Migration

## Overview
Execute the automated migration of console.log and logger.log patterns across the entire codebase. This phase uses enhanced migration tools to systematically convert legacy logging patterns to the new standardized format.

## Objectives
- [ ] Enhance existing fix-logging.js script with comprehensive migration capabilities
- [ ] Execute automated grep/regex scans for console.log and logger.log patterns
- [ ] AI categorization of files: auto-migratable, manual review required, already compliant
- [ ] Automated replacement: console.log → logger.info, warn, error; logger.log → logger.info
- [ ] Automated import insertion and standardization
- [ ] Generate migration reports and TODOs for manual review

## Deliverables

### File: `scripts/enhanced-logging-migration.js` - Enhanced migration script
```javascript
#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const LogMigration = require('../backend/infrastructure/logging/LogMigration');
const LogStandardizer = require('../backend/infrastructure/logging/LogStandardizer');

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

class EnhancedLoggingMigration {
  constructor(options = {}) {
    this.options = {
      dryRun: false,
      backupFiles: true,
      generateReport: true,
      categorizeFiles: true,
      ...options
    };
    
    this.migration = new LogMigration(this.options);
    this.standardizer = new LogStandardizer();
    
    this.migrationResults = {
      totalFiles: 0,
      migratedFiles: 0,
      failedFiles: 0,
      manualReviewFiles: 0,
      alreadyCompliantFiles: 0,
      categories: {
        autoMigratable: [],
        manualReview: [],
        alreadyCompliant: []
      }
    };
  }

  /**
   * Execute comprehensive migration
   */
  async execute() {
    log('🚀 Starting Enhanced Logging Migration...', 'bright');
    log('', 'reset');
    
    const backendDir = path.join(__dirname, '..', 'backend');
    const frontendDir = path.join(__dirname, '..', 'frontend');
    
    // Phase 1: Scan and categorize
    if (this.options.categorizeFiles) {
      log('📊 Phase 1: Scanning and categorizing files...', 'blue');
      await this.scanAndCategorize(backendDir);
      await this.scanAndCategorize(frontendDir);
    }
    
    // Phase 2: Execute migrations
    log('🔄 Phase 2: Executing migrations...', 'blue');
    await this.migrateDirectory(backendDir);
    await this.migrateDirectory(frontendDir);
    
    // Phase 3: Generate reports
    if (this.options.generateReport) {
      log('📋 Phase 3: Generating migration report...', 'blue');
      await this.generateMigrationReport();
    }
    
    // Phase 4: Generate TODOs for manual review
    log('📝 Phase 4: Generating TODOs for manual review...', 'blue');
    await this.generateManualReviewTODOs();
    
    this.printSummary();
  }

  /**
   * Scan and categorize files
   */
  async scanAndCategorize(directory) {
    if (!fs.existsSync(directory)) return;
    
    const files = this.migration.findJsFiles(directory);
    this.migrationResults.totalFiles += files.length;
    
    for (const file of files) {
      const category = await this.categorizeFile(file);
      this.migrationResults.categories[category].push(file);
    }
  }

  /**
   * Categorize a single file
   */
  async categorizeFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Check if already compliant
      if (this.isAlreadyCompliant(content)) {
        this.migrationResults.alreadyCompliantFiles++;
        return 'alreadyCompliant';
      }
      
      // Check if needs manual review
      if (this.needsManualReview(content)) {
        this.migrationResults.manualReviewFiles++;
        return 'manualReview';
      }
      
      // Auto-migratable
      return 'autoMigratable';
      
    } catch (error) {
      log(`❌ Error categorizing ${filePath}: ${error.message}`, 'red');
      return 'manualReview';
    }
  }

  /**
   * Check if file is already compliant
   */
  isAlreadyCompliant(content) {
    // Has proper logger import
    const hasProperImport = content.includes('require(\'@logging/Logger\')') ||
                           content.includes('require("@logging/Logger")');
    
    // No console.log or logger.log usage
    const hasLegacyUsage = content.includes('console.log') ||
                          content.includes('logger.log') ||
                          content.includes('this.logger = console');
    
    return hasProperImport && !hasLegacyUsage;
  }

  /**
   * Check if file needs manual review
   */
  needsManualReview(content) {
    // Complex patterns that need manual review
    const complexPatterns = [
      /console\.log.*\$\{.*\}/g, // Template literals
      /console\.log.*function.*\(/g, // Function calls
      /console\.log.*=>/g, // Arrow functions
      /logger\.log.*\$\{.*\}/g, // Template literals
      /this\.logger\s*=\s*console/g, // Direct console assignment
      /console\.log.*process\.env/g, // Environment variables
      /console\.log.*require\(/g, // Require statements
      /console\.log.*import.*from/g // Import statements
    ];
    
    return complexPatterns.some(pattern => pattern.test(content));
  }

  /**
   * Migrate directory
   */
  async migrateDirectory(directory) {
    if (!fs.existsSync(directory)) return;
    
    log(`📁 Migrating ${directory}...`, 'cyan');
    
    const autoMigratableFiles = this.migrationResults.categories.autoMigratable.filter(
      file => file.startsWith(directory)
    );
    
    for (const file of autoMigratableFiles) {
      const result = await this.migration.migrateFile(file);
      
      if (result.success && result.changes.length > 0) {
        this.migrationResults.migratedFiles++;
        log(`  ✅ Migrated: ${path.relative(process.cwd(), file)}`, 'green');
      } else if (!result.success) {
        this.migrationResults.failedFiles++;
        log(`  ❌ Failed: ${path.relative(process.cwd(), file)}`, 'red');
      }
    }
  }

  /**
   * Generate migration report
   */
  async generateMigrationReport() {
    const reportPath = path.join(process.cwd(), 'logs', 'migration-report.json');
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalFiles: this.migrationResults.totalFiles,
        migratedFiles: this.migrationResults.migratedFiles,
        failedFiles: this.migrationResults.failedFiles,
        manualReviewFiles: this.migrationResults.manualReviewFiles,
        alreadyCompliantFiles: this.migrationResults.alreadyCompliantFiles
      },
      categories: this.migrationResults.categories,
      recommendations: this.generateRecommendations()
    };
    
    // Ensure logs directory exists
    const logsDir = path.dirname(reportPath);
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    log(`📊 Migration report saved to: ${reportPath}`, 'green');
  }

  /**
   * Generate recommendations
   */
  generateRecommendations() {
    const recommendations = [];
    
    if (this.migrationResults.failedFiles > 0) {
      recommendations.push({
        type: 'error',
        message: `${this.migrationResults.failedFiles} files failed migration - manual intervention required`
      });
    }
    
    if (this.migrationResults.manualReviewFiles > 0) {
      recommendations.push({
        type: 'warning',
        message: `${this.migrationResults.manualReviewFiles} files need manual review - complex patterns detected`
      });
    }
    
    if (this.migrationResults.migratedFiles > 0) {
      recommendations.push({
        type: 'success',
        message: `${this.migrationResults.migratedFiles} files successfully migrated`
      });
    }
    
    return recommendations;
  }

  /**
   * Generate TODOs for manual review
   */
  async generateManualReviewTODOs() {
    const todoPath = path.join(process.cwd(), 'logs', 'manual-review-todos.md');
    const manualReviewFiles = this.migrationResults.categories.manualReview;
    
    if (manualReviewFiles.length === 0) {
      log('✅ No files require manual review', 'green');
      return;
    }
    
    let todoContent = `# Manual Review TODOs - Logging Migration

Generated: ${new Date().toISOString()}

## Files Requiring Manual Review (${manualReviewFiles.length})

`;
    
    for (const file of manualReviewFiles) {
      const relativePath = path.relative(process.cwd(), file);
      const content = fs.readFileSync(file, 'utf8');
      const issues = this.identifyManualReviewIssues(content);
      
      todoContent += `### ${relativePath}

**Issues Found:**
${issues.map(issue => `- ${issue}`).join('\n')}

**Action Required:**
- Review complex logging patterns
- Manually migrate to standardized format
- Test after migration

---

`;
    }
    
    // Ensure logs directory exists
    const logsDir = path.dirname(todoPath);
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    
    fs.writeFileSync(todoPath, todoContent);
    log(`📝 Manual review TODOs saved to: ${todoPath}`, 'yellow');
  }

  /**
   * Identify manual review issues
   */
  identifyManualReviewIssues(content) {
    const issues = [];
    
    if (content.includes('console.log') && content.includes('${')) {
      issues.push('Template literals in console.log statements');
    }
    
    if (content.includes('this.logger = console')) {
      issues.push('Direct console assignment to logger property');
    }
    
    if (content.includes('console.log') && content.includes('process.env')) {
      issues.push('Environment variables in console.log statements');
    }
    
    if (content.includes('console.log') && content.includes('require(')) {
      issues.push('Require statements in console.log');
    }
    
    if (content.includes('console.log') && content.includes('function')) {
      issues.push('Function calls in console.log statements');
    }
    
    return issues;
  }

  /**
   * Print migration summary
   */
  printSummary() {
    log('', 'reset');
    log('📊 Migration Summary:', 'bright');
    log(`   Total files scanned: ${this.migrationResults.totalFiles}`, 'cyan');
    log(`   Files migrated: ${this.migrationResults.migratedFiles}`, 'green');
    log(`   Files failed: ${this.migrationResults.failedFiles}`, 'red');
    log(`   Files need manual review: ${this.migrationResults.manualReviewFiles}`, 'yellow');
    log(`   Files already compliant: ${this.migrationResults.alreadyCompliantFiles}`, 'blue');
    log('', 'reset');
    
    if (this.migrationResults.migratedFiles > 0) {
      log('✅ Migration completed successfully!', 'green');
      log('💡 Check logs/migration-report.json for detailed results', 'cyan');
      log('💡 Check logs/manual-review-todos.md for manual review tasks', 'yellow');
    } else {
      log('ℹ️  No files were migrated', 'cyan');
    }
  }
}

// CLI interface
function main() {
  const args = process.argv.slice(2);
  const options = {
    dryRun: args.includes('--dry-run'),
    backupFiles: !args.includes('--no-backup'),
    generateReport: !args.includes('--no-report'),
    categorizeFiles: !args.includes('--no-categorize')
  };
  
  const migration = new EnhancedLoggingMigration(options);
  migration.execute().catch(error => {
    log(`❌ Migration failed: ${error.message}`, 'red');
    process.exit(1);
  });
}

if (require.main === module) {
  main();
}

module.exports = EnhancedLoggingMigration;
```

### File: `scripts/validate-logging-migration.js` - Migration validation script
```javascript
#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

class LoggingMigrationValidator {
  constructor() {
    this.validationResults = {
      totalFiles: 0,
      compliantFiles: 0,
      nonCompliantFiles: 0,
      issues: []
    };
  }

  /**
   * Validate migration results
   */
  async validate() {
    log('🔍 Validating Logging Migration...', 'bright');
    log('', 'reset');
    
    const backendDir = path.join(__dirname, '..', 'backend');
    const frontendDir = path.join(__dirname, '..', 'frontend');
    
    await this.validateDirectory(backendDir);
    await this.validateDirectory(frontendDir);
    
    this.printValidationSummary();
  }

  /**
   * Validate directory
   */
  async validateDirectory(directory) {
    if (!fs.existsSync(directory)) return;
    
    log(`📁 Validating ${directory}...`, 'blue');
    
    const files = this.findJsFiles(directory);
    this.validationResults.totalFiles += files.length;
    
    for (const file of files) {
      const result = await this.validateFile(file);
      
      if (result.compliant) {
        this.validationResults.compliantFiles++;
      } else {
        this.validationResults.nonCompliantFiles++;
        this.validationResults.issues.push(result);
      }
    }
  }

  /**
   * Find JavaScript files
   */
  findJsFiles(directory) {
    const files = [];
    
    function scan(currentDir) {
      const items = fs.readdirSync(currentDir);
      
      for (const item of items) {
        const fullPath = path.join(currentDir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          if (!['node_modules', '.git', 'logs', 'coverage', 'dist', 'build'].includes(item)) {
            scan(fullPath);
          }
        } else if (item.endsWith('.js') || item.endsWith('.jsx')) {
          files.push(fullPath);
        }
      }
    }
    
    scan(directory);
    return files;
  }

  /**
   * Validate single file
   */
  async validateFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const relativePath = path.relative(process.cwd(), filePath);
      
      const result = {
        file: relativePath,
        compliant: true,
        issues: []
      };
      
      // Check for console.log usage
      if (content.includes('console.log')) {
        result.compliant = false;
        result.issues.push('console.log usage found');
      }
      
      // Check for logger.log usage (legacy)
      if (content.includes('logger.log')) {
        result.compliant = false;
        result.issues.push('logger.log usage found (legacy pattern)');
      }
      
      // Check for direct console assignment
      if (content.includes('this.logger = console')) {
        result.compliant = false;
        result.issues.push('direct console assignment found');
      }
      
      // Check for proper logger import
      const hasProperImport = content.includes('require(\'@logging/Logger\')') ||
                             content.includes('require("@logging/Logger")');
      
      if (!hasProperImport && (content.includes('logger.') || content.includes('Logger'))) {
        result.compliant = false;
        result.issues.push('missing or incorrect logger import');
      }
      
      // Check for double brackets (legacy pattern)
      if (content.includes('[[') || content.includes(']]')) {
        result.compliant = false;
        result.issues.push('double brackets found (legacy pattern)');
      }
      
      if (!result.compliant) {
        log(`  ❌ ${relativePath}: ${result.issues.join(', ')}`, 'red');
      } else {
        log(`  ✅ ${relativePath}`, 'green');
      }
      
      return result;
      
    } catch (error) {
      return {
        file: path.relative(process.cwd(), filePath),
        compliant: false,
        issues: [`Error reading file: ${error.message}`]
      };
    }
  }

  /**
   * Print validation summary
   */
  printValidationSummary() {
    log('', 'reset');
    log('📊 Validation Summary:', 'bright');
    log(`   Total files: ${this.validationResults.totalFiles}`, 'cyan');
    log(`   Compliant files: ${this.validationResults.compliantFiles}`, 'green');
    log(`   Non-compliant files: ${this.validationResults.nonCompliantFiles}`, 'red');
    log('', 'reset');
    
    if (this.validationResults.nonCompliantFiles > 0) {
      log('⚠️  Migration validation failed!', 'yellow');
      log('📋 Non-compliant files:', 'yellow');
      
      this.validationResults.issues.forEach(issue => {
        log(`   - ${issue.file}: ${issue.issues.join(', ')}`, 'red');
      });
      
      process.exit(1);
    } else {
      log('✅ All files are compliant with logging standards!', 'green');
    }
  }
}

// CLI interface
function main() {
  const validator = new LoggingMigrationValidator();
  validator.validate().catch(error => {
    log(`❌ Validation failed: ${error.message}`, 'red');
    process.exit(1);
  });
}

if (require.main === module) {
  main();
}

module.exports = LoggingMigrationValidator;
```

### File: `logs/migration-report.json` - Migration report (generated)
```json
{
  "timestamp": "2024-12-19T10:00:00.000Z",
  "summary": {
    "totalFiles": 150,
    "migratedFiles": 120,
    "failedFiles": 5,
    "manualReviewFiles": 20,
    "alreadyCompliantFiles": 5
  },
  "categories": {
    "autoMigratable": [
      "backend/domain/services/auto-finish/AutoFinishSystem.js",
      "backend/infrastructure/messaging/EventBus.js",
      "scripts/task-category-migration.js"
    ],
    "manualReview": [
      "backend/domain/services/auto-test/AutoTestFixSystem.js",
      "backend/infrastructure/external/IDEDetector.js"
    ],
    "alreadyCompliant": [
      "backend/infrastructure/logging/Logger.js",
      "backend/presentation/api/TaskController.js"
    ]
  },
  "recommendations": [
    {
      "type": "success",
      "message": "120 files successfully migrated"
    },
    {
      "type": "warning",
      "message": "20 files need manual review - complex patterns detected"
    },
    {
      "type": "error",
      "message": "5 files failed migration - manual intervention required"
    }
  ]
}
```

### File: `logs/manual-review-todos.md` - Manual review TODOs (generated)
```markdown
# Manual Review TODOs - Logging Migration

Generated: 2024-12-19T10:00:00.000Z

## Files Requiring Manual Review (20)

### backend/domain/services/auto-test/AutoTestFixSystem.js

**Issues Found:**
- Template literals in console.log statements
- Direct console assignment to logger property
- Function calls in console.log statements

**Action Required:**
- Review complex logging patterns
- Manually migrate to standardized format
- Test after migration

---

### backend/infrastructure/external/IDEDetector.js

**Issues Found:**
- Environment variables in console.log statements
- Require statements in console.log

**Action Required:**
- Review complex logging patterns
- Manually migrate to standardized format
- Test after migration

---
```

## Dependencies
- Requires: Phase 1 completion (infrastructure files)
- Blocks: Phase 3 start

## Estimated Time
5 hours

## Success Criteria
- [ ] Enhanced migration script created and functional
- [ ] All auto-migratable files successfully migrated
- [ ] Migration report generated with detailed statistics
- [ ] Manual review TODOs generated for complex cases
- [ ] Validation script confirms migration success
- [ ] No console.log or logger.log patterns remain in auto-migrated files
- [ ] All imports standardized to @logging/Logger pattern
- [ ] Backup files created for all modified files
- [ ] Migration documentation complete 