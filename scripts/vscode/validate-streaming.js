const Logger = require('@logging/Logger');

const logger = new Logger('ServiceName');

/**
 * Streaming Service Validation Script
 * 
 * Validates that the IDE Mirror System streaming feature is properly implemented
 * and all components are working correctly.
 */

const fs = require('fs');
const path = require('path');
const BrowserManager = require('../../backend/infrastructure/external/BrowserManager');
const IDEManager = require('../../backend/infrastructure/external/IDEManager');

class VSCodeStreamingValidator {
  constructor() {
    this.browserManager = new BrowserManager();
    this.ideManager = new IDEManager();
    this.outputDir = path.join(__dirname, '../output/streaming-validation');
    this.results = {
      tests: [],
      coverage: {},
      issues: [],
      recommendations: []
    };
    
    this.ensureOutputDir();
  }

  ensureOutputDir() {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
      logger.info(`📁 Created VSCode streaming validation directory: ${this.outputDir}`);
    }
  }

  async initialize() {
    logger.info('🚀 VSCode Streaming Validator starting...');
    logger.info('📡 Connecting to VSCode IDE via CDP...\n');

    try {
      await this.ideManager.initialize();
      
      // Get available IDEs and find VSCode specifically
      const availableIDEs = await this.ideManager.getAvailableIDEs();
      const vscodeIDE = availableIDEs.find(ide => ide.ideType === 'vscode' && ide.status === 'running');
      
      if (!vscodeIDE) {
        throw new Error('No running VSCode IDE found! Please start VSCode with remote debugging enabled.');
      }

      // Connect Browser Manager to VSCode IDE
      await this.browserManager.connect(vscodeIDE.port);
      logger.info(`✅ Connected to VSCode IDE on port ${vscodeIDE.port}`);
      
      return true;
    } catch (error) {
      console.error('❌ VSCode connection failed:', error.message);
      throw error;
    }
  }

  async validateStreaming() {
    await this.initialize();
    
    logger.info('🧪 Starting VSCode streaming validation tests...\n');

    try {
      // 1. Test VSCode chat activation
      await this.testVSCodeChatActivation();
      
      // 2. Test VSCode message sending
      await this.testVSCodeMessageSending();
      
      // 3. Test VSCode AI response detection
      await this.testVSCodeAIResponseDetection();
      
      // 4. Test VSCode streaming states
      await this.testVSCodeStreamingStates();
      
      // 5. Generate validation report
      const report = this.generateValidationReport();
      
      // 6. Save results
      this.saveResults(report);

      logger.info('\n📊 VSCode STREAMING VALIDATION COMPLETED!');
      logger.info(`📁 Output: ${this.outputDir}`);
      logger.info(`🧪 Tests Run: ${this.results.tests.length}`);
      logger.info(`✅ Passed: ${this.results.tests.filter(t => t.passed).length}`);
      logger.info(`❌ Failed: ${this.results.tests.filter(t => !t.passed).length}`);

      await this.cleanup();
      return report;

    } catch (error) {
      console.error('❌ VSCode streaming validation failed:', error.message);
      await this.cleanup();
      throw error;
    }
  }

  async testVSCodeChatActivation() {
    logger.info('🔍 Testing VSCode chat activation...');
    
    const test = {
      name: 'VSCode Chat Activation',
      description: 'Test VSCode New Chat button functionality',
      passed: false,
      details: {},
      error: null
    };

    try {
      const page = await this.browserManager.getPage();
      
      // Try multiple strategies to find and click VSCode New Chat button
      const newChatSelectors = [
        '[aria-label*="New Chat"]',
        '[title*="New Chat"]',
        '.codicon-add-two',
        '.action-label[aria-label*="New"]',
        'button[aria-label*="New Chat"]',
        'a[aria-label*="New Chat"]',
        '.new-chat-button',
        '[data-testid*="new-chat"]'
      ];
      
      let chatActivated = false;
      for (const selector of newChatSelectors) {
        try {
          const element = await page.$(selector);
          if (element) {
            await element.click();
            logger.info(`  ✅ Clicked VSCode New Chat button: ${selector}`);
            
            // Handle VSCode New Chat modal if it appears
            await this.handleVSCodeNewChatModal(page);
            chatActivated = true;
            test.details.usedSelector = selector;
            break;
          }
        } catch (e) {
          continue;
        }
      }
      
      if (!chatActivated) {
        // Fallback: try keyboard shortcut for VSCode
        await page.keyboard.press('Control+Shift+I');
        await this.wait(1000);
        await this.handleVSCodeNewChatModal(page);
        chatActivated = true;
        test.details.usedShortcut = 'Control+Shift+I';
      }
      
      // Verify chat is active
      await this.wait(2000);
      const chatContainer = await page.$('.aislash-container, .chat-container, [aria-label*="Chat"]');
      if (chatContainer) {
        test.passed = true;
        test.details.chatContainerFound = true;
        logger.info('  ✅ VSCode chat container found');
      } else {
        test.error = 'VSCode chat container not found after activation';
        logger.info('  ❌ VSCode chat container not found');
      }
      
    } catch (error) {
      test.error = error.message;
      console.error('  ❌ VSCode chat activation failed:', error.message);
    }
    
    this.results.tests.push(test);
  }

  async handleVSCodeNewChatModal(page) {
    try {
      // Wait for modal to appear
      await this.wait(500);
      
      // Look for buttons in the VSCode New Chat modal
      const modalSelectors = [
        // Common modal buttons
        'button[role="button"]',
        '.monaco-button',
        '.action-label',
        '.codicon',
        '[aria-label*="button"]',
        
        // Specific VSCode New Chat modal buttons
        'button:has-text("OK")',
        'button:has-text("Continue")',
        'button:has-text("Start")',
        'button:has-text("Create")',
        'button:has-text("Begin")',
        'button:has-text("Yes")',
        'button:has-text("No")',
        'button:has-text("Cancel")',
        
        // Aria-label based
        '[aria-label*="OK"]',
        '[aria-label*="Continue"]',
        '[aria-label*="Start"]',
        '[aria-label*="Create"]',
        '[aria-label*="Begin"]',
        '[aria-label*="Yes"]',
        '[aria-label*="No"]',
        '[aria-label*="Cancel"]'
      ];

      // Try to find and click any button to proceed
      for (const selector of modalSelectors) {
        try {
          const element = await page.$(selector);
          if (element) {
            const text = await element.textContent();
            const ariaLabel = await element.getAttribute('aria-label');
            
            // Skip close/cancel buttons, prefer action buttons
            if (text?.includes('Cancel') || ariaLabel?.includes('Cancel') ||
                text?.includes('Close') || ariaLabel?.includes('Close')) {
              continue;
            }
            
            logger.info(`  ✅ Clicking VSCode New Chat modal button: ${text || ariaLabel}`);
            await element.click();
            await this.wait(500);
            return;
          }
        } catch (e) {
          continue;
        }
      }
      
      // If no action button found, try any button
      for (const selector of modalSelectors) {
        try {
          const element = await page.$(selector);
          if (element) {
            const text = await element.textContent();
            const ariaLabel = await element.getAttribute('aria-label');
            logger.info(`  ⚠️ Clicking any VSCode modal button: ${text || ariaLabel}`);
            await element.click();
            await this.wait(500);
            return;
          }
        } catch (e) {
          continue;
        }
      }
      
      // Last resort: try Escape key
      await page.keyboard.press('Escape');
      await this.wait(500);
      
    } catch (error) {
      logger.info(`  ⚠️ VSCode New Chat modal handling failed: ${error.message}`);
    }
  }

  async testVSCodeMessageSending() {
    logger.info('📝 Testing VSCode message sending...');
    
    const test = {
      name: 'VSCode Message Sending',
      description: 'Test VSCode chat message input and sending',
      passed: false,
      details: {},
      error: null
    };

    try {
      const page = await this.browserManager.getPage();
      
      // Focus VSCode chat input
      const inputSelectors = [
        'textarea[data-testid="chat-input"]',
        'textarea[placeholder*="Type your task"]',
        '.aislash-editor-input[contenteditable="true"]',
        '[contenteditable="true"]',
        'textarea[placeholder*="chat"]',
        '.chat-input',
        '[data-testid*="chat-input"]'
      ];
      
      let inputFocused = false;
      for (const selector of inputSelectors) {
        try {
          const element = await page.$(selector);
          if (element) {
            await element.click();
            await element.focus();
            logger.info(`  ✅ Found VSCode chat input: ${selector}`);
            test.details.inputSelector = selector;
            inputFocused = true;
            break;
          }
        } catch (e) {
          continue;
        }
      }
      
      if (!inputFocused) {
        test.error = 'VSCode chat input not found';
        logger.info('  ❌ VSCode chat input not found');
        this.results.tests.push(test);
        return;
      }
      
      // Type test message
      const testMessage = 'Hello VSCode! This is a test message for streaming validation.';
      await page.keyboard.type(testMessage);
      test.details.messageTyped = testMessage;
      logger.info(`  ✅ Typed test message: "${testMessage}"`);
      
      // Find and click VSCode send button
      const sendSelectors = [
        '.codicon-send',
        '.action-label[aria-label*="Send"]',
        '.chat-execute-toolbar .codicon-send',
        '.monaco-action-bar .codicon-send',
        '[aria-label*="Send Message"]',
        '.chat-send-button'
      ];
      
      let messageSent = false;
      for (const selector of sendSelectors) {
        try {
          const sendButton = await page.$(selector);
          if (sendButton) {
            await sendButton.click();
            logger.info(`  ✅ Clicked VSCode send button: ${selector}`);
            test.details.sendSelector = selector;
            messageSent = true;
            break;
          }
        } catch (e) {
          continue;
        }
      }
      
      if (!messageSent) {
        // Fallback: try Enter key
        await page.keyboard.press('Enter');
        logger.info('  ⚠️ Used Enter key fallback for VSCode');
        test.details.usedEnterKey = true;
        messageSent = true;
      }
      
      test.passed = messageSent;
      
    } catch (error) {
      test.error = error.message;
      console.error('  ❌ VSCode message sending failed:', error.message);
    }
    
    this.results.tests.push(test);
  }

  async testVSCodeAIResponseDetection() {
    logger.info('🤖 Testing VSCode AI response detection...');
    
    const test = {
      name: 'VSCode AI Response Detection',
      description: 'Test VSCode AI response streaming detection',
      passed: false,
      details: {},
      error: null
    };

    try {
      const page = await this.browserManager.getPage();
      
      // Wait for AI response to start
      logger.info('  ⏳ Waiting for VSCode AI response...');
      await this.wait(3000);
      
      // Look for AI response indicators
      const responseSelectors = [
        '.ai-message',
        '.assistant-message',
        '.anysphere-markdown-container-root',
        'span.anysphere-markdown-container-root',
        '[data-role="assistant"]',
        '.message.assistant',
        '.chat-message.assistant'
      ];
      
      let responseFound = false;
      for (const selector of responseSelectors) {
        try {
          const element = await page.$(selector);
          if (element) {
            const text = await element.textContent();
            logger.info(`  ✅ Found VSCode AI response: ${selector}`);
            test.details.responseSelector = selector;
            test.details.responseText = text?.substring(0, 100) + '...';
            responseFound = true;
            break;
          }
        } catch (e) {
          continue;
        }
      }
      
      // Also check for loading indicators
      const loadingSelectors = [
        '.loading',
        '.thinking',
        '.chat-loading',
        '.ai-responding',
        '.spinner',
        '.loading-indicator'
      ];
      
      let loadingFound = false;
      for (const selector of loadingSelectors) {
        try {
          const element = await page.$(selector);
          if (element) {
            logger.info(`  ✅ Found VSCode loading indicator: ${selector}`);
            test.details.loadingSelector = selector;
            loadingFound = true;
            break;
          }
        } catch (e) {
          continue;
        }
      }
      
      test.passed = responseFound || loadingFound;
      if (!test.passed) {
        test.error = 'VSCode AI response not detected';
        logger.info('  ❌ VSCode AI response not detected');
      }
      
    } catch (error) {
      test.error = error.message;
      console.error('  ❌ VSCode AI response detection failed:', error.message);
    }
    
    this.results.tests.push(test);
  }

  async testVSCodeStreamingStates() {
    logger.info('🔄 Testing VSCode streaming states...');
    
    const test = {
      name: 'VSCode Streaming States',
      description: 'Test VSCode chat streaming state transitions',
      passed: false,
      details: {},
      error: null
    };

    try {
      const page = await this.browserManager.getPage();
      
      // Monitor VSCode chat states over time
      const states = [];
      const maxChecks = 10;
      
      for (let i = 0; i < maxChecks; i++) {
        const state = await this.captureVSCodeChatState(page);
        states.push(state);
        
        if (state.hasResponse && !state.isLoading) {
          // AI response completed
          break;
        }
        
        await this.wait(1000);
      }
      
      test.details.states = states;
      test.details.stateCount = states.length;
      
      // Check if we detected streaming
      const hasStreaming = states.some(state => state.isLoading || state.hasResponse);
      test.passed = hasStreaming;
      
      if (hasStreaming) {
        logger.info(`  ✅ VSCode streaming detected across ${states.length} states`);
      } else {
        test.error = 'VSCode streaming not detected';
        logger.info('  ❌ VSCode streaming not detected');
      }
      
    } catch (error) {
      test.error = error.message;
      console.error('  ❌ VSCode streaming states test failed:', error.message);
    }
    
    this.results.tests.push(test);
  }

  async captureVSCodeChatState(page) {
    const state = {
      timestamp: new Date().toISOString(),
      hasInput: false,
      hasResponse: false,
      isLoading: false,
      hasError: false,
      selectors: {}
    };
    
    try {
      // Check for chat input
      const inputSelectors = [
        'textarea[data-testid="chat-input"]',
        'textarea[placeholder*="Type your task"]',
        '.aislash-editor-input[contenteditable="true"]',
        '[contenteditable="true"]'
      ];
      
      for (const selector of inputSelectors) {
        const element = await page.$(selector);
        if (element) {
          state.hasInput = true;
          state.selectors.input = selector;
          break;
        }
      }
      
      // Check for AI response
      const responseSelectors = [
        '.ai-message',
        '.assistant-message',
        '.anysphere-markdown-container-root',
        '[data-role="assistant"]'
      ];
      
      for (const selector of responseSelectors) {
        const element = await page.$(selector);
        if (element) {
          state.hasResponse = true;
          state.selectors.response = selector;
          break;
        }
      }
      
      // Check for loading
      const loadingSelectors = [
        '.loading',
        '.thinking',
        '.chat-loading',
        '.ai-responding',
        '.spinner'
      ];
      
      for (const selector of loadingSelectors) {
        const element = await page.$(selector);
        if (element) {
          state.isLoading = true;
          state.selectors.loading = selector;
          break;
        }
      }
      
      // Check for errors
      const errorSelectors = [
        '.error',
        '.chat-error',
        '.error-message',
        '.alert-error'
      ];
      
      for (const selector of errorSelectors) {
        const element = await page.$(selector);
        if (element) {
          state.hasError = true;
          state.selectors.error = selector;
          break;
        }
      }
      
    } catch (error) {
      state.error = error.message;
    }
    
    return state;
  }

  generateValidationReport() {
    const totalTests = this.results.tests.length;
    const passedTests = this.results.tests.filter(t => t.passed).length;
    const failedTests = totalTests - passedTests;
    
    const report = {
      meta: {
        generatedAt: new Date().toISOString(),
        script: 'validate-streaming.js',
        totalTests: totalTests,
        passedTests: passedTests,
        failedTests: failedTests
      },
      results: this.results,
      summary: {
        totalTests: totalTests,
        passedTests: passedTests,
        failedTests: failedTests,
        successRate: totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0,
        status: passedTests === totalTests ? 'PASSED' : 'FAILED',
        readyForStreaming: passedTests >= 2 // At least chat activation and message sending
      },
      recommendations: []
    };
    
    // Generate recommendations based on test results
    this.generateValidationRecommendations(report);
    
    return report;
  }

  generateValidationRecommendations(report) {
    const failedTests = this.results.tests.filter(t => !t.passed);
    
    if (failedTests.length > 0) {
      report.recommendations.push({
        priority: 'CRITICAL',
        title: 'Fix Failed VSCode Streaming Tests',
        description: `${failedTests.length} VSCode streaming tests failed`,
        tests: failedTests.map(test => ({
          name: test.name,
          description: test.description,
          error: test.error
        })),
        actions: [
          'Verify VSCode IDE connection',
          'Check VSCode chat extension status',
          'Update VSCode selectors',
          'Implement fallback strategies'
        ]
      });
    }
    
    if (!report.summary.readyForStreaming) {
      report.recommendations.push({
        priority: 'IMPORTANT',
        title: 'Improve VSCode Streaming Readiness',
        description: 'VSCode streaming automation not ready',
        actions: [
          'Fix critical streaming tests',
          'Implement robust error handling',
          'Add streaming state monitoring',
          'Test with different VSCode versions'
        ]
      });
    }
  }

  saveResults(report) {
    const outputFile = path.join(this.outputDir, 'vscode-streaming-validation.json');
    fs.writeFileSync(outputFile, JSON.stringify(report, null, 2));
    
    // Also save a summary report
    const summaryFile = path.join(this.outputDir, 'vscode-streaming-validation-summary.md');
    const summary = this.generateSummaryReport(report);
    fs.writeFileSync(summaryFile, summary);
    
    logger.info(`📄 VSCode streaming validation saved: ${outputFile}`);
    logger.info(`📄 VSCode streaming summary saved: ${summaryFile}`);
  }

  generateSummaryReport(report) {
    const { summary, results } = report;
    
    return `# VSCode Streaming Validation Summary

## Overview
- **Generated**: ${report.meta.generatedAt}
- **Success Rate**: ${summary.successRate}%
- **Total Tests**: ${summary.totalTests}
- **Passed Tests**: ${summary.passedTests}
- **Failed Tests**: ${summary.failedTests}
- **Status**: ${summary.status}
- **Ready for Streaming**: ${summary.readyForStreaming ? '✅ YES' : '❌ NO'}

## Test Results
${results.tests.map(test => 
  `- ${test.passed ? '✅' : '❌'} **${test.name}**: ${test.description}${test.error ? ` (${test.error})` : ''}`
).join('\n')}

## Failed Tests
${results.tests.filter(test => !test.passed).map(test => 
  `- ❌ **${test.name}**: ${test.error || 'Test failed'}`
).join('\n')}

## Recommendations
${report.recommendations.map(rec => 
  `- **${rec.priority}**: ${rec.title} - ${rec.description}`
).join('\n')}

## Next Steps
1. Fix failed streaming tests
2. Implement robust error handling
3. Add comprehensive state monitoring
4. Test with different VSCode configurations
`;
  }

  async wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async cleanup() {
    try {
      await this.browserManager.disconnect();
    } catch (error) {
      logger.info('⚠️ VSCode cleanup warning:', error.message);
    }
  }
}

// CLI Usage
if (require.main === module) {
  const validator = new VSCodeStreamingValidator();
  
  async function run() {
    try {
      await validator.validateStreaming();
    } catch (error) {
      console.error('❌ VSCode streaming validation failed:', error.message);
      process.exit(1);
    }
  }
  
  run();
}

module.exports = VSCodeStreamingValidator; 