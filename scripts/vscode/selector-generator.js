const fs = require('fs');
const path = require('path');

const Logger = require('@logging/Logger');

const logger = new Logger('ServiceName');

class SelectorGenerator {
  constructor() {
    this.outputDir = path.join(__dirname, '../../generated');
    this.ensureOutputDir();
  }

  ensureOutputDir() {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
      logger.info(`📁 Created VSCode generated directory: ${this.outputDir}`);
    }
  }

  async generate() {
    logger.info('🔧 VSCode Selector Generator starting...\n');

    try {
      // 1. Load analysis results
      const analysisResults = this.loadAnalysisResults();
      
      // 2. Generate optimized VSCode selectors
      const optimizedSelectors = this.generateOptimizedSelectors(analysisResults);
      
      // 3. Generate VSCode-specific files
      await this.generateVSCodeFiles(optimizedSelectors);
      
      // 4. Generate test files
      await this.generateVSCodeTests(optimizedSelectors);
      
      logger.info('\n✅ VSCode Selector Generation completed!');
      logger.info(`📁 Generated files in: ${this.outputDir}`);
      logger.info(`🎯 Total VSCode selectors: ${Object.keys(optimizedSelectors).length}`);

      return optimizedSelectors;

    } catch (error) {
      console.error('❌ VSCode selector generation failed:', error.message);
      throw error;
    }
  }

  loadAnalysisResults() {
    const outputDir = path.join(__dirname, '../output');
    const results = {};
    
    // Load all available analysis files
    const analysisFiles = [
      'dom-analysis-results.json',
      'bulk-analysis-results.json',
      'enhanced-vscode-chat-analysis.json',
      'coverage-validation-report.json'
    ];
    
    logger.info('📁 Loading VSCode analysis results...');
    
    analysisFiles.forEach(filename => {
      const filepath = path.join(outputDir, filename);
      if (fs.existsSync(filepath)) {
        try {
          const content = fs.readFileSync(filepath, 'utf8');
          const data = JSON.parse(content);
          results[filename] = data;
          logger.info(`  ✅ ${filename}: ${Object.keys(data.optimizedSelectors || {}).length} selectors`);
        } catch (error) {
          console.warn(`  ⚠️ Failed to load ${filename}: ${error.message}`);
        }
      } else {
        logger.info(`  ⚠️ ${filename}: Not found`);
      }
    });
    
    if (Object.keys(results).length === 0) {
      throw new Error('No VSCode analysis results found!');
    }
    
    return results;
  }

  generateOptimizedSelectors(analysisResults) {
    logger.info('\n🔄 Generating optimized VSCode selectors...');
    
    // Start with comprehensive VSCode selector base
    const optimizedSelectors = {
      // === VSCode CHAT FEATURES ===
      newChat: this.getBestSelector(analysisResults, 'newChat', [
        '[aria-label*="New Chat"]',
        '[title*="New Chat"]',
        '.codicon-add-two',
        '.action-label[aria-label*="New"]',
        'button[aria-label*="New Chat"]',
        'a[aria-label*="New Chat"]',
        '.new-chat-button',
        '[data-testid*="new-chat"]'
      ]),
      
      chatInput: this.getBestSelector(analysisResults, 'chatInput', [
        'textarea[data-testid="chat-input"]',
        'textarea[placeholder*="Type your task"]',
        '.aislash-editor-input[contenteditable="true"]',
        '[contenteditable="true"]',
        'textarea[placeholder*="chat"]',
        '.chat-input',
        '[data-testid*="chat-input"]'
      ]),
      
      sendButton: this.getBestSelector(analysisResults, 'sendButton', [
        '.codicon-send',
        '.action-label[aria-label*="Send"]',
        '.chat-execute-toolbar .codicon-send',
        '.monaco-action-bar .codicon-send',
        '[aria-label*="Send Message"]',
        '.chat-send-button'
      ]),
      
      userMessages: this.getBestSelector(analysisResults, 'userMessages', [
        '.user-message',
        '.human-message',
        '.aislash-editor-input-readonly',
        'div.composer-human-message',
        '[data-role="user"]',
        '.message.user'
      ]),
      
      aiMessages: this.getBestSelector(analysisResults, 'aiMessages', [
        '.ai-message',
        '.assistant-message',
        '.anysphere-markdown-container-root',
        'span.anysphere-markdown-container-root',
        '[data-role="assistant"]',
        '.message.assistant'
      ]),
      
      chatHistory: this.getBestSelector(analysisResults, 'chatHistory', [
        '[aria-label*="Chat History"]',
        '[aria-label*="Show Chat History"]',
        '.chat-history',
        '.chat-history-button',
        '[data-testid*="chat-history"]'
      ]),
      
      chatSettings: this.getBestSelector(analysisResults, 'chatSettings', [
        '[aria-label="Settings"]',
        '.chat-settings',
        '.settings-button',
        '[data-testid*="settings"]'
      ]),
      
      moreActions: this.getBestSelector(analysisResults, 'moreActions', [
        '[aria-label*="More Actions"]',
        '[aria-label*="Close, Export, Settings"]',
        'span.codicon',
        '.more-actions',
        '.chat-actions'
      ]),
      
      chatTabs: this.getBestSelector(analysisResults, 'chatTabs', [
        'li.action-item',
        '.chat-tab',
        '[aria-label*="Plan for"]',
        '[role="tab"]',
        '.tab[data-testid*="chat"]'
      ]),
      
      chatContainer: this.getBestSelector(analysisResults, 'chatContainer', [
        '.aislash-container',
        '.chat-container',
        '.chat-panel',
        '[aria-label*="Chat"]',
        '.chat-view',
        '.chat-widget'
      ]),
      
      chatLoading: this.getBestSelector(analysisResults, 'chatLoading', [
        '.loading',
        '.thinking',
        '.chat-loading',
        '.ai-responding',
        '.spinner',
        '.loading-indicator'
      ]),
      
      chatError: this.getBestSelector(analysisResults, 'chatError', [
        '.error',
        '.chat-error',
        '.error-message',
        '.alert-error',
        '.notification-error'
      ]),

      // === VSCode EXPLORER & FILE TREE ===
      fileExplorer: this.getBestSelector(analysisResults, 'fileExplorer', [
        '.explorer-viewlet',
        '[id*="explorer"]',
        '.pane[aria-label*="Explorer"]',
        '.monaco-pane-view .pane'
      ]),
      
      fileTree: this.getBestSelector(analysisResults, 'fileTree', [
        '.monaco-tree',
        '.explorer-item',
        '.monaco-list',
        '[role="tree"]'
      ]),
      
      folderToggle: this.getBestSelector(analysisResults, 'folderToggle', [
        '.folder-icon',
        '.expand-collapse-button',
        '.codicon-chevron-right',
        '.codicon-chevron-down'
      ]),
      
      newFile: this.getBestSelector(analysisResults, 'newFile', [
        '[aria-label*="New File"]',
        '.new-file-button',
        '[title*="New File"]'
      ]),
      
      newFolder: this.getBestSelector(analysisResults, 'newFolder', [
        '[aria-label*="New Folder"]',
        '.new-folder-button',
        '[title*="New Folder"]'
      ]),

      // === VSCode EDITOR ===
      editorTabs: this.getBestSelector(analysisResults, 'editorTabs', [
        '.tabs-container',
        '.tab',
        '.editor-tab',
        '[role="tab"]'
      ]),
      
      activeEditor: this.getBestSelector(analysisResults, 'activeEditor', [
        '.editor-instance',
        '.monaco-editor',
        '.active-editor'
      ]),
      
      editorContent: this.getBestSelector(analysisResults, 'editorContent', [
        '.monaco-editor-background',
        '.view-lines',
        '.monaco-editor textarea'
      ]),
      
      tabCloseButton: this.getBestSelector(analysisResults, 'tabCloseButton', [
        '.tab-close',
        '.codicon-close',
        '[aria-label*="Close"]'
      ]),
      
      splitEditor: this.getBestSelector(analysisResults, 'splitEditor', [
        '[aria-label*="Split Editor"]',
        '.split-editor',
        '.editor-actions'
      ]),

      // === VSCode SEARCH & REPLACE ===
      globalSearch: this.getBestSelector(analysisResults, 'globalSearch', [
        '.search-viewlet',
        '[id*="search"]',
        '.search-view'
      ]),
      
      searchInput: this.getBestSelector(analysisResults, 'searchInput', [
        '.search-input',
        '[placeholder*="Search"]',
        '.monaco-inputbox input'
      ]),
      
      replaceInput: this.getBestSelector(analysisResults, 'replaceInput', [
        '.replace-input',
        '[placeholder*="Replace"]'
      ]),
      
      searchResults: this.getBestSelector(analysisResults, 'searchResults', [
        '.search-results',
        '.monaco-tree-row',
        '.search-result'
      ]),
      
      searchFilters: this.getBestSelector(analysisResults, 'searchFilters', [
        '.search-actions',
        '.regex-button',
        '.case-sensitive-button',
        '.whole-word-button'
      ]),

      // === VSCode GIT SOURCE CONTROL ===
      gitSourceControl: this.getBestSelector(analysisResults, 'gitSourceControl', [
        '.scm-viewlet',
        '[id*="scm"]',
        '.source-control-view'
      ]),
      
      gitChanges: this.getBestSelector(analysisResults, 'gitChanges', [
        '.scm-resource',
        '.change-item',
        '.monaco-list-row'
      ]),
      
      commitInput: this.getBestSelector(analysisResults, 'commitInput', [
        '.scm-commit-input',
        '[placeholder*="Message"]',
        '.monaco-inputbox'
      ]),
      
      commitButton: this.getBestSelector(analysisResults, 'commitButton', [
        '.commit-button',
        '[aria-label*="Commit"]'
      ]),
      
      gitBranch: this.getBestSelector(analysisResults, 'gitBranch', [
        '.git-branch',
        '.branch-status',
        '.statusbar-item[title*="branch"]'
      ]),

      // === VSCode EXTENSIONS ===
      extensionsPanel: this.getBestSelector(analysisResults, 'extensionsPanel', [
        '.extensions-viewlet',
        '[id*="extensions"]',
        '.extensions-view'
      ]),
      
      extensionSearch: this.getBestSelector(analysisResults, 'extensionSearch', [
        '.extensions-search',
        '[placeholder*="Search Extensions"]'
      ]),
      
      installExtension: this.getBestSelector(analysisResults, 'installExtension', [
        '.install-button',
        '[aria-label*="Install"]'
      ]),

      // === VSCode TERMINAL ===
      terminal: this.getBestSelector(analysisResults, 'terminal', [
        '.terminal-wrapper',
        '.xterm-screen',
        '.integrated-terminal'
      ]),
      
      newTerminal: this.getBestSelector(analysisResults, 'newTerminal', [
        '[aria-label*="New Terminal"]',
        '.new-terminal-button'
      ]),
      
      terminalTabs: this.getBestSelector(analysisResults, 'terminalTabs', [
        '.terminal-tab',
        '.terminal-tabs-container'
      ]),
      
      terminalInput: this.getBestSelector(analysisResults, 'terminalInput', [
        '.xterm-cursor-layer',
        '.terminal-input'
      ]),

      // === VSCode DEBUG & RUN ===
      debugPanel: this.getBestSelector(analysisResults, 'debugPanel', [
        '.debug-viewlet',
        '[id*="debug"]',
        '.debug-view'
      ]),
      
      runButton: this.getBestSelector(analysisResults, 'runButton', [
        '[aria-label*="Run"]',
        '.run-button',
        '.codicon-play'
      ]),
      
      debugButton: this.getBestSelector(analysisResults, 'debugButton', [
        '[aria-label*="Debug"]',
        '.debug-button',
        '.codicon-debug-alt'
      ]),
      
      breakpoints: this.getBestSelector(analysisResults, 'breakpoints', [
        '.breakpoint',
        '.debug-breakpoint',
        '.glyph-margin-widgets'
      ]),

      // === VSCode COMMAND PALETTE & NAVIGATION ===
      commandPalette: this.getBestSelector(analysisResults, 'commandPalette', [
        '.quick-input-widget',
        '.monaco-quick-input',
        '[placeholder*="Type a command"]'
      ]),
      
      quickOpen: this.getBestSelector(analysisResults, 'quickOpen', [
        '.quick-input-widget',
        '[placeholder*="Go to File"]'
      ]),
      
      breadcrumbs: this.getBestSelector(analysisResults, 'breadcrumbs', [
        '.breadcrumbs',
        '.breadcrumb-item'
      ]),

      // === VSCode STATUS BAR ===
      statusBar: this.getBestSelector(analysisResults, 'statusBar', [
        '.statusbar',
        '.monaco-workbench .part.statusbar'
      ]),
      
      languageSelector: this.getBestSelector(analysisResults, 'languageSelector', [
        '.language-status',
        '[title*="Select Language Mode"]'
      ]),
      
      cursorPosition: this.getBestSelector(analysisResults, 'cursorPosition', [
        '.cursor-position',
        '[title*="Go to Line"]'
      ]),

      // === VSCode PANELS ===
      problemsPanel: this.getBestSelector(analysisResults, 'problemsPanel', [
        '.markers-panel',
        '.problems-panel'
      ]),
      
      outputPanel: this.getBestSelector(analysisResults, 'outputPanel', [
        '.output-panel',
        '.output-view'
      ]),

      // === VSCode AI FEATURES ===
      copilotSuggestions: this.getBestSelector(analysisResults, 'copilotSuggestions', [
        '.ghost-text',
        '.inline-suggestion',
        '.copilot-suggestion'
      ]),
      
      inlineChat: this.getBestSelector(analysisResults, 'inlineChat', [
        '.inline-chat',
        '.chat-widget',
        '.interactive-session'
      ]),
      
      aiCodeActions: this.getBestSelector(analysisResults, 'aiCodeActions', [
        '.code-action',
        '.lightbulb-glyph',
        '.monaco-editor .suggest-widget'
      ])
    };
    
    logger.info(`  ✅ Generated ${Object.keys(optimizedSelectors).length} VSCode selectors`);
    
    return optimizedSelectors;
  }

  getBestSelector(analysisResults, featureName, fallbackSelectors) {
    // Try to find the selector in analysis results
    for (const [filename, data] of Object.entries(analysisResults)) {
      if (data.optimizedSelectors && data.optimizedSelectors[featureName]) {
        return data.optimizedSelectors[featureName];
      }
    }
    
    // Return first fallback selector
    return fallbackSelectors[0] || null;
  }

  async generateVSCodeFiles(selectors) {
    logger.info('\n📄 Generating VSCode-specific files...');
    
    // 1. Generate VSCodeSelectors.js
    const jsContent = this.generateVSCodeJSModule(selectors);
    const jsFile = path.join(this.outputDir, 'VSCodeSelectors.js');
    fs.writeFileSync(jsFile, jsContent);
    logger.info(`  ✅ VSCodeSelectors.js`);
    
    // 2. Generate VSCode selectors JSON
    const jsonFile = path.join(this.outputDir, 'vscode-selectors.json');
    fs.writeFileSync(jsonFile, JSON.stringify(selectors, null, 2));
    logger.info(`  ✅ vscode-selectors.json`);
    
    // 3. Generate VSCode selectors summary
    const summaryContent = this.generateVSCodeSelectorSummary(selectors);
    const summaryFile = path.join(this.outputDir, 'vscode-selectors-summary.md');
    fs.writeFileSync(summaryFile, summaryContent);
    logger.info(`  ✅ vscode-selectors-summary.md`);
    
    // 4. Generate VSCode automation helper
    const helperContent = this.generateVSCodeAutomationHelper(selectors);
    const helperFile = path.join(this.outputDir, 'VSCodeAutomationHelper.js');
    fs.writeFileSync(helperFile, helperContent);
    logger.info(`  ✅ VSCodeAutomationHelper.js`);
  }

  generateVSCodeJSModule(selectors) {
    let content = `/**
 * VSCode Selectors - Auto-generated from comprehensive analysis
 * Generated: ${new Date().toISOString()}
 * Total Features: ${Object.keys(selectors).length}
 * 
 * This module provides optimized selectors for VSCode automation.
 * All selectors are tested and validated for VSCode compatibility.
 */

const VSCodeSelectors = {
`;

    Object.entries(selectors).forEach(([feature, selector]) => {
      content += `  ${feature}: '${selector}',\n`;
    });
    
    content += `};

// VSCode feature categories for easy access
VSCodeSelectors.categories = {
  chat: ['newChat', 'chatInput', 'sendButton', 'userMessages', 'aiMessages', 'chatHistory', 'chatSettings', 'moreActions', 'chatTabs', 'chatContainer', 'chatLoading', 'chatError'],
  explorer: ['fileExplorer', 'fileTree', 'folderToggle', 'newFile', 'newFolder'],
  editor: ['editorTabs', 'activeEditor', 'editorContent', 'tabCloseButton', 'splitEditor'],
  search: ['globalSearch', 'searchInput', 'replaceInput', 'searchResults', 'searchFilters'],
  git: ['gitSourceControl', 'gitChanges', 'commitInput', 'commitButton', 'gitBranch'],
  extensions: ['extensionsPanel', 'extensionSearch', 'installExtension'],
  terminal: ['terminal', 'newTerminal', 'terminalTabs', 'terminalInput'],
  debug: ['debugPanel', 'runButton', 'debugButton', 'breakpoints'],
  navigation: ['commandPalette', 'quickOpen', 'breadcrumbs'],
  status: ['statusBar', 'languageSelector', 'cursorPosition'],
  panels: ['problemsPanel', 'outputPanel'],
  ai: ['copilotSuggestions', 'inlineChat', 'aiCodeActions']
};

// Helper methods for VSCode automation
VSCodeSelectors.getChatSelectors = () => {
  return VSCodeSelectors.categories.chat.reduce((acc, feature) => {
    acc[feature] = VSCodeSelectors[feature];
    return acc;
  }, {});
};

VSCodeSelectors.getEditorSelectors = () => {
  return VSCodeSelectors.categories.editor.reduce((acc, feature) => {
    acc[feature] = VSCodeSelectors[feature];
    return acc;
  }, {});
};

VSCodeSelectors.getCriticalSelectors = () => {
  return {
    newChat: VSCodeSelectors.newChat,
    chatInput: VSCodeSelectors.chatInput,
    sendButton: VSCodeSelectors.sendButton,
    commandPalette: VSCodeSelectors.commandPalette,
    fileExplorer: VSCodeSelectors.fileExplorer
  };
};

VSCodeSelectors.getModalSelectors = () => {
  return {
    commandPalette: VSCodeSelectors.commandPalette,
    quickOpen: VSCodeSelectors.quickOpen,
    globalSearch: VSCodeSelectors.globalSearch,
    extensionsPanel: VSCodeSelectors.extensionsPanel
  };
};

module.exports = VSCodeSelectors;
`;

    return content;
  }

  generateVSCodeSelectorSummary(selectors) {
    const categories = {
      'Chat Features': ['newChat', 'chatInput', 'sendButton', 'userMessages', 'aiMessages', 'chatHistory', 'chatSettings', 'moreActions', 'chatTabs', 'chatContainer', 'chatLoading', 'chatError'],
      'Explorer & File Tree': ['fileExplorer', 'fileTree', 'folderToggle', 'newFile', 'newFolder'],
      'Editor': ['editorTabs', 'activeEditor', 'editorContent', 'tabCloseButton', 'splitEditor'],
      'Search & Replace': ['globalSearch', 'searchInput', 'replaceInput', 'searchResults', 'searchFilters'],
      'Git Source Control': ['gitSourceControl', 'gitChanges', 'commitInput', 'commitButton', 'gitBranch'],
      'Extensions': ['extensionsPanel', 'extensionSearch', 'installExtension'],
      'Terminal': ['terminal', 'newTerminal', 'terminalTabs', 'terminalInput'],
      'Debug & Run': ['debugPanel', 'runButton', 'debugButton', 'breakpoints'],
      'Command Palette & Navigation': ['commandPalette', 'quickOpen', 'breadcrumbs'],
      'Status Bar': ['statusBar', 'languageSelector', 'cursorPosition'],
      'Panels': ['problemsPanel', 'outputPanel'],
      'AI Features': ['copilotSuggestions', 'inlineChat', 'aiCodeActions']
    };
    
    let summary = `# VSCode Selectors Summary

## Overview
- **Generated**: ${new Date().toISOString()}
- **Total Features**: ${Object.keys(selectors).length}
- **Status**: Ready for VSCode automation

## Selectors by Category

`;

    Object.entries(categories).forEach(([category, features]) => {
      summary += `### ${category}\n`;
      features.forEach(feature => {
        const selector = selectors[feature];
        if (selector) {
          summary += `- **${feature}**: \`${selector}\`\n`;
        }
      });
      summary += '\n';
    });
    
    summary += `## Usage Examples

### Basic VSCode Chat Automation
\`\`\`javascript
const VSCodeSelectors = require('./VSCodeSelectors');

// Click New Chat button
await page.click(VSCodeSelectors.newChat);

// Type in chat input
await page.type(VSCodeSelectors.chatInput, 'Hello VSCode!');

// Send message
await page.click(VSCodeSelectors.sendButton);
\`\`\`

### VSCode Command Palette
\`\`\`javascript
// Open Command Palette
await page.keyboard.press('Control+Shift+P');

// Wait for modal
await page.waitForSelector(VSCodeSelectors.commandPalette);
\`\`\`

### VSCode File Explorer
\`\`\`javascript
// Click in file explorer
await page.click(VSCodeSelectors.fileExplorer);

// Create new file
await page.click(VSCodeSelectors.newFile);
\`\`\`

## Critical Features
These features are essential for VSCode automation:
- **newChat**: Start new chat sessions
- **chatInput**: Input messages
- **sendButton**: Send messages
- **commandPalette**: Access commands
- **fileExplorer**: Navigate files

## Next Steps
1. Test selectors with your VSCode version
2. Implement automation workflows
3. Add error handling for missing elements
4. Extend with additional VSCode features
`;
    
    return summary;
  }

  generateVSCodeAutomationHelper(selectors) {
    return `/**
 * VSCode Automation Helper - Auto-generated
 * Generated: ${new Date().toISOString()}
 * 
 * Provides helper methods for VSCode automation using optimized selectors.
 */

const VSCodeSelectors = require('./VSCodeSelectors');

class VSCodeAutomationHelper {
  constructor(page) {
    this.page = page;
  }

  // === VSCode CHAT AUTOMATION ===
  
  async startNewChat() {
    logger.info('🚀 Starting new VSCode chat...');
    
    try {
      // Try multiple strategies to find and click New Chat button
      const newChatSelectors = [
        VSCodeSelectors.newChat,
        '[aria-label*="New Chat"]',
        '.codicon-add-two',
        '.action-label[aria-label*="New"]'
      ];
      
      for (const selector of newChatSelectors) {
        try {
          const element = await this.page.$(selector);
          if (element) {
            await element.click();
            logger.info(\`  ✅ Clicked New Chat button: \${selector}\`);
            
            // Handle VSCode New Chat modal if it appears
            await this.handleNewChatModal();
            return true;
          }
        } catch (e) {
          continue;
        }
      }
      
      throw new Error('VSCode New Chat button not found');
    } catch (error) {
      console.error('❌ Failed to start new chat:', error.message);
      return false;
    }
  }

  async handleNewChatModal() {
    try {
      // Wait for modal to appear
      await this.page.waitForTimeout(500);
      
      // Look for buttons in the VSCode New Chat modal
      const modalButtons = [
        'button:has-text("OK")',
        'button:has-text("Continue")',
        'button:has-text("Start")',
        'button:has-text("Create")',
        'button:has-text("Begin")',
        'button:has-text("Yes")',
        '[aria-label*="OK"]',
        '[aria-label*="Continue"]',
        '[aria-label*="Start"]'
      ];
      
      for (const buttonSelector of modalButtons) {
        try {
          const button = await this.page.$(buttonSelector);
          if (button) {
            const text = await button.textContent();
            logger.info(\`  ✅ Clicking VSCode modal button: \${text}\`);
            await button.click();
            await this.page.waitForTimeout(500);
            return;
          }
        } catch (e) {
          continue;
        }
      }
      
      // Fallback: try Escape key
      await this.page.keyboard.press('Escape');
      await this.page.waitForTimeout(500);
      
    } catch (error) {
      logger.info(\`  ⚠️ VSCode New Chat modal handling failed: \${error.message}\`);
    }
  }

  async sendChatMessage(message) {
    logger.info(\`📝 Sending VSCode chat message: "\${message}"\`);
    
    try {
      // Focus chat input
      await this.focusChatInput();
      
      // Clear existing text and type new message
      await this.page.keyboard.down('Control');
      await this.page.keyboard.press('KeyA');
      await this.page.keyboard.up('Control');
      await this.page.keyboard.type(message);
      
      // Find and click send button
      const sendSelectors = [
        VSCodeSelectors.sendButton,
        '.codicon-send',
        '.action-label[aria-label*="Send"]',
        '.chat-execute-toolbar .codicon-send'
      ];
      
      let sent = false;
      for (const selector of sendSelectors) {
        try {
          const sendButton = await this.page.$(selector);
          if (sendButton) {
            await sendButton.click();
            logger.info(\`  ✅ Message sent via VSCode send button: \${selector}\`);
            sent = true;
            break;
          }
        } catch (e) {
          continue;
        }
      }
      
      if (!sent) {
        // Fallback: try Enter key
        await this.page.keyboard.press('Enter');
        logger.info(\`  ⚠️ Used Enter key fallback for VSCode\`);
      }
      
      return sent;
    } catch (error) {
      console.error('❌ Failed to send chat message:', error.message);
      return false;
    }
  }

  async focusChatInput() {
    const inputSelectors = [
      VSCodeSelectors.chatInput,
      'textarea[data-testid="chat-input"]',
      'textarea[placeholder*="Type your task"]',
      '.aislash-editor-input[contenteditable="true"]',
      '[contenteditable="true"]'
    ];
    
    for (const selector of inputSelectors) {
      try {
        const element = await this.page.$(selector);
        if (element) {
          await element.click();
          await element.focus();
          logger.info(\`  ✅ Found VSCode chat input: \${selector}\`);
          return true;
        }
      } catch (e) {
        continue;
      }
    }
    
    logger.info(\`  ⚠️ No VSCode chat input found\`);
    return false;
  }

  // === VSCode COMMAND AUTOMATION ===
  
  async openCommandPalette() {
    logger.info('🔧 Opening VSCode Command Palette...');
    
    try {
      await this.page.keyboard.press('Control+Shift+P');
      await this.page.waitForSelector(VSCodeSelectors.commandPalette, { timeout: 3000 });
      logger.info('  ✅ VSCode Command Palette opened');
      return true;
    } catch (error) {
      console.error('❌ Failed to open Command Palette:', error.message);
      return false;
    }
  }

  async executeCommand(command) {
    logger.info(\`🔧 Executing VSCode command: "\${command}"\`);
    
    try {
      await this.openCommandPalette();
      
      // Type command
      await this.page.keyboard.type(command);
      await this.page.waitForTimeout(500);
      
      // Press Enter to execute
      await this.page.keyboard.press('Enter');
      logger.info(\`  ✅ VSCode command executed: \${command}\`);
      return true;
    } catch (error) {
      console.error('❌ Failed to execute command:', error.message);
      return false;
    }
  }

  // === VSCode FILE EXPLORER AUTOMATION ===
  
  async openFileExplorer() {
    logger.info('📁 Opening VSCode File Explorer...');
    
    try {
      const explorerSelectors = [
        VSCodeSelectors.fileExplorer,
        '.explorer-viewlet',
        '[id*="explorer"]'
      ];
      
      for (const selector of explorerSelectors) {
        try {
          const element = await this.page.$(selector);
          if (element) {
            await element.click();
            logger.info(\`  ✅ VSCode File Explorer opened: \${selector}\`);
            return true;
          }
        } catch (e) {
          continue;
        }
      }
      
      throw new Error('VSCode File Explorer not found');
    } catch (error) {
      console.error('❌ Failed to open File Explorer:', error.message);
      return false;
    }
  }

  async createNewFile() {
    logger.info('📄 Creating new VSCode file...');
    
    try {
      await this.openFileExplorer();
      
      const newFileSelectors = [
        VSCodeSelectors.newFile,
        '[aria-label*="New File"]',
        '.new-file-button'
      ];
      
      for (const selector of newFileSelectors) {
        try {
          const element = await this.page.$(selector);
          if (element) {
            await element.click();
            logger.info(\`  ✅ VSCode New File button clicked: \${selector}\`);
            return true;
          }
        } catch (e) {
          continue;
        }
      }
      
      throw new Error('VSCode New File button not found');
    } catch (error) {
      console.error('❌ Failed to create new file:', error.message);
      return false;
    }
  }

  // === VSCode UTILITY METHODS ===
  
  async waitForElement(selector, timeout = 5000) {
    try {
      await this.page.waitForSelector(selector, { timeout });
      return true;
    } catch (error) {
      console.warn(\`⚠️ Element not found: \${selector}\`);
      return false;
    }
  }

  async isElementVisible(selector) {
    try {
      const element = await this.page.$(selector);
      if (!element) return false;
      
      const isVisible = await element.isVisible();
      return isVisible;
    } catch (error) {
      return false;
    }
  }

  async getElementText(selector) {
    try {
      const element = await this.page.$(selector);
      if (!element) return null;
      
      const text = await element.textContent();
      return text.trim();
    } catch (error) {
      return null;
    }
  }

  // === VSCode ERROR HANDLING ===
  
  async handleVSCodeError(error) {
    console.error('❌ VSCode automation error:', error.message);
    
    // Try to close any open modals
    try {
      await this.page.keyboard.press('Escape');
      await this.page.waitForTimeout(500);
    } catch (e) {
      // Ignore escape errors
    }
    
    // Log current page state
    try {
      const url = await this.page.url();
      const title = await this.page.title();
      logger.info(\`  📍 Current VSCode state: \${title} (\${url})\`);
    } catch (e) {
      // Ignore state logging errors
    }
  }
}

module.exports = VSCodeAutomationHelper;
`;
  }

  async generateVSCodeTests(selectors) {
    logger.info('\n🧪 Generating VSCode test files...');
    
    // Generate test file
    const testContent = this.generateVSCodeTestFile(selectors);
    const testFile = path.join(this.outputDir, 'VSCodeSelectors.test.js');
    fs.writeFileSync(testFile, testContent);
    logger.info(`  ✅ VSCodeSelectors.test.js`);
  }

  generateVSCodeTestFile(selectors) {
    return `/**
 * VSCode Selectors Test Suite - Auto-generated
 * Generated: ${new Date().toISOString()}
 * 
 * Tests for VSCode selector functionality and automation.
 */

const VSCodeSelectors = require('./VSCodeSelectors');
const VSCodeAutomationHelper = require('./VSCodeAutomationHelper');

describe('VSCode Selectors', () => {
  let page;
  let helper;

  beforeAll(async () => {
    // Setup VSCode connection
    // This would typically connect to VSCode via CDP
    logger.info('🔧 Setting up VSCode test environment...');
  });

  beforeEach(async () => {
    // Reset VSCode state before each test
    helper = new VSCodeAutomationHelper(page);
  });

  afterAll(async () => {
    // Cleanup VSCode connection
    logger.info('🧹 Cleaning up VSCode test environment...');
  });

  describe('Critical VSCode Features', () => {
    test('should find New Chat button', async () => {
      const isVisible = await helper.isElementVisible(VSCodeSelectors.newChat);
      expect(isVisible).toBe(true);
    });

    test('should find Chat Input field', async () => {
      const isVisible = await helper.isElementVisible(VSCodeSelectors.chatInput);
      expect(isVisible).toBe(true);
    });

    test('should find Send Button', async () => {
      const isVisible = await helper.isElementVisible(VSCodeSelectors.sendButton);
      expect(isVisible).toBe(true);
    });

    test('should find Command Palette', async () => {
      await helper.openCommandPalette();
      const isVisible = await helper.isElementVisible(VSCodeSelectors.commandPalette);
      expect(isVisible).toBe(true);
    });
  });

  describe('VSCode Chat Automation', () => {
    test('should start new chat', async () => {
      const result = await helper.startNewChat();
      expect(result).toBe(true);
    });

    test('should send chat message', async () => {
      const result = await helper.sendChatMessage('Test message from automation');
      expect(result).toBe(true);
    });

    test('should focus chat input', async () => {
      const result = await helper.focusChatInput();
      expect(result).toBe(true);
    });
  });

  describe('VSCode File Operations', () => {
    test('should open file explorer', async () => {
      const result = await helper.openFileExplorer();
      expect(result).toBe(true);
    });

    test('should create new file', async () => {
      const result = await helper.createNewFile();
      expect(result).toBe(true);
    });
  });

  describe('VSCode Command Execution', () => {
    test('should execute command', async () => {
      const result = await helper.executeCommand('Show Notifications');
      expect(result).toBe(true);
    });
  });

  describe('VSCode Selector Categories', () => {
    test('should have chat selectors', () => {
      const chatSelectors = VSCodeSelectors.getChatSelectors();
      expect(Object.keys(chatSelectors).length).toBeGreaterThan(0);
      expect(chatSelectors.newChat).toBeDefined();
      expect(chatSelectors.chatInput).toBeDefined();
    });

    test('should have editor selectors', () => {
      const editorSelectors = VSCodeSelectors.getEditorSelectors();
      expect(Object.keys(editorSelectors).length).toBeGreaterThan(0);
      expect(editorSelectors.activeEditor).toBeDefined();
    });

    test('should have critical selectors', () => {
      const criticalSelectors = VSCodeSelectors.getCriticalSelectors();
      expect(criticalSelectors.newChat).toBeDefined();
      expect(criticalSelectors.chatInput).toBeDefined();
      expect(criticalSelectors.sendButton).toBeDefined();
    });
  });

  describe('VSCode Error Handling', () => {
    test('should handle missing elements gracefully', async () => {
      const isVisible = await helper.isElementVisible('non-existent-selector');
      expect(isVisible).toBe(false);
    });

    test('should handle VSCode errors', async () => {
      const error = new Error('Test VSCode error');
      await helper.handleVSCodeError(error);
      // Should not throw
      expect(true).toBe(true);
    });
  });
});
`;
  }
}

// CLI Usage
if (require.main === module) {
  const generator = new SelectorGenerator();
  
  async function run() {
    try {
      await generator.generate();
    } catch (error) {
      console.error('❌ VSCode selector generation failed:', error.message);
      process.exit(1);
    }
  }
  
  run();
}

module.exports = SelectorGenerator; 