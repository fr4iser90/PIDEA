const fs = require('fs');
const path = require('path');
const BrowserManager = require('../../backend/infrastructure/external/BrowserManager');
const IDEManager = require('../../backend/infrastructure/external/IDEManager');

class EnhancedDOMCollector {
  constructor() {
    this.browserManager = new BrowserManager();
    this.ideManager = new IDEManager();
    this.outputDir = path.join(__dirname, '../output/enhanced-collected');
    this.collectedStates = new Map();
    
    // Enhanced VSCode state configurations with comprehensive modal coverage
    this.enhancedStateConfigs = [
      // === BASIC VSCode IDE STATES ===
      {
        name: 'default-state',
        description: 'Basis VSCode IDE-Ansicht (clean state)',
        action: () => this.collectDefaultState()
      },
      {
        name: 'chat-active',
        description: 'VSCode Chat Panel aktiv und sichtbar',
        action: () => this.activateChat()
      },
      
      // === VSCode MODAL STATES (HIGH PRIORITY) ===
      {
        name: 'modal-command-palette',
        description: 'VSCode Command Palette Modal (Ctrl+Shift+P)',
        action: () => this.openCommandPaletteModal()
      },
      {
        name: 'modal-quick-open',
        description: 'VSCode Quick Open Modal (Ctrl+P)',
        action: () => this.openQuickOpenModal()
      },
      {
        name: 'modal-global-search',
        description: 'VSCode Global Search Modal (Ctrl+Shift+F)',
        action: () => this.openGlobalSearchModal()
      },
      {
        name: 'modal-extensions',
        description: 'VSCode Extensions Panel Modal (Ctrl+Shift+X)',
        action: () => this.openExtensionsModal()
      },
      {
        name: 'modal-settings',
        description: 'VSCode Settings Modal (Ctrl+,)',
        action: () => this.openSettingsModal()
      },
      {
        name: 'modal-debug',
        description: 'VSCode Debug Panel Modal (Ctrl+Shift+D)',
        action: () => this.openDebugModal()
      },
      {
        name: 'modal-problems',
        description: 'VSCode Problems Panel Modal (Ctrl+Shift+M)',
        action: () => this.openProblemsModal()
      },
      {
        name: 'modal-output',
        description: 'VSCode Output Panel Modal (Ctrl+Shift+U)',
        action: () => this.openOutputModal()
      },
      
      // === ENHANCED VSCode CHAT STATES ===
      {
        name: 'chat-input-focused',
        description: 'VSCode Chat Input Field Focused',
        action: () => this.focusChatInput()
      },
      {
        name: 'chat-loading',
        description: 'VSCode Chat Loading State (AI Responding)',
        action: () => this.triggerChatLoading()
      },
      {
        name: 'chat-history-expanded',
        description: 'VSCode Chat History Expanded',
        action: () => this.expandChatHistory()
      },
      {
        name: 'new-chat-modal',
        description: 'VSCode New Chat Modal (appears after clicking New Chat)',
        action: () => this.triggerNewChatModal()
      },
      {
        name: 'chat-settings-modal',
        description: 'VSCode Chat Settings Modal',
        action: () => this.openChatSettingsModal()
      },
      {
        name: 'chat-export-modal',
        description: 'VSCode Chat Export Modal',
        action: () => this.openChatExportModal()
      },
      
      // === VSCode CONTEXT MENU STATES ===
      {
        name: 'context-file-explorer',
        description: 'VSCode File Explorer Context Menu (Right-click)',
        action: () => this.openFileContextMenu()
      },
      {
        name: 'context-editor',
        description: 'VSCode Editor Context Menu (Right-click)',
        action: () => this.openEditorContextMenu()
      },
      {
        name: 'context-git',
        description: 'VSCode Git Panel Context Menu (Right-click)',
        action: () => this.openGitContextMenu()
      },
      {
        name: 'context-terminal',
        description: 'VSCode Terminal Context Menu (Right-click)',
        action: () => this.openTerminalContextMenu()
      },
      
      // === ADVANCED VSCode IDE STATES ===
      {
        name: 'debug-session-active',
        description: 'VSCode Debug Session Active (F5)',
        action: () => this.startDebugSession()
      },
      {
        name: 'breakpoint-set',
        description: 'VSCode Breakpoint Set in Editor',
        action: () => this.setBreakpoint()
      },
      {
        name: 'extension-install-modal',
        description: 'VSCode Extension Installation Modal',
        action: () => this.openExtensionInstallModal()
      },
      {
        name: 'notification-overlay',
        description: 'VSCode Notification Overlay Visible',
        action: () => this.triggerNotification()
      },
      {
        name: 'error-dialog',
        description: 'VSCode Error Dialog Modal',
        action: () => this.triggerErrorDialog()
      },
      {
        name: 'confirmation-dialog',
        description: 'VSCode Confirmation Dialog Modal',
        action: () => this.triggerConfirmationDialog()
      }
    ];

    this.ensureOutputDir();
  }

  ensureOutputDir() {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
      console.log(`📁 Created enhanced VSCode collection directory: ${this.outputDir}`);
    }
  }

  async initialize() {
    console.log('🚀 Enhanced VSCode DOM Collector starting...');
    console.log('📡 Connecting to VSCode IDE via CDP...\n');

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
      console.log(`✅ Connected to VSCode IDE on port ${vscodeIDE.port}`);
      
      return true;
    } catch (error) {
      console.error('❌ VSCode connection failed:', error.message);
      throw error;
    }
  }

  async collectAllEnhancedStates() {
    await this.initialize();
    
    console.log(`\n🎯 Collecting ${this.enhancedStateConfigs.length} enhanced VSCode IDE states...\n`);

    for (const [index, config] of this.enhancedStateConfigs.entries()) {
      try {
        console.log(`📄 [${index + 1}/${this.enhancedStateConfigs.length}] ${config.name}`);
        console.log(`   ${config.description}`);
        
        // Activate state
        await config.action();
        
        // Collect DOM with enhanced analysis
        await this.collectEnhancedState(config.name, config.description);
        
        // Wait between states
        await this.wait(2000);
        
        console.log(`   ✅ Successfully collected\n`);
        
      } catch (error) {
        console.error(`   ❌ Error in ${config.name}:`, error.message);
      }
    }

    await this.generateEnhancedReport();
    await this.cleanup();

    // Start enhanced analysis
    console.log('\n🔄 Starting enhanced VSCode analysis...');
    await this.runEnhancedAnalysis();
  }

  async runEnhancedAnalysis() {
    try {
      // 1. Enhanced Chat Analysis
      console.log('\n📊 [1/5] Enhanced VSCode Chat Analysis...');
      const EnhancedChatAnalyzer = require('./enhanced-chat-analyzer');
      const chatAnalyzer = new EnhancedChatAnalyzer();
      await chatAnalyzer.analyze();

      // 2. Modal Analysis
      console.log('\n📊 [2/5] VSCode Modal Analysis...');
      const ModalAnalyzer = require('./modal-analyzer');
      const modalAnalyzer = new ModalAnalyzer();
      await modalAnalyzer.analyze();

      // 3. Bulk DOM Analysis
      console.log('\n📊 [3/5] VSCode Bulk DOM Analysis...');
      const BulkDOMAnalyzer = require('./bulk-dom-analyzer');
      const bulkAnalyzer = new BulkDOMAnalyzer();
      await bulkAnalyzer.analyze();

      // 4. Coverage Validation
      console.log('\n✅ [4/5] Enhanced VSCode Coverage Validation...');
      const CoverageValidator = require('./coverage-validator');
      const validator = new CoverageValidator();
      await validator.validate();

      // 5. Enhanced Selector Generation
      console.log('\n🔧 [5/5] Enhanced VSCode Selector Generation...');
      const SelectorGenerator = require('./selector-generator');
      const generator = new SelectorGenerator();
      await generator.generate();

      console.log('\n🎉 ENHANCED VSCode AUTOMATION COMPLETED!');
      console.log('📁 All files generated in: vscode-chat-agent/generated/');

    } catch (error) {
      console.error('❌ Enhanced VSCode analysis failed:', error.message);
      throw error;
    }
  }

  async collectEnhancedState(stateName, description) {
    const page = await this.browserManager.getPage();
    if (!page) {
      throw new Error('No VSCode IDE connection');
    }

    // Wait for UI updates
    await this.wait(1000);

    // Get complete DOM
    const html = await page.content();
    
    // Enhanced metadata collection
    const metadata = await this.collectEnhancedMetadata(page, stateName);
    
    // Save to file
    const filename = `${stateName}.md`;
    const filepath = path.join(this.outputDir, filename);
    
    const content = `# ${stateName} Enhanced VSCode DOM Data

## Description
${description}

## Collection Info
- Timestamp: ${new Date().toISOString()}
- Method: Enhanced CDP Connection
- IDE Port: ${this.browserManager.getCurrentPort()}
- State Type: ${this.getStateType(stateName)}

## Enhanced Metadata
\`\`\`json
${JSON.stringify(metadata, null, 2)}
\`\`\`

## DOM Content
\`\`\`html
${html}
\`\`\`
`;

    fs.writeFileSync(filepath, content);
    
    // Store metadata
    this.collectedStates.set(stateName, {
      description,
      filename,
      timestamp: new Date().toISOString(),
      elementCount: (html.match(/<[^>]*>/g) || []).length,
      size: html.length,
      metadata
    });
  }

  async collectEnhancedMetadata(page, stateName) {
    const metadata = {
      stateName,
      timestamp: new Date().toISOString(),
      url: await page.url(),
      title: await page.title(),
      viewport: await page.viewportSize(),
      modalElements: [],
      chatElements: [],
      overlayElements: [],
      focusElements: []
    };

    try {
      // Collect modal/overlay elements
      metadata.modalElements = await page.evaluate(() => {
        const modals = document.querySelectorAll('[role="dialog"], .monaco-overlay, .modal-backdrop, .quick-input-widget');
        return Array.from(modals).map(el => ({
          tagName: el.tagName,
          className: el.className,
          id: el.id,
          ariaLabel: el.getAttribute('aria-label'),
          role: el.getAttribute('role'),
          zIndex: window.getComputedStyle(el).zIndex
        }));
      });

      // Collect chat elements
      metadata.chatElements = await page.evaluate(() => {
        const chatElements = document.querySelectorAll('.aislash-container, .chat-container, [aria-label*="Chat"]');
        return Array.from(chatElements).map(el => ({
          tagName: el.tagName,
          className: el.className,
          id: el.id,
          ariaLabel: el.getAttribute('aria-label'),
          contentEditable: el.getAttribute('contenteditable')
        }));
      });

      // Collect overlay elements
      metadata.overlayElements = await page.evaluate(() => {
        const overlays = document.querySelectorAll('.monaco-overlay, .overlay, [style*="z-index"]');
        return Array.from(overlays).map(el => ({
          tagName: el.tagName,
          className: el.className,
          id: el.id,
          zIndex: window.getComputedStyle(el).zIndex,
          position: window.getComputedStyle(el).position
        }));
      });

      // Collect focused elements
      metadata.focusElements = await page.evaluate(() => {
        const focused = document.activeElement;
        return focused ? {
          tagName: focused.tagName,
          className: focused.className,
          id: focused.id,
          ariaLabel: focused.getAttribute('aria-label'),
          contentEditable: focused.getAttribute('contenteditable')
        } : null;
      });

    } catch (error) {
      console.warn(`⚠️ VSCode metadata collection failed for ${stateName}:`, error.message);
    }

    return metadata;
  }

  getStateType(stateName) {
    if (stateName.includes('modal')) return 'Modal/Overlay';
    if (stateName.includes('chat')) return 'Chat';
    if (stateName.includes('context')) return 'Context Menu';
    if (stateName.includes('debug')) return 'Debug';
    return 'Standard';
  }

  // === ENHANCED VSCode STATE ACTIVATION METHODS ===
  
  async collectDefaultState() {
    const page = await this.browserManager.getPage();
    await page.keyboard.press('Escape'); // Close any dialogs
    await this.wait(500);
  }

  async activateChat() {
    const page = await this.browserManager.getPage();
    
    // Try multiple strategies to activate VSCode chat
    const chatSelectors = [
      '[aria-label*="New Chat"]',
      '[title*="New Chat"]',
      '.codicon-add-two',
      '.action-label[aria-label*="New"]',
      'button[aria-label*="New Chat"]'
    ];

    for (const selector of chatSelectors) {
      try {
        const element = await page.$(selector);
        if (element) {
          await element.click();
          await this.wait(1000);
          
          // CRITICAL: Handle the VSCode New Chat modal that appears after clicking New Chat
          await this.handleNewChatModal(page);
          return;
        }
      } catch (e) {
        continue;
      }
    }
    
    // Fallback: try keyboard shortcut for VSCode
    await page.keyboard.press('Control+Shift+I');
    await this.wait(1000);
    await this.handleNewChatModal(page);
  }

  async handleNewChatModal(page) {
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
            
            console.log(`  ✅ Clicking VSCode New Chat modal button: ${text || ariaLabel}`);
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
            console.log(`  ⚠️ Clicking any VSCode modal button: ${text || ariaLabel}`);
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
      console.log(`  ⚠️ VSCode New Chat modal handling failed: ${error.message}`);
    }
  }

  async focusChatInput() {
    const page = await this.browserManager.getPage();
    
    // First ensure chat is active
    await this.activateChat();
    
    // Focus VSCode chat input with VSCode-specific selectors
    const inputSelectors = [
      'textarea[data-testid="chat-input"]',
      'textarea[placeholder*="Type your task"]',
      '.chat-input-container textarea',
      '.chat-editor-container textarea',
      '.aislash-editor-input[contenteditable="true"]',
      '[contenteditable="true"]',
      'textarea[placeholder*="chat"]',
      '.chat-input'
    ];

    for (const selector of inputSelectors) {
      try {
        const element = await page.$(selector);
        if (element) {
          await element.click();
          await element.focus();
          console.log(`  ✅ Found VSCode chat input with selector: ${selector}`);
          return;
        }
      } catch (e) {
        continue;
      }
    }
    
    console.log(`  ⚠️ No VSCode chat input found`);
  }

  async triggerChatLoading() {
    const page = await this.browserManager.getPage();
    
    // Focus chat input and send a message to trigger loading
    await this.focusChatInput();
    await page.keyboard.type('Test message for loading state');
    
    // Try to find and click VSCode send button
    const sendSelectors = [
      '.codicon-send',
      '.action-label[aria-label*="Send"]',
      '.chat-execute-toolbar .codicon-send',
      '.monaco-action-bar .codicon-send'
    ];
    
    for (const selector of sendSelectors) {
      try {
        const sendButton = await page.$(selector);
        if (sendButton) {
          await sendButton.click();
          console.log(`  ✅ Clicked VSCode send button: ${selector}`);
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    await this.wait(2000); // Wait for AI response
  }

  async expandChatHistory() {
    const page = await this.browserManager.getPage();
    
    // Try to find and click VSCode chat history button
    const historySelectors = [
      '[aria-label*="Chat History"]',
      '[aria-label*="Show Chat History"]',
      '.chat-history-button'
    ];

    for (const selector of historySelectors) {
      try {
        const element = await page.$(selector);
        if (element) {
          await element.click();
          await this.wait(1000);
          return;
        }
      } catch (e) {
        continue;
      }
    }
  }

  // === VSCode MODAL ACTIVATION METHODS ===
  
  async openCommandPaletteModal() {
    const page = await this.browserManager.getPage();
    await page.keyboard.press('Control+Shift+P');
    await page.waitForSelector('.quick-input-widget', { timeout: 3000 });
  }

  async openQuickOpenModal() {
    const page = await this.browserManager.getPage();
    await page.keyboard.press('Control+P');
    await page.waitForSelector('.quick-input-widget', { timeout: 3000 });
  }

  async openGlobalSearchModal() {
    const page = await this.browserManager.getPage();
    await page.keyboard.press('Control+Shift+F');
    await this.wait(1000);
  }

  async openExtensionsModal() {
    const page = await this.browserManager.getPage();
    await page.keyboard.press('Control+Shift+X');
    await this.wait(1000);
  }

  async openSettingsModal() {
    const page = await this.browserManager.getPage();
    await page.keyboard.press('Control+,');
    await this.wait(1000);
  }

  async openDebugModal() {
    const page = await this.browserManager.getPage();
    await page.keyboard.press('Control+Shift+D');
    await this.wait(1000);
  }

  async openProblemsModal() {
    const page = await this.browserManager.getPage();
    await page.keyboard.press('Control+Shift+M');
    await this.wait(1000);
  }

  async openOutputModal() {
    const page = await this.browserManager.getPage();
    await page.keyboard.press('Control+Shift+U');
    await this.wait(1000);
  }

  // === VSCode CONTEXT MENU METHODS ===
  
  async openFileContextMenu() {
    const page = await this.browserManager.getPage();
    
    // Find a file in explorer and right-click
    const fileElement = await page.$('.monaco-list-row, .explorer-item');
    if (fileElement) {
      await fileElement.click({ button: 'right' });
      await this.wait(500);
    }
  }

  async openEditorContextMenu() {
    const page = await this.browserManager.getPage();
    
    // Right-click in editor area
    const editor = await page.$('.monaco-editor, .editor-instance');
    if (editor) {
      await editor.click({ button: 'right' });
      await this.wait(500);
    }
  }

  async openGitContextMenu() {
    const page = await this.browserManager.getPage();
    
    // Find git element and right-click
    const gitElement = await page.$('.scm-resource, .git-item');
    if (gitElement) {
      await gitElement.click({ button: 'right' });
      await this.wait(500);
    }
  }

  async openTerminalContextMenu() {
    const page = await this.browserManager.getPage();
    
    // Right-click in terminal
    const terminal = await page.$('.terminal-wrapper, .xterm');
    if (terminal) {
      await terminal.click({ button: 'right' });
      await this.wait(500);
    }
  }

  // === ADVANCED VSCode STATE METHODS ===
  
  async startDebugSession() {
    const page = await this.browserManager.getPage();
    await page.keyboard.press('F5');
    await this.wait(2000);
  }

  async setBreakpoint() {
    const page = await this.browserManager.getPage();
    
    // Click in gutter to set breakpoint
    const gutter = await page.$('.glyph-margin-widgets, .margin-view-overlays');
    if (gutter) {
      await gutter.click();
      await this.wait(500);
    }
  }

  async openExtensionInstallModal() {
    const page = await this.browserManager.getPage();
    
    // Open extensions and try to install one
    await this.openExtensionsModal();
    
    // Find install button
    const installButton = await page.$('[aria-label*="Install"], .install-button');
    if (installButton) {
      await installButton.click();
      await this.wait(1000);
    }
  }

  async triggerNotification() {
    const page = await this.browserManager.getPage();
    
    // Try to trigger a notification by performing an action
    await page.keyboard.press('Control+Shift+P');
    await page.keyboard.type('Show Notifications');
    await page.keyboard.press('Enter');
    await this.wait(1000);
  }

  async triggerErrorDialog() {
    const page = await this.browserManager.getPage();
    
    // Try to trigger error by invalid action
    await page.keyboard.press('Control+Shift+P');
    await page.keyboard.type('Invalid Command That Should Fail');
    await page.keyboard.press('Enter');
    await this.wait(1000);
  }

  async triggerConfirmationDialog() {
    const page = await this.browserManager.getPage();
    
    // Try to trigger confirmation dialog
    await page.keyboard.press('Control+Shift+P');
    await page.keyboard.type('Reload Window');
    await page.keyboard.press('Enter');
    await this.wait(1000);
  }

  // === VSCode CHAT MODAL METHODS ===
  
  async openChatSettingsModal() {
    const page = await this.browserManager.getPage();
    
    // Find VSCode chat settings button
    const settingsButton = await page.$('[aria-label*="Settings"], .chat-settings');
    if (settingsButton) {
      await settingsButton.click();
      await this.wait(1000);
    }
  }

  async openChatExportModal() {
    const page = await this.browserManager.getPage();
    
    // Find export button in VSCode chat
    const exportButton = await page.$('[aria-label*="Export"], .chat-export');
    if (exportButton) {
      await exportButton.click();
      await this.wait(1000);
    }
  }

  async triggerNewChatModal() {
    const page = await this.browserManager.getPage();
    
    // First click New Chat to trigger the modal
    await this.activateChat();
    
    // The modal should now be visible - don't close it, just collect DOM
    console.log('  📋 Collecting VSCode New Chat modal DOM...');
    await this.wait(1000);
  }

  async wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async generateEnhancedReport() {
    const report = {
      meta: {
        generatedAt: new Date().toISOString(),
        collector: 'enhanced-dom-collector.js',
        method: 'Enhanced CDP Connection',
        idePort: this.browserManager.getCurrentPort(),
        totalStatesCollected: this.collectedStates.size,
        stateTypes: this.getStateTypeBreakdown()
      },
      collectedStates: Object.fromEntries(this.collectedStates),
      summary: {
        totalFiles: this.collectedStates.size,
        outputDirectory: this.outputDir,
        avgElementCount: Math.round(
          Array.from(this.collectedStates.values())
            .reduce((sum, state) => sum + state.elementCount, 0) / this.collectedStates.size
        ),
        modalStates: Array.from(this.collectedStates.keys()).filter(name => name.includes('modal')).length,
        chatStates: Array.from(this.collectedStates.keys()).filter(name => name.includes('chat')).length,
        contextStates: Array.from(this.collectedStates.keys()).filter(name => name.includes('context')).length
      }
    };

    const reportPath = path.join(this.outputDir, 'enhanced-vscode-collection-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log('\n📊 ENHANCED VSCode COLLECTION SUCCESSFUL!');
    console.log(`📁 Directory: ${this.outputDir}`);
    console.log(`📄 Files: ${this.collectedStates.size}`);
    console.log(`📊 Report: ${reportPath}`);
    
    // Show file breakdown
    console.log('\n📋 COLLECTED VSCode FILES BY TYPE:');
    const stateTypes = this.getStateTypeBreakdown();
    Object.entries(stateTypes).forEach(([type, count]) => {
      console.log(`  ✅ ${type}: ${count} files`);
    });
  }

  getStateTypeBreakdown() {
    const breakdown = {};
    Array.from(this.collectedStates.keys()).forEach(stateName => {
      const type = this.getStateType(stateName);
      breakdown[type] = (breakdown[type] || 0) + 1;
    });
    return breakdown;
  }

  async cleanup() {
    try {
      await this.browserManager.disconnect();
    } catch (error) {
      console.log('⚠️ VSCode cleanup warning:', error.message);
    }
  }
}

// CLI Usage
if (require.main === module) {
  const collector = new EnhancedDOMCollector();
  
  async function run() {
    try {
      await collector.collectAllEnhancedStates();
    } catch (error) {
      console.error('❌ Enhanced VSCode collection failed:', error.message);
      console.error(error.stack);
    }
  }
  
  run();
}

module.exports = EnhancedDOMCollector; 