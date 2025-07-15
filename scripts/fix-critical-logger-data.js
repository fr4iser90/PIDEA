#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class CriticalLoggerDataFixer {
  constructor() {
    this.fixes = [];
    this.criticalPatterns = [
      // User data and authentication
      {
        pattern: /logger\.(info|error|debug|warn|log)\s*\(\s*[^,)]*,\s*(user|session|token|auth|password|secret)/gi,
        replacement: (match, level, message, data) => {
          return `logger.${level}(${message}, '[REDACTED_USER_DATA]')`;
        },
        type: 'user_data'
      },
      // Large objects and arrays
      {
        pattern: /logger\.(info|error|debug|warn|log)\s*\(\s*[^,)]*,\s*\{[^}]*\}/g,
        replacement: (match, level, message, data) => {
          return `logger.${level}(${message}, '[REDACTED_OBJECT]')`;
        },
        type: 'large_object'
      },
      {
        pattern: /logger\.(info|error|debug|warn|log)\s*\(\s*[^,)]*,\s*\[[^\]]*\]/g,
        replacement: (match, level, message, data) => {
          return `logger.${level}(${message}, '[REDACTED_ARRAY]')`;
        },
        type: 'large_array'
      },
      // Error objects with full stack traces
      {
        pattern: /logger\.(info|error|debug|warn|log)\s*\(\s*[^,)]*,\s*error\s*\)/g,
        replacement: (match, level, message) => {
          return `logger.${level}(${message}, error.message)`;
        },
        type: 'error_object'
      },
      // Request/response data
      {
        pattern: /logger\.(info|error|debug|warn|log)\s*\(\s*[^,)]*,\s*(req|res|request|response)/gi,
        replacement: (match, level, message, data) => {
          return `logger.${level}(${message}, '[REDACTED_REQUEST_DATA]')`;
        },
        type: 'request_response'
      },
      // Database results
      {
        pattern: /logger\.(info|error|debug|warn|log)\s*\(\s*[^,)]*,\s*(result|data|rows|records)/gi,
        replacement: (match, level, message, data) => {
          return `logger.${level}(${message}, '[REDACTED_DB_DATA]')`;
        },
        type: 'database_result'
      },
      // File content
      {
        pattern: /logger\.(info|error|debug|warn|log)\s*\(\s*[^,)]*,\s*(content|file|path)/gi,
        replacement: (match, level, message, data) => {
          return `logger.${level}(${message}, '[REDACTED_FILE_DATA]')`;
        },
        type: 'file_content'
      },
      // Configuration data
      {
        pattern: /logger\.(info|error|debug|warn|log)\s*\(\s*[^,)]*,\s*(config|settings|options)/gi,
        replacement: (match, level, message, data) => {
          return `logger.${level}(${message}, '[REDACTED_CONFIG]')`;
        },
        type: 'configuration'
      },
      // API responses
      {
        pattern: /logger\.(info|error|debug|warn|log)\s*\(\s*[^,)]*,\s*(response|api|http)/gi,
        replacement: (match, level, message, data) => {
          return `logger.${level}(${message}, '[REDACTED_API_DATA]')`;
        },
        type: 'api_response'
      },
      // IDE data with sensitive paths
      {
        pattern: /logger\.(info|error|debug|warn|log)\s*\(\s*[^,)]*,\s*(ide|workspace|port)/gi,
        replacement: (match, level, message, data) => {
          return `logger.${level}(${message}, '[REDACTED_IDE_DATA]')`;
        },
        type: 'ide_data'
      },
      // Chat data
      {
        pattern: /logger\.(info|error|debug|warn|log)\s*\(\s*[^,)]*,\s*(chat|message|history)/gi,
        replacement: (match, level, message, data) => {
          return `logger.${level}(${message}, '[REDACTED_CHAT_DATA]')`;
        },
        type: 'chat_data'
      },
      // Task data
      {
        pattern: /logger\.(info|error|debug|warn|log)\s*\(\s*[^,)]*,\s*(task|execution|workflow)/gi,
        replacement: (match, level, message, data) => {
          return `logger.${level}(${message}, '[REDACTED_TASK_DATA]')`;
        },
        type: 'task_data'
      }
    ];
  }

  async findFiles() {
    try {
      const { execSync } = require('child_process');
      const output = execSync('find . -name "*.js" -not -path "./node_modules/*" -not -path "./.git/*"', { encoding: 'utf8' });
      return output.trim().split('\n').filter(file => file.length > 0);
    } catch (error) {
      console.error('Error finding files:', error.message);
      return [];
    }
  }

  async fixFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      let modifiedContent = content;
      let fileFixes = [];

      this.criticalPatterns.forEach(pattern => {
        const matches = [...content.matchAll(pattern.pattern)];
        matches.forEach(match => {
          const originalLine = match[0];
          const fixedLine = pattern.replacement(...match);
          
          if (originalLine !== fixedLine) {
            modifiedContent = modifiedContent.replace(originalLine, fixedLine);
            fileFixes.push({
              type: pattern.type,
              original: originalLine,
              fixed: fixedLine
            });
          }
        });
      });

      if (fileFixes.length > 0) {
        fs.writeFileSync(filePath, modifiedContent);
        this.fixes.push({
          file: filePath,
          fixes: fileFixes
        });
        return fileFixes.length;
      }

      return 0;
    } catch (error) {
      console.error(`Error fixing ${filePath}:`, error.message);
      return 0;
    }
  }

  async fixAllFiles() {
    console.log('🔍 Finding JavaScript files...');
    const files = await this.findFiles();
    console.log(`Found ${files.length} files to analyze`);

    console.log('🔧 Fixing critical unsanitized logger data...');
    let totalFixes = 0;

    for (const file of files) {
      const fixCount = await this.fixFile(file);
      if (fixCount > 0) {
        console.log(`  ✅ Fixed ${fixCount} issues in ${file}`);
        totalFixes += fixCount;
      }
    }

    return totalFixes;
  }

  generateReport() {
    const report = {
      summary: {
        totalFiles: this.fixes.length,
        totalFixes: this.fixes.reduce((sum, file) => sum + file.fixes.length, 0),
        byType: {}
      },
      files: {}
    };

    this.fixes.forEach(fileFix => {
      report.summary.totalFixes += fileFix.fixes.length;
      
      const fileReport = {
        totalFixes: fileFix.fixes.length,
        byType: {},
        fixes: fileFix.fixes
      };

      fileFix.fixes.forEach(fix => {
        fileReport.byType[fix.type] = (fileReport.byType[fix.type] || 0) + 1;
        report.summary.byType[fix.type] = (report.summary.byType[fix.type] || 0) + 1;
      });

      report.files[fileFix.file] = fileReport;
    });

    return report;
  }

  printReport(report) {
    console.log('\n' + '='.repeat(80));
    console.log('🔧 CRITICAL LOGGER DATA FIX REPORT');
    console.log('='.repeat(80));

    console.log('\n📊 SUMMARY:');
    console.log(`  Total files fixed: ${report.summary.totalFiles}`);
    console.log(`  Total fixes applied: ${report.summary.totalFixes}`);

    console.log('\n📈 FIXES BY TYPE:');
    Object.entries(report.summary.byType)
      .sort(([,a], [,b]) => b - a)
      .forEach(([type, count]) => {
        console.log(`  ${type}: ${count}`);
      });

    console.log('\n📁 DETAILED FIXES BY FILE:');
    Object.entries(report.files)
      .sort(([,a], [,b]) => b.totalFixes - a.totalFixes)
      .forEach(([filePath, fileReport]) => {
        console.log(`\n  ${filePath} (${fileReport.totalFixes} fixes):`);
        
        Object.entries(fileReport.byType)
          .sort(([,a], [,b]) => b - a)
          .forEach(([type, count]) => {
            console.log(`    ${type}: ${count}`);
          });

        // Show first few fixes
        fileReport.fixes.slice(0, 3).forEach(fix => {
          console.log(`    ${fix.type}: ${fix.original.substring(0, 60)}${fix.original.length > 60 ? '...' : ''}`);
        });

        if (fileReport.fixes.length > 3) {
          console.log(`    ... and ${fileReport.fixes.length - 3} more fixes`);
        }
      });

    console.log('\n' + '='.repeat(80));
  }

  saveReport(report) {
    const reportFile = 'critical-logger-fix-report.json';
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    console.log(`\n💾 Detailed fix report saved to: ${reportFile}`);
  }

  async run() {
    console.log('🚀 Starting critical logger data fixes...');
    
    const totalFixes = await this.fixAllFiles();
    const report = this.generateReport();
    
    this.printReport(report);
    this.saveReport(report);
    
    console.log(`\n✅ Fixed ${totalFixes} critical unsanitized logger data issues!`);
  }
}

// Run the fixer
if (require.main === module) {
  const fixer = new CriticalLoggerDataFixer();
  fixer.run().catch(console.error);
}

module.exports = CriticalLoggerDataFixer; 