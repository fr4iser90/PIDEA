const Logger = require('@logging/Logger');

const logger = new Logger('ServiceName');
#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

class ModalAnalyzer {
  constructor() {
    this.results = {
      modals: {},
      modalSelectors: {},
      modalStates: [],
      modalIssues: [],
      recommendations: []
    };
    
    this.outputDir = path.join(__dirname, '../output/modal-analysis');
    this.ensureOutputDir();
  }

  ensureOutputDir() {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
      logger.info(`📁 Created VSCode modal analysis directory: ${this.outputDir}`);
    }
  }

  // Load enhanced DOM files for modal analysis
  loadModalDOMFiles() {
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

    const modalFiles = fs.readdirSync(sourcePath)
      .filter(file => file.endsWith('.md') && file.includes('modal'));
    
    // Also include files that might contain modals
    const allFiles = fs.readdirSync(sourcePath)
      .filter(file => file.endsWith('.md') && !file.includes('collection-report'));
    
    const filesToAnalyze = modalFiles.length > 0 ? modalFiles : allFiles;
    
    logger.info(`📁 VSCode Modal Analysis Source: ${sourcePath}`);
    logger.info(`📄 Found ${filesToAnalyze.length} VSCode DOM files for modal analysis`);
    
    const sources = {};
    filesToAnalyze.forEach(file => {
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
    logger.info('🚀 VSCode Modal Analyzer starting...\n');

    try {
      // 1. Load DOM files
      const sources = this.loadModalDOMFiles();
      
      if (Object.keys(sources).length === 0) {
        throw new Error('No VSCode DOM files found for modal analysis!');
      }

      // 2. Analyze each source for modal features
      Object.entries(sources).forEach(([sourceFile, htmlContent]) => {
        if (htmlContent && htmlContent.trim()) {
          this.analyzeModalFeatures(htmlContent, sourceFile);
        }
      });

      // 3. Generate comprehensive modal analysis
      const analysis = this.generateModalAnalysis();
      
      // 4. Save results
      this.saveResults(analysis);

      // 5. Generate recommendations
      this.generateRecommendations();

      logger.info('\n📊 VSCode MODAL ANALYSIS COMPLETED!');
      logger.info(`📁 Output: ${this.outputDir}`);
      logger.info(`🎯 Modal Types Found: ${Object.keys(this.results.modals).length}`);
      logger.info(`🔍 Modal Issues: ${this.results.modalIssues.length}`);
      logger.info(`💡 Recommendations: ${this.results.recommendations.length}`);

      return analysis;

    } catch (error) {
      console.error('❌ VSCode modal analysis failed:', error.message);
      throw error;
    }
  }

  analyzeModalFeatures(htmlContent, sourceFile) {
    try {
      const dom = new JSDOM(htmlContent);
      const document = dom.window.document;
      
      logger.info(`🔍 Analyzing VSCode modal features in ${sourceFile}...`);
      
      // Comprehensive VSCode modal detection
      const modalFeatures = {
        // === VSCode QUICK INPUT MODALS ===
        quickInputModal: this.findModalElements(document, [
          '.quick-input-widget',
          '.monaco-quick-input',
          '[role="dialog"]',
          '.monaco-overlay'
        ]),
        
        commandPaletteModal: this.findModalElements(document, [
          '.quick-input-widget[aria-label*="Command Palette"]',
          '.monaco-quick-input[aria-label*="Command"]',
          '[role="dialog"][aria-label*="Command"]'
        ]),
        
        quickOpenModal: this.findModalElements(document, [
          '.quick-input-widget[aria-label*="Go to File"]',
          '.monaco-quick-input[aria-label*="File"]',
          '[role="dialog"][aria-label*="File"]'
        ]),
        
        // === VSCode DIALOG MODALS ===
        confirmationDialog: this.findModalElements(document, [
          '.monaco-dialog',
          '.dialog-modal',
          '[role="dialog"][aria-label*="Confirm"]',
          '.modal-dialog'
        ]),
        
        errorDialog: this.findModalElements(document, [
          '.monaco-dialog.error',
          '.dialog-modal.error',
          '[role="dialog"][aria-label*="Error"]',
          '.error-dialog'
        ]),
        
        infoDialog: this.findModalElements(document, [
          '.monaco-dialog.info',
          '.dialog-modal.info',
          '[role="dialog"][aria-label*="Information"]',
          '.info-dialog'
        ]),
        
        // === VSCode CHAT MODALS ===
        newChatModal: this.findModalElements(document, [
          '.monaco-dialog[aria-label*="New Chat"]',
          '.dialog-modal[aria-label*="New Chat"]',
          '[role="dialog"][aria-label*="New Chat"]',
          '.new-chat-modal'
        ]),
        
        chatSettingsModal: this.findModalElements(document, [
          '.monaco-dialog[aria-label*="Settings"]',
          '.dialog-modal[aria-label*="Settings"]',
          '[role="dialog"][aria-label*="Settings"]',
          '.chat-settings-modal'
        ]),
        
        chatExportModal: this.findModalElements(document, [
          '.monaco-dialog[aria-label*="Export"]',
          '.dialog-modal[aria-label*="Export"]',
          '[role="dialog"][aria-label*="Export"]',
          '.chat-export-modal'
        ]),
        
        // === VSCode EXTENSION MODALS ===
        extensionInstallModal: this.findModalElements(document, [
          '.monaco-dialog[aria-label*="Install"]',
          '.dialog-modal[aria-label*="Install"]',
          '[role="dialog"][aria-label*="Install"]',
          '.extension-install-modal'
        ]),
        
        extensionUpdateModal: this.findModalElements(document, [
          '.monaco-dialog[aria-label*="Update"]',
          '.dialog-modal[aria-label*="Update"]',
          '[role="dialog"][aria-label*="Update"]',
          '.extension-update-modal'
        ]),
        
        // === VSCode NOTIFICATION MODALS ===
        notificationOverlay: this.findModalElements(document, [
          '.monaco-notification-overlay',
          '.notification-overlay',
          '.monaco-overlay[aria-label*="Notification"]',
          '.notification-modal'
        ]),
        
        progressModal: this.findModalElements(document, [
          '.monaco-progress-modal',
          '.progress-modal',
          '[role="dialog"][aria-label*="Progress"]',
          '.loading-modal'
        ]),
        
        // === VSCode CONTEXT MENUS ===
        contextMenu: this.findModalElements(document, [
          '.monaco-menu',
          '.context-menu',
          '[role="menu"]',
          '.dropdown-menu'
        ]),
        
        fileContextMenu: this.findModalElements(document, [
          '.monaco-menu[aria-label*="File"]',
          '.context-menu[aria-label*="File"]',
          '[role="menu"][aria-label*="File"]'
        ]),
        
        editorContextMenu: this.findModalElements(document, [
          '.monaco-menu[aria-label*="Editor"]',
          '.context-menu[aria-label*="Editor"]',
          '[role="menu"][aria-label*="Editor"]'
        ]),
        
        // === VSCode PANEL MODALS ===
        searchPanel: this.findModalElements(document, [
          '.search-viewlet',
          '.search-panel',
          '[aria-label*="Search"]',
          '.search-modal'
        ]),
        
        extensionsPanel: this.findModalElements(document, [
          '.extensions-viewlet',
          '.extensions-panel',
          '[aria-label*="Extensions"]',
          '.extensions-modal'
        ]),
        
        debugPanel: this.findModalElements(document, [
          '.debug-viewlet',
          '.debug-panel',
          '[aria-label*="Debug"]',
          '.debug-modal'
        ]),
        
        // === VSCode OVERLAY ELEMENTS ===
        backdrop: this.findModalElements(document, [
          '.modal-backdrop',
          '.overlay-backdrop',
          '.monaco-overlay-backdrop',
          '.backdrop'
        ]),
        
        overlay: this.findModalElements(document, [
          '.monaco-overlay',
          '.overlay',
          '[style*="z-index"]',
          '.modal-overlay'
        ])
      };

      // Process found modal features
      Object.entries(modalFeatures).forEach(([featureName, elements]) => {
        if (elements.length > 0) {
          if (!this.results.modals[featureName]) {
            this.results.modals[featureName] = [];
          }
          
          this.results.modals[featureName].push({
            source: sourceFile,
            count: elements.length,
            elements: elements.map(el => this.generateModalSelector(el)),
            attributes: elements.map(el => this.getElementAttributes(el)),
            modalType: this.getModalType(featureName)
          });
          
          logger.info(`  ✅ ${featureName}: ${elements.length} elements`);
        } else {
          // Track missing modal features
          if (!this.results.modalIssues.find(issue => issue.feature === featureName)) {
            this.results.modalIssues.push({
              feature: featureName,
              source: sourceFile,
              severity: this.getModalFeatureSeverity(featureName),
              description: `Missing ${featureName} in ${sourceFile}`
            });
          }
        }
      });

      // Store modal state information
      this.results.modalStates.push({
        source: sourceFile,
        modals: Object.keys(modalFeatures).filter(f => modalFeatures[f].length > 0),
        missingModals: Object.keys(modalFeatures).filter(f => modalFeatures[f].length === 0),
        totalElements: Object.values(modalFeatures).reduce((sum, elements) => sum + elements.length, 0)
      });

    } catch (error) {
      console.error(`❌ Error analyzing VSCode modal ${sourceFile}:`, error.message);
    }
  }

  findModalElements(document, selectors) {
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

  generateModalSelector(element) {
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
      if (ariaLabel.includes('Command')) {
        selectors.push(`[aria-label*="Command"]`);
      }
      if (ariaLabel.includes('File')) {
        selectors.push(`[aria-label*="File"]`);
      }
    }
    
    // Role selector
    if (element.getAttribute && element.getAttribute('role')) {
      const role = element.getAttribute('role');
      selectors.push(`[role="${role}"]`);
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

  getModalType(featureName) {
    if (featureName.includes('quickInput') || featureName.includes('commandPalette') || featureName.includes('quickOpen')) {
      return 'Quick Input';
    }
    if (featureName.includes('dialog')) {
      return 'Dialog';
    }
    if (featureName.includes('chat')) {
      return 'Chat';
    }
    if (featureName.includes('extension')) {
      return 'Extension';
    }
    if (featureName.includes('notification') || featureName.includes('progress')) {
      return 'Notification';
    }
    if (featureName.includes('context')) {
      return 'Context Menu';
    }
    if (featureName.includes('panel')) {
      return 'Panel';
    }
    if (featureName.includes('backdrop') || featureName.includes('overlay')) {
      return 'Overlay';
    }
    return 'Modal';
  }

  getModalFeatureSeverity(featureName) {
    const criticalModals = ['quickInputModal', 'commandPaletteModal', 'confirmationDialog'];
    const importantModals = ['newChatModal', 'contextMenu', 'notificationOverlay'];
    
    if (criticalModals.includes(featureName)) return 'CRITICAL';
    if (importantModals.includes(featureName)) return 'IMPORTANT';
    return 'NORMAL';
  }

  generateModalAnalysis() {
    const optimizedSelectors = {};
    const issues = this.results.modalIssues;
    const recommendations = [];
    
    // Generate optimized selectors
    Object.entries(this.results.modals).forEach(([featureName, sources]) => {
      if (sources.length > 0) {
        // Find the best selector (most reliable)
        const allSelectors = sources.flatMap(source => source.elements);
        const bestSelector = this.selectBestModalSelector(allSelectors);
        optimizedSelectors[featureName] = bestSelector;
      }
    });

    // Generate recommendations based on issues
    const criticalIssues = issues.filter(issue => issue.severity === 'CRITICAL');
    const importantIssues = issues.filter(issue => issue.severity === 'IMPORTANT');
    
    if (criticalIssues.length > 0) {
      recommendations.push({
        priority: 'CRITICAL',
        action: 'Fix missing critical VSCode modal features',
        features: criticalIssues.map(issue => issue.feature),
        description: 'These modal features are essential for VSCode automation'
      });
    }
    
    if (importantIssues.length > 0) {
      recommendations.push({
        priority: 'IMPORTANT',
        action: 'Address missing important VSCode modal features',
        features: importantIssues.map(issue => issue.feature),
        description: 'These modal features improve VSCode functionality'
      });
    }

    // Add specific recommendations for modal handling
    if (!optimizedSelectors.quickInputModal) {
      recommendations.push({
        priority: 'CRITICAL',
        action: 'Implement VSCode quick input modal detection',
        features: ['quickInputModal'],
        description: 'Use multiple strategies to find VSCode quick input modals',
        implementation: this.generateModalDetectionStrategy()
      });
    }

    return {
      meta: {
        generatedAt: new Date().toISOString(),
        script: 'modal-analyzer.js',
        totalModals: Object.keys(this.results.modals).length,
        totalIssues: issues.length,
        totalRecommendations: recommendations.length
      },
      optimizedSelectors,
      detailedModals: this.results.modals,
      issues,
      recommendations,
      modalStates: this.results.modalStates,
      summary: {
        coverage: Math.round((Object.keys(optimizedSelectors).length / 20) * 100),
        criticalIssues: criticalIssues.length,
        importantIssues: importantIssues.length,
        readyForAutomation: criticalIssues.length === 0
      }
    };
  }

  selectBestModalSelector(selectors) {
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

  generateModalDetectionStrategy() {
    return `
// Enhanced VSCode Modal Detection Strategy
async function detectVSCodeModal(page, modalType) {
  const strategies = {
    quickInput: [
      '.quick-input-widget',
      '.monaco-quick-input',
      '[role="dialog"]',
      '.monaco-overlay'
    ],
    dialog: [
      '.monaco-dialog',
      '.dialog-modal',
      '[role="dialog"]',
      '.modal-dialog'
    ],
    contextMenu: [
      '.monaco-menu',
      '.context-menu',
      '[role="menu"]',
      '.dropdown-menu'
    ],
    notification: [
      '.monaco-notification-overlay',
      '.notification-overlay',
      '.monaco-overlay[aria-label*="Notification"]'
    ]
  };
  
  const selectors = strategies[modalType] || strategies.quickInput;
  
  for (const selector of selectors) {
    try {
      const element = await page.$(selector);
      if (element) {
        return element;
      }
    } catch (e) {
      continue;
    }
  }
  
  return null;
}

// VSCode Modal Interaction Helper
async function interactWithVSCodeModal(page, modalType, action) {
  const modal = await detectVSCodeModal(page, modalType);
  if (!modal) {
    throw new Error(\`VSCode \${modalType} modal not found\`);
  }
  
  switch (action) {
    case 'close':
      await page.keyboard.press('Escape');
      break;
    case 'confirm':
      const confirmButton = await modal.$('button:has-text("OK"), button:has-text("Yes"), button:has-text("Confirm")');
      if (confirmButton) await confirmButton.click();
      break;
    case 'cancel':
      const cancelButton = await modal.$('button:has-text("Cancel"), button:has-text("No")');
      if (cancelButton) await cancelButton.click();
      break;
  }
}
    `;
  }

  generateRecommendations() {
    const recommendations = [
      {
        type: 'IMMEDIATE',
        title: 'Fix VSCode Quick Input Modal Detection',
        description: 'Implement multiple detection strategies for VSCode quick input modals',
        actions: [
          'Add .quick-input-widget detection',
          'Add .monaco-quick-input detection',
          'Add role="dialog" detection',
          'Add aria-label variations'
        ]
      },
      {
        type: 'ENHANCEMENT',
        title: 'Improve VSCode Dialog Modal Handling',
        description: 'Ensure reliable VSCode dialog modal interaction',
        actions: [
          'Add .monaco-dialog detection',
          'Add confirmation button detection',
          'Add cancel button detection',
          'Add escape key handling'
        ]
      },
      {
        type: 'TESTING',
        title: 'Add VSCode Modal Functionality Tests',
        description: 'Create comprehensive tests for VSCode modal automation',
        actions: [
          'Test quick input modal opening',
          'Test dialog modal interaction',
          'Test context menu detection',
          'Test notification overlay handling'
        ]
      }
    ];

    this.results.recommendations = recommendations;
  }

  saveResults(analysis) {
    const outputFile = path.join(this.outputDir, 'vscode-modal-analysis.json');
    fs.writeFileSync(outputFile, JSON.stringify(analysis, null, 2));
    
    // Also save a summary report
    const summaryFile = path.join(this.outputDir, 'vscode-modal-analysis-summary.md');
    const summary = this.generateSummaryReport(analysis);
    fs.writeFileSync(summaryFile, summary);
    
    logger.info(`📄 VSCode modal analysis saved: ${outputFile}`);
    logger.info(`📄 VSCode modal summary saved: ${summaryFile}`);
  }

  generateSummaryReport(analysis) {
    const { summary, issues, recommendations } = analysis;
    
    return `# VSCode Modal Analysis Summary

## Overview
- **Generated**: ${analysis.meta.generatedAt}
- **Coverage**: ${summary.coverage}%
- **Critical Issues**: ${summary.criticalIssues}
- **Ready for Automation**: ${summary.readyForAutomation ? '✅ YES' : '❌ NO'}

## Found VSCode Modal Types
${Object.entries(analysis.optimizedSelectors).map(([modal, selector]) => 
  `- **${modal}**: \`${selector}\``
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
1. Fix critical modal issues first
2. Implement enhanced modal detection strategies
3. Add comprehensive modal testing
4. Validate modal automation reliability
`;
  }
}

// CLI Usage
if (require.main === module) {
  const analyzer = new ModalAnalyzer();
  
  async function run() {
    try {
      await analyzer.analyze();
    } catch (error) {
      console.error('❌ VSCode modal analysis failed:', error.message);
      process.exit(1);
    }
  }
  
  run();
}

module.exports = ModalAnalyzer; 