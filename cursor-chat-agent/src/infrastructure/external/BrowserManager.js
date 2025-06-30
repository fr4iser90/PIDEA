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