const fs = require('fs');
const path = require('path');
const BrowserManager = require('@external/BrowserManager');

class VSCodeTerminalHandler {
  constructor(ideManager = null) {
    this.browserManager = new BrowserManager();
    this.ideManager = ideManager;
    this.outputDir = path.join(__dirname, 'output/vscode-terminal');
    this.ensureOutputDir();
  }

  ensureOutputDir() {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
      console.log(`📁 Created VSCode terminal directory: ${this.outputDir}`);
    }
  }

  async initialize(port = null) {
    console.log(`🚀 VSCode Terminal Handler starting...`);
    try {
      // If no port specified, find VSCode automatically
      if (!port) {
        if (!this.ideManager) {
          throw new Error('IDEManager not provided to VSCodeTerminalHandler');
        }
        await this.ideManager.initialize();
        
        const availableIDEs = await this.ideManager.getAvailableIDEs();
        const vscodeIDE = availableIDEs.find(ide => ide.ideType === 'vscode' && ide.status === 'running');
        
        if (!vscodeIDE) {
          throw new Error('No running VSCode IDE found! Please start VSCode with remote debugging enabled.');
        }
        
        port = vscodeIDE.port;
        console.log(`🔍 Found VSCode IDE on port ${port}`);
      }
      
      await this.browserManager.connect(port);
      console.log(`✅ Connected to VSCode CDP on port ${port}`);
      
      this.page = await this.findVSCodeAppPage();
      if (!this.page) throw new Error('Could not find VSCode app page!');
      console.log(`✅ VSCode app page ready: ${this.page.url()}`);
      return true;
    } catch (error) {
      console.error('❌ Connection failed:', error.message);
      throw error;
    }
  }

  async findVSCodeAppPage() {
    const page = await this.browserManager.getPage();
    let url = page.url();
    console.log(`  🌐 Initial page URL: ${url}`);
    
    // If not on VSCode app, navigate
    if (
      url.startsWith('devtools://') ||
      url === 'about:blank' ||
      url.includes('chrome-devtools')
    ) {
      console.log('  🔄 Navigating to VSCode app on http://localhost:9232 ...');
      try {
        await page.goto('http://localhost:9232', { waitUntil: 'domcontentloaded' });
        await this.wait(3000);
        url = page.url();
        console.log(`  🌐 After navigation: ${url}`);
      } catch (e) {
        console.log('  ⚠️ Navigation to VSCode app failed:', e.message);
      }
    }
    
    // Heuristic: check for VSCode app
    if (
      url.startsWith('http://localhost:') ||
      url.startsWith('https://localhost:') ||
      url.startsWith('file:///') ||
      url.includes('vscode') ||
      url.includes('workbench')
    ) {
      return page;
    }
    return null;
  }

  async openTerminal() {
    const page = this.page;
    if (!page) throw new Error('VSCode app page not available!');
    
    console.log('🔧 Opening VSCode terminal...');
    
    try {
      // Method 1: Use keyboard shortcut Ctrl+` (VSCode terminal toggle)
      console.log('  ⌨️ Using keyboard shortcut Ctrl+`...');
      await page.keyboard.down('Control');
      await page.keyboard.press('`');
      await page.keyboard.up('Control');
      
      await this.wait(2000);
      
      // Check if terminal opened successfully
      const terminalStatus = await this.checkTerminalStatus();
      if (terminalStatus.isOpen) {
        console.log('✅ Terminal opened successfully');
        return true;
      }
      
      // Method 2: Try Command Palette
      console.log('  🔍 Trying Command Palette method...');
      await page.keyboard.down('Control');
      await page.keyboard.down('Shift');
      await page.keyboard.press('KeyP');
      await page.keyboard.up('Shift');
      await page.keyboard.up('Control');
      
      await this.wait(1000);
      
      // Type "Terminal: Create New Terminal"
      await page.keyboard.type('Terminal: Create New Terminal');
      await this.wait(500);
      await page.keyboard.press('Enter');
      
      await this.wait(2000);
      
      // Check again
      const terminalStatus2 = await this.checkTerminalStatus();
      if (terminalStatus2.isOpen) {
        console.log('✅ Terminal opened via Command Palette');
        return true;
      }
      
      console.log('⚠️ Terminal opening methods failed');
      return false;
      
    } catch (error) {
      console.error('❌ Error opening terminal:', error.message);
      return false;
    }
  }

  async checkTerminalStatus() {
    const page = this.page;
    if (!page) return { isOpen: false };
    
    const status = await page.evaluate(() => {
      // VSCode-specific terminal selectors
      const terminalSelectors = [
        '.terminal-wrapper',
        '.xterm-screen',
        '.integrated-terminal',
        '.terminal-container',
        '.terminal-panel',
        '.xterm'
      ];
      
      let isOpen = false;
      let activeTerminal = null;
      
      for (const selector of terminalSelectors) {
        const element = document.querySelector(selector);
        if (element) {
          // Check if terminal is visible and has content
          const isVisible = element.offsetWidth > 0 && element.offsetHeight > 0;
          const hasContent = element.textContent && element.textContent.trim().length > 0;
          
          if (isVisible) {
            isOpen = true;
            activeTerminal = selector;
            break;
          }
        }
      }
      
      // Also check for terminal tabs
      const terminalTabs = document.querySelectorAll('.terminal-tab, .tab-content');
      if (terminalTabs.length > 0) {
        isOpen = true;
        activeTerminal = 'terminal-tabs';
      }
      
      return {
        isOpen,
        activeTerminal,
        terminalTabsCount: terminalTabs.length
      };
    });
    
    return status;
  }

  async executeCommand(command) {
    const page = this.page;
    if (!page) throw new Error('VSCode app page not available!');
    
    console.log(`💻 Executing command: ${command}`);
    
    try {
      // First ensure terminal is open
      const terminalStatus = await this.checkTerminalStatus();
      if (!terminalStatus.isOpen) {
        console.log('  🔧 Terminal not open, opening...');
        const opened = await this.openTerminal();
        if (!opened) {
          throw new Error('Could not open terminal');
        }
        await this.wait(1000);
      }
      
      // Focus the terminal
      console.log('  🎯 Focusing terminal...');
      await this.focusTerminal();
      await this.wait(500);
      
      // Clear any existing text
      console.log('  🧹 Clearing terminal...');
      await page.keyboard.down('Control');
      await page.keyboard.press('KeyA');
      await page.keyboard.up('Control');
      await page.keyboard.press('Backspace');
      await this.wait(200);
      
      // Type the command
      console.log(`  ⌨️ Typing command: ${command}`);
      await page.keyboard.type(command);
      await this.wait(500);
      
      // Execute the command
      console.log('  ⏎ Executing command...');
      await page.keyboard.press('Enter');
      
      // Wait for command to complete
      await this.wait(2000);
      
      console.log('✅ Command executed successfully');
      return true;
      
    } catch (error) {
      console.error('❌ Error executing command:', error.message);
      return false;
    }
  }

  async focusTerminal() {
    const page = this.page;
    if (!page) return false;
    
    try {
      // Try multiple methods to focus the terminal
      
      // Method 1: Click on terminal area
      const terminalSelectors = [
        '.terminal-wrapper',
        '.xterm-screen',
        '.integrated-terminal',
        '.terminal-container'
      ];
      
      for (const selector of terminalSelectors) {
        try {
          const element = await page.$(selector);
          if (element) {
            await element.click();
            console.log(`  ✅ Focused terminal via ${selector}`);
            return true;
          }
        } catch (e) {
          continue;
        }
      }
      
      // Method 2: Use JavaScript to focus
      const focused = await page.evaluate(() => {
        const selectors = [
          '.terminal-wrapper',
          '.xterm-screen',
          '.integrated-terminal',
          '.terminal-container'
        ];
        
        for (const selector of selectors) {
          const element = document.querySelector(selector);
          if (element) {
            element.focus();
            element.click();
            return true;
          }
        }
        return false;
      });
      
      if (focused) {
        console.log('  ✅ Focused terminal via JavaScript');
        return true;
      }
      
      // Method 3: Use keyboard to focus terminal panel
      await page.keyboard.press('Control+`');
      console.log('  ✅ Focused terminal via keyboard shortcut');
      return true;
      
    } catch (error) {
      console.error('❌ Error focusing terminal:', error.message);
      return false;
    }
  }

  async getTerminalOutput() {
    const page = this.page;
    if (!page) return '';
    
    try {
      const output = await page.evaluate(() => {
        // VSCode-specific terminal content extraction
        const terminalSelectors = [
          '.terminal-wrapper',
          '.xterm-screen',
          '.integrated-terminal',
          '.terminal-container'
        ];
        
        let terminalText = '';
        
        for (const selector of terminalSelectors) {
          const element = document.querySelector(selector);
          if (element) {
            const text = element.innerText || element.textContent || '';
            if (text.trim() && text.length > 10) {
              terminalText = text;
              break;
            }
          }
        }
        
        // Also try view-line elements
        if (!terminalText.trim()) {
          const viewLines = document.querySelectorAll('.view-line');
          if (viewLines.length > 0) {
            viewLines.forEach(line => {
              const lineText = line.innerText || line.textContent || '';
              if (lineText.trim() && lineText.length > 2) {
                terminalText += lineText + '\n';
              }
            });
          }
        }
        
        return terminalText.trim();
      });
      
      return output;
      
    } catch (error) {
      console.error('❌ Error getting terminal output:', error.message);
      return '';
    }
  }

  async wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async cleanup() {
    try {
      await this.browserManager.disconnect();
      console.log('🧹 VSCode Terminal Handler cleaned up');
    } catch (error) {
      console.log('⚠️ Cleanup warning:', error.message);
    }
  }
}

// CLI Usage
if (require.main === module) {
  const handler = new VSCodeTerminalHandler();
  async function run() {
    try {
      await handler.initialize();
      
      // Test terminal operations
      console.log('\n🔧 Testing VSCode terminal operations...');
      
      // Open terminal
      const terminalOpened = await handler.openTerminal();
      if (terminalOpened) {
        console.log('✅ Terminal opened successfully');
        
        // Execute a test command
        const command = 'pwd && ls -la && git status > /tmp/IDEWEB/9232/info.txt 2>&1 && echo "Terminal session started at $(date)" > /tmp/IDEWEB/9232/terminal-session.txt';
        const executed = await handler.executeCommand(command);
        
        if (executed) {
          console.log('✅ Command executed successfully');
          
          // Get terminal output
          await handler.wait(3000);
          const output = await handler.getTerminalOutput();
          console.log('\n📋 Terminal Output:');
          console.log(output);
        } else {
          console.log('❌ Command execution failed');
        }
      } else {
        console.log('❌ Failed to open terminal');
      }
      
    } catch (error) {
      console.error('❌ VSCode terminal test failed:', error.message);
      console.error(error.stack);
    } finally {
      await handler.cleanup();
    }
  }
  run();
}

module.exports = VSCodeTerminalHandler; 