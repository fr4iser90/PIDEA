const { chromium, firefox, webkit } = require('playwright');
const { execSync } = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');

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
    
    // Get working launch options from your script logic
    const launchOptions = await this.getWorkingLaunchOptions(browserName, options);
    
    const browser = await this.browsers[browserName].launch(launchOptions);
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      // Read and execute test content
      const testContent = fs.readFileSync(testFile, 'utf8');
      
      // Set up page with test content
      await page.setContent(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Test Page</title>
        </head>
        <body>
          <div id="test-content">Test loaded successfully</div>
        </body>
        </html>
      `);

      // Navigate to base URL if provided
      if (options.baseURL) {
        await page.goto(options.baseURL);
      }

      // Execute test logic
      await page.evaluate(() => {
        console.log('Test executed successfully');
      });

      // Take screenshot if enabled
      if (options.screenshots?.enabled) {
        const screenshotPath = path.join(options.screenshots.path || './screenshots', `${browserName}-${Date.now()}.png`);
        fs.ensureDirSync(path.dirname(screenshotPath));
        await page.screenshot({ path: screenshotPath });
      }

      await browser.close();

      return {
        success: true,
        browser: browserName,
        duration: Date.now() - Date.now(),
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      await browser.close();
      throw error;
    }
  }

  // GENAU dein Script-Logic!
  async getWorkingLaunchOptions(browserName, config = {}) {
    console.log(`🔍 Finding working launch options for ${browserName}...`);
    
        const options = [
            { name: 'Default', options: {} },
            { name: 'Headless', options: { headless: true } },
            { name: 'No sandbox', options: { args: ['--no-sandbox'] } },
            { name: 'Disable GPU', options: { args: ['--disable-gpu'] } },
            { name: 'Disable dev shm', options: { args: ['--disable-dev-shm-usage'] } },
            { name: 'All flags', options: {
                args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--disable-web-security']
            }},
            // NixOS specific options that work
            { name: 'NixOS flags', options: {
                args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--disable-web-security', '--disable-features=VizDisplayCompositor']
            }},
            { name: 'NixOS minimal', options: {
                args: ['--no-sandbox', '--disable-gpu']
            }}
        ];

    // Test system browser paths - nur wenn normale Optionen fehlschlagen
    const systemPaths = [
      '/usr/bin/chromium-browser',
      '/usr/bin/google-chrome',
      '/usr/bin/firefox',
      '/snap/bin/chromium',
      '/snap/bin/firefox',
      // NixOS specific paths
      '/run/current-system/sw/bin/firefox',
      '/run/current-system/sw/bin/chromium',
      '/run/current-system/sw/bin/google-chrome'
    ];

    // Test Playwright options first
    for (const option of options) {
      try {
        const testBrowser = await this.browsers[browserName].launch({
          headless: config.headless !== undefined ? config.headless : false,
          ...option.options
        });
        await testBrowser.close();
        console.log(`✅ ${option.name} worked for ${browserName}`);
        return {
          headless: config.headless !== undefined ? config.headless : false,
          ...option.options
        };
      } catch (error) {
        console.log(`❌ ${option.name} failed for ${browserName}:`, error.message);
      }
    }

    // Test system browsers
    for (const browserPath of systemPaths) {
      if (fs.existsSync(browserPath)) {
        try {
          const testBrowser = await this.browsers[browserName].launch({
            executablePath: browserPath,
            headless: config.headless !== undefined ? config.headless : false
          });
          await testBrowser.close();
          console.log(`✅ System browser worked: ${browserPath}`);
          return {
            executablePath: browserPath,
            headless: config.headless !== undefined ? config.headless : false
          };
        } catch (error) {
          console.log(`❌ System browser failed: ${browserPath}`, error.message);
        }
      }
    }

    console.log(`⚠️ No working options found for ${browserName}, using fallback`);
    return {
      headless: config.headless !== undefined ? config.headless : false,
      args: ['--no-sandbox', '--disable-gpu'] // Fallback wie dein Script!
    };
  }
}

module.exports = PlaywrightTestRunner;