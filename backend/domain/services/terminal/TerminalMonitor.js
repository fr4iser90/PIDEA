class TerminalMonitor {
  constructor(browserManager, eventBus = null) {
    this.browserManager = browserManager;
    this.eventBus = eventBus;
    this.monitoringInterval = null;
    this.lastTerminalContent = '';
    this.lastTerminalStatus = null;
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
        console.log('[TerminalMonitor] Terminal status:', terminalExists);
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
        // Simplified terminal content extraction - focus on practical methods
        let terminalText = '';
        
        // Method 1: Try terminal container with specific selectors (most reliable)
        const selectors = [
          '.terminal-wrapper',
          '.terminal-container', 
          '.terminal-panel',
          '.terminal-viewport',
          '.terminal-content'
        ];
        
        for (const selector of selectors) {
          const element = document.querySelector(selector);
          if (element) {
            const elementText = element.innerText || element.textContent || '';
            if (elementText.trim() && !elementText.includes('.xterm-') && elementText.length > 10) {
              terminalText = elementText;
              console.log('Found text in', selector);
              break;
            }
          }
        }
        
        // Method 2: Try view-line elements (if they contain real text)
        if (!terminalText.trim()) {
          const viewLines = document.querySelectorAll('.view-line');
          if (viewLines.length > 0) {
            viewLines.forEach(line => {
              const lineText = line.innerText || line.textContent || '';
              if (lineText.trim() && !lineText.includes('.xterm-') && lineText.length > 2) {
                terminalText += lineText + '\n';
              }
            });
            if (terminalText.trim()) {
              console.log('Found text in view-lines');
            }
          }
        }
        
        // Method 3: Try terminal tabs (if using tabbed terminal)
        if (!terminalText.trim()) {
          const terminalTabs = document.querySelectorAll('.terminal-tab, .tab-content');
          terminalTabs.forEach(tab => {
            const tabText = tab.innerText || tab.textContent || '';
            if (tabText.trim() && !tabText.includes('.xterm-') && tabText.length > 10) {
              terminalText += tabText + '\n';
            }
          });
          if (terminalText.trim()) {
            console.log('Found text in terminal tabs');
          }
        }
        
        // Method 4: Last resort - try to get any text from terminal area
        if (!terminalText.trim()) {
          const terminalArea = document.querySelector('.terminal, .xterm, .xterm-screen');
          if (terminalArea) {
            const areaText = terminalArea.innerText || terminalArea.textContent || '';
            if (areaText.trim() && !areaText.includes('.xterm-') && areaText.length > 10) {
              terminalText = areaText;
              console.log('Found text in terminal area');
            }
          }
        }
        
        return terminalText.trim();
      });

      // Only log if content changed and is not empty
      if (terminalOutput && terminalOutput !== this.lastTerminalContent) {
        console.log('[TerminalMonitor] Terminal content changed, length:', terminalOutput.length);
        
        // Show what we actually got
        if (terminalOutput && terminalOutput.length > 0) {
          console.log('[TerminalMonitor] Content preview:', terminalOutput.substring(0, 200) + '...');
        }
        
        this.lastTerminalContent = terminalOutput;
        
        const userAppUrl = this.extractUserAppUrl(terminalOutput);
        if (userAppUrl) {
          console.log('[TerminalMonitor] User app URL detected:', userAppUrl);
          // Emit event
          if (this.eventBus && typeof this.eventBus.emit === 'function') {
            this.eventBus.emit('userAppDetected', { url: userAppUrl });
          }
          return userAppUrl;
        }
      }
      
      // If no URL found in terminal, rely on package.json analysis instead
      // This is more reliable than trying to parse terminal output
      console.log('[TerminalMonitor] No URL found in terminal, relying on package.json analysis');
      return null;
    } catch (error) {
      console.error('[TerminalMonitor] Error monitoring terminal:', error);
      return null;
    }
  }

  async startTerminalMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    
    this.monitoringInterval = setInterval(async () => {
      await this.monitorTerminalOutput();
    }, 2000); // Check every 2 seconds
    
    console.log('[TerminalMonitor] Terminal monitoring started');
  }

  async stopTerminalMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      console.log('[TerminalMonitor] Terminal monitoring stopped');
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
      
      console.log('[TerminalMonitor] Restart command sent to terminal');
      
      // Monitor for new URL
      setTimeout(async () => {
        await this.monitorTerminalOutput();
      }, 3000);
      
    } catch (error) {
      console.error('[TerminalMonitor] Error restarting app:', error);
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
        console.log('[TerminalMonitor] No terminal available - will not create new terminal');
        throw new Error('No terminal available for monitoring');
      } else {
        console.log('[TerminalMonitor] Terminal available for monitoring');
      }
    } catch (error) {
      console.error('[TerminalMonitor] Error checking terminal:', error);
      throw error;
    }
  }

  extractUserAppUrl(terminalOutput) {
    // Logge den Terminal-Output (letzte 30 Zeilen, falls sehr lang)
    if (terminalOutput && terminalOutput.length > 0) {
      const lines = terminalOutput.split('\n');
      const previewLines = lines.length > 30 ? lines.slice(-30) : lines;
      console.log('[TerminalMonitor] TerminalOutput (Preview):\n' + previewLines.join('\n'));
    } else {
      console.log('[TerminalMonitor] TerminalOutput: <leer oder undefined>');
    }
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
        console.log('[TerminalMonitor] URL pattern matched:', pattern, '->', url);
        return url;
      }
    }
    // --- NEU: Allgemeines Pattern für jede http(s)://...:PORT URL ---
    const genericUrlRegex = /(https?:\/\/[a-zA-Z0-9\[\]\.\-]+:\d+[^\s]*)/g;
    const matches = terminalOutput.match(genericUrlRegex);
    if (matches && matches.length > 0) {
      const url = matches[0];
      console.log('[TerminalMonitor] Generic URL pattern matched ->', url);
      return url;
    }
    // ---
    console.log('[TerminalMonitor] No URL patterns matched in terminal output');
    return null;
  }
}

module.exports = TerminalMonitor;
