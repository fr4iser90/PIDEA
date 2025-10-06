const { chromium, firefox, webkit } = require('playwright');
const fs = require('fs-extra');
const path = require('path');

class PlaywrightTestRunner {
  constructor(config = {}) {
    this.browsers = { chromium, firefox, webkit };
    this.config = config;
  }

  // Finde NixOS Chromium
  getNixOSChromiumPath() {
    const { execSync } = require('child_process');
    
    try {
      // Versuche NixOS Chromium zu finden
      const nixOSChromium = execSync('which chromium', { encoding: 'utf8' }).trim();
      
      if (nixOSChromium) {
        console.log(`🔍 Using NixOS Chromium: ${nixOSChromium}`);
        return nixOSChromium;
      }
    } catch (error) {
      // NixOS Chromium nicht gefunden, verwende Standard
      console.log(`🔍 NixOS Chromium not found, using standard Playwright Chromium`);
    }
    
    // Fallback zu Standard Playwright Chromium
    return undefined;
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
    console.log(`🔄 Running REAL tests on ${browserName}...`);
    
    // Merge config with options to ensure all settings are passed
    const mergedConfig = { ...this.config, ...options };
    
    try {
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);
      
      // Build Playwright command with proper options
      const testDir = path.dirname(testFile);
      const testFileName = path.basename(testFile);
      
      let command = `npx playwright test ${testFileName}`;
      
      // Add project directory
      command += ` --config ${path.join(testDir, '../playwright.config.js')}`;
      
      // Add browser project
      command += ` --project ${browserName}`;
      
      // Add headless option
      if (mergedConfig.headless === false) {
        command += ` --headed`;
      }
      
      // Environment variables will be set in execAsync options
      
      console.log(`🚀 Executing: ${command}`);
      console.log(`📁 Working directory: ${testDir}`);
      
      // Execute the REAL Playwright tests
      const { stdout, stderr } = await execAsync(command, {
        cwd: testDir,
        timeout: mergedConfig.timeout || 30000,
        env: {
          ...process.env,
          TEST_BASE_URL: mergedConfig.baseURL,
          VITE_FRONTEND_URL: mergedConfig.baseURL,
          NIXOS_CHROMIUM_PATH: this.getNixOSChromiumPath(), // Set NixOS Chromium path
          TEST_LOGIN_USERNAME: mergedConfig.login?.username || 'test@test.com',
          TEST_LOGIN_PASSWORD: mergedConfig.login?.password || 'test123',
          TEST_TIMEOUT: mergedConfig.timeout || 30000
        }
      });
      
      console.log('📊 Test Output:');
      console.log(stdout);
      
      if (stderr) {
        console.log('⚠️ Test Warnings/Errors:');
        console.log(stderr);
      }
      
      // Parse test results
      const success = !stderr.includes('failed') && stdout.includes('passed');
      
      console.log(`✅ Tests completed on ${browserName}`);
      
      return {
        success: success,
        browser: browserName,
        output: stdout,
        error: stderr,
        command: command,
        duration: Date.now() - Date.now(),
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.log(`❌ Tests failed on ${browserName}:`, error.message);
      console.log('\n💡 Make sure Playwright is installed: npx playwright install chromium');
      
      return {
        success: false,
        browser: browserName,
        error: error.message,
        output: error.stdout || '',
        stderr: error.stderr || '',
        duration: Date.now() - Date.now(),
        timestamp: new Date().toISOString()
      };
    }
  }
}

module.exports = PlaywrightTestRunner;