#!/usr/bin/env node

/**
 * API Modernization Scanner
 * 
 * Finds ALL files that still need modernization:
 * 1. data: {} wrappers
 * 2. message: wrappers  
 * 3. /false patterns
 * 4. Old response patterns
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class APIModernizationScanner {
  constructor() {
    this.results = {
      dataWrappers: [],
      messageWrappers: [],
      successPatterns: [],
      oldResponses: []
    };
  }

  scanFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      
      lines.forEach((line, index) => {
        const lineNum = index + 1;
        
        // Find data: {} wrappers (only in API responses, not object properties)
        if (line.match(/data:\s*\{/) && !line.trim().startsWith('*') && !line.trim().startsWith('//') && 
            (line.includes('res.json') || line.includes('res.status') || line.includes('response'))) {
          this.results.dataWrappers.push({
            file: filePath,
            line: lineNum,
            content: line.trim()
          });
        }
        
        // Find message: wrappers (only in API responses with old patterns)
        if (line.match(/message:\s*['"]/) && !line.trim().startsWith('*') && !line.trim().startsWith('//') &&
            (line.includes('res.json') || line.includes('res.status') || line.includes('response')) &&
            (line.includes('data:') || line.includes('success:'))) {
          this.results.messageWrappers.push({
            file: filePath,
            line: lineNum,
            content: line.trim()
          });
        }
        
        // Find /false patterns (only in actual code, not comments)
        if (line.match(/success:\s*(true|false)/) && !line.trim().startsWith('*') && !line.trim().startsWith('//')) {
          this.results.successPatterns.push({
            file: filePath,
            line: lineNum,
            content: line.trim()
          });
        }
        
        // Find old response patterns
        if (line.match(/res\.json\(\{.*success:/)) {
          this.results.oldResponses.push({
            file: filePath,
            line: lineNum,
            content: line.trim()
          });
        }
      });
    } catch (error) {
      console.error(`Error scanning ${filePath}:`, error.message);
    }
  }

  scanDirectory(dirPath) {
    const items = fs.readdirSync(dirPath);
    
    for (const item of items) {
      const fullPath = path.join(dirPath, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        this.scanDirectory(fullPath);
      } else if (item.endsWith('.js') && !item.includes('test') && !item.includes('spec') && !item.includes('api-modernization')) {
        this.scanFile(fullPath);
      }
    }
  }

  generateReport() {
    const totalIssues = 
      this.results.dataWrappers.length +
      this.results.messageWrappers.length +
      this.results.successPatterns.length +
      this.results.oldResponses.length;

    console.log('\n🔍 API MODERNIZATION SCANNER REPORT');
    console.log('=====================================');
    console.log(`📊 Total Issues Found: ${totalIssues}`);
    console.log(`📁 Data Wrappers: ${this.results.dataWrappers.length}`);
    console.log(`📁 Message Wrappers: ${this.results.messageWrappers.length}`);
    console.log(`📁 Success Patterns: ${this.results.successPatterns.length}`);
    console.log(`📁 Old Responses: ${this.results.oldResponses.length}`);

    // Save detailed report
    const report = {
      summary: {
        totalIssues,
        dataWrappers: this.results.dataWrappers.length,
        messageWrappers: this.results.messageWrappers.length,
        successPatterns: this.results.successPatterns.length,
        oldResponses: this.results.oldResponses.length
      },
      details: this.results
    };

    fs.writeFileSync('api-modernization-report.json', JSON.stringify(report, null, 2));
    console.log('\n📄 Detailed report saved to: api-modernization-report.json');

    return report;
  }

  getNextFile() {
    // Priority order: data wrappers > message wrappers > success patterns > old responses
    if (this.results.dataWrappers.length > 0) {
      return {
        type: 'dataWrapper',
        file: this.results.dataWrappers[0].file,
        line: this.results.dataWrappers[0].line,
        content: this.results.dataWrappers[0].content
      };
    }
    
    if (this.results.messageWrappers.length > 0) {
      return {
        type: 'messageWrapper',
        file: this.results.messageWrappers[0].file,
        line: this.results.messageWrappers[0].line,
        content: this.results.messageWrappers[0].content
      };
    }
    
    if (this.results.successPatterns.length > 0) {
      return {
        type: 'successPattern',
        file: this.results.successPatterns[0].file,
        line: this.results.successPatterns[0].line,
        content: this.results.successPatterns[0].content
      };
    }
    
    if (this.results.oldResponses.length > 0) {
      return {
        type: 'oldResponse',
        file: this.results.oldResponses[0].file,
        line: this.results.oldResponses[0].line,
        content: this.results.oldResponses[0].content
      };
    }
    
    return null;
  }

  removeProcessedItem(type, file, line) {
    const results = this.results[type === 'dataWrapper' ? 'dataWrappers' : 
                              type === 'messageWrapper' ? 'messageWrappers' :
                              type === 'successPattern' ? 'successPatterns' : 'oldResponses'];
    
    const index = results.findIndex(item => item.file === file && item.line === line);
    if (index !== -1) {
      results.splice(index, 1);
    }
  }
}

// Main execution
if (require.main === module) {
  const scanner = new APIModernizationScanner();
  
  console.log('🔍 Scanning backend directory for API modernization issues...');
  scanner.scanDirectory('./');
  
  const report = scanner.generateReport();
  
  if (report.summary.totalIssues > 0) {
    console.log('\n🎯 NEXT FILE TO PROCESS:');
    const next = scanner.getNextFile();
    if (next) {
      console.log(`📁 File: ${next.file}`);
      console.log(`📍 Line: ${next.line}`);
      console.log(`🔧 Type: ${next.type}`);
      console.log(`📝 Content: ${next.content}`);
    }
  } else {
    console.log('\n✅ ALL FILES ARE MODERNIZED!');
  }
}

module.exports = APIModernizationScanner;
