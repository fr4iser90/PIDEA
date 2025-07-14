const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const Logger = require('@logging/Logger');

const logger = new Logger('ServiceName');

class EnhancedChatAnalyzer {
  constructor() {
    this.results = {
      chatFeatures: {},
      chatSelectors: {},
      chatStates: [],
      chatIssues: [],
      recommendations: []
    };
    
    this.outputDir = path.join(__dirname, '../output/chat-analysis');
    this.ensureOutputDir();
  }

  ensureOutputDir() {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
      logger.info(`📁 Created VSCode chat analysis directory: ${this.outputDir}`);
    }
  }

  // Load enhanced DOM files
  loadEnhancedDOMFiles() {
    const enhancedPath = path.join(__dirname, '../output/enhanced-collected');
    const fallbackPath = path.join(__dirname, '../output/auto-collected');
    
    let sourcePath = enhancedPath;
    if (!fs.existsSync(enhancedPath)) {
      sourcePath = fallbackPath;
      logger.info(`⚠️ Enhanced collection not found, using fallback: ${fallbackPath}`);
    }
    
    if (!fs.existsSync(sourcePath)) {
      throw new Error(`No VSCode DOM collection found in: ${sourcePath}`);
    }

    const allFiles = fs.readdirSync(sourcePath)
      .filter(file => file.endsWith('.md') && !file.includes('collection-report'));
    
    logger.info(`📁 VSCode Chat Analysis Source: ${sourcePath}`);
    logger.info(`📄 Found ${allFiles.length} VSCode DOM files`);
    
    const sources = {};
    allFiles.forEach(file => {
      const content = fs.readFileSync(path.join(sourcePath, file), 'utf8');
      const htmlContent = this.extractHTML(content);
      sources[file] = htmlContent;
      
      const elementCount = (htmlContent.match(/<[^>]*>/g) || []).length;
      logger.info(`📄 ${file}: ${elementCount} HTML elements`);
    });
    
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

  async analyze() {
    logger.info('🚀 Enhanced VSCode Chat Analyzer starting...\n');

    try {
      // 1. Load DOM files
      const sources = this.loadEnhancedDOMFiles();
      
      if (Object.keys(sources).length === 0) {
        throw new Error('No VSCode DOM files found for analysis!');
      }

      // 2. Analyze each source for chat features
      Object.entries(sources).forEach(([sourceFile, htmlContent]) => {
        if (htmlContent && htmlContent.trim()) {
          this.analyzeChatFeatures(htmlContent, sourceFile);
        }
      });

      // 3. Generate comprehensive chat analysis
      const analysis = this.generateChatAnalysis();
      
      // 4. Save results
      this.saveResults(analysis);

      // 5. Generate recommendations
      this.generateRecommendations();

      logger.info('\n📊 ENHANCED VSCode CHAT ANALYSIS COMPLETED!');
      logger.info(`📁 Output: ${this.outputDir}`);
      logger.info(`🎯 Chat Features Found: ${Object.keys(this.results.chatFeatures).length}`);
      logger.info(`🔍 Issues Identified: ${this.results.chatIssues.length}`);
      logger.info(`💡 Recommendations: ${this.results.recommendations.length}`);

      return analysis;

    } catch (error) {
      console.error('❌ VSCode chat analysis failed:', error.message);
      throw error;
    }
  }

  analyzeChatFeatures(htmlContent, sourceFile) {
    try {
      const dom = new JSDOM(htmlContent);
      const document = dom.window.document;
      
      logger.info(`🔍 Analyzing VSCode chat features in ${sourceFile}...`);
      
      // Comprehensive VSCode chat feature detection
      const chatFeatures = {
        // === NEW CHAT BUTTON (CRITICAL) ===
        newChatButton: this.findChatButton(document, [
          '[aria-label*="New Chat"]',
          '[title*="New Chat"]',
          '.codicon-add-two',
          '.action-label[aria-label*="New"]',
          'button[aria-label*="New Chat"]',
          'a[aria-label*="New Chat"]',
          '.new-chat-button',
          '[data-testid*="new-chat"]',
          '.codicon-add',
          '[aria-label*="Add"]',
          'button[title*="New"]',
          'a[title*="New"]'
        ]),
        
        // === NEW CHAT MODAL & BUTTONS ===
        newChatModal: this.findElements(document, [
          '.monaco-dialog',
          '.quick-input-widget',
          '[role="dialog"]',
          '.modal-dialog',
          '.dialog-modal',
          '[aria-label*="Create new chat"]',
          '[aria-label*="New Chat"]'
        ]),
        replaceChatButton: this.findElements(document, [
          'button:has-text("Replace Chat")',
          '[aria-label*="Replace Chat"]',
          '.monaco-dialog button',
          '.quick-input-widget button',
          '.modal-dialog button',
          '.action-label:has-text("Replace Chat")'
        ]),
        createInNewTabButton: this.findElements(document, [
          'button:has-text("Create in New Tab")',
          '[aria-label*="Create in New Tab"]',
          '.monaco-dialog button',
          '.quick-input-widget button',
          '.modal-dialog button',
          '.action-label:has-text("Create in New Tab")'
        ]),
        cancelNewChatButton: this.findElements(document, [
          'button:has-text("Cancel")',
          '[aria-label*="Cancel"]',
          '.monaco-dialog button',
          '.quick-input-widget button',
          '.modal-dialog button',
          '.action-label:has-text("Cancel")'
        ]),
        
        // === CHAT INPUT (CRITICAL) ===
        chatInput: this.findChatInput(document, [
          '.aislash-editor-input[contenteditable="true"]',
          '[contenteditable="true"]',
          'textarea[placeholder*="chat"]',
          'textarea[placeholder*="Ask"]',
          '.chat-input',
          '.monaco-editor[data-testid="chat-input"]',
          'input[placeholder*="chat"]',
          'input[placeholder*="Ask"]',
          '.aislash-editor-input',
          '[data-lexical-editor="true"]',
          'textarea[data-testid="chat-input"]',
          'textarea[placeholder*="Type your task"]'
        ]),
        
        // === CHAT MESSAGES ===
        userMessages: this.findUserMessages(document, [
          'div.composer-human-message',
          '.user-message',
          '.human-message',
          '.aislash-editor-input-readonly',
          '[data-role="user"]',
          '.message.user',
          '.chat-message.user'
        ]),
        
        aiMessages: this.findAIMessages(document, [
          'span.anysphere-markdown-container-root',
          '.ai-message',
          '.assistant-message',
          '.markdown-container',
          '[data-role="assistant"]',
          '.message.assistant',
          '.chat-message.assistant',
          '.anysphere-markdown-container-root'
        ]),
        
        // === CHAT CONTROLS ===
        sendButton: this.findSendButton(document, [
          '[aria-label*="Send"]',
          '.send-button',
          '.codicon-send',
          'button[type="submit"]',
          '.chat-send-button',
          '[title*="Send"]'
        ]),
        
        chatHistory: this.findChatHistory(document, [
          '[aria-label*="Chat History"]',
          '[aria-label*="Show Chat History"]',
          '.chat-history',
          '[data-testid*="chat-history"]',
          '.chat-history-button'
        ]),
        
        // === CHAT SETTINGS ===
        chatSettings: this.findChatSettings(document, [
          '[aria-label="Settings"]',
          '.chat-settings',
          '.settings-button',
          '[data-testid*="settings"]',
          '.chat-settings-button'
        ]),
        
        // === CHAT ACTIONS ===
        moreActions: this.findMoreActions(document, [
          '[aria-label*="More Actions"]',
          '[aria-label*="Close, Export, Settings"]',
          'span.codicon',
          '.more-actions',
          '.chat-actions',
          '.action-menu'
        ]),
        
        // === CHAT TABS ===
        chatTabs: this.findChatTabs(document, [
          'li.action-item',
          '.chat-tab',
          '[aria-label*="Plan for"]',
          '[role="tab"]',
          '.tab[data-testid*="chat"]',
          '.chat-tab-item'
        ]),
        
        // === CHAT CONTAINERS ===
        chatContainer: this.findChatContainer(document, [
          '.aislash-container',
          '.chat-container',
          '.chat-panel',
          '[aria-label*="Chat"]',
          '.chat-view',
          '.chat-widget'
        ]),
        
        // === CHAT LOADING ===
        chatLoading: this.findChatLoading(document, [
          '.loading',
          '.thinking',
          '.chat-loading',
          '.ai-responding',
          '.spinner',
          '.loading-indicator'
        ]),
        
        // === CHAT ERROR ===
        chatError: this.findChatError(document, [
          '.error',
          '.chat-error',
          '.error-message',
          '.alert-error',
          '.notification-error'
        ])
      };

      // Process found features
      Object.entries(chatFeatures).forEach(([featureName, elements]) => {
        if (elements.length > 0) {
          if (!this.results.chatFeatures[featureName]) {
            this.results.chatFeatures[featureName] = [];
          }
          
          this.results.chatFeatures[featureName].push({
            source: sourceFile,
            count: elements.length,
            elements: elements.map(el => this.generateChatSelector(el)),
            attributes: elements.map(el => this.getElementAttributes(el))
          });
          
          logger.info(`  ✅ ${featureName}: ${elements.length} elements`);
        } else {
          // Track missing features
          if (!this.results.chatIssues.find(issue => issue.feature === featureName)) {
            this.results.chatIssues.push({
              feature: featureName,
              source: sourceFile,
              severity: this.getFeatureSeverity(featureName),
              description: `Missing ${featureName} in ${sourceFile}`
            });
          }
        }
      });

      // Store chat state information
      this.results.chatStates.push({
        source: sourceFile,
        features: Object.keys(chatFeatures).filter(f => chatFeatures[f].length > 0),
        missingFeatures: Object.keys(chatFeatures).filter(f => chatFeatures[f].length === 0),
        totalElements: Object.values(chatFeatures).reduce((sum, elements) => sum + elements.length, 0)
      });

    } catch (error) {
      console.error(`❌ Error analyzing VSCode ${sourceFile}:`, error.message);
    }
  }

  findChatButton(document, selectors) {
    return this.findElements(document, selectors);
  }

  findChatInput(document, selectors) {
    return this.findElements(document, selectors);
  }

  findUserMessages(document, selectors) {
    return this.findElements(document, selectors);
  }

  findAIMessages(document, selectors) {
    return this.findElements(document, selectors);
  }

  findSendButton(document, selectors) {
    return this.findElements(document, selectors);
  }

  findChatHistory(document, selectors) {
    return this.findElements(document, selectors);
  }

  findChatSettings(document, selectors) {
    return this.findElements(document, selectors);
  }

  findMoreActions(document, selectors) {
    return this.findElements(document, selectors);
  }

  findChatTabs(document, selectors) {
    return this.findElements(document, selectors);
  }

  findChatContainer(document, selectors) {
    return this.findElements(document, selectors);
  }

  findChatLoading(document, selectors) {
    return this.findElements(document, selectors);
  }

  findChatError(document, selectors) {
    return this.findElements(document, selectors);
  }

  findElements(document, selectors) {
    const foundElements = [];
    
    selectors.forEach(selector => {
      try {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          if (!foundElements.includes(el)) {
            foundElements.push(el);
          }
        });
      } catch (error) {
        // Invalid selector, continue
      }
    });
    
    return foundElements;
  }

  generateChatSelector(element) {
    if (!element || !element.tagName) return '';
    
    const selectors = [];
    
    // ID selector
    if (element.id) {
      selectors.push(`#${element.id}`);
    }
    
    // Class selectors
    if (element.className && typeof element.className === 'string') {
      const classes = element.className.split(' ').filter(c => c.trim());
      if (classes.length > 0) {
        selectors.push(`.${classes[0]}`);
        if (classes.length > 1) {
          selectors.push(`.${classes.join('.')}`);
        }
      }
    }
    
    // Aria-label selector
    if (element.getAttribute && element.getAttribute('aria-label')) {
      const ariaLabel = element.getAttribute('aria-label');
      selectors.push(`[aria-label="${ariaLabel}"]`);
      // Also add partial matches for flexibility
      if (ariaLabel.includes('New Chat')) {
        selectors.push(`[aria-label*="New Chat"]`);
      }
    }
    
    // Title selector
    if (element.getAttribute && element.getAttribute('title')) {
      const title = element.getAttribute('title');
      selectors.push(`[title="${title}"]`);
      if (title.includes('New Chat')) {
        selectors.push(`[title*="New Chat"]`);
      }
    }
    
    // Data attributes
    if (element.getAttribute && element.getAttribute('data-testid')) {
      const testId = element.getAttribute('data-testid');
      selectors.push(`[data-testid="${testId}"]`);
    }
    
    // Tag + class combination
    if (element.tagName && element.className) {
      const firstClass = element.className.split(' ')[0];
      if (firstClass) {
        selectors.push(`${element.tagName.toLowerCase()}.${firstClass}`);
      }
    }
    
    return selectors[0] || element.tagName.toLowerCase();
  }

  getElementAttributes(element) {
    const attrs = {};
    if (element.attributes) {
      for (let attr of element.attributes) {
        attrs[attr.name] = attr.value;
      }
    }
    return attrs;
  }

  getFeatureSeverity(featureName) {
    const criticalFeatures = ['newChatButton', 'chatInput'];
    const importantFeatures = ['sendButton', 'chatContainer', 'userMessages', 'aiMessages'];
    
    if (criticalFeatures.includes(featureName)) return 'CRITICAL';
    if (importantFeatures.includes(featureName)) return 'IMPORTANT';
    return 'NORMAL';
  }

  generateChatAnalysis() {
    const optimizedSelectors = {};
    const issues = this.results.chatIssues;
    const recommendations = [];
    
    // Generate optimized selectors
    Object.entries(this.results.chatFeatures).forEach(([featureName, sources]) => {
      if (sources.length > 0) {
        // Find the best selector (most reliable)
        const allSelectors = sources.flatMap(source => source.elements);
        const bestSelector = this.selectBestSelector(allSelectors);
        optimizedSelectors[featureName] = bestSelector;
      }
    });

    // Generate recommendations based on issues
    const criticalIssues = issues.filter(issue => issue.severity === 'CRITICAL');
    const importantIssues = issues.filter(issue => issue.severity === 'IMPORTANT');
    
    if (criticalIssues.length > 0) {
      recommendations.push({
        priority: 'CRITICAL',
        action: 'Fix missing critical VSCode chat features',
        features: criticalIssues.map(issue => issue.feature),
        description: 'These features are essential for VSCode chat automation'
      });
    }
    
    if (importantIssues.length > 0) {
      recommendations.push({
        priority: 'IMPORTANT',
        action: 'Address missing important VSCode chat features',
        features: importantIssues.map(issue => issue.feature),
        description: 'These features improve VSCode chat functionality'
      });
    }

    // Add specific recommendations for chat button
    if (!optimizedSelectors.newChatButton) {
      recommendations.push({
        priority: 'CRITICAL',
        action: 'Implement dynamic VSCode chat button detection',
        features: ['newChatButton'],
        description: 'Use multiple strategies to find the VSCode New Chat button',
        implementation: this.generateChatButtonDetectionStrategy()
      });
    }

    return {
      meta: {
        generatedAt: new Date().toISOString(),
        script: 'enhanced-chat-analyzer.js',
        totalFeatures: Object.keys(this.results.chatFeatures).length,
        totalIssues: issues.length,
        totalRecommendations: recommendations.length
      },
      optimizedSelectors,
      detailedFeatures: this.results.chatFeatures,
      issues,
      recommendations,
      chatStates: this.results.chatStates,
      summary: {
        coverage: Math.round((Object.keys(optimizedSelectors).length / 12) * 100),
        criticalIssues: criticalIssues.length,
        importantIssues: importantIssues.length,
        readyForAutomation: criticalIssues.length === 0
      }
    };
  }

  selectBestSelector(selectors) {
    if (selectors.length === 0) return null;
    
    // Prioritize selectors: ID > specific aria-label > class > tag
    const prioritized = selectors.sort((a, b) => {
      // IDs have highest priority
      if (a.startsWith('#')) return -1;
      if (b.startsWith('#')) return 1;
      
      // Specific aria-labels have priority
      if (a.includes('aria-label="') && b.includes('aria-label*=')) return -1;
      if (b.includes('aria-label="') && a.includes('aria-label*=')) return 1;
      
      // Classes have priority over tags
      if (a.startsWith('.') && !b.startsWith('.')) return -1;
      if (b.startsWith('.') && !a.startsWith('.')) return 1;
      
      // Shorter selectors are preferred
      return a.length - b.length;
    });
    
    return prioritized[0];
  }

  generateChatButtonDetectionStrategy() {
    return `
// Enhanced VSCode Chat Button Detection Strategy
async function detectNewChatButton(page) {
  const strategies = [
    // Strategy 1: Direct VSCode selectors
    async () => {
      const selectors = [
        '[aria-label*="New Chat"]',
        '[title*="New Chat"]',
        '.codicon-add-two',
        '.action-label[aria-label*="New"]'
      ];
      
      for (const selector of selectors) {
        const element = await page.$(selector);
        if (element) return element;
      }
      return null;
    },
    
    // Strategy 2: Icon-based detection for VSCode
    async () => {
      const icons = await page.$$('.codicon-add, .codicon-add-two, .codicon-plus');
      for (const icon of icons) {
        const ariaLabel = await icon.getAttribute('aria-label');
        const title = await icon.getAttribute('title');
        if (ariaLabel?.includes('New') || title?.includes('New')) {
          return icon;
        }
      }
      return null;
    },
    
    // Strategy 3: Text content search for VSCode
    async () => {
      const elements = await page.$$('button, a, .action-label');
      for (const element of elements) {
        const text = await element.textContent();
        const ariaLabel = await element.getAttribute('aria-label');
        if (text?.includes('New Chat') || ariaLabel?.includes('New Chat')) {
          return element;
        }
      }
      return null;
    }
  ];
  
  // Try each strategy
  for (const strategy of strategies) {
    const element = await strategy();
    if (element) return element;
  }
  
  return null;
}
    `;
  }

  generateRecommendations() {
    const recommendations = [
      {
        type: 'IMMEDIATE',
        title: 'Fix VSCode New Chat Button Detection',
        description: 'Implement multiple detection strategies for the VSCode New Chat button',
        actions: [
          'Add icon-based detection (.codicon-add-two)',
          'Add text content search',
          'Add aria-label variations',
          'Add fallback mechanisms'
        ]
      },
      {
        type: 'ENHANCEMENT',
        title: 'Improve VSCode Chat Input Detection',
        description: 'Ensure reliable VSCode chat input field detection',
        actions: [
          'Add contentEditable detection',
          'Add Monaco editor integration',
          'Add placeholder text detection',
          'Add data-lexical-editor detection'
        ]
      },
      {
        type: 'TESTING',
        title: 'Add VSCode Chat Functionality Tests',
        description: 'Create comprehensive tests for VSCode chat automation',
        actions: [
          'Test New Chat button click',
          'Test message sending',
          'Test AI response detection',
          'Test chat history navigation'
        ]
      }
    ];

    this.results.recommendations = recommendations;
  }

  saveResults(analysis) {
    const outputFile = path.join(this.outputDir, 'enhanced-vscode-chat-analysis.json');
    fs.writeFileSync(outputFile, JSON.stringify(analysis, null, 2));
    
    // Also save a summary report
    const summaryFile = path.join(this.outputDir, 'vscode-chat-analysis-summary.md');
    const summary = this.generateSummaryReport(analysis);
    fs.writeFileSync(summaryFile, summary);
    
    logger.info(`📄 VSCode analysis saved: ${outputFile}`);
    logger.info(`📄 VSCode summary saved: ${summaryFile}`);
  }

  generateSummaryReport(analysis) {
    const { summary, issues, recommendations } = analysis;
    
    return `# Enhanced VSCode Chat Analysis Summary

## Overview
- **Generated**: ${analysis.meta.generatedAt}
- **Coverage**: ${summary.coverage}%
- **Critical Issues**: ${summary.criticalIssues}
- **Ready for Automation**: ${summary.readyForAutomation ? '✅ YES' : '❌ NO'}

## Found VSCode Features
${Object.entries(analysis.optimizedSelectors).map(([feature, selector]) => 
  `- **${feature}**: \`${selector}\``
).join('\n')}

## Critical Issues
${issues.filter(issue => issue.severity === 'CRITICAL').map(issue => 
  `- ❌ **${issue.feature}**: ${issue.description}`
).join('\n')}

## Recommendations
${recommendations.map(rec => 
  `- **${rec.type}**: ${rec.title} - ${rec.description}`
).join('\n')}

## Next Steps
1. Fix critical issues first
2. Implement enhanced detection strategies
3. Add comprehensive testing
4. Validate automation reliability
`;
  }
}

// CLI Usage
if (require.main === module) {
  const analyzer = new EnhancedChatAnalyzer();
  
  async function run() {
    try {
      await analyzer.analyze();
    } catch (error) {
      console.error('❌ VSCode chat analysis failed:', error.message);
      process.exit(1);
    }
  }
  
  run();
}

module.exports = EnhancedChatAnalyzer; 