#!/usr/bin/env node

/**
 * API Modernization Loop Processor
 * 
 * Processes files one by one until all modernization issues are fixed
 */

const APIModernizationScanner = require('./api-modernization-scanner');
const fs = require('fs');
const path = require('path');

class APIModernizationProcessor {
  constructor() {
    this.scanner = new APIModernizationScanner();
    this.processedCount = 0;
    this.maxFilesPerRun = 10; // Process max 10 files per run
  }

  async processNextFile() {
    // Rescan to get current state
    this.scanner = new APIModernizationScanner();
    this.scanner.scanDirectory('./');
    
    const next = this.scanner.getNextFile();
    
    if (!next) {
      console.log('\n✅ ALL FILES MODERNIZED!');
      return false;
    }

    console.log(`\n🔧 PROCESSING FILE ${this.processedCount + 1}:`);
    console.log(`📁 File: ${next.file}`);
    console.log(`📍 Line: ${next.line}`);
    console.log(`🔧 Type: ${next.type}`);
    console.log(`📝 Content: ${next.content}`);

    // Process the file based on type
    await this.processFile(next);
    
    this.processedCount++;
    
    // Remove processed item from scanner
    this.scanner.removeProcessedItem(next.type, next.file, next.line);
    
    return true;
  }

  async processFile(issue) {
    try {
      const content = fs.readFileSync(issue.file, 'utf8');
      const lines = content.split('\n');
      
      // Get context around the issue line
      const startLine = Math.max(0, issue.line - 3);
      const endLine = Math.min(lines.length, issue.line + 3);
      
      console.log('\n📋 CONTEXT:');
      for (let i = startLine; i < endLine; i++) {
        const marker = i + 1 === issue.line ? '>>> ' : '    ';
        console.log(`${marker}${i + 1}: ${lines[i]}`);
      }

      // Apply fix based on type
      let fixed = false;
      
      switch (issue.type) {
        case 'dataWrapper':
          fixed = await this.fixDataWrapper(issue.file, issue.line, lines);
          break;
        case 'messageWrapper':
          fixed = await this.fixMessageWrapper(issue.file, issue.line, lines);
          break;
        case 'successPattern':
          fixed = await this.fixSuccessPattern(issue.file, issue.line, lines);
          break;
        case 'oldResponse':
          fixed = await this.fixOldResponse(issue.file, issue.line, lines);
          break;
      }

      if (fixed) {
        console.log(`✅ Fixed ${issue.type} in ${issue.file}:${issue.line}`);
      } else {
        console.log(`⚠️  Could not auto-fix ${issue.type} in ${issue.file}:${issue.line}`);
        console.log('   Manual intervention required');
      }

    } catch (error) {
      console.error(`❌ Error processing ${issue.file}:`, error.message);
    }
  }

  async fixDataWrapper(filePath, lineNum, lines) {
    const lineIndex = lineNum - 1;
    const line = lines[lineIndex];
    
    // Look for patterns like: res.json({ data: result })
    if (line.includes('res.json({') && line.includes('data:')) {
      // Extract the data value
      const dataMatch = line.match(/data:\s*([^,}]+)/);
      if (dataMatch) {
        const dataValue = dataMatch[1].trim();
        // Replace with direct response
        lines[lineIndex] = line.replace(/res\.json\(\{\s*data:\s*([^,}]+)\s*\}\)/, `res.status(200).json(${dataValue})`);
        
        fs.writeFileSync(filePath, lines.join('\n'));
        return true;
      }
    }
    
    return false;
  }

  async fixMessageWrapper(filePath, lineNum, lines) {
    const lineIndex = lineNum - 1;
    const line = lines[lineIndex];
    
    // Look for patterns like: res.json({ message: "..." })
    if (line.includes('res.json({') && line.includes('message:')) {
      // Extract the message value
      const messageMatch = line.match(/message:\s*['"]([^'"]+)['"]/);
      if (messageMatch) {
        const message = messageMatch[1];
        // Replace with error response
        lines[lineIndex] = line.replace(/res\.json\(\{\s*message:\s*['"]([^'"]+)['"]\s*\}\)/, `res.status(400).json({ error: { message: "${message}", code: "VALIDATION_ERROR" } })`);
        
        fs.writeFileSync(filePath, lines.join('\n'));
        return true;
      }
    }
    
    return false;
  }

  async fixSuccessPattern(filePath, lineNum, lines) {
    const lineIndex = lineNum - 1;
    const line = lines[lineIndex];
    
    // Remove /false patterns
    if (line.includes('') || line.includes('')) {
      lines[lineIndex] = line.replace(/,\s*success:\s*(true|false)/g, '');
      
      fs.writeFileSync(filePath, lines.join('\n'));
      return true;
    }
    
    return false;
  }

  async fixOldResponse(filePath, lineNum, lines) {
    // This would handle old response patterns
    // Implementation depends on specific patterns found
    return false;
  }

  async run() {
    console.log('🚀 Starting API Modernization Loop Processor...');
    console.log(`📊 Max files per run: ${this.maxFilesPerRun}`);
    
    let processed = 0;
    
    while (processed < this.maxFilesPerRun) {
      const hasMore = await this.processNextFile();
      
      if (!hasMore) {
        break;
      }
      
      processed++;
      
      // Small delay between files
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`\n📊 Processed ${processed} files in this run`);
    
    if (processed >= this.maxFilesPerRun) {
      console.log('🔄 Run again to continue processing...');
    }
  }
}

// Main execution
if (require.main === module) {
  const processor = new APIModernizationProcessor();
  processor.run().catch(console.error);
}

module.exports = APIModernizationProcessor;
