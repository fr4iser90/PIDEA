#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class UnsanitizedLoggerFinder {
  constructor() {
    this.results = {};
    this.patterns = [
      // Direct data logging
      { pattern: /logger\.(info|error|debug|warn|log)\s*\(\s*[^,)]*,\s*([^)]+)/g, type: 'direct_data' },
      // Object logging
      { pattern: /logger\.(info|error|debug|warn|log)\s*\(\s*[^,)]*,\s*\{[^}]*\}/g, type: 'object_data' },
      // Array logging
      { pattern: /logger\.(info|error|debug|warn|log)\s*\(\s*[^,)]*,\s*\[[^\]]*\]/g, type: 'array_data' },
      // Variable logging
      { pattern: /logger\.(info|error|debug|warn|log)\s*\(\s*[^,)]*,\s*(\w+)/g, type: 'variable_data' },
      // Template literal with data
      { pattern: /logger\.(info|error|debug|warn|log)\s*\(\s*`[^`]*\$\{[^}]*\}[^`]*`/g, type: 'template_data' },
      // JSON.stringify logging
      { pattern: /logger\.(info|error|debug|warn|log)\s*\(\s*[^,)]*,\s*JSON\.stringify/g, type: 'json_stringify' },
      // Error object logging
      { pattern: /logger\.(info|error|debug|warn|log)\s*\(\s*[^,)]*,\s*error/g, type: 'error_object' },
      // Request/response logging
      { pattern: /logger\.(info|error|debug|warn|log)\s*\(\s*[^,)]*,\s*(req|res|request|response)/g, type: 'request_response' },
      // Database result logging
      { pattern: /logger\.(info|error|debug|warn|log)\s*\(\s*[^,)]*,\s*(result|data|rows|records)/g, type: 'database_result' },
      // User data logging
      { pattern: /logger\.(info|error|debug|warn|log)\s*\(\s*[^,)]*,\s*(user|session|token|auth)/g, type: 'user_data' },
      // File content logging
      { pattern: /logger\.(info|error|debug|warn|log)\s*\(\s*[^,)]*,\s*(content|file|path)/g, type: 'file_content' },
      // Configuration logging
      { pattern: /logger\.(info|error|debug|warn|log)\s*\(\s*[^,)]*,\s*(config|settings|options)/g, type: 'configuration' },
      // API response logging
      { pattern: /logger\.(info|error|debug|warn|log)\s*\(\s*[^,)]*,\s*(response|api|http)/g, type: 'api_response' },
      // IDE data logging
      { pattern: /logger\.(info|error|debug|warn|log)\s*\(\s*[^,)]*,\s*(ide|workspace|port)/g, type: 'ide_data' },
      // Chat data logging
      { pattern: /logger\.(info|error|debug|warn|log)\s*\(\s*[^,)]*,\s*(chat|message|history)/g, type: 'chat_data' },
      // Task data logging
      { pattern: /logger\.(info|error|debug|warn|log)\s*\(\s*[^,)]*,\s*(task|execution|workflow)/g, type: 'task_data' }
    ];
  }

  async findFiles() {
    try {
      const output = execSync('find . -name "*.js" -not -path "./node_modules/*" -not -path "./.git/*"', { encoding: 'utf8' });
      return output.trim().split('\n').filter(file => file.length > 0);
    } catch (error) {
      console.error('Error finding files:', error.message);
      return [];
    }
  }

  async analyzeFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      const findings = [];

      lines.forEach((line, lineNumber) => {
        this.patterns.forEach(pattern => {
          const matches = [...line.matchAll(pattern.pattern)];
          matches.forEach(match => {
            findings.push({
              line: lineNumber + 1,
              content: line.trim(),
              type: pattern.type,
              match: match[0]
            });
          });
        });
      });

      if (findings.length > 0) {
        this.results[filePath] = findings;
      }
    } catch (error) {
      console.error(`Error analyzing ${filePath}:`, error.message);
    }
  }

  async analyzeAllFiles() {
    console.log('🔍 Finding JavaScript files...');
    const files = await this.findFiles();
    console.log(`Found ${files.length} files to analyze`);

    console.log('🔍 Analyzing files for unsanitized logger data...');
    for (const file of files) {
      await this.analyzeFile(file);
    }
  }

  generateReport() {
    const report = {
      summary: {
        totalFiles: Object.keys(this.results).length,
        totalFindings: 0,
        byType: {}
      },
      files: {}
    };

    // Process results
    Object.entries(this.results).forEach(([filePath, findings]) => {
      report.summary.totalFindings += findings.length;
      
      const fileReport = {
        totalFindings: findings.length,
        byType: {},
        findings: findings
      };

      findings.forEach(finding => {
        fileReport.byType[finding.type] = (fileReport.byType[finding.type] || 0) + 1;
        report.summary.byType[finding.type] = (report.summary.byType[finding.type] || 0) + 1;
      });

      report.files[filePath] = fileReport;
    });

    return report;
  }

  printReport(report) {
    console.log('\n' + '='.repeat(80));
    console.log('🚨 UNSANITIZED LOGGER DATA ANALYSIS REPORT');
    console.log('='.repeat(80));

    console.log('\n📊 SUMMARY:');
    console.log(`  Total files with potential issues: ${report.summary.totalFiles}`);
    console.log(`  Total findings: ${report.summary.totalFindings}`);

    console.log('\n📈 FINDINGS BY TYPE:');
    Object.entries(report.summary.byType)
      .sort(([,a], [,b]) => b - a)
      .forEach(([type, count]) => {
        console.log(`  ${type}: ${count}`);
      });

    console.log('\n📁 DETAILED FINDINGS BY FILE:');
    Object.entries(report.files)
      .sort(([,a], [,b]) => b.totalFindings - a.totalFindings)
      .forEach(([filePath, fileReport]) => {
        console.log(`\n  ${filePath} (${fileReport.totalFindings} findings):`);
        
        Object.entries(fileReport.byType)
          .sort(([,a], [,b]) => b - a)
          .forEach(([type, count]) => {
            console.log(`    ${type}: ${count}`);
          });

        // Show first few findings
        fileReport.findings.slice(0, 3).forEach(finding => {
          console.log(`    Line ${finding.line}: ${finding.content.substring(0, 80)}${finding.content.length > 80 ? '...' : ''}`);
        });

        if (fileReport.findings.length > 3) {
          console.log(`    ... and ${fileReport.findings.length - 3} more findings`);
        }
      });

    console.log('\n' + '='.repeat(80));
  }

  saveReport(report) {
    const reportFile = 'unsanitized-logger-report.json';
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    console.log(`\n💾 Detailed report saved to: ${reportFile}`);
  }

  async run() {
    console.log('🚀 Starting unsanitized logger data analysis...');
    
    await this.analyzeAllFiles();
    const report = this.generateReport();
    
    this.printReport(report);
    this.saveReport(report);
    
    console.log('\n✅ Analysis complete!');
  }
}

// Run the analysis
if (require.main === module) {
  const finder = new UnsanitizedLoggerFinder();
  finder.run().catch(console.error);
}

module.exports = UnsanitizedLoggerFinder; 