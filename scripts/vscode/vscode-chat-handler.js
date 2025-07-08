const fs = require('fs');
const path = require('path');
const BrowserManager = require('../../backend/infrastructure/external/BrowserManager');

class VSCodeChatHandler {
  constructor() {
    this.browserManager = new BrowserManager();
    this.outputDir = path.join(__dirname, 'output/vscode-chat');
    this.ensureOutputDir();
  }

  ensureOutputDir() {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
      console.log(`📁 Created VSCode chat directory: ${this.outputDir}`);
    }
  }

  async initialize(port = null) {
    console.log(`🚀 VSCode Chat Handler starting...`);
    try {
      // If no port specified, find VSCode automatically
      if (!port) {
        const IDEManager = require('../../backend/infrastructure/external/IDEManager');
        const ideManager = new IDEManager();
        await ideManager.initialize();
        
        const availableIDEs = await ideManager.getAvailableIDEs();
        const vscodeIDE = availableIDEs.find(ide => ide.ideType === 'vscode' && ide.status === 'running');
        
        if (!vscodeIDE) {
          throw new Error('No running VSCode IDE found! Please start VSCode with remote debugging enabled.');
        }
        
        port = vscodeIDE.port;
        console.log(`🔍 Found VSCode IDE on port ${port}`);
      }
      
      await this.browserManager.connect(port);
      console.log(`✅ Connected to VSCode CDP on port ${port}`);
      // Use single page logic
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

  async sendChatMessage(message) {
    const page = this.page;
    if (!page) throw new Error('VSCode app page not available!');
    console.log(`📝 Sending VSCode chat message: "${message}"`);
    
    // Step 1: Find and focus the chat input using the correct VSCode selectors
    const inputSelectors = [
      // Primary VSCode chat input selectors based on your HTML
      '.chat-editor-container textarea',
      '.monaco-editor textarea',
      'textarea[data-mprt="7"]',
      'textarea.inputarea',
      // Fallback selectors
      'textarea[data-testid="chat-input"]',
      'textarea[placeholder*="Type your task"]',
      'textarea[placeholder*="chat"]'
    ];
    
    let inputElement = null;
    for (const selector of inputSelectors) {
      try {
        inputElement = await page.$(selector);
        if (inputElement) {
          console.log(`  ✅ Found chat input: ${selector}`);
          break;
        }
      } catch (e) { continue; }
    }
    
    if (!inputElement) {
      // Try to find the chat input container and click it
      const chatContainer = await page.$('.chat-editor-container');
      if (chatContainer) {
        console.log(`  🔍 Found chat container, clicking to focus...`);
        await chatContainer.click();
        await page.waitForTimeout(500);
        
        // Try to find textarea again after clicking
        for (const selector of inputSelectors) {
          try {
            inputElement = await page.$(selector);
            if (inputElement) {
              console.log(`  ✅ Found chat input after container click: ${selector}`);
              break;
            }
          } catch (e) { continue; }
        }
      }
    }
    
    if (!inputElement) throw new Error('VSCode chat input not found!');
    
    // Focus the input using a more reliable method
    try {
      // Try clicking the container first
      const chatContainer = await page.$('.chat-editor-container');
      if (chatContainer) {
        await chatContainer.click();
        await page.waitForTimeout(300);
      }
      
      // Then try to focus the textarea
      await inputElement.focus();
      await page.waitForTimeout(200);
      
      // Clear existing text using JavaScript
      await page.evaluate((selector) => {
        const textarea = document.querySelector(selector);
        if (textarea) {
          textarea.value = '';
          textarea.focus();
        }
      }, inputSelectors.find(selector => {
        try {
          return document.querySelector(selector);
        } catch (e) {
          return false;
        }
      }));
      
      await page.waitForTimeout(100);
      
      // Type the message using JavaScript - try multiple approaches
      const success = await page.evaluate((message) => {
        // Try multiple selectors for the textarea
        const selectors = [
          '.chat-editor-container textarea',
          '.monaco-editor textarea',
          'textarea[data-mprt="7"]',
          'textarea.inputarea'
        ];
        
        for (const selector of selectors) {
          const textarea = document.querySelector(selector);
          if (textarea) {
            try {
              textarea.value = message;
              textarea.focus();
              // Trigger input event
              textarea.dispatchEvent(new Event('input', { bubbles: true }));
              return true;
            } catch (e) {
              console.log(`Failed with selector ${selector}:`, e.message);
              continue;
            }
          }
        }
        return false;
      }, message);
      
      if (!success) {
        throw new Error('Could not set textarea value via JavaScript');
      }
      
      console.log(`  📝 Typed message via JavaScript: "${message}"`);
      await page.waitForTimeout(200);
      
    } catch (error) {
      console.log(`  ⚠️ JavaScript method failed, trying keyboard method: ${error.message}`);
      
      // Fallback to keyboard method
      await inputElement.focus();
      await page.waitForTimeout(200);
      
      // Clear existing text (Ctrl+A)
      await page.keyboard.down('Control');
      await page.keyboard.press('KeyA');
      await page.keyboard.up('Control');
      await page.keyboard.press('Backspace');
      await page.waitForTimeout(100);
      
      // Type the message
      await page.keyboard.type(message);
      console.log(`  📝 Typed message via keyboard: "${message}"`);
      await page.waitForTimeout(200);
    }
    
    // Step 4: Find and click send button using correct VSCode selectors
    const sendSelectors = [
      // Primary VSCode send button selectors based on your HTML
      '.codicon-send',
      '.action-label[aria-label*="Send and Dispatch"]',
      '.chat-execute-toolbar .codicon-send',
      '.monaco-action-bar .codicon-send',
      // Fallback selectors
      '.action-label[aria-label*="Send"]',
      '[aria-label*="Send and Dispatch"]'
    ];
    
    let sent = false;
    for (const selector of sendSelectors) {
      try {
        const sendButton = await page.$(selector);
        if (sendButton) {
          await sendButton.click();
          console.log(`  ✅ Clicked send button: ${selector}`);
          sent = true;
          break;
        }
      } catch (e) { continue; }
    }
    
    if (!sent) {
      // Fallback: try Enter key
      console.log(`  ⚠️ Send button not found, trying Enter key...`);
      await page.keyboard.press('Enter');
      console.log(`  ⚠️ Used Enter key fallback`);
    }
    
    return sent;
  }

  async getChatHistory() {
    const page = this.page;
    if (!page) throw new Error('VSCode app page not available!');
    console.log('📋 Getting VSCode chat history...');
    const messageSelectors = [
      '.chat-message',
      '.chat-session-detail',
      '.ced-chat-session-detail',
      '[class*="chat-session"]',
      '.chat-content'
    ];
    const messages = [];
    for (const selector of messageSelectors) {
      try {
        const elements = await page.$$(selector);
        if (elements.length > 0) {
          console.log(`  ✅ Found ${elements.length} messages with selector: ${selector}`);
          for (let i = 0; i < Math.min(elements.length, 5); i++) {
            const text = await elements[i].textContent();
            if (text && text.trim()) {
              messages.push({
                selector: selector,
                index: i,
                text: text.trim().substring(0, 100) + '...'
              });
            }
          }
          break;
        }
      } catch (e) { continue; }
    }
    return messages;
  }

  async analyzeVSCodeDOM() {
    const page = this.page;
    if (!page) throw new Error('VSCode app page not available!');
    console.log('🔍 Analyzing VSCode DOM structure...');
    const title = await page.title();
    const url = page.url();
    console.log(`  📄 Page title: ${title}`);
    console.log(`  🌐 URL: ${url}`);
    const vscodeElements = await page.evaluate(() => {
      const elements = {
        // Updated selectors based on your VSCode HTML
        chatInput: document.querySelector('.chat-editor-container textarea') || 
                  document.querySelector('.monaco-editor textarea') ||
                  document.querySelector('textarea[data-mprt="7"]'),
        chatContainer: document.querySelector('.chat-editor-container'),
        sendButton: document.querySelector('.codicon-send'),
        monacoEditor: document.querySelector('.monaco-editor'),
        chatInputContainer: document.querySelector('.chat-input-container'),
        interactiveInput: document.querySelector('.interactive-input-and-side-toolbar'),
        vscodeElements: document.querySelectorAll('[class*="vscode"], [class*="monaco"]').length
      };
      return {
        hasChatInput: !!elements.chatInput,
        hasChatContainer: !!elements.chatContainer,
        hasSendButton: !!elements.sendButton,
        hasMonacoEditor: !!elements.monacoEditor,
        hasChatInputContainer: !!elements.chatInputContainer,
        hasInteractiveInput: !!elements.interactiveInput,
        vscodeElementCount: elements.vscodeElements
      };
    });
    console.log('  📊 VSCode DOM Analysis:');
    console.log(`    Chat Input: ${vscodeElements.hasChatInput ? '✅' : '❌'}`);
    console.log(`    Chat Container: ${vscodeElements.hasChatContainer ? '✅' : '❌'}`);
    console.log(`    Send Button: ${vscodeElements.hasSendButton ? '✅' : '❌'}`);
    console.log(`    Monaco Editor: ${vscodeElements.hasMonacoEditor ? '✅' : '❌'}`);
    console.log(`    Chat Input Container: ${vscodeElements.hasChatInputContainer ? '✅' : '❌'}`);
    console.log(`    Interactive Input: ${vscodeElements.hasInteractiveInput ? '✅' : '❌'}`);
    console.log(`    VSCode Elements: ${vscodeElements.vscodeElementCount}`);
    return vscodeElements;
  }

  async wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async cleanup() {
    try {
      await this.browserManager.disconnect();
      console.log('🧹 VSCode Chat Handler cleaned up');
    } catch (error) {
      console.log('⚠️ Cleanup warning:', error.message);
    }
  }
}

// CLI Usage
if (require.main === module) {
  const handler = new VSCodeChatHandler();
  async function run() {
    try {
      await handler.initialize();
      await handler.analyzeVSCodeDOM();
      await handler.wait(1000);
      const testMessage = 'Hello from PIDEA VSCode handler!';
      const sent = await handler.sendChatMessage(testMessage);
      if (sent) {
        console.log('✅ VSCode chat message sent successfully!');
      } else {
        console.log('⚠️ Message sent with fallback method');
      }
      await handler.wait(2000);
      const history = await handler.getChatHistory();
      if (history.length > 0) {
        console.log(`📋 Found ${history.length} chat messages`);
      } else {
        console.log('📋 No chat history found');
      }
    } catch (error) {
      console.error('❌ VSCode chat test failed:', error.message);
      console.error(error.stack);
    } finally {
      await handler.cleanup();
    }
  }
  run();
}

module.exports = VSCodeChatHandler; 