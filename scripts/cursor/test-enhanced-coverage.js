const fs = require('fs');
const path = require('path');
const EnhancedDOMCollector = require('./enhanced-dom-collector');
const EnhancedChatAnalyzer = require('./enhanced-chat-analyzer');

const Logger = require('@logging/Logger');

const logger = new Logger('ServiceName');

class EnhancedCoverageTester {
  constructor() {
    this.testResults = {
      passed: 0,
      failed: 0,
      warnings: 0,
      details: []
    };
  }

  async runAllTests() {
    logger.info('🧪 Enhanced Coverage Testing Suite\n');
    logger.info('=' .repeat(50));

    try {
      // Test 1: Enhanced DOM Collection
      await this.testEnhancedDOMCollection();
      
      // Test 2: Chat Analysis
      await this.testChatAnalysis();
      
      // Test 3: Coverage Validation
      await this.testCoverageValidation();
      
      // Test 4: Selector Generation
      await this.testSelectorGeneration();
      
      // Test 5: Integration Test
      await this.testIntegration();
      
      // Generate test report
      this.generateTestReport();
      
    } catch (error) {
      console.error('❌ Test suite failed:', error.message);
      this.testResults.failed++;
    }
  }

  async testEnhancedDOMCollection() {
    logger.info('\n📊 Test 1: Enhanced DOM Collection');
    
    try {
      const collector = new EnhancedDOMCollector();
      
      // Test initialization
      const initialized = await collector.initialize();
      if (initialized) {
        this.addTestResult('Enhanced DOM Collector Initialization', 'PASSED');
      } else {
        this.addTestResult('Enhanced DOM Collector Initialization', 'FAILED');
        return;
      }
      
      // Test state configuration
      const stateCount = collector.enhancedStateConfigs.length;
      if (stateCount >= 25) {
        this.addTestResult(`State Configuration (${stateCount} states)`, 'PASSED');
      } else {
        this.addTestResult(`State Configuration (${stateCount} states)`, 'WARNING', `Expected 25+, got ${stateCount}`);
      }
      
      // Test modal states
      const modalStates = collector.enhancedStateConfigs.filter(config => 
        config.name.includes('modal')
      ).length;
      
      if (modalStates >= 8) {
        this.addTestResult(`Modal States (${modalStates} modals)`, 'PASSED');
      } else {
        this.addTestResult(`Modal States (${modalStates} modals)`, 'WARNING', `Expected 8+, got ${modalStates}`);
      }
      
      // Test chat states
      const chatStates = collector.enhancedStateConfigs.filter(config => 
        config.name.includes('chat')
      ).length;
      
      if (chatStates >= 5) {
        this.addTestResult(`Chat States (${chatStates} chat states)`, 'PASSED');
      } else {
        this.addTestResult(`Chat States (${chatStates} chat states)`, 'WARNING', `Expected 5+, got ${chatStates}`);
      }
      
      await collector.cleanup();
      
    } catch (error) {
      this.addTestResult('Enhanced DOM Collection', 'FAILED', error.message);
    }
  }

  async testChatAnalysis() {
    logger.info('\n💬 Test 2: Chat Analysis');
    
    try {
      const analyzer = new EnhancedChatAnalyzer();
      
      // Test analyzer initialization
      if (analyzer.results) {
        this.addTestResult('Chat Analyzer Initialization', 'PASSED');
      } else {
        this.addTestResult('Chat Analyzer Initialization', 'FAILED');
        return;
      }
      
      // Test feature detection methods
      const testDocument = new (require('jsdom').JSDOM)('').window.document;
      const testElement = testDocument.createElement('button');
      testElement.setAttribute('aria-label', 'New Chat (Ctrl+N)');
      testElement.className = 'codicon-add-two';
      
      const selector = analyzer.generateChatSelector(testElement);
      if (selector && selector.includes('aria-label')) {
        this.addTestResult('Chat Selector Generation', 'PASSED');
      } else {
        this.addTestResult('Chat Selector Generation', 'FAILED', 'Generated selector: ' + selector);
      }
      
      // Test severity classification
      const severity = analyzer.getFeatureSeverity('newChatButton');
      if (severity === 'CRITICAL') {
        this.addTestResult('Feature Severity Classification', 'PASSED');
      } else {
        this.addTestResult('Feature Severity Classification', 'FAILED', `Expected CRITICAL, got ${severity}`);
      }
      
    } catch (error) {
      this.addTestResult('Chat Analysis', 'FAILED', error.message);
    }
  }

  async testCoverageValidation() {
    logger.info('\n✅ Test 3: Coverage Validation');
    
    try {
      const CoverageValidator = require('./coverage-validator');
      const validator = new CoverageValidator();
      
      // Test validator initialization
      if (validator.requiredFeatures) {
        this.addTestResult('Coverage Validator Initialization', 'PASSED');
      } else {
        this.addTestResult('Coverage Validator Initialization', 'FAILED');
        return;
      }
      
      // Test required features count
      const totalFeatures = Object.values(validator.requiredFeatures).flat().length;
      if (totalFeatures >= 40) {
        this.addTestResult(`Required Features (${totalFeatures} features)`, 'PASSED');
      } else {
        this.addTestResult(`Required Features (${totalFeatures} features)`, 'WARNING', `Expected 40+, got ${totalFeatures}`);
      }
      
      // Test chat features
      const chatFeatures = validator.requiredFeatures.chat || [];
      if (chatFeatures.length >= 8) {
        this.addTestResult(`Chat Features (${chatFeatures.length} features)`, 'PASSED');
      } else {
        this.addTestResult(`Chat Features (${chatFeatures.length} features)`, 'WARNING', `Expected 8+, got ${chatFeatures.length}`);
      }
      
      // Test modal features (should be added)
      const modalFeatures = validator.requiredFeatures.modals || [];
      if (modalFeatures.length >= 5) {
        this.addTestResult(`Modal Features (${modalFeatures.length} features)`, 'PASSED');
      } else {
        this.addTestResult(`Modal Features (${modalFeatures.length} features)`, 'WARNING', `Expected 5+, got ${modalFeatures.length}`);
      }
      
    } catch (error) {
      this.addTestResult('Coverage Validation', 'FAILED', error.message);
    }
  }

  async testSelectorGeneration() {
    logger.info('\n🔧 Test 4: Selector Generation');
    
    try {
      const SelectorGenerator = require('./selector-generator');
      const generator = new SelectorGenerator();
      
      // Test generator initialization
      if (generator.outputDir) {
        this.addTestResult('Selector Generator Initialization', 'PASSED');
      } else {
        this.addTestResult('Selector Generator Initialization', 'FAILED');
        return;
      }
      
      // Test selector file generation
      const testSelectors = {
        newChat: '[aria-label*="New Chat"]',
        chatInput: '.aislash-editor-input',
        aiMessages: '.anysphere-markdown-container-root'
      };
      
      const selectorContent = generator.generateSelectorsFile(testSelectors);
      if (selectorContent.includes('CURSOR_SELECTORS') && selectorContent.includes('newChat')) {
        this.addTestResult('Selector File Generation', 'PASSED');
      } else {
        this.addTestResult('Selector File Generation', 'FAILED');
      }
      
      // Test CursorIDE class generation
      const cursorClassContent = generator.generateCursorIDEClass(testSelectors);
      if (cursorClassContent.includes('class CursorIDE') && cursorClassContent.includes('startNewChat')) {
        this.addTestResult('CursorIDE Class Generation', 'PASSED');
      } else {
        this.addTestResult('CursorIDE Class Generation', 'FAILED');
      }
      
    } catch (error) {
      this.addTestResult('Selector Generation', 'FAILED', error.message);
    }
  }

  async testIntegration() {
    logger.info('\n🔗 Test 5: Integration Test');
    
    try {
      // Test file structure
      const requiredFiles = [
        'scripts/enhanced-dom-collector.js',
        'scripts/enhanced-chat-analyzer.js',
        'scripts/coverage-validator.js',
        'scripts/selector-generator.js'
      ];
      
      let allFilesExist = true;
      for (const file of requiredFiles) {
        if (!fs.existsSync(path.join(__dirname, '..', file))) {
          this.addTestResult(`File Exists: ${file}`, 'FAILED');
          allFilesExist = false;
        }
      }
      
      if (allFilesExist) {
        this.addTestResult('Required Files Structure', 'PASSED');
      }
      
      // Test output directories
      const outputDirs = [
        '../output/enhanced-collected',
        '../output/chat-analysis',
        '../generated'
      ];
      
      let allDirsExist = true;
      for (const dir of outputDirs) {
        const dirPath = path.join(__dirname, dir);
        if (!fs.existsSync(dirPath)) {
          try {
            fs.mkdirSync(dirPath, { recursive: true });
            this.addTestResult(`Output Directory: ${dir}`, 'PASSED', 'Created');
          } catch (e) {
            this.addTestResult(`Output Directory: ${dir}`, 'FAILED', e.message);
            allDirsExist = false;
          }
        } else {
          this.addTestResult(`Output Directory: ${dir}`, 'PASSED');
        }
      }
      
      // Test analysis file structure
      const analysisFile = path.join(__dirname, '../output/dom-analysis-results.json');
      if (fs.existsSync(analysisFile)) {
        try {
          const analysis = JSON.parse(fs.readFileSync(analysisFile, 'utf8'));
          if (analysis.optimizedSelectors && analysis.meta) {
            this.addTestResult('Analysis File Structure', 'PASSED');
          } else {
            this.addTestResult('Analysis File Structure', 'WARNING', 'Missing required fields');
          }
        } catch (e) {
          this.addTestResult('Analysis File Structure', 'FAILED', 'Invalid JSON');
        }
      } else {
        this.addTestResult('Analysis File Structure', 'WARNING', 'File not found');
      }
      
    } catch (error) {
      this.addTestResult('Integration Test', 'FAILED', error.message);
    }
  }

  addTestResult(testName, status, details = '') {
    const result = {
      test: testName,
      status,
      details,
      timestamp: new Date().toISOString()
    };
    
    this.testResults.details.push(result);
    
    switch (status) {
      case 'PASSED':
        this.testResults.passed++;
        logger.info(`  ✅ ${testName}`);
        break;
      case 'FAILED':
        this.testResults.failed++;
        logger.info(`  ❌ ${testName}${details ? `: ${details}` : ''}`);
        break;
      case 'WARNING':
        this.testResults.warnings++;
        logger.info(`  ⚠️ ${testName}${details ? `: ${details}` : ''}`);
        break;
    }
  }

  generateTestReport() {
    logger.info('\n' + '='.repeat(50));
    logger.info('📊 TEST RESULTS SUMMARY');
    logger.info('='.repeat(50));
    
    const total = this.testResults.passed + this.testResults.failed + this.testResults.warnings;
    const successRate = total > 0 ? Math.round((this.testResults.passed / total) * 100) : 0;
    
    logger.info(`✅ Passed: ${this.testResults.passed}`);
    logger.info(`❌ Failed: ${this.testResults.failed}`);
    logger.info(`⚠️ Warnings: ${this.testResults.warnings}`);
    logger.info(`📈 Success Rate: ${successRate}%`);
    
    if (this.testResults.failed > 0) {
      logger.info('\n❌ FAILED TESTS:');
      this.testResults.details
        .filter(result => result.status === 'FAILED')
        .forEach(result => {
          logger.info(`  - ${result.test}: ${result.details}`);
        });
    }
    
    if (this.testResults.warnings > 0) {
      logger.info('\n⚠️ WARNINGS:');
      this.testResults.details
        .filter(result => result.status === 'WARNING')
        .forEach(result => {
          logger.info(`  - ${result.test}: ${result.details}`);
        });
    }
    
    // Save detailed report
    const reportFile = path.join(__dirname, '../output/enhanced-coverage-test-report.json');
    fs.writeFileSync(reportFile, JSON.stringify(this.testResults, null, 2));
    logger.info(`\n📄 Detailed report saved: ${reportFile}`);
    
    // Overall assessment
    if (this.testResults.failed === 0 && successRate >= 80) {
      logger.info('\n🎉 ENHANCED COVERAGE READY FOR PRODUCTION!');
    } else if (this.testResults.failed === 0) {
      logger.info('\n🟡 ENHANCED COVERAGE READY WITH WARNINGS');
    } else {
      logger.info('\n🔴 ENHANCED COVERAGE NEEDS FIXES');
    }
  }
}

// CLI Usage
if (require.main === module) {
  const tester = new EnhancedCoverageTester();
  
  async function run() {
    try {
      await tester.runAllTests();
    } catch (error) {
      console.error('❌ Test suite failed:', error.message);
      process.exit(1);
    }
  }
  
  run();
}

module.exports = EnhancedCoverageTester; 