const fs = require('fs');
const path = require('path');

const Logger = require('@logging/Logger');

const logger = new Logger('ServiceName');

class SelectorGenerator {
  constructor() {
    this.analysisFile = path.join(__dirname, '../output/dom-analysis-results.json');
    this.outputDir = path.join(__dirname, '../generated');
    this.ensureDirectories();
  }

  ensureDirectories() {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
      logger.info(`📁 Created directory: ${this.outputDir}`);
    }
    
    const outputBaseDir = path.join(__dirname, '../output');
    if (!fs.existsSync(outputBaseDir)) {
      fs.mkdirSync(outputBaseDir, { recursive: true });
    }
  }

  loadAnalysisResults() {
    if (!fs.existsSync(this.analysisFile)) {
      throw new Error(`Analysis file not found: ${this.analysisFile}`);
    }
    const content = fs.readFileSync(this.analysisFile, 'utf8');
    return JSON.parse(content);
  }

  generateSelectorsFile(selectors) {
    return `/**
 * 🎯 CURSOR IDE SELECTORS
 * Auto-generated: ${new Date().toISOString()}
 */

export const CURSOR_SELECTORS = {
  chat: {
    newChat: '${selectors.newChat || '[aria-label*="New Chat"]'}',
    chatHistory: '${selectors.chatHistory || '[aria-label*="Chat History"]'}',
    chatInput: '${selectors.chatInput || '.aislash-editor-input'}',
    userMessages: '${selectors.userMessages || '.composer-human-message'}',
    aiMessages: '${selectors.aiMessages || '.anysphere-markdown-container-root'}',
    settings: '${selectors.settings || '[aria-label="Settings"]'}',
    moreActions: '${selectors.moreActions || 'span.codicon'}',
    backgroundAgents: '${selectors.backgroundAgents || '[aria-label*="Background Agents"]'}'
  },
  explorer: {
    fileExplorer: '${selectors.fileExplorer || '.pane'}',
    fileTree: '${selectors.fileTree || '.monaco-list'}',
    newFile: '${selectors.newFile || '[aria-label*="New File"]'}',
    newFolder: '${selectors.newFolder || '[aria-label*="New Folder"]'}',
    folderToggle: '${selectors.folderToggle || '.codicon-chevron-right'}'
  },
  editor: {
    activeEditor: '${selectors.activeEditor || '.monaco-editor'}',
    editorContent: '${selectors.editorContent || '.view-lines'}',
    editorTabs: '${selectors.editorTabs || '.tab'}',
    tabCloseButton: '${selectors.tabCloseButton || '.codicon-close'}',
    splitEditor: '${selectors.splitEditor || '[aria-label*="Split Editor"]'}'
  },
  search: {
    globalSearch: '${selectors.globalSearch || '.search-view'}',
    searchInput: '${selectors.searchInput || '.monaco-inputbox'}',
    searchResults: '${selectors.searchResults || '.monaco-tree-row'}'
  },
  git: {
    gitSourceControl: '${selectors.gitSourceControl || '.pane'}',
    gitChanges: '${selectors.gitChanges || '.monaco-list-row'}',
    commitInput: '${selectors.commitInput || '.monaco-inputbox'}',
    commitButton: '${selectors.commitButton || '[aria-label*="Commit"]'}'
  },
  terminal: {
    terminal: '${selectors.terminal || '.terminal-wrapper'}',
    newTerminal: '${selectors.newTerminal || '[aria-label*="New Terminal"]'}'
  },
  commands: {
    commandPalette: '${selectors.commandPalette || '.quick-input-widget'}',
    quickOpen: '${selectors.quickOpen || '.quick-input-widget'}'
  },
  panels: {
    debugPanel: '${selectors.debugPanel || '.debug-view'}',
    problemsPanel: '${selectors.problemsPanel || '.markers-panel'}',
    outputPanel: '${selectors.outputPanel || '.output-panel'}',
    extensionsPanel: '${selectors.extensionsPanel || '.extensions-view'}'
  }
};

module.exports = { CURSOR_SELECTORS };`;
  }

  generateCursorIDEClass(selectors) {
    return `/**
 * 🤖 CURSOR IDE AUTOMATION
 * Generated: ${new Date().toISOString()}
 */

const BrowserManager = require('../src/infrastructure/external/BrowserManager');
const IDEManager = require('../src/infrastructure/external/IDEManager');

class CursorIDE {
  constructor() {
    this.browserManager = new BrowserManager();
    this.ideManager = new IDEManager();
    this.selectors = {
      chat: {
        newChat: '${selectors.newChat || '[aria-label*="New Chat"]'}',
        chatInput: '${selectors.chatInput || '.aislash-editor-input'}',
        aiMessages: '${selectors.aiMessages || '.anysphere-markdown-container-root'}',
        settings: '${selectors.settings || '[aria-label="Settings"]'}'
      },
      explorer: {
        fileExplorer: '${selectors.fileExplorer || '.pane'}',
        newFile: '${selectors.newFile || '[aria-label*="New File"]'}',
        fileTree: '${selectors.fileTree || '.monaco-list'}'
      },
      editor: {
        activeEditor: '${selectors.activeEditor || '.monaco-editor'}',
        editorTabs: '${selectors.editorTabs || '.tab'}'
      },
      terminal: {
        terminal: '${selectors.terminal || '.terminal-wrapper'}'
      },
      commands: {
        commandPalette: '${selectors.commandPalette || '.quick-input-widget'}',
        quickOpen: '${selectors.quickOpen || '.quick-input-widget'}'
      },
      search: {
        globalSearch: '${selectors.globalSearch || '.search-view'}'
      },
      panels: {
        debugPanel: '${selectors.debugPanel || '.debug-view'}',
        problemsPanel: '${selectors.problemsPanel || '.markers-panel'}',
        outputPanel: '${selectors.outputPanel || '.output-panel'}',
        extensionsPanel: '${selectors.extensionsPanel || '.extensions-view'}'
      }
    };
  }

  async initialize() {
    await this.ideManager.initialize();
    const activePort = this.ideManager.getActivePort();
    await this.browserManager.connect(activePort);
    this.page = await this.browserManager.getPage();
    return this;
  }

  async startNewChat() {
    await this.page.click(this.selectors.chat.newChat);
    await this.page.waitForSelector(this.selectors.chat.chatInput);
  }

  async sendChatMessage(message) {
    await this.page.fill(this.selectors.chat.chatInput, message);
    await this.page.keyboard.press('Enter');
    await this.page.waitForSelector(this.selectors.chat.aiMessages);
  }

  async openSettings() {
    await this.page.click(this.selectors.chat.settings);
  }

  async openFileExplorer() {
    await this.page.keyboard.press('Control+Shift+E');
    await this.page.waitForSelector(this.selectors.explorer.fileExplorer);
  }

  async createNewFile(fileName) {
    await this.page.click(this.selectors.explorer.newFile);
    await this.page.keyboard.type(fileName);
    await this.page.keyboard.press('Enter');
  }

  async createNewFolder(folderName) {
    await this.page.click(this.selectors.explorer.newFolder);
    await this.page.keyboard.type(folderName);
    await this.page.keyboard.press('Enter');
  }

  async getActiveEditor() {
    return await this.page.locator(this.selectors.editor.activeEditor);
  }

  async closeTab() {
    await this.page.click(this.selectors.editor.tabCloseButton);
  }

  async openTerminal() {
    await this.page.keyboard.press('Control+Shift+\`');
    await this.page.waitForSelector(this.selectors.terminal.terminal);
  }

  async runTerminalCommand(command) {
    await this.page.keyboard.type(command);
    await this.page.keyboard.press('Enter');
  }

  async openCommandPalette() {
    await this.page.keyboard.press('Control+Shift+P');
    await this.page.waitForSelector(this.selectors.commands.commandPalette);
  }

  async openQuickOpen() {
    await this.page.keyboard.press('Control+P');
    await this.page.waitForSelector(this.selectors.commands.quickOpen);
  }

  async openGlobalSearch() {
    await this.page.keyboard.press('Control+Shift+F');
    await this.page.waitForSelector(this.selectors.search.globalSearch);
  }

  async search(query) {
    await this.openGlobalSearch();
    await this.page.fill(this.selectors.search.searchInput, query);
    await this.page.keyboard.press('Enter');
  }

  async openDebugPanel() {
    await this.page.keyboard.press('Control+Shift+D');
    await this.page.waitForSelector(this.selectors.panels.debugPanel);
  }

  async openProblemsPanel() {
    await this.page.keyboard.press('Control+Shift+M');
    await this.page.waitForSelector(this.selectors.panels.problemsPanel);
  }

  async openOutputPanel() {
    await this.page.keyboard.press('Control+Shift+U');
    await this.page.waitForSelector(this.selectors.panels.outputPanel);
  }

  async openExtensionsPanel() {
    await this.page.keyboard.press('Control+Shift+X');
    await this.page.waitForSelector(this.selectors.panels.extensionsPanel);
  }

  async wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async disconnect() {
    await this.browserManager.disconnect();
  }
}

module.exports = { CursorIDE };`;
  }

  async generate() {
    logger.info('🔧 Generating Playwright files...\n');

    try {
      const analysisResults = this.loadAnalysisResults();
      const selectors = analysisResults.optimizedSelectors;
      
      logger.info(`📊 Using ${Object.keys(selectors).length} features from analysis`);

      const files = {
        'selectors.js': this.generateSelectorsFile(selectors),
        'CursorIDE.js': this.generateCursorIDEClass(selectors)
      };

      Object.entries(files).forEach(([filename, content]) => {
        const filepath = path.join(this.outputDir, filename);
        fs.writeFileSync(filepath, content);
        logger.info(`✅ Generated: ${filename}`);
      });

      logger.info(`\n🎉 Generated ${Object.keys(files).length} files in ${this.outputDir}`);
      
      const featureCount = Object.keys(selectors).length;
      logger.info(`📈 Total Features: ${featureCount}`);
      
      const categories = {
        chat: Object.keys(selectors).filter(f => f.includes('chat') || f.includes('message') || f.includes('ai')).length,
        explorer: Object.keys(selectors).filter(f => f.includes('file') || f.includes('folder') || f.includes('explorer')).length,
        editor: Object.keys(selectors).filter(f => f.includes('editor') || f.includes('tab')).length,
        terminal: Object.keys(selectors).filter(f => f.includes('terminal')).length,
        panels: Object.keys(selectors).filter(f => f.includes('Panel') || f.includes('debug') || f.includes('output') || f.includes('problems')).length
      };

      logger.info('\n📋 FEATURES BY CATEGORY:');
      Object.entries(categories).forEach(([category, count]) => {
        if (count > 0) {
          logger.info(`  🎯 ${category}: ${count} features`);
        }
      });

      return files;

    } catch (error) {
      console.error('❌ Generation failed:', error.message);
      throw error;
    }
  }
}

if (require.main === module) {
  const generator = new SelectorGenerator();
  
  async function run() {
    try {
      await generator.generate();
    } catch (error) {
      console.error('❌ FEHLER:', error.message);
      process.exit(1);
    }
  }
  
  run();
}

module.exports = SelectorGenerator; 