const { chromium } = require('playwright');

class BrowserManager {
  constructor() {
    this.browser = null;
    this.page = null;
    this.isConnecting = false;
  }

  async connect() {
    if (this.browser && this.page) {
      return this.page;
    }

    if (this.isConnecting) {
      // Wait for existing connection attempt
      while (this.isConnecting) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return this.page;
    }

    this.isConnecting = true;

    try {
      console.log('[BrowserManager] Connecting to Cursor IDE...');
      this.browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
      const contexts = this.browser.contexts();
      this.page = contexts[0].pages()[0];
      
      if (!this.page) {
        throw new Error('No page found in Cursor IDE');
      }

      console.log('[BrowserManager] Successfully connected to Cursor IDE');
      return this.page;

    } catch (error) {
      console.error('[BrowserManager] Connection failed:', error.message);
      this.browser = null;
      this.page = null;
      throw error;
    } finally {
      this.isConnecting = false;
    }
  }

  async getPage() {
    try {
      if (!this.page || !this.browser) {
        await this.connect();
      }
      
      // Check if page is still valid
      if (this.page && this.page.isClosed && this.page.isClosed()) {
        console.log('[BrowserManager] Page was closed, reconnecting...');
        this.page = null;
        await this.connect();
      }
      
      return this.page;
    } catch (error) {
      console.error('[BrowserManager] Error getting page:', error.message);
      return null;
    }
  }

  // File Explorer Methods
  async getFileExplorerTree() {
    try {
      const page = await this.getPage();
      if (!page) {
        throw new Error('No connection to Cursor IDE');
      }

      // Try multiple selectors for the explorer
      const selectors = [
        '.explorer-folders-view',
        '.monaco-list.list_id_2',
        '[data-keybinding-context="16"]',
        '.monaco-list[role="tree"]'
      ];

      let explorerFound = false;
      for (const selector of selectors) {
        try {
          await page.waitForSelector(selector, { timeout: 2000 });
          explorerFound = true;
          break;
        } catch (e) {}
      }
      if (!explorerFound) return [];

      // Extract the file tree structure as a flat list
      const flatFiles = await page.evaluate(() => {
        const selectors = [
          '.explorer-folders-view .monaco-list-row',
          '.monaco-list.list_id_2 .monaco-list-row',
          '[data-keybinding-context="16"] .monaco-list-row',
          '.monaco-list[role="tree"] .monaco-list-row'
        ];
        let treeItems = [];
        for (const selector of selectors) {
          const items = document.querySelectorAll(selector);
          if (items.length > 0) {
            treeItems = Array.from(items);
            break;
          }
        }
        return treeItems.map(item => {
          const labelElement = item.querySelector('.label-name');
          if (!labelElement) return null;
          const name = labelElement.textContent.trim();
          const ariaLabel = item.getAttribute('aria-label');
          const ariaLevel = parseInt(item.getAttribute('aria-level') || '1');
          const ariaExpanded = item.getAttribute('aria-expanded') === 'true';
          const isSelected = item.classList.contains('selected');
          const isDirectory = item.querySelector('.codicon-tree-item-expanded') !== null;
          let path = '';
          if (ariaLabel) {
            const pathMatch = ariaLabel.match(/~\/Documents\/Git\/CursorWeb\/(.+)/);
            if (pathMatch) {
              path = pathMatch[1];
            }
          }
          // Fallback: Wenn path leer ist und Root-Ordner, setze ihn auf den Namen
          if (!path && isDirectory && ariaLevel === 1) {
            path = name;
            console.warn('[BrowserManager] WARN: Root-Ordner ohne Pfad, setze path auf name:', name);
          }
          if (!path) {
            path = name;
            console.warn('[BrowserManager] WARN: Leerer Pfad für', name, ariaLabel);
          }
          return {
            name,
            path,
            type: isDirectory ? 'directory' : 'file',
            level: ariaLevel,
            expanded: ariaExpanded,
            selected: isSelected
          };
        }).filter(Boolean);
      });

      // Build tree from flat list
      function buildTree(flatList) {
        const root = [];
        const pathMap = {};
        flatList.forEach(item => {
          item.children = [];
          pathMap[item.path] = item;
        });
        flatList.forEach(item => {
          const parentPath = item.path.split('/').slice(0, -1).join('/');
          if (parentPath && pathMap[parentPath]) {
            pathMap[parentPath].children.push(item);
          } else {
            root.push(item);
          }
        });
        return root;
      }
      return buildTree(flatFiles);
    } catch (error) {
      console.error('[BrowserManager] Error reading file explorer tree:', error.message);
      return [];
    }
  }

  async openFile(filePath) {
    try {
      console.log('[BrowserManager] openFile aufgerufen mit:', filePath);
      const page = await this.getPage();
      if (!page) {
        throw new Error('No connection to Cursor IDE');
      }
      // Find the file in the explorer and click it
      const fileSelector = `.explorer-folders-view .monaco-list-row[aria-label*="${filePath}"]`;
      console.log('[BrowserManager] Suche Selector:', fileSelector);
      await page.waitForSelector(fileSelector, { timeout: 5000 });
      await page.click(fileSelector);
      // Wait for the file to open in the editor
      await page.waitForSelector('.monaco-editor', { timeout: 5000 });
      console.log(`[BrowserManager] Opened file: ${filePath}`);
      return true;
    } catch (error) {
      console.error(`[BrowserManager] Error opening file ${filePath}:`, error.message);
      return false;
    }
  }

  async getCurrentFileContent() {
    try {
      const page = await this.getPage();
      if (!page) {
        throw new Error('No connection to Cursor IDE');
      }

      // Wait for the editor to be available
      await page.waitForSelector('.monaco-editor', { timeout: 5000 });

      // Get the file content from the editor
      const content = await page.evaluate(() => {
        const editorElement = document.querySelector('.monaco-editor');
        if (!editorElement) return '';

        // Try to get content from Monaco editor
        const monacoEditor = window.monaco?.editor?.getEditors()?.[0];
        if (monacoEditor) {
          return monacoEditor.getValue();
        }

        // Fallback: try to get content from textarea or contenteditable
        const textarea = editorElement.querySelector('textarea');
        if (textarea) {
          return textarea.value;
        }

        const contentEditable = editorElement.querySelector('[contenteditable="true"]');
        if (contentEditable) {
          return contentEditable.textContent;
        }

        return '';
      });

      return content;

    } catch (error) {
      console.error('[BrowserManager] Error reading file content:', error.message);
      return '';
    }
  }

  async getFileContent(filePath) {
    try {
      console.log('[BrowserManager] getFileContent aufgerufen mit:', filePath);
      const page = await this.getPage();
      if (!page) {
        throw new Error('No connection to Cursor IDE');
      }
      // First, open the file in the editor
      const opened = await this.openFile(filePath);
      if (!opened) {
        throw new Error(`Failed to open file: ${filePath}`);
      }
      // Wait a bit for the file to load
      await page.waitForTimeout(1000);
      // Get the content from the editor
      const content = await this.getCurrentFileContent();
      console.log('[BrowserManager] Dateiinhalt geladen für:', filePath);
      return content;
    } catch (error) {
      console.error(`[BrowserManager] Error getting file content for ${filePath}:`, error.message);
      throw error;
    }
  }

  async getCurrentFileInfo() {
    try {
      const page = await this.getPage();
      if (!page) {
        throw new Error('No connection to Cursor IDE');
      }

      // Get the current file tab information
      const fileInfo = await page.evaluate(() => {
        const activeTab = document.querySelector('.tab.active, .tab.active-modified');
        if (!activeTab) return null;

        const tabTitle = activeTab.querySelector('.tab-title')?.textContent?.trim();
        const tabPath = activeTab.getAttribute('data-resource-uri');
        
        return {
          name: tabTitle,
          path: tabPath,
          isModified: activeTab.classList.contains('active-modified')
        };
      });

      return fileInfo;

    } catch (error) {
      console.error('[BrowserManager] Error getting current file info:', error.message);
      return null;
    }
  }

  async refreshExplorer() {
    try {
      const page = await this.getPage();
      if (!page) {
        throw new Error('No connection to Cursor IDE');
      }

      // Click the refresh button in the explorer
      const refreshButton = await page.$('.explorer-folders-view .codicon-refresh');
      if (refreshButton) {
        await refreshButton.click();
        console.log('[BrowserManager] Refreshed file explorer');
        return true;
      }

      return false;

    } catch (error) {
      console.error('[BrowserManager] Error refreshing explorer:', error.message);
      return false;
    }
  }

  async disconnect() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
      console.log('[BrowserManager] Disconnected from Cursor IDE');
    }
  }

  isConnected() {
    return this.browser !== null && this.page !== null;
  }

  async healthCheck() {
    try {
      const page = await this.getPage();
      // Simple health check - try to get page title
      await page.title();
      return true;
    } catch (error) {
      console.error('[BrowserManager] Health check failed:', error.message);
      // Reset connection on health check failure
      this.browser = null;
      this.page = null;
      return false;
    }
  }
}

module.exports = BrowserManager; 