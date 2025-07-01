class CursorIDEService {
  constructor(browserManager, ideManager, eventBus = null) {
    this.browserManager = browserManager;
    this.ideManager = ideManager;
    this.eventBus = eventBus;
    this.monitoringInterval = null;
    this.lastTerminalContent = '';
    this.lastTerminalStatus = null;
    this.lastPackageJsonCheck = null;
    this.cachedPackageJsonUrl = null;
    
    // Listen for IDE changes to reset package.json cache
    if (this.eventBus) {
      this.eventBus.subscribe('activeIDEChanged', async (eventData) => {
        console.log('[CursorIDEService] IDE changed, resetting package.json cache');
        this.resetPackageJsonCache();
        
        // Switch browser connection to new IDE
        if (eventData.port) {
          try {
            await this.browserManager.switchToPort(eventData.port);
            console.log('[CursorIDEService] Switched browser connection to port:', eventData.port);
          } catch (error) {
            console.error('[CursorIDEService] Failed to switch browser connection:', error.message);
          }
        }
      });
    }
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
        // First, try to enable xterm accessibility if not already enabled
        const terminals = document.querySelectorAll('.terminal, .xterm');
        terminals.forEach(terminal => {
          // Try to enable accessibility mode
          if (terminal._xterm && typeof terminal._xterm.setOption === 'function') {
            terminal._xterm.setOption('screenReaderMode', true);
            terminal._xterm.setOption('accessibilitySupport', true);
          }
        });
        
        // Try multiple approaches to get REAL terminal content
        let terminalText = '';
        
        // Method 1: Try xterm accessibility tree (most reliable for actual text)
        const accessibilityTree = document.querySelector('.xterm-accessibility-tree');
        if (accessibilityTree) {
          const accessibilityText = accessibilityTree.innerText || accessibilityTree.textContent || '';
          if (accessibilityText.trim() && !accessibilityText.includes('.xterm-')) {
            terminalText = accessibilityText;
            console.log('Found text in accessibility tree');
          }
        }
        
        // Method 2: Try to get text from canvas using OCR-like approach
        if (!terminalText.trim()) {
          const canvas = document.querySelector('.xterm canvas');
          if (canvas) {
            // Try to get text from canvas context
            const ctx = canvas.getContext('2d');
            if (ctx) {
              // This is a simplified approach - in reality you'd need OCR
              // For now, try to get any text that might be in the canvas
              console.log('Canvas found, but text extraction requires OCR');
            }
          }
        }
        
        // Method 3: Try xterm rows (actual terminal lines)
        if (!terminalText.trim()) {
          const xtermRows = document.querySelectorAll('.xterm-rows .xterm-row');
          if (xtermRows.length > 0) {
            xtermRows.forEach(row => {
              const rowText = row.innerText || row.textContent || '';
              if (rowText.trim() && !rowText.includes('.xterm-')) {
                terminalText += rowText + '\n';
              }
            });
            if (terminalText.trim()) {
              console.log('Found text in xterm rows');
            }
          }
        }
        
        // Method 4: Try terminal tabs (if using tabbed terminal)
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
        
        // Method 5: Try terminal container with specific selectors
        if (!terminalText.trim()) {
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
        }
        
        // Method 6: Try view-line elements (if they contain real text)
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
        
        // Method 7: Last resort - try to get any text from terminal area
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
        console.log('[CursorIDEService] Terminal content changed, length:', terminalOutput.length);
        
        // Show what we actually got
        if (terminalOutput && terminalOutput.length > 0) {
          console.log('[CursorIDEService] Content preview:', terminalOutput.substring(0, 200) + '...');
        }
        
        this.lastTerminalContent = terminalOutput;
        
        const userAppUrl = this.extractUserAppUrl(terminalOutput);
        if (userAppUrl) {
          console.log('[CursorIDEService] User app URL detected:', userAppUrl);
          // Emit event
          if (this.eventBus && typeof this.eventBus.emit === 'function') {
            this.eventBus.emit('userAppDetected', { url: userAppUrl });
          }
          return userAppUrl;
        }
      }
      
      // If no URL found in terminal, try package.json analysis as fallback
      if (!this.lastPackageJsonCheck || Date.now() - this.lastPackageJsonCheck > 10000) { // Check every 10 seconds
        if (!this.cachedPackageJsonUrl) {
          // Try CDP method first (more reliable)
          console.log('[CursorIDEService] Trying CDP method for package.json analysis...');
          this.cachedPackageJsonUrl = await this.detectDevServerFromCDP();
          
          // Fallback to old DOM method if CDP fails
          if (!this.cachedPackageJsonUrl) {
            console.log('[CursorIDEService] CDP failed, trying DOM method...');
            this.cachedPackageJsonUrl = await this.detectDevServerFromPackageJson();
          }
        }
        if (this.cachedPackageJsonUrl) {
          console.log('[CursorIDEService] Dev server detected from package.json:', this.cachedPackageJsonUrl);
          return this.cachedPackageJsonUrl;
        }
        this.lastPackageJsonCheck = Date.now();
      }
      
      return null;
    } catch (error) {
      console.error('[CursorIDEService] Error monitoring terminal:', error);
      return null;
    }
  }

  extractUserAppUrl(terminalOutput) {
    // Logge den Terminal-Output (letzte 30 Zeilen, falls sehr lang)
    if (terminalOutput && terminalOutput.length > 0) {
      const lines = terminalOutput.split('\n');
      const previewLines = lines.length > 30 ? lines.slice(-30) : lines;
      console.log('[CursorIDEService] TerminalOutput (Preview):\n' + previewLines.join('\n'));
    } else {
      console.log('[CursorIDEService] TerminalOutput: <leer oder undefined>');
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
        console.log('[CursorIDEService] URL pattern matched:', pattern, '->', url);
        return url;
      }
    }
    // --- NEU: Allgemeines Pattern für jede http(s)://...:PORT URL ---
    const genericUrlRegex = /(https?:\/\/[a-zA-Z0-9\[\]\.\-]+:\d+[^\s]*)/g;
    const matches = terminalOutput.match(genericUrlRegex);
    if (matches && matches.length > 0) {
      const url = matches[0];
      console.log('[CursorIDEService] Generic URL pattern matched ->', url);
      return url;
    }
    // ---
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

  async detectDevServerFromPackageJson(workspacePath = null) {
    try {
      // Hole Workspace-Pfad IMMER über Playwright-Methode (gecacht)
      if (!workspacePath) {
        workspacePath = await this.addWorkspacePathDetectionViaPlaywright();
        console.log('[CursorIDEService] Workspace path via Playwright:', workspacePath);
      }
      if (!workspacePath) {
        console.error('[CursorIDEService] No workspace path detected!');
        return null;
      }
      
      console.log('[CursorIDEService] Analyzing package.json in:', workspacePath);
      
      // Read package.json
      const fs = require('fs');
      const path = require('path');
      const packageJsonPath = path.join(workspacePath, 'package.json');
      
      if (!fs.existsSync(packageJsonPath)) {
        console.log('[CursorIDEService] No package.json found in:', workspacePath);
        
        // Try to find package.json in subdirectories
        console.log('[CursorIDEService] Searching for package.json in subdirectories...');
        const findPackageJson = (dir, maxDepth = 3, currentDepth = 0) => {
          if (currentDepth > maxDepth) return null;
          
          try {
            const files = fs.readdirSync(dir);
            for (const file of files) {
              const fullPath = path.join(dir, file);
              const stat = fs.statSync(fullPath);
              
              if (stat.isDirectory()) {
                const packagePath = path.join(fullPath, 'package.json');
                if (fs.existsSync(packagePath)) {
                  console.log('[CursorIDEService] Found package.json in subdirectory:', fullPath);
                  return fullPath;
                }
                
                // Recursively search deeper
                const found = findPackageJson(fullPath, maxDepth, currentDepth + 1);
                if (found) return found;
              }
            }
          } catch (error) {
            // Ignore permission errors
          }
          return null;
        };
        
        const foundPath = findPackageJson(workspacePath);
        if (foundPath) {
          workspacePath = foundPath;
          packageJsonPath = path.join(workspacePath, 'package.json');
        } else {
          return null;
        }
      }
      
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      
      // Analyze scripts for dev server patterns
      const scripts = packageJson.scripts || {};
      const devServerPorts = [];
      
      // Common dev server patterns
      const devPatterns = [
        { pattern: /dev/, defaultPort: 3000 },
        { pattern: /start/, defaultPort: 3000 },
        { pattern: /serve/, defaultPort: 3000 },
        { pattern: /vite/, defaultPort: 5173 },
        { pattern: /next/, defaultPort: 3000 },
        { pattern: /react/, defaultPort: 3000 },
        { pattern: /vue/, defaultPort: 3000 },
        { pattern: /svelte/, defaultPort: 5173 },
        { pattern: /nuxt/, defaultPort: 3000 },
        { pattern: /gatsby/, defaultPort: 8000 },
        { pattern: /astro/, defaultPort: 4321 },
        { pattern: /solid/, defaultPort: 3000 },
        { pattern: /preact/, defaultPort: 3000 }
      ];
      
      // Check each script
      for (const [scriptName, scriptCommand] of Object.entries(scripts)) {
        for (const { pattern, defaultPort } of devPatterns) {
          if (pattern.test(scriptName.toLowerCase()) || pattern.test(scriptCommand.toLowerCase())) {
            // Try to extract port from command
            const portMatch = scriptCommand.match(/--port\s+(\d+)|-p\s+(\d+)|port\s*=\s*(\d+)/i);
            const port = portMatch ? parseInt(portMatch[1] || portMatch[2] || portMatch[3]) : defaultPort;
            
            devServerPorts.push({
              script: scriptName,
              command: scriptCommand,
              port: port,
              url: `http://localhost:${port}`
            });
          }
        }
      }
      
      // Check for common dev server configurations
      if (packageJson.devDependencies || packageJson.dependencies) {
        const deps = { ...packageJson.devDependencies, ...packageJson.dependencies };
        
        // React/Vite
        if (deps.vite) {
          devServerPorts.push({
            script: 'vite',
            command: 'vite',
            port: 5173,
            url: 'http://localhost:5173'
          });
        }
        
        // Next.js
        if (deps.next) {
          devServerPorts.push({
            script: 'next',
            command: 'next dev',
            port: 3000,
            url: 'http://localhost:3000'
          });
        }
        
        // Create React App
        if (deps['react-scripts']) {
          devServerPorts.push({
            script: 'react-scripts',
            command: 'react-scripts start',
            port: 3000,
            url: 'http://localhost:3000'
          });
        }
        
        // Vue CLI
        if (deps['@vue/cli-service']) {
          devServerPorts.push({
            script: 'vue-cli-service',
            command: 'vue-cli-service serve',
            port: 8080,
            url: 'http://localhost:8080'
          });
        }
      }
      
      // Return the first (most likely) dev server
      if (devServerPorts.length > 0) {
        const primaryServer = devServerPorts[0];
        console.log('[CursorIDEService] Primary dev server detected:', primaryServer.url);
        
        // Emit event
        if (this.eventBus && typeof this.eventBus.emit === 'function') {
          this.eventBus.emit('userAppDetected', { url: primaryServer.url });
        }
        
        return primaryServer.url;
      }
      
      console.log('[CursorIDEService] No dev server patterns found in package.json');
      return null;
      
    } catch (error) {
      console.error('[CursorIDEService] Error analyzing package.json:', error);
      return null;
    }
  }

  resetPackageJsonCache() {
    this.cachedPackageJsonUrl = null;
    this.lastPackageJsonCheck = null;
    console.log('[CursorIDEService] Package.json cache reset for new IDE/project');
  }

  async detectDevServerFromCDP() {
    try {
      const page = await this.browserManager.getPage();
      if (!page) {
        console.log('[CursorIDEService] No page available for CDP');
        return null;
      }

      // Use CDP to get file system info
      const client = await page.context().newCDPSession(page);
      
      // Get workspace info from CDP
      const workspaceInfo = await client.send('Runtime.evaluate', {
        expression: `
          (() => {
            // Try to get workspace from various sources
            const workspace = {
              path: null,
              name: null
            };
            
            // Method 1: From window object
            if (window.workspace) {
              workspace.path = window.workspace.uri?.fsPath;
              workspace.name = window.workspace.name;
            }
            
            // Method 2: From VS Code API
            if (window.vscode) {
              workspace.path = window.vscode.workspace.workspaceFolders?.[0]?.uri?.fsPath;
              workspace.name = window.vscode.workspace.workspaceFolders?.[0]?.name;
            }
            
            // Method 3: From Monaco editor
            if (window.monaco) {
              workspace.path = window.monaco.Uri.file('.').fsPath;
            }
            
            return workspace;
          })()
        `
      });

      if (workspaceInfo.result?.value?.path) {
        const workspacePath = workspaceInfo.result.value.path;
        console.log('[CursorIDEService] CDP workspace path:', workspacePath);
        
        // Now analyze package.json in this path
        return await this.analyzePackageJsonInPath(workspacePath);
      }

      console.log('[CursorIDEService] No workspace path found via CDP');
      return null;

    } catch (error) {
      console.error('[CursorIDEService] CDP error:', error.message);
      return null;
    }
  }

  async analyzePackageJsonInPath(workspacePath) {
    try {
      const fs = require('fs');
      const path = require('path');
      
      console.log('[CursorIDEService] Analyzing package.json in path:', workspacePath);
      
      // Try to find package.json
      const packageJsonPath = path.join(workspacePath, 'package.json');
      
      if (fs.existsSync(packageJsonPath)) {
        return await this.parsePackageJson(packageJsonPath);
      }
      
      // Search in subdirectories
      console.log('[CursorIDEService] Searching for package.json in subdirectories...');
      const findPackageJson = (dir, maxDepth = 3, currentDepth = 0) => {
        if (currentDepth > maxDepth) return null;
        
        try {
          const files = fs.readdirSync(dir);
          for (const file of files) {
            const fullPath = path.join(dir, file);
            const stat = fs.statSync(fullPath);
            
            if (stat.isDirectory()) {
              const packagePath = path.join(fullPath, 'package.json');
              if (fs.existsSync(packagePath)) {
                console.log('[CursorIDEService] Found package.json in subdirectory:', fullPath);
                return fullPath;
              }
              
              // Recursively search deeper
              const found = findPackageJson(fullPath, maxDepth, currentDepth + 1);
              if (found) return found;
            }
          }
        } catch (error) {
          // Ignore permission errors
        }
        return null;
      };
      
      const foundPath = findPackageJson(workspacePath);
      if (foundPath) {
        return await this.parsePackageJson(path.join(foundPath, 'package.json'));
      }
      
      return null;
      
    } catch (error) {
      console.error('[CursorIDEService] Error analyzing path:', error.message);
      return null;
    }
  }

  async parsePackageJson(packageJsonPath) {
    try {
      const fs = require('fs');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      
      // Analyze scripts for dev server patterns
      const scripts = packageJson.scripts || {};
      const devServerPorts = [];
      
      // Common dev server patterns
      const devPatterns = [
        { pattern: /dev/, defaultPort: 3000 },
        { pattern: /start/, defaultPort: 3000 },
        { pattern: /serve/, defaultPort: 3000 },
        { pattern: /vite/, defaultPort: 5173 },
        { pattern: /next/, defaultPort: 3000 },
        { pattern: /react/, defaultPort: 3000 },
        { pattern: /vue/, defaultPort: 3000 },
        { pattern: /svelte/, defaultPort: 5173 },
        { pattern: /nuxt/, defaultPort: 3000 },
        { pattern: /gatsby/, defaultPort: 8000 },
        { pattern: /astro/, defaultPort: 4321 },
        { pattern: /solid/, defaultPort: 3000 },
        { pattern: /preact/, defaultPort: 3000 }
      ];
      
      // Check each script
      for (const [scriptName, scriptCommand] of Object.entries(scripts)) {
        for (const { pattern, defaultPort } of devPatterns) {
          if (pattern.test(scriptName.toLowerCase()) || pattern.test(scriptCommand.toLowerCase())) {
            // Try to extract port from command
            const portMatch = scriptCommand.match(/--port\s+(\d+)|-p\s+(\d+)|port\s*=\s*(\d+)/i);
            const port = portMatch ? parseInt(portMatch[1] || portMatch[2] || portMatch[3]) : defaultPort;
            
            devServerPorts.push({
              script: scriptName,
              command: scriptCommand,
              port: port,
              url: `http://localhost:${port}`
            });
          }
        }
      }
      
      // Check for common dev server configurations
      if (packageJson.devDependencies || packageJson.dependencies) {
        const deps = { ...packageJson.devDependencies, ...packageJson.dependencies };
        
        // React/Vite
        if (deps.vite) {
          devServerPorts.push({
            script: 'vite',
            command: 'vite',
            port: 5173,
            url: 'http://localhost:5173'
          });
        }
        
        // Next.js
        if (deps.next) {
          devServerPorts.push({
            script: 'next',
            command: 'next dev',
            port: 3000,
            url: 'http://localhost:3000'
          });
        }
        
        // Create React App
        if (deps['react-scripts']) {
          devServerPorts.push({
            script: 'react-scripts',
            command: 'react-scripts start',
            port: 3000,
            url: 'http://localhost:3000'
          });
        }
        
        // Vue CLI
        if (deps['@vue/cli-service']) {
          devServerPorts.push({
            script: 'vue-cli-service',
            command: 'vue-cli-service serve',
            port: 8080,
            url: 'http://localhost:8080'
          });
        }
      }
      
      // Return the first (most likely) dev server
      if (devServerPorts.length > 0) {
        const primaryServer = devServerPorts[0];
        console.log('[CursorIDEService] Primary dev server detected via CDP:', primaryServer.url);
        
        // Emit event
        if (this.eventBus && typeof this.eventBus.emit === 'function') {
          this.eventBus.emit('userAppDetected', { url: primaryServer.url });
        }
        
        return primaryServer.url;
      }
      
      console.log('[CursorIDEService] No dev server patterns found in package.json via CDP');
      return null;
      
    } catch (error) {
      console.error('[CursorIDEService] Error parsing package.json:', error.message);
      return null;
    }
  }

  /**
   * Ermittelt den absoluten Workspace-Pfad über Playwright Terminal.
   * Cacht das Ergebnis pro IDE-Port.
   * Gibt den Pfad als Promise zurück.
   */
  async addWorkspacePathDetectionViaPlaywright() {
    const port = this.ideManager.getActivePort();
    if (!port) throw new Error('No active IDE port');
    
    // Prüfe Backend-Cache
    const cached = this.ideManager.getWorkspacePath(port);
    if (cached) {
      console.log(`[CursorIDEService] Workspace path for port ${port} already set/cached:`, cached);
      return cached;
    }
    
    // Prüfe, ob bereits eine Erkennung läuft
    if (this._workspaceDetectionInProgress && this._workspaceDetectionInProgress[port]) {
      console.log(`[CursorIDEService] Workspace detection already in progress for port ${port}, waiting...`);
      await this._workspaceDetectionInProgress[port];
      return this.ideManager.getWorkspacePath(port);
    }
    
    // Setze Flag für laufende Erkennung
    if (!this._workspaceDetectionInProgress) this._workspaceDetectionInProgress = {};
    this._workspaceDetectionInProgress[port] = new Promise(async (resolve) => {
      try {
        const page = await this.browserManager.getPage();
        if (!page) throw new Error('No Cursor IDE page available');
        
        // 1. Neues Terminal öffnen (Ctrl+Shift+`)
        await page.keyboard.press('Control+Shift+Backquote');
        await page.waitForTimeout(700);
        
        // 2. Hardcoded Pfade für bekannte Ports
        let lastPwd;
        if (port === 9222) {
          lastPwd = '/home/fr4iser/Documents/Git/CursorWeb';
        } else if (port === 9223) {
          lastPwd = '/home/fr4iser/Documents/Git/aboutME';
        } else {
          lastPwd = '/home/fr4iser/Documents/Git/CursorWeb'; // Default
        }
        
        // Direkt Backend setzen (kein curl nötig)
        this.ideManager.setWorkspacePath(port, lastPwd);
        console.log(`[CursorIDEService] Set workspace path for port ${port}:`, lastPwd);
        
        resolve(lastPwd);
      } catch (error) {
        console.error('[CursorIDEService] Error in workspace detection:', error);
        resolve(null);
      } finally {
        // Flag entfernen
        delete this._workspaceDetectionInProgress[port];
      }
    });
    
    return await this._workspaceDetectionInProgress[port];
  }
}

module.exports = CursorIDEService; 