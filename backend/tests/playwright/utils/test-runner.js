const { chromium, firefox, webkit } = require('playwright');
const fs = require('fs-extra');
const path = require('path');

class PlaywrightTestRunner {
  constructor(config = {}) {
    this.browsers = { chromium, firefox, webkit };
    this.config = config;
  }

  async executeTest(testFile, options = {}) {
    const results = [];
    
    for (const browserName of this.config.browsers || ['chromium']) {
      try {
        const result = await this.executeTestOnBrowser(testFile, browserName, options);
        results.push(result);
      } catch (error) {
        console.log(`❌ Playwright failed on ${browserName}:`, error.message);
        results.push({
          success: false,
          error: error.message,
          browser: browserName,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    return results;
  }

  async executeTestOnBrowser(testFile, browserName, options = {}) {
    console.log(`🔄 Testing on ${browserName}...`);
    
    // Merge config with options to ensure all settings are passed
    const mergedConfig = { ...this.config, ...options };
    
    try {
      console.log(`1️⃣ Testing ${browserName} launch...`);
      
      // DEINE KONFIGURATION AUS DER DATENBANK RESPEKTIEREN!
      const browser = await this.browsers[browserName].launch({
        headless: mergedConfig.headless !== undefined ? mergedConfig.headless : true, // DEINE EINSTELLUNG! Default to headless for NixOS compatibility
        args: ['--no-sandbox', '--disable-gpu'] // NixOS compatible args - same as working script!
      });
      
      // DEBUG: Show what executable was actually used
      console.log('🔍 DEBUG: Browser launched, checking processes...');
      console.log(`🔍 DEBUG: Headless mode: ${mergedConfig.headless}`);
      
      console.log(`✅ ${browserName} launched successfully!`);
      
      const page = await browser.newPage();
      
      // Navigate to base URL - DEIN SCRIPT!
      if (mergedConfig.baseURL) {
        await page.goto(mergedConfig.baseURL);
        console.log('✅ Website loaded successfully!');
        
        // Test curl-like functionality - DEIN SCRIPT!
        const response = await page.goto(mergedConfig.baseURL);
        console.log('📊 Response status:', response.status());
        console.log('📊 Response headers:', response.headers());
        
        // Get page title - DEIN SCRIPT!
        const title = await page.title();
        console.log('📄 Page title:', title);
        
        // Get page content length - DEIN SCRIPT!
        const content = await page.content();
        console.log('📏 Page content length:', content.length, 'characters');
      }
      
      // Read test file - DEIN SCRIPT!
      const testContent = fs.readFileSync(testFile, 'utf8');
      console.log(`📄 Test file: ${path.basename(testFile)}`);
      console.log(`📏 Test content length: ${testContent.length} characters`);
      
      // Take screenshot if enabled
      if (mergedConfig.screenshots?.enabled) {
        const screenshotPath = path.join(mergedConfig.screenshots.path || './screenshots', `${browserName}-${Date.now()}.png`);
        fs.ensureDirSync(path.dirname(screenshotPath));
        await page.screenshot({ path: screenshotPath });
        console.log(`📸 Screenshot saved: ${screenshotPath}`);
      }
      
      // Wait a bit so you can see the browser - DEIN SCRIPT!
      await page.waitForTimeout(2000);
      
      await browser.close();
      console.log('✅ Browser closed successfully!');
      
      console.log('\n🎉 Playwright works! You can use this configuration for tests.');
      
      return {
        success: true,
        browser: browserName,
        duration: Date.now() - Date.now(),
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.log(`❌ Playwright failed on ${browserName}:`, error.message);
      console.log('\n💡 Try running: npx playwright install chromium');
      throw error;
    }
  }
}

module.exports = PlaywrightTestRunner;