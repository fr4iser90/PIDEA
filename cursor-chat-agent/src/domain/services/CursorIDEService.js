class CursorIDEService {
  constructor(browserManager, ideManager, eventBus = null) {
    this.browserManager = browserManager;
    this.ideManager = ideManager;
    this.eventBus = eventBus;
    this.monitoringInterval = null;
    this.lastTerminalContent = '';
    this.lastTerminalStatus = null;
  }

  async sendMessage(message) {
    try {
      const page = await this.browserManager.getPage();
      if (!page) {
        throw new Error('No Cursor IDE page available');
      }

      const inputSelector = '.aislash-editor-input[contenteditable="true"]';
      await page.focus(inputSelector);
      await page.fill(inputSelector, message);
      await page.keyboard.press('Enter');
    } catch (error) {
      console.error('[CursorIDEService] Error sending message:', error.message);
      throw error;
    }
  }

  async extractChatHistory() {
    try {
      const page = await this.browserManager.getPage();
      if (!page) {
        throw new Error('No Cursor IDE page available');
      }

      // Wait for messages to load
      await page.waitForTimeout(1000);

      const userMessageSelector = 'div.aislash-editor-input-readonly[contenteditable="false"][data-lexical-editor="true"]';
      const aiMessageSelector = 'span.anysphere-markdown-container-root';

      // Extract all messages in chronological order
      const allMessages = await page.evaluate(() => {
        const messages = [];
        
        // Find all User messages
        const userElements = document.querySelectorAll('div.aislash-editor-input-readonly[contenteditable="false"][data-lexical-editor="true"]');
        userElements.forEach((element, index) => {
          const text = element.innerText || element.textContent || '';
          if (text.trim()) {
            messages.push({
              type: 'user',
              content: text.trim(),
              element: element,
              index: index
            });
          }
        });
        
        // Find all AI messages
        const aiElements = document.querySelectorAll('span.anysphere-markdown-container-root');
        aiElements.forEach((element, index) => {
          const text = element.innerText || element.textContent || '';
          if (text.trim()) {
            messages.push({
              type: 'ai',
              content: text.trim(),
              element: element,
              index: index
            });
          }
        });
        
        // Sort based on DOM position (top value)
        messages.sort((a, b) => {
          const aRect = a.element.getBoundingClientRect();
          const bRect = b.element.getBoundingClientRect();
          return aRect.top - bRect.top;
        });
        
        return messages.map(msg => ({
          type: msg.type,
          content: msg.content
        }));
      });

      return allMessages;
    } catch (error) {
      console.error('[CursorIDEService] Error extracting chat history:', error);
      return [];
    }
  }

  async isConnected() {
    try {
      const page = await this.browserManager.getPage();
      return page !== null;
    } catch (error) {
      return false;
    }
  }

  async switchToSession(session) {
    if (!session.idePort) {
      throw new Error('Session has no IDE port assigned');
    }

    const activeIDE = await this.ideManager.getActiveIDE();
    if (activeIDE && activeIDE.port === session.idePort) {
      return; // Already connected to the right IDE
    }

    await this.ideManager.switchToIDE(session.idePort);
    await this.browserManager.switchToPort(session.idePort);
  }

  async getAvailableIDEs() {
    return await this.ideManager.getAvailableIDEs();
  }

  async startNewIDE(workspacePath = null) {
    return await this.ideManager.startNewIDE(workspacePath);
  }

  async stopIDE(port) {
    return await this.ideManager.stopIDE(port);
  }

  getActivePort() {
    return this.ideManager.getActivePort();
  }

  async switchToPort(port) {
    if (this.getActivePort() === port) {
      console.log(`[CursorIDEService] Already connected to port ${port}`);
      return;
    }
    
    console.log(`[CursorIDEService] Switching to port ${port}`);
    await this.browserManager.switchToPort(port);
    
    // Update active port in IDE manager
    if (this.ideManager.switchToIDE) {
      await this.ideManager.switchToIDE(port);
    }
  }

  async monitorTerminalOutput() {
    try {
      const page = await this.browserManager.getPage();
      if (!page) {
        throw new Error('No Cursor IDE page available');
      }

      // First check if terminal is open and visible
      const terminalExists = await page.evaluate(() => {
        const terminalWrapper = document.querySelector('.terminal-wrapper.active');
        const xtermScreen = document.querySelector('.xterm-screen');
        const panel = document.querySelector('#workbench.parts.panel');
        const terminalPanel = document.querySelector('#terminal');
        
        // Check if terminal has actual content (canvas elements indicate terminal is active)
        const canvasElements = xtermScreen ? xtermScreen.querySelectorAll('canvas') : [];
        const hasTerminalContent = canvasElements.length > 0 && 
          Array.from(canvasElements).some(canvas => canvas.width > 0 && canvas.height > 0);
        
        // Check if terminal panel is actually visible
        const isPanelVisible = panel && (
          panel.style.display !== 'none' && 
          panel.style.visibility !== 'hidden' &&
          panel.offsetHeight > 0
        );
        
        // Terminal is considered available if it has xterm-screen element (regardless of content)
        const terminalAvailable = !!xtermScreen;
        
        return {
          hasTerminalWrapper: !!terminalWrapper,
          hasXtermScreen: !!xtermScreen,
          hasPanel: !!panel,
          hasTerminalPanel: !!terminalPanel,
          panelVisible: isPanelVisible,
          hasTerminalContent: hasTerminalContent,
          terminalAvailable: terminalAvailable,
          canvasCount: canvasElements.length
        };
      });

      // Only log status changes
      const statusChanged = JSON.stringify(terminalExists) !== JSON.stringify(this.lastTerminalStatus);
      if (statusChanged) {
        console.log('[CursorIDEService] Terminal status:', terminalExists);
        this.lastTerminalStatus = terminalExists;
      }

      // Only monitor if terminal is available - DO NOT CREATE NEW TERMINALS
      if (!terminalExists.terminalAvailable) {
        return null;
      }

      if (!terminalExists.terminalAvailable) {
        return null;
      }

      // Monitor terminal output for dev server URLs
      const terminalOutput = await page.evaluate(() => {
        const xtermScreen = document.querySelector('.xterm-screen');
        if (!xtermScreen) return null;
        
        // Try multiple approaches to get terminal content
        let terminalText = '';
        
        // Method 1: Get text from view-line elements (most reliable)
        const textElements = xtermScreen.querySelectorAll('.view-line');
        if (textElements.length > 0) {
          textElements.forEach(element => {
            const text = element.innerText || element.textContent || '';
            if (text.trim()) {
              terminalText += text + '\n';
            }
          });
        }
        
        // Method 2: Try getting text from terminal textarea (input area)
        if (!terminalText.trim()) {
          const textarea = document.querySelector('.xterm-helper-textarea');
          if (textarea) {
            const textareaText = textarea.value || textarea.textContent || '';
            if (textareaText.trim()) {
              terminalText += textareaText + '\n';
            }
          }
        }
        
        // Method 3: Try getting text from terminal container
        if (!terminalText.trim()) {
          const terminalContainer = document.querySelector('.terminal-wrapper');
          if (terminalContainer) {
            const containerText = terminalContainer.innerText || terminalContainer.textContent || '';
            if (containerText.trim()) {
              terminalText = containerText;
            }
          }
        }
        
        // Method 4: Try getting text from terminal tabs
        if (!terminalText.trim()) {
          const terminalTabs = document.querySelectorAll('.terminal-tab');
          terminalTabs.forEach(tab => {
            const tabText = tab.innerText || tab.textContent || '';
            if (tabText.trim()) {
              terminalText += tabText + '\n';
            }
          });
        }
        
        // Method 5: Try getting text from terminal viewport
        if (!terminalText.trim()) {
          const viewport = document.querySelector('.xterm-viewport');
          if (viewport) {
            const viewportText = viewport.innerText || viewport.textContent || '';
            if (viewportText.trim()) {
              terminalText = viewportText;
            }
          }
        }
        
        // Method 6: Last resort - try getting text from the entire xterm-screen
        if (!terminalText.trim()) {
          const screenText = xtermScreen.innerText || xtermScreen.textContent || '';
          if (screenText.trim()) {
            terminalText = screenText;
          }
        }
        
        return terminalText.trim();
      });

      // Only log if content changed and is not empty
      if (terminalOutput && terminalOutput !== this.lastTerminalContent) {
        console.log('[CursorIDEService] Terminal content changed, length:', terminalOutput.length);
        
        // Show what we actually got
        if (terminalOutput && terminalOutput.length > 0) {
          if (terminalOutput.includes('.xterm') || terminalOutput.includes('ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ')) {
            console.log('[CursorIDEService] CSS content detected, trying alternative methods...');
            // Try to get real terminal content
            const realContent = await page.evaluate(() => {
              // Try to get text from terminal tabs
              const tabs = document.querySelectorAll('.terminal-tab');
              let tabText = '';
              tabs.forEach(tab => {
                const text = tab.innerText || tab.textContent || '';
                if (text.trim()) {
                  tabText += text + '\n';
                }
              });
              return tabText.trim();
            });
            
            if (realContent) {
              console.log('[CursorIDEService] Found real terminal content:', realContent.substring(0, 100) + '...');
              const userAppUrl = this.extractUserAppUrl(realContent);
              if (userAppUrl) {
                console.log('[CursorIDEService] User app URL detected:', userAppUrl);
                if (this.eventBus) {
                  this.eventBus.emit('userAppDetected', { url: userAppUrl });
                }
                return userAppUrl;
              }
            }
          } else {
            console.log('[CursorIDEService] Content preview:', terminalOutput.substring(0, 200) + '...');
          }
        }
        
        this.lastTerminalContent = terminalOutput;
        
        const userAppUrl = this.extractUserAppUrl(terminalOutput);
        if (userAppUrl) {
          console.log('[CursorIDEService] User app URL detected:', userAppUrl);
          // Emit event via EventBus
          if (this.eventBus) {
            this.eventBus.emit('userAppDetected', { url: userAppUrl });
          }
          return userAppUrl;
        }
      }
      
      return null;
    } catch (error) {
      console.error('[CursorIDEService] Error monitoring terminal:', error);
      return null;
    }
  }

  extractUserAppUrl(terminalOutput) {
    // Parse common dev server patterns
    const patterns = [
      /Local:\s*(http:\/\/localhost:\d+)/i,
      /Server running on\s*(http:\/\/localhost:\d+)/i,
      /Local:\s*(http:\/\/127\.0\.0\.1:\d+)/i,
      /(http:\/\/localhost:\d+)/i,
      /(http:\/\/127\.0\.0\.1:\d+)/i,
      /localhost:\d+/i,
      /127\.0\.0\.1:\d+/i,
      /Server running at\s*(http:\/\/localhost:\d+)/i,
      /Server running at\s*(http:\/\/127\.0\.0\.1:\d+)/i,
      /Development server running at\s*(http:\/\/localhost:\d+)/i,
      /Development server running at\s*(http:\/\/127\.0\.0\.1:\d+)/i,
      /Ready in\s*\d+ms\s*-\s*(http:\/\/localhost:\d+)/i,
      /Ready in\s*\d+ms\s*-\s*(http:\/\/127\.0\.0\.1:\d+)/i,
      /Local:\s*(http:\/\/localhost:\d+)/i,
      /Network:\s*(http:\/\/localhost:\d+)/i,
      /Network:\s*(http:\/\/127\.0\.0\.1:\d+)/i
    ];
    
    for (const pattern of patterns) {
      const match = terminalOutput.match(pattern);
      if (match) {
        let url = match[1] || match[0];
        // Ensure URL has protocol
        if (!url.startsWith('http')) {
          url = 'http://' + url;
        }
        console.log('[CursorIDEService] URL pattern matched:', pattern, '->', url);
        return url;
      }
    }
    
    console.log('[CursorIDEService] No URL patterns matched in terminal output');
    return null;
  }

  async startTerminalMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    
    this.monitoringInterval = setInterval(async () => {
      await this.monitorTerminalOutput();
    }, 2000); // Check every 2 seconds
    
    console.log('[CursorIDEService] Terminal monitoring started');
  }

  async stopTerminalMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      console.log('[CursorIDEService] Terminal monitoring stopped');
    }
  }

  async restartUserApp() {
    try {
      const page = await this.browserManager.getPage();
      if (!page) {
        throw new Error('No Cursor IDE page available');
      }

      // Check if terminal is available (DO NOT CREATE NEW TERMINALS)
      await this.ensureTerminalOpen();
      
      // Focus terminal and send restart command
      await page.focus('.xterm-helper-textarea');
      await page.fill('.xterm-helper-textarea', 'npm run dev');
      await page.keyboard.press('Enter');
      
      console.log('[CursorIDEService] Restart command sent to terminal');
      
      // Monitor for new URL
      setTimeout(async () => {
        await this.monitorTerminalOutput();
      }, 3000);
      
    } catch (error) {
      console.error('[CursorIDEService] Error restarting app:', error);
      throw error;
    }
  }

  async ensureTerminalOpen() {
    try {
      const page = await this.browserManager.getPage();
      if (!page) {
        throw new Error('No Cursor IDE page available');
      }

      // Check if terminal is available - DO NOT CREATE NEW TERMINALS
      const terminalStatus = await page.evaluate(() => {
        const xtermScreen = document.querySelector('.xterm-screen');
        const canvasElements = xtermScreen ? xtermScreen.querySelectorAll('canvas') : [];
        
        return {
          terminalAvailable: !!xtermScreen,
          canvasCount: canvasElements.length
        };
      });

      if (!terminalStatus.terminalAvailable) {
        console.log('[CursorIDEService] No terminal available - will not create new terminal');
        throw new Error('No terminal available for monitoring');
      } else {
        console.log('[CursorIDEService] Terminal available for monitoring');
      }
    } catch (error) {
      console.error('[CursorIDEService] Error checking terminal:', error);
      throw error;
    }
  }
}

module.exports = CursorIDEService; 