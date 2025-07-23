#!/usr/bin/env node
require('module-alias/register');

/**
 * Coverage to Markdown Converter
 * Converts Jest coverage output to a comprehensive Markdown report
 * with task generation for uncovered code
 */

const fs = require('fs');
const path = require('path');
const Logger = require('@logging/Logger');
const logger = new Logger('Logger');

class CoverageToMarkdown {
  constructor() {
    this.coverageData = null;
    this.reportDate = new Date().toLocaleString();
  }

  /**
   * Parse LCOV coverage data
   * @param {string} lcovContent - Raw LCOV content
   * @returns {Object} - Parsed coverage data
   */
  parseLcovData(lcovContent) {
    const lines = lcovContent.split('\n');
    const files = [];
    let currentFile = null;
    let summary = { overall: 0, files: 0, covered: 0 };

    for (const line of lines) {
      if (line.startsWith('SF:')) {
        // Source file
        const filePath = line.substring(3);
        currentFile = {
          file: filePath,
          functions: { found: 0, hit: 0, details: [] },
          lines: { found: 0, hit: 0, details: [] },
          branches: { found: 0, hit: 0, details: [] }
        };
        files.push(currentFile);
        summary.files++;
      } else if (line.startsWith('FNF:')) {
        // Functions found
        currentFile.functions.found = parseInt(line.substring(4));
      } else if (line.startsWith('FNH:')) {
        // Functions hit
        currentFile.functions.hit = parseInt(line.substring(4));
      } else if (line.startsWith('LF:')) {
        // Lines found
        currentFile.lines.found = parseInt(line.substring(3));
      } else if (line.startsWith('LH:')) {
        // Lines hit
        currentFile.lines.hit = parseInt(line.substring(3));
      } else if (line.startsWith('BRF:')) {
        // Branches found
        currentFile.branches.found = parseInt(line.substring(4));
      } else if (line.startsWith('BRH:')) {
        // Branches hit
        currentFile.branches.hit = parseInt(line.substring(4));
      }
    }

    // Calculate percentages and overall coverage
    let totalFunctions = 0, hitFunctions = 0;
    let totalLines = 0, hitLines = 0;
    let totalBranches = 0, hitBranches = 0;

    files.forEach(file => {
      file.functions.percentage = file.functions.found > 0 ? 
        Math.round((file.functions.hit / file.functions.found) * 100) : 100;
      file.lines.percentage = file.lines.found > 0 ? 
        Math.round((file.lines.hit / file.lines.found) * 100) : 100;
      file.branches.percentage = file.branches.found > 0 ? 
        Math.round((file.branches.hit / file.branches.found) * 100) : 100;
      
      file.average = Math.round((file.functions.percentage + file.lines.percentage + file.branches.percentage) / 3);

      totalFunctions += file.functions.found;
      hitFunctions += file.functions.hit;
      totalLines += file.lines.found;
      hitLines += file.lines.hit;
      totalBranches += file.branches.found;
      hitBranches += file.branches.hit;
    });

    summary.overall = totalLines > 0 ? Math.round((hitLines / totalLines) * 100) : 0;
    summary.covered = files.filter(f => f.average >= 80).length;

    return { summary, files };
  }

  /**
   * Generate tasks for uncovered code
   * @param {Array} files - Coverage data for files
   * @returns {Array} - Generated tasks
   */
  generateTasks(files) {
    const tasks = [];
    
    files.forEach(file => {
      if (file.average < 80) {
        const priority = file.average < 50 ? 'HIGH' : file.average < 70 ? 'MEDIUM' : 'LOW';
        const task = {
          priority,
          file: file.file,
          currentCoverage: file.average,
          targetCoverage: 80,
          description: `Improve test coverage for ${path.basename(file.file)}`,
          details: {
            functions: file.functions.percentage,
            lines: file.lines.percentage,
            branches: file.branches.percentage
          }
        };
        tasks.push(task);
      }
    });

    return tasks.sort((a, b) => {
      const priorityOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Generate Markdown report
   * @param {Object} coverageData - Parsed coverage data
   * @returns {string} - Markdown report
   */
  generateMarkdown(coverageData) {
    let md = '# Test Coverage Report\n\n';
    md += `**Generated:** ${this.reportDate}\n\n`;

    if (!coverageData || !coverageData.summary.overall) {
      md += '## ⚠️ Coverage Data Unavailable\n\n';
      md += 'No coverage data was generated. This could be due to:\n\n';
      md += '- Tests failing during execution\n';
      md += '- Coverage not enabled in Jest configuration\n';
      md += '- No source files being tested\n\n';
      md += '### Recommended Actions:\n\n';
      md += '1. **Fix failing tests** - Ensure all tests pass before generating coverage\n';
      md += '2. **Enable coverage** - Add `--coverage` flag to Jest configuration\n';
      md += '3. **Check source files** - Verify that source files are being included in coverage\n';
      md += '4. **Run tests separately** - Try running `npm test -- --coverage` manually\n\n';
      
      // Generate fallback tasks based on project structure
      md += this.generateFallbackTasks();
      
      return md;
    }

    md += `## 📊 Coverage Summary\n\n`;
    md += `**Overall Coverage:** ${coverageData.summary.overall}%\n\n`;
    md += `**Files Analyzed:** ${coverageData.summary.files}\n`;
    md += `**Files with ≥80% Coverage:** ${coverageData.summary.covered}\n\n`;

    if (coverageData.files.length > 0) {
      md += '## 📁 File Coverage Details\n\n';
      md += '| File | Functions | Lines | Branches | Average | Status |\n';
      md += '|------|-----------|-------|----------|---------|--------|\n';
      
      coverageData.files.forEach(file => {
        const status = file.average >= 80 ? '✅' : file.average >= 50 ? '⚠️' : '❌';
        md += `| \`${file.file}\` | ${file.functions.percentage}% | ${file.lines.percentage}% | ${file.branches.percentage}% | ${file.average}% | ${status} |\n`;
      });
      md += '\n';

      // Generate tasks
      const tasks = this.generateTasks(coverageData.files);
      if (tasks.length > 0) {
        md += '## 🎯 Coverage Improvement Tasks\n\n';
        
        const highPriority = tasks.filter(t => t.priority === 'HIGH');
        const mediumPriority = tasks.filter(t => t.priority === 'MEDIUM');
        const lowPriority = tasks.filter(t => t.priority === 'LOW');

        if (highPriority.length > 0) {
          md += '### 🔴 High Priority\n\n';
          highPriority.forEach(task => {
            md += `- **${task.file}** (${task.currentCoverage}% → 80%)\n`;
            md += `  - Current: Funcs ${task.details.functions}%, Lines ${task.details.lines}%, Branches ${task.details.branches}%\n`;
            md += `  - Task: ${task.description}\n\n`;
          });
        }

        if (mediumPriority.length > 0) {
          md += '### 🟡 Medium Priority\n\n';
          mediumPriority.forEach(task => {
            md += `- **${task.file}** (${task.currentCoverage}% → 80%)\n`;
            md += `  - Task: ${task.description}\n\n`;
          });
        }

        if (lowPriority.length > 0) {
          md += '### 🟢 Low Priority\n\n';
          lowPriority.forEach(task => {
            md += `- **${task.file}** (${task.currentCoverage}% → 80%)\n`;
            md += `  - Task: ${task.description}\n\n`;
          });
        }
      }
    }

    return md;
  }

  /**
   * Generate fallback tasks when no coverage data is available
   * @returns {string} - Fallback tasks markdown
   */
  generateFallbackTasks() {
    let md = '## 🎯 Recommended Coverage Tasks\n\n';
    md += 'Since no coverage data is available, here are  coverage improvement tasks:\n\n';
    
    // Common directories that should have tests
    const commonDirs = [
      'domain/entities',
      'domain/services', 
      'application/handlers',
      'application/commands',
      'infrastructure/services',
      'presentation/api/controllers',
      'presentation/api/handlers'
    ];

    md += '### 📁 Priority Areas for Coverage\n\n';
    commonDirs.forEach(dir => {
      md += `- **${dir}/** - Add unit tests for business logic\n`;
    });
    
    md += '\n### 🔧 Coverage Setup Tasks\n\n';
    md += '1. **Configure Jest Coverage** - Update `jest.config.js` to include coverage settings\n';
    md += '2. **Add Coverage Thresholds** - Set minimum coverage requirements\n';
    md += '3. **Create Test Templates** - Standardize test structure for new files\n';
    md += '4. **Setup Coverage Reports** - Configure HTML and LCOV reports\n\n';

    return md;
  }

  /**
   * Main execution method
   */
  async run() {
    try {
      logger.info('📊 Converting coverage to Markdown...');
      
      // Try to read LCOV file first
      const lcovFile = path.join(process.cwd(), 'coverage', 'lcov.info');
      let coverageData = null;

      if (fs.existsSync(lcovFile)) {
        logger.info('📁 Found LCOV file, parsing coverage data...');
        const lcovContent = fs.readFileSync(lcovFile, 'utf8');
        coverageData = this.parseLcovData(lcovContent);
      } else {
        logger.info('⚠️  LCOV file not found, checking for coverage.txt...');
        // Fallback to coverage.txt if LCOV doesn't exist
        const coverageFile = path.join(process.cwd(), 'coverage.txt');
        if (fs.existsSync(coverageFile)) {
          const coverageText = fs.readFileSync(coverageFile, 'utf8');
          // Try to parse as Jest text output (legacy)
          coverageData = this.parseCoverageText(coverageText);
        }
      }

      const markdown = this.generateMarkdown(coverageData);
      
      const outputFile = path.join(process.cwd(), 'coverage.md');
      fs.writeFileSync(outputFile, markdown, 'utf8');
      
      logger.info(`✅ Coverage report generated: ${outputFile}`);
      
      if (coverageData && coverageData.summary.overall) {
        logger.info(`📊 Overall coverage: ${coverageData.summary.overall}%`);
        logger.info(`📁 Files analyzed: ${coverageData.summary.files}`);
        logger.info(`✅ Files with ≥80% coverage: ${coverageData.summary.covered}`);
      } else {
        logger.info('⚠️  No coverage data found - generated fallback report');
      }
      
    } catch (error) {
      logger.error('❌ Error generating coverage report:', error.message);
      
      // Generate fallback report even on error
      const fallbackMd = this.generateMarkdown(null);
      const outputFile = path.join(process.cwd(), 'coverage.md');
      fs.writeFileSync(outputFile, fallbackMd, 'utf8');
      logger.info(`✅ Fallback coverage report generated: ${outputFile}`);
    }
  }

  /**
   * Legacy method to parse Jest text output (kept for backward compatibility)
   */
  parseCoverageText(coverageText) {
    const lines = coverageText.split('\n');
    const summary = {};
    const files = [];
    let inTable = false;
    let headers = [];

    for (const line of lines) {
      // Parse summary section
      if (line.includes('All files')) {
        const match = line.match(/(\d+(?:\.\d+)?)%/);
        if (match) {
          summary.overall = parseFloat(match[1]);
        }
      }
      // Detect start of table
      if (line.match(/^\s*File\s+% Stmts/)) {
        inTable = true;
        headers = line.trim().split(/\s{2,}/);
        continue;
      }
      // Detect end of table
      if (inTable && line.match(/^(\s*-+\s*)+$/)) {
        inTable = false;
        continue;
      }
      // Parse table rows
      if (inTable && line.trim() && !line.match(/^(\s*-+\s*)+$/)) {
        const parts = line.trim().split(/\s{2,}/);
        if (parts.length >= 4) {
          const filePath = parts[0];
          const stmts = parseFloat(parts[1]) || 0;
          const branch = parseFloat(parts[2]) || 0;
          const funcs = parseFloat(parts[3]) || 0;
          const lines = parseFloat(parts[4]) || 0;
          
          if (filePath && filePath !== 'File') {
            files.push({
              file: filePath,
              statements: stmts,
              branches: branch,
              functions: funcs,
              lines: lines
            });
          }
        }
      }
    }

    return { summary, files };
  }
}

// Run the converter
const converter = new CoverageToMarkdown();
converter.run(); 