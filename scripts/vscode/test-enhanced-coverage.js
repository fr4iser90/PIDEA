const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

class TestEnhancedCoverage {
  constructor() {
    this.results = {
      tests: {},
      coverage: {},
      issues: [],
      recommendations: []
    };
    
    this.outputDir = path.join(__dirname, '../output/test-coverage');
    this.ensureOutputDir();
  }

  ensureOutputDir() {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
      console.log(`📁 Created VSCode test coverage directory: ${this.outputDir}`);
    }
  }

  // Load all available DOM files for comprehensive testing
  loadAllDOMFiles() {
    const sources = {};
    
    // Try enhanced collection first
    const enhancedPath = path.join(__dirname, '../output/enhanced-collected');
    if (fs.existsSync(enhancedPath)) {
      const enhancedFiles = fs.readdirSync(enhancedPath)
        .filter(file => file.endsWith('.md') && !file.includes('collection-report'));
      
      enhancedFiles.forEach(file => {
        const content = fs.readFileSync(path.join(enhancedPath, file), 'utf8');
        const htmlContent = this.extractHTML(content);
        sources[`enhanced-${file}`] = htmlContent;
      });
      
      console.log(`📁 Enhanced VSCode collection: ${enhancedFiles.length} files`);
    }
    
    // Fallback to auto collection
    const autoPath = path.join(__dirname, '../output/auto-collected');
    if (fs.existsSync(autoPath)) {
      const autoFiles = fs.readdirSync(autoPath)
        .filter(file => file.endsWith('.md') && !file.includes('collection-report'));
      
      autoFiles.forEach(file => {
        const content = fs.readFileSync(path.join(autoPath, file), 'utf8');
        const htmlContent = this.extractHTML(content);
        sources[`auto-${file}`] = htmlContent;
      });
      
      console.log(`📁 Auto VSCode collection: ${autoFiles.length} files`);
    }
    
    if (Object.keys(sources).length === 0) {
      throw new Error('No VSCode DOM files found for testing!');
    }
    
    console.log(`📄 Total VSCode DOM files for testing: ${Object.keys(sources).length}`);
    return sources;
  }

  extractHTML(content) {
    let htmlContent = '';
    
    // Extract HTML blocks from markdown files
    const htmlBlocks = content.match(/```html([\s\S]*?)```/g);
    if (htmlBlocks) {
      htmlContent += htmlBlocks.map(block => 
        block.replace(/```html\n?/, '').replace(/\n?```/, '')
      ).join('\n');
    }
    
    return htmlContent.trim();
  }

  async testEnhancedCoverage() {
    console.log('🧪 VSCode Enhanced Coverage Testing starting...\n');

    try {
      // 1. Load all DOM files
      const sources = this.loadAllDOMFiles();
      
      // 2. Define comprehensive VSCode test scenarios
      const testScenarios = this.defineVSCodeTestScenarios();
      
      // 3. Run tests across all sources
      const testResults = this.runVSCodeTests(sources, testScenarios);
      
      // 4. Generate comprehensive test report
      const report = this.generateTestReport(testResults);
      
      // 5. Save results
      this.saveResults(report);
      
      // 6. Generate actionable recommendations
      this.generateTestRecommendations(testResults);

      console.log('\n📊 VSCode ENHANCED COVERAGE TESTING COMPLETED!');
      console.log(`📁 Output: ${this.outputDir}`);
      console.log(`🧪 Tests Run: ${report.summary.totalTests}`);
      console.log(`✅ Passed: ${report.summary.passedTests}`);
      console.log(`❌ Failed: ${report.summary.failedTests}`);
      console.log(`📈 Coverage Score: ${report.summary.coverageScore}%`);

      return report;

    } catch (error) {
      console.error('❌ VSCode enhanced coverage testing failed:', error.message);
      throw error;
    }
  }

  defineVSCodeTestScenarios() {
    return {
      // === CRITICAL VSCode CHAT TESTS ===
      critical: {
        newChatButton: {
          description: 'VSCode New Chat button should be present and clickable',
          selectors: [
            '[aria-label*="New Chat"]',
            '[title*="New Chat"]',
            '.codicon-add-two',
            '.action-label[aria-label*="New"]',
            'button[aria-label*="New Chat"]',
            'a[aria-label*="New Chat"]',
            '.new-chat-button',
            '[data-testid*="new-chat"]'
          ],
          required: true,
          testType: 'presence'
        },
        
        chatInput: {
          description: 'VSCode Chat input field should be present and focusable',
          selectors: [
            'textarea[data-testid="chat-input"]',
            'textarea[placeholder*="Type your task"]',
            '.aislash-editor-input[contenteditable="true"]',
            '[contenteditable="true"]',
            'textarea[placeholder*="chat"]',
            '.chat-input',
            '[data-testid*="chat-input"]'
          ],
          required: true,
          testType: 'presence'
        },
        
        sendButton: {
          description: 'VSCode Send button should be present and clickable',
          selectors: [
            '.codicon-send',
            '.action-label[aria-label*="Send"]',
            '.chat-execute-toolbar .codicon-send',
            '.monaco-action-bar .codicon-send',
            '[aria-label*="Send Message"]',
            '.chat-send-button'
          ],
          required: true,
          testType: 'presence'
        },
        
        commandPalette: {
          description: 'VSCode Command Palette should be accessible',
          selectors: [
            '.quick-input-widget',
            '.monaco-quick-input',
            '[role="dialog"]',
            '.monaco-overlay'
          ],
          required: true,
          testType: 'modal'
        }
      },
      
      // === IMPORTANT VSCode FEATURE TESTS ===
      important: {
        fileExplorer: {
          description: 'VSCode File Explorer should be present',
          selectors: [
            '.explorer-viewlet',
            '[id*="explorer"]',
            '.pane[aria-label*="Explorer"]',
            '.monaco-pane-view .pane'
          ],
          required: false,
          testType: 'presence'
        },
        
        editor: {
          description: 'VSCode Editor should be present',
          selectors: [
            '.monaco-editor',
            '.editor-instance',
            '.view-lines',
            '.monaco-editor-background'
          ],
          required: false,
          testType: 'presence'
        },
        
        terminal: {
          description: 'VSCode Terminal should be accessible',
          selectors: [
            '.terminal-wrapper',
            '.xterm-screen',
            '.integrated-terminal'
          ],
          required: false,
          testType: 'presence'
        },
        
        search: {
          description: 'VSCode Global Search should be accessible',
          selectors: [
            '.search-viewlet',
            '[id*="search"]',
            '.search-input',
            '.search-view'
          ],
          required: false,
          testType: 'presence'
        },
        
        git: {
          description: 'VSCode Git Source Control should be accessible',
          selectors: [
            '.scm-viewlet',
            '[id*="scm"]',
            '.scm-resource',
            '.source-control-view'
          ],
          required: false,
          testType: 'presence'
        },
        
        extensions: {
          description: 'VSCode Extensions Panel should be accessible',
          selectors: [
            '.extensions-viewlet',
            '[id*="extensions"]',
            '.extensions-search',
            '.extensions-view'
          ],
          required: false,
          testType: 'presence'
        },
        
        debug: {
          description: 'VSCode Debug Panel should be accessible',
          selectors: [
            '.debug-viewlet',
            '[id*="debug"]',
            '.codicon-debug-alt',
            '.debug-view'
          ],
          required: false,
          testType: 'presence'
        }
      },
      
      // === ENHANCED VSCode FEATURE TESTS ===
      enhanced: {
        userMessages: {
          description: 'VSCode User Messages should be present',
          selectors: [
            '.user-message',
            '.human-message',
            '.aislash-editor-input-readonly',
            'div.composer-human-message',
            '[data-role="user"]',
            '.message.user'
          ],
          required: false,
          testType: 'presence'
        },
        
        aiMessages: {
          description: 'VSCode AI Messages should be present',
          selectors: [
            '.ai-message',
            '.assistant-message',
            '.anysphere-markdown-container-root',
            'span.anysphere-markdown-container-root',
            '[data-role="assistant"]',
            '.message.assistant'
          ],
          required: false,
          testType: 'presence'
        },
        
        chatHistory: {
          description: 'VSCode Chat History should be accessible',
          selectors: [
            '[aria-label*="Chat History"]',
            '[aria-label*="Show Chat History"]',
            '.chat-history',
            '.chat-history-button',
            '[data-testid*="chat-history"]'
          ],
          required: false,
          testType: 'presence'
        },
        
        chatSettings: {
          description: 'VSCode Chat Settings should be accessible',
          selectors: [
            '[aria-label="Settings"]',
            '.chat-settings',
            '.settings-button',
            '[data-testid*="settings"]'
          ],
          required: false,
          testType: 'presence'
        },
        
        contextMenu: {
          description: 'VSCode Context Menu should be accessible',
          selectors: [
            '.monaco-menu',
            '.context-menu',
            '[role="menu"]',
            '.dropdown-menu'
          ],
          required: false,
          testType: 'presence'
        },
        
        notification: {
          description: 'VSCode Notification Overlay should be accessible',
          selectors: [
            '.monaco-notification-overlay',
            '.notification-overlay',
            '.monaco-overlay',
            '.notification-modal'
          ],
          required: false,
          testType: 'presence'
        },
        
        breadcrumbs: {
          description: 'VSCode Breadcrumbs should be present',
          selectors: [
            '.breadcrumbs',
            '.breadcrumb-item'
          ],
          required: false,
          testType: 'presence'
        },
        
        statusBar: {
          description: 'VSCode Status Bar should be present',
          selectors: [
            '.statusbar',
            '.monaco-workbench .part.statusbar'
          ],
          required: false,
          testType: 'presence'
        }
      }
    };
  }

  runVSCodeTests(sources, testScenarios) {
    console.log('🧪 Running VSCode feature tests across all sources...');
    
    const results = {
      tests: {},
      coverage: {},
      summary: {
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        criticalTests: 0,
        importantTests: 0,
        enhancedTests: 0
      }
    };
    
    // Run tests for each category
    Object.entries(testScenarios).forEach(([category, scenarios]) => {
      Object.entries(scenarios).forEach(([testName, testDef]) => {
        const testResult = this.runSingleVSCodeTest(sources, testName, testDef);
        
        results.tests[testName] = testResult;
        results.summary.totalTests++;
        
        if (testResult.passed) {
          results.summary.passedTests++;
        } else {
          results.summary.failedTests++;
        }
        
        // Track by category
        if (category === 'critical') {
          results.summary.criticalTests++;
        } else if (category === 'important') {
          results.summary.importantTests++;
        } else if (category === 'enhanced') {
          results.summary.enhancedTests++;
        }
      });
    });
    
    // Calculate coverage
    results.coverage = this.calculateVSCodeCoverage(results.tests);
    
    console.log(`  ✅ Passed: ${results.summary.passedTests} VSCode tests`);
    console.log(`  ❌ Failed: ${results.summary.failedTests} VSCode tests`);
    console.log(`  📊 Coverage: ${results.coverage.overall}%`);
    
    return results;
  }

  runSingleVSCodeTest(sources, testName, testDef) {
    const result = {
      name: testName,
      description: testDef.description,
      required: testDef.required,
      testType: testDef.testType,
      passed: false,
      found: false,
      sources: [],
      bestSelector: null,
      error: null
    };
    
    try {
      // Test each selector across all sources
      const foundSelectors = [];
      
      testDef.selectors.forEach(selector => {
        Object.entries(sources).forEach(([sourceName, htmlContent]) => {
          try {
            const dom = new JSDOM(htmlContent);
            const document = dom.window.document;
            
            const elements = document.querySelectorAll(selector);
            if (elements.length > 0) {
              foundSelectors.push({
                selector: selector,
                source: sourceName,
                count: elements.length,
                element: this.getElementInfo(elements[0])
              });
              
              if (!result.sources.includes(sourceName)) {
                result.sources.push(sourceName);
              }
            }
          } catch (error) {
            // Invalid selector or HTML, continue
          }
        });
      });
      
      // Determine test result
      if (foundSelectors.length > 0) {
        result.found = true;
        result.passed = true;
        result.bestSelector = this.selectBestTestSelector(foundSelectors);
      } else {
        result.found = false;
        result.passed = !testDef.required; // Only fail if required
        if (testDef.required) {
          result.error = `Required VSCode feature not found: ${testName}`;
        }
      }
      
    } catch (error) {
      result.error = error.message;
      result.passed = !testDef.required;
    }
    
    return result;
  }

  getElementInfo(element) {
    return {
      tagName: element.tagName,
      className: element.className,
      id: element.id,
      ariaLabel: element.getAttribute('aria-label'),
      role: element.getAttribute('role'),
      contentEditable: element.getAttribute('contenteditable')
    };
  }

  selectBestTestSelector(foundSelectors) {
    if (foundSelectors.length === 0) return null;
    
    // Prioritize selectors: ID > specific aria-label > class > tag
    const prioritized = foundSelectors.sort((a, b) => {
      // IDs have highest priority
      if (a.selector.startsWith('#')) return -1;
      if (b.selector.startsWith('#')) return 1;
      
      // Specific aria-labels have priority
      if (a.selector.includes('aria-label="') && b.selector.includes('aria-label*=')) return -1;
      if (b.selector.includes('aria-label="') && a.selector.includes('aria-label*=')) return 1;
      
      // Classes have priority over tags
      if (a.selector.startsWith('.') && !b.selector.startsWith('.')) return -1;
      if (b.selector.startsWith('.') && !a.selector.startsWith('.')) return 1;
      
      // Shorter selectors are preferred
      return a.selector.length - b.selector.length;
    });
    
    return prioritized[0].selector;
  }

  calculateVSCodeCoverage(tests) {
    const totalTests = Object.keys(tests).length;
    const passedTests = Object.values(tests).filter(t => t.passed).length;
    const criticalTests = Object.values(tests).filter(t => t.required).length;
    const passedCriticalTests = Object.values(tests).filter(t => t.required && t.passed).length;
    
    return {
      overall: Math.round((passedTests / totalTests) * 100),
      critical: criticalTests > 0 ? Math.round((passedCriticalTests / criticalTests) * 100) : 100,
      totalTests: totalTests,
      passedTests: passedTests,
      failedTests: totalTests - passedTests,
      criticalTests: criticalTests,
      passedCriticalTests: passedCriticalTests
    };
  }

  generateTestReport(testResults) {
    const report = {
      meta: {
        generatedAt: new Date().toISOString(),
        script: 'test-enhanced-coverage.js',
        totalTests: testResults.summary.totalTests,
        passedTests: testResults.summary.passedTests,
        failedTests: testResults.summary.failedTests
      },
      results: testResults,
      summary: {
        totalTests: testResults.summary.totalTests,
        passedTests: testResults.summary.passedTests,
        failedTests: testResults.summary.failedTests,
        coverageScore: testResults.coverage.overall,
        criticalCoverage: testResults.coverage.critical,
        status: testResults.coverage.overall >= 90 ? 'EXCELLENT' :
                testResults.coverage.overall >= 75 ? 'GOOD' :
                testResults.coverage.overall >= 50 ? 'FAIR' : 'POOR',
        readyForAutomation: testResults.coverage.critical === 100
      },
      recommendations: []
    };
    
    // Generate recommendations based on test results
    this.generateTestRecommendations(testResults, report);
    
    return report;
  }

  generateTestRecommendations(testResults, report) {
    // Failed critical tests
    const failedCritical = Object.entries(testResults.tests)
      .filter(([name, test]) => test.required && !test.passed);
    
    if (failedCritical.length > 0) {
      report.recommendations.push({
        priority: 'CRITICAL',
        title: 'Fix Failed Critical VSCode Tests',
        description: `${failedCritical.length} critical VSCode tests failed`,
        tests: failedCritical.map(([name, test]) => ({
          name: name,
          description: test.description,
          error: test.error
        })),
        actions: [
          'Collect additional VSCode DOM states',
          'Update selectors for VSCode version',
          'Implement dynamic feature detection',
          'Add fallback selectors'
        ]
      });
    }
    
    // Failed important tests
    const failedImportant = Object.entries(testResults.tests)
      .filter(([name, test]) => !test.required && !test.passed);
    
    if (failedImportant.length > 0) {
      report.recommendations.push({
        priority: 'IMPORTANT',
        title: 'Address Failed Important VSCode Tests',
        description: `${failedImportant.length} important VSCode tests failed`,
        tests: failedImportant.map(([name, test]) => ({
          name: name,
          description: test.description,
          error: test.error
        })),
        actions: [
          'Collect specific VSCode panel states',
          'Add panel-specific selectors',
          'Implement panel activation strategies'
        ]
      });
    }
    
    // Coverage improvement suggestions
    if (report.summary.coverageScore < 90) {
      report.recommendations.push({
        priority: 'ENHANCEMENT',
        title: 'Improve VSCode Test Coverage',
        description: `Current coverage: ${report.summary.coverageScore}% (target: 90%+)`,
        actions: [
          'Run enhanced DOM collection',
          'Add missing VSCode test scenarios',
          'Implement comprehensive modal testing',
          'Add context menu and notification tests'
        ]
      });
    }
  }

  saveResults(report) {
    const outputFile = path.join(this.outputDir, 'vscode-test-coverage.json');
    fs.writeFileSync(outputFile, JSON.stringify(report, null, 2));
    
    // Also save a summary report
    const summaryFile = path.join(this.outputDir, 'vscode-test-coverage-summary.md');
    const summary = this.generateSummaryReport(report);
    fs.writeFileSync(summaryFile, summary);
    
    console.log(`📄 VSCode test coverage saved: ${outputFile}`);
    console.log(`📄 VSCode test summary saved: ${summaryFile}`);
  }

  generateSummaryReport(report) {
    const { summary, results } = report;
    
    return `# VSCode Enhanced Coverage Test Summary

## Overview
- **Generated**: ${report.meta.generatedAt}
- **Coverage Score**: ${summary.coverageScore}% (${summary.status})
- **Total Tests**: ${summary.totalTests}
- **Passed Tests**: ${summary.passedTests}
- **Failed Tests**: ${summary.failedTests}
- **Critical Coverage**: ${summary.criticalCoverage}%
- **Ready for Automation**: ${summary.readyForAutomation ? '✅ YES' : '❌ NO'}

## Test Results by Category

### Critical Tests (Required)
${Object.entries(results.tests).filter(([name, test]) => test.required).map(([name, test]) => 
  `- ${test.passed ? '✅' : '❌'} **${name}**: ${test.description}${test.bestSelector ? ` (\`${test.bestSelector}\`)` : ''}`
).join('\n')}

### Important Tests
${Object.entries(results.tests).filter(([name, test]) => !test.required && !test.passed).map(([name, test]) => 
  `- ❌ **${name}**: ${test.description}`
).join('\n')}

### Enhanced Tests
${Object.entries(results.tests).filter(([name, test]) => !test.required && test.passed).map(([name, test]) => 
  `- ✅ **${name}**: ${test.description} (\`${test.bestSelector}\`)`
).join('\n')}

## Failed Tests
${Object.entries(results.tests).filter(([name, test]) => !test.passed).map(([name, test]) => 
  `- ❌ **${name}**: ${test.error || 'Feature not found'}`
).join('\n')}

## Recommendations
${report.recommendations.map(rec => 
  `- **${rec.priority}**: ${rec.title} - ${rec.description}`
).join('\n')}

## Next Steps
1. Address critical test failures first
2. Implement recommended collection strategies
3. Run enhanced DOM collection
4. Re-run tests to validate improvements
`;
  }
}

// CLI Usage
if (require.main === module) {
  const tester = new TestEnhancedCoverage();
  
  async function run() {
    try {
      await tester.testEnhancedCoverage();
    } catch (error) {
      console.error('❌ VSCode enhanced coverage testing failed:', error.message);
      process.exit(1);
    }
  }
  
  run();
}

module.exports = TestEnhancedCoverage; 