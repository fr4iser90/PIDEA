const fs = require('fs');
const path = require('path');
const os = require('os');

// Simple logger for testing - reduce verbosity
const logger = {
  info: () => {}, // Disable info logs
  debug: () => {}, // Disable debug logs
  error: console.error,
  warn: console.warn
};

/**
 * Browser Environment Detection Service
 * 
 * Detects available browsers and their capabilities based on:
 * - Operating System (Linux, macOS, Windows)
 * - Playwright browser installations
 * - System browser installations
 * - NO special NixOS handling - just like the working script!
 */
class BrowserEnvironmentService {
  constructor() {
    this.platform = os.platform();
    this.playwrightCacheDir = path.join(os.homedir(), '.cache', 'ms-playwright');
    
    logger.info('BrowserEnvironmentService initialized', {
      platform: this.platform,
      playwrightCacheDir: this.playwrightCacheDir
    });
  }

  /**
   * Get all available browser options
   */
  async getAvailableBrowsers() {
    const browsers = {
      playwright: await this.detectPlaywrightBrowsers(),
      system: await this.detectSystemBrowsers(),
      recommendations: this.getRecommendations()
    };

    logger.info('Browser detection completed', browsers);
    return browsers;
  }

  /**
   * Detect Playwright browsers
   */
  async detectPlaywrightBrowsers() {
    const browsers = [];
    
    const playwrightBrowsers = [
      { name: 'chromium', executable: 'chrome-linux/chrome' },
      { name: 'chromium_headless_shell', executable: 'chrome-linux/headless_shell' },
      { name: 'firefox', executable: 'firefox/firefox' },
      { name: 'webkit', executable: 'webkit' }
    ];


    try {
      // Look for versioned directories directly in cache dir (e.g., chromium-1193)
      const entries = fs.readdirSync(this.playwrightCacheDir);
      
      for (const browser of playwrightBrowsers) {
        let isAvailable = false;
        let browserPath = null;
        
        // Special handling for chromium_headless_shell
        if (browser.name === 'chromium_headless_shell') {
          const headlessShellDirs = entries.filter(entry => entry.startsWith('chromium_headless_shell-'));
          if (headlessShellDirs.length > 0) {
            headlessShellDirs.sort((a, b) => {
              const versionA = parseInt(a.split('-')[2]);
              const versionB = parseInt(b.split('-')[2]);
              return versionB - versionA; // Descending order
            });
            
            const latestVersionDir = headlessShellDirs[0];
            const fullPath = path.join(this.playwrightCacheDir, latestVersionDir, browser.executable);
            if (fs.existsSync(fullPath)) {
              isAvailable = true;
              browserPath = fullPath;
            }
          }
        } else {
          const browserVersionDirs = entries.filter(entry => entry.startsWith(browser.name + '-'));
          
          if (browserVersionDirs.length > 0) {
            // Sort by version number and get the latest
            browserVersionDirs.sort((a, b) => {
              const versionA = parseInt(a.split('-')[1]);
              const versionB = parseInt(b.split('-')[1]);
              return versionB - versionA; // Descending order
            });
            
            const latestVersionDir = browserVersionDirs[0];
            const fullPath = path.join(this.playwrightCacheDir, latestVersionDir, browser.executable);
            if (fs.existsSync(fullPath)) {
              isAvailable = true;
              browserPath = fullPath;
            }
          }
        }
        
        if (isAvailable) {
          browsers.push({
            name: browser.name,
            type: 'playwright',
            available: isAvailable,
            path: browserPath,
            compatible: this.isBrowserCompatible(browser.name)
          });
        } else {
          logger.debug(`Playwright browser ${browser.name} not available`);
        }
      }
    } catch (error) {
      logger.warn('Failed to detect Playwright browsers:', error.message);
      // Return empty browsers if cache dir doesn't exist
      return [];
    }

    return browsers;
  }

  /**
   * Detect system browsers
   */
  async detectSystemBrowsers() {
    const browsers = [];
    
    const systemBrowserCommands = this.getSystemBrowserCommands();
    
    for (const browser of systemBrowserCommands) {
      try {
        const { execSync } = require('child_process');
        execSync(`which ${browser.command}`, { stdio: 'ignore' });
        browsers.push({
          name: browser.name,
          type: 'system',
          available: true,
          command: browser.command,
          compatible: true,
          incognitoFlag: browser.incognitoFlag
        });
        logger.info(`✅ Found system browser: ${browser.name} at ${browser.command}`);
      } catch (error) {
        // Don't add unavailable browsers to the list
        logger.debug(`❌ System browser ${browser.name} not available: ${browser.command}`);
      }
    }

    logger.info(`System browser detection completed: ${browsers.length} browsers found`);
    return browsers;
  }

  /**
   * Get system browser commands based on OS
   */
  getSystemBrowserCommands() {
    const commands = {
      linux: [
        { name: 'chrome', command: 'google-chrome', incognitoFlag: '--incognito' },
        { name: 'chromium', command: 'chromium-browser', incognitoFlag: '--incognito' },
        { name: 'firefox', command: 'firefox', incognitoFlag: '--private-window' },
        { name: 'edge', command: 'microsoft-edge', incognitoFlag: '--inprivate' }
      ],
      darwin: [
        { name: 'chrome', command: 'google-chrome', incognitoFlag: '--incognito' },
        { name: 'firefox', command: 'firefox', incognitoFlag: '--private-window' },
        { name: 'safari', command: 'safari', incognitoFlag: '--private' }
      ],
      win32: [
        { name: 'chrome', command: 'chrome', incognitoFlag: '--incognito' },
        { name: 'firefox', command: 'firefox', incognitoFlag: '--private-window' },
        { name: 'edge', command: 'msedge', incognitoFlag: '--inprivate' }
      ]
    };

    return commands[this.platform] || commands.linux;
  }

  /**
   * Check if browser is compatible with current environment
   */
  isBrowserCompatible(browserName) {
    // Always compatible - let Playwright handle it like in the script
    return true;
  }

  /**
   * Get recommendations based on environment
   */
  getRecommendations() {
    const recommendations = {
      primary: null,
      fallback: null,
      installCommand: 'npx playwright install chromium',
      warnings: []
    };

    // Primary recommendation
    if (this.platform === 'linux') {
      recommendations.primary = 'chromium';
      recommendations.fallback = 'google-chrome';
    } else if (this.platform === 'darwin') {
      recommendations.primary = 'chrome';
      recommendations.fallback = 'firefox';
    } else if (this.platform === 'win32') {
      recommendations.primary = 'chrome';
      recommendations.fallback = 'edge';
    }

    return recommendations;
  }

  /**
   * Get environment summary for frontend
   */
  async getEnvironmentSummary() {
    const browsers = await this.getAvailableBrowsers();
    
    return {
      platform: this.platform,
      browsers: browsers,
      hasPlaywrightBrowsers: browsers.playwright.some(b => b.available),
      hasSystemBrowsers: browsers.system.some(b => b.available),
      recommendedInstall: browsers.playwright.every(b => !b.available)
    };
  }
}

module.exports = BrowserEnvironmentService;
