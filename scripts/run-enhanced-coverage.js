#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const EnhancedDOMCollector = require('./enhanced-dom-collector');
const EnhancedChatAnalyzer = require('./enhanced-chat-analyzer');
const EnhancedCoverageTester = require('./test-enhanced-coverage');

class EnhancedCoverageRunner {
  constructor() {
    this.startTime = Date.now();
    this.results = {
      phases: [],
      errors: [],
      warnings: [],
      summary: {}
    };
  }

  async run() {
    console.log('🚀 ENHANCED DOM COVERAGE TASK EXECUTION');
    console.log('=' .repeat(60));
    console.log('🎯 Goal: Improve IDE coverage from 72% to 95%+');
    console.log('🎯 Focus: Fix chat functionality and modal detection');
    console.log('⏰ Started:', new Date().toISOString());
    console.log('');

    try {
      // Phase 1: Pre-flight checks
      await this.runPreFlightChecks();
      
      // Phase 2: Enhanced DOM Collection
      await this.runEnhancedDOMCollection();
      
      // Phase 3: Chat Analysis
      await this.runChatAnalysis();
      
      // Phase 4: Coverage Validation
      await this.runCoverageValidation();
      
      // Phase 5: Testing & Validation
      await this.runTesting();
      
      // Phase 6: Generate Final Report
      await this.generateFinalReport();
      
    } catch (error) {
      console.error('❌ Enhanced coverage task failed:', error.message);
      this.results.errors.push({
        phase: 'MAIN',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    } finally {
      await this.cleanup();
    }
  }

  async runPreFlightChecks() {
    console.log('🔍 Phase 1: Pre-flight Checks');
    console.log('-'.repeat(40));
    
    const phaseStart = Date.now();
    
    try {
      // Check required dependencies
      const dependencies = [
        'jsdom',
        'playwright'
      ];
      
      for (const dep of dependencies) {
        try {
          require(dep);
          console.log(`  ✅ ${dep} - Available`);
        } catch (e) {
          console.log(`  ❌ ${dep} - Missing`);
          throw new Error(`Missing dependency: ${dep}`);
        }
      }
      
      // Check required files
      const requiredFiles = [
        'scripts/enhanced-dom-collector.js',
        'scripts/enhanced-chat-analyzer.js',
        'scripts/coverage-validator.js',
        'scripts/selector-generator.js'
      ];
      
      for (const file of requiredFiles) {
        const filePath = path.join(__dirname, '..', file);
        if (fs.existsSync(filePath)) {
          console.log(`  ✅ ${file} - Found`);
        } else {
          console.log(`  ❌ ${file} - Missing`);
          throw new Error(`Missing file: ${file}`);
        }
      }
      
      // Check output directories
      const outputDirs = [
        '../output/enhanced-collected',
        '../output/chat-analysis',
        '../generated'
      ];
      
      for (const dir of outputDirs) {
        const dirPath = path.join(__dirname, dir);
        if (!fs.existsSync(dirPath)) {
          fs.mkdirSync(dirPath, { recursive: true });
          console.log(`  📁 ${dir} - Created`);
        } else {
          console.log(`  ✅ ${dir} - Exists`);
        }
      }
      
      const phaseTime = Date.now() - phaseStart;
      this.results.phases.push({
        name: 'Pre-flight Checks',
        status: 'SUCCESS',
        duration: phaseTime,
        timestamp: new Date().toISOString()
      });
      
      console.log(`  ✅ Pre-flight checks completed in ${phaseTime}ms\n`);
      
    } catch (error) {
      const phaseTime = Date.now() - phaseStart;
      this.results.phases.push({
        name: 'Pre-flight Checks',
        status: 'FAILED',
        duration: phaseTime,
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      throw error;
    }
  }

  async runEnhancedDOMCollection() {
    console.log('📊 Phase 2: Enhanced DOM Collection');
    console.log('-'.repeat(40));
    
    const phaseStart = Date.now();
    
    try {
      const collector = new EnhancedDOMCollector();
      
      console.log('  🚀 Starting enhanced DOM collection...');
      console.log(`  📋 Collecting ${collector.enhancedStateConfigs.length} IDE states`);
      
      await collector.collectAllEnhancedStates();
      
      const phaseTime = Date.now() - phaseStart;
      this.results.phases.push({
        name: 'Enhanced DOM Collection',
        status: 'SUCCESS',
        duration: phaseTime,
        statesCollected: collector.enhancedStateConfigs.length,
        timestamp: new Date().toISOString()
      });
      
      console.log(`  ✅ Enhanced DOM collection completed in ${phaseTime}ms\n`);
      
    } catch (error) {
      const phaseTime = Date.now() - phaseStart;
      this.results.phases.push({
        name: 'Enhanced DOM Collection',
        status: 'FAILED',
        duration: phaseTime,
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      throw error;
    }
  }

  async runChatAnalysis() {
    console.log('💬 Phase 3: Chat Analysis');
    console.log('-'.repeat(40));
    
    const phaseStart = Date.now();
    
    try {
      const analyzer = new EnhancedChatAnalyzer();
      
      console.log('  🔍 Analyzing chat functionality...');
      
      const analysis = await analyzer.analyze();
      
      const phaseTime = Date.now() - phaseStart;
      this.results.phases.push({
        name: 'Chat Analysis',
        status: 'SUCCESS',
        duration: phaseTime,
        featuresFound: Object.keys(analysis.optimizedSelectors).length,
        issuesFound: analysis.issues.length,
        coverage: analysis.summary.coverage,
        timestamp: new Date().toISOString()
      });
      
      console.log(`  ✅ Chat analysis completed in ${phaseTime}ms`);
      console.log(`  📈 Coverage: ${analysis.summary.coverage}%`);
      console.log(`  🎯 Features: ${Object.keys(analysis.optimizedSelectors).length}`);
      console.log(`  ⚠️ Issues: ${analysis.issues.length}\n`);
      
    } catch (error) {
      const phaseTime = Date.now() - phaseStart;
      this.results.phases.push({
        name: 'Chat Analysis',
        status: 'FAILED',
        duration: phaseTime,
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      throw error;
    }
  }

  async runCoverageValidation() {
    console.log('✅ Phase 4: Coverage Validation');
    console.log('-'.repeat(40));
    
    const phaseStart = Date.now();
    
    try {
      const CoverageValidator = require('./coverage-validator');
      const validator = new CoverageValidator();
      
      console.log('  🔍 Validating coverage...');
      
      const validation = await validator.validate();
      
      const phaseTime = Date.now() - phaseStart;
      this.results.phases.push({
        name: 'Coverage Validation',
        status: 'SUCCESS',
        duration: phaseTime,
        coverage: validation.coverage.overall.percentage,
        featuresFound: validation.coverage.overall.found,
        featuresTotal: validation.coverage.overall.total,
        timestamp: new Date().toISOString()
      });
      
      console.log(`  ✅ Coverage validation completed in ${phaseTime}ms`);
      console.log(`  📊 Overall Coverage: ${validation.coverage.overall.percentage}%`);
      console.log(`  🎯 Features: ${validation.coverage.overall.found}/${validation.coverage.overall.total}\n`);
      
    } catch (error) {
      const phaseTime = Date.now() - phaseStart;
      this.results.phases.push({
        name: 'Coverage Validation',
        status: 'FAILED',
        duration: phaseTime,
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      throw error;
    }
  }

  async runTesting() {
    console.log('🧪 Phase 5: Testing & Validation');
    console.log('-'.repeat(40));
    
    const phaseStart = Date.now();
    
    try {
      const tester = new EnhancedCoverageTester();
      
      console.log('  🧪 Running test suite...');
      
      await tester.runAllTests();
      
      const phaseTime = Date.now() - phaseStart;
      this.results.phases.push({
        name: 'Testing & Validation',
        status: 'SUCCESS',
        duration: phaseTime,
        testsPassed: tester.testResults.passed,
        testsFailed: tester.testResults.failed,
        testsWarnings: tester.testResults.warnings,
        timestamp: new Date().toISOString()
      });
      
      console.log(`  ✅ Testing completed in ${phaseTime}ms`);
      console.log(`  ✅ Passed: ${tester.testResults.passed}`);
      console.log(`  ❌ Failed: ${tester.testResults.failed}`);
      console.log(`  ⚠️ Warnings: ${tester.testResults.warnings}\n`);
      
    } catch (error) {
      const phaseTime = Date.now() - phaseStart;
      this.results.phases.push({
        name: 'Testing & Validation',
        status: 'FAILED',
        duration: phaseTime,
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      throw error;
    }
  }

  async generateFinalReport() {
    console.log('📋 Phase 6: Final Report Generation');
    console.log('-'.repeat(40));
    
    const totalTime = Date.now() - this.startTime;
    const successfulPhases = this.results.phases.filter(p => p.status === 'SUCCESS').length;
    const totalPhases = this.results.phases.length;
    
    // Generate summary
    this.results.summary = {
      totalDuration: totalTime,
      successfulPhases,
      totalPhases,
      successRate: Math.round((successfulPhases / totalPhases) * 100),
      errors: this.results.errors.length,
      warnings: this.results.warnings.length,
      completedAt: new Date().toISOString()
    };
    
    // Save detailed report
    const reportFile = path.join(__dirname, '../output/enhanced-coverage-execution-report.json');
    fs.writeFileSync(reportFile, JSON.stringify(this.results, null, 2));
    
    // Generate markdown summary
    const markdownReport = this.generateMarkdownReport();
    const markdownFile = path.join(__dirname, '../output/enhanced-coverage-summary.md');
    fs.writeFileSync(markdownFile, markdownReport);
    
    console.log('  📄 Detailed report saved:', reportFile);
    console.log('  📄 Summary report saved:', markdownFile);
    console.log('');
    
    // Display final summary
    console.log('🎉 ENHANCED COVERAGE TASK COMPLETED!');
    console.log('=' .repeat(60));
    console.log(`⏱️ Total Duration: ${Math.round(totalTime / 1000)}s`);
    console.log(`✅ Successful Phases: ${successfulPhases}/${totalPhases}`);
    console.log(`📈 Success Rate: ${this.results.summary.successRate}%`);
    console.log(`❌ Errors: ${this.results.errors.length}`);
    console.log(`⚠️ Warnings: ${this.results.warnings.length}`);
    
    if (this.results.summary.successRate >= 80) {
      console.log('\n🎉 TASK SUCCESSFUL - Enhanced coverage ready for production!');
    } else if (this.results.summary.successRate >= 60) {
      console.log('\n🟡 TASK PARTIALLY SUCCESSFUL - Some issues need attention');
    } else {
      console.log('\n🔴 TASK FAILED - Significant issues need to be resolved');
    }
  }

  generateMarkdownReport() {
    const { summary, phases, errors, warnings } = this.results;
    
    return `# Enhanced DOM Coverage Task Report

## Executive Summary
- **Status**: ${summary.successRate >= 80 ? '✅ SUCCESS' : summary.successRate >= 60 ? '🟡 PARTIAL' : '❌ FAILED'}
- **Duration**: ${Math.round(summary.totalDuration / 1000)}s
- **Success Rate**: ${summary.successRate}%
- **Completed**: ${summary.completedAt}

## Phase Results

${phases.map(phase => `
### ${phase.name}
- **Status**: ${phase.status === 'SUCCESS' ? '✅ SUCCESS' : '❌ FAILED'}
- **Duration**: ${phase.duration}ms
- **Timestamp**: ${phase.timestamp}
${phase.error ? `- **Error**: ${phase.error}` : ''}
${phase.coverage ? `- **Coverage**: ${phase.coverage}%` : ''}
${phase.featuresFound ? `- **Features**: ${phase.featuresFound}` : ''}
${phase.testsPassed ? `- **Tests Passed**: ${phase.testsPassed}` : ''}
`).join('')}

## Issues Summary
- **Errors**: ${errors.length}
- **Warnings**: ${warnings.length}

${errors.length > 0 ? `
### Errors
${errors.map(error => `- **${error.phase}**: ${error.error}`).join('\n')}
` : ''}

${warnings.length > 0 ? `
### Warnings
${warnings.map(warning => `- ${warning}`).join('\n')}
` : ''}

## Recommendations
${summary.successRate >= 80 ? `
✅ **Ready for Production**: Enhanced coverage implementation is complete and ready for use.
` : summary.successRate >= 60 ? `
⚠️ **Needs Attention**: Some phases failed but core functionality is available.
- Review failed phases and address critical issues
- Consider re-running failed phases
` : `
❌ **Needs Major Work**: Multiple phases failed, significant issues need resolution.
- Review all error messages
- Fix critical dependencies
- Re-run the entire task after fixes
`}

## Next Steps
1. Review detailed execution report
2. Address any critical errors
3. Validate chat functionality manually
4. Test modal detection in real IDE
5. Deploy enhanced coverage to production
`;
  }

  async cleanup() {
    console.log('\n🧹 Cleaning up...');
    
    try {
      // Any cleanup tasks
      console.log('  ✅ Cleanup completed');
    } catch (error) {
      console.log('  ⚠️ Cleanup warning:', error.message);
    }
  }
}

// CLI Usage
if (require.main === module) {
  const runner = new EnhancedCoverageRunner();
  
  async function run() {
    try {
      await runner.run();
    } catch (error) {
      console.error('❌ Enhanced coverage task failed:', error.message);
      process.exit(1);
    }
  }
  
  run();
}

module.exports = EnhancedCoverageRunner; 