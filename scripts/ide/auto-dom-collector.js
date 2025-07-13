#!/usr/bin/env node

/**
 * IDE DOM Collector
 * Collects DOM structures from all supported IDEs
 */

const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

// IDE configurations
const IDE_CONFIGS = {
  cursor: {
    name: 'Cursor IDE',
    portRange: { start: 9222, end: 9231 },
    selectors: {
      chat: '[data-testid="chat-panel"]',
      editor: '[data-testid="editor"]',
      sidebar: '[data-testid="sidebar"]',
      terminal: '[data-testid="terminal"]'
    }
  },
  vscode: {
    name: 'VS Code',
    portRange: { start: 9232, end: 9241 },
    selectors: {
      chat: '.chat-panel',
      editor: '.monaco-editor',
      sidebar: '.sidebar',
      terminal: '.terminal'
    }
  },
  windsurf: {
    name: 'Windsurf IDE',
    portRange: { start: 9242, end: 9251 },
    selectors: {
      chat: '[data-testid="chat-panel"]',
      editor: '[data-testid="editor"]',
      sidebar: '[data-testid="sidebar"]',
      terminal: '[data-testid="terminal"]',
      aiAssistant: '[data-testid="ai-assistant"]'
    }
  }
};

class DOMCollector {
  constructor() {
    this.outputDir = path.join(process.cwd(), 'generated', 'ide-dom');
    this.results = new Map();
  }

  /**
   * Initialize output directory
   */
  async initialize() {
    try {
      await fs.mkdir(this.outputDir, { recursive: true });
      console.log(`[DOMCollector] Output directory: ${this.outputDir}`);
    } catch (error) {
      console.error('[DOMCollector] Failed to create output directory:', error);
      throw error;
    }
  }

  /**
   * Detect running IDEs
   */
  async detectRunningIDEs() {
    const runningIDEs = [];

    for (const [ideType, config] of Object.entries(IDE_CONFIGS)) {
      console.log(`[DOMCollector] Detecting ${config.name}...`);
      
      for (let port = config.portRange.start; port <= config.portRange.end; port++) {
        const isRunning = await this.checkPort(port);
        if (isRunning) {
          runningIDEs.push({
            type: ideType,
            port: port,
            config: config
          });
          console.log(`[DOMCollector] Found ${config.name} on port ${port}`);
        }
      }
    }

    return runningIDEs;
  }

  /**
   * Check if port is in use
   */
  async checkPort(port) {
    return new Promise((resolve) => {
      const net = require('net');
      const socket = new net.Socket();
      
      socket.setTimeout(1000);
      
      socket.on('connect', () => {
        socket.destroy();
        resolve(true);
      });
      
      socket.on('timeout', () => {
        socket.destroy();
        resolve(false);
      });
      
      socket.on('error', () => {
        resolve(false);
      });
      
      socket.connect(port, 'localhost');
    });
  }

  /**
   * Collect DOM from IDE
   */
  async collectDOMFromIDE(ideInfo) {
    const { type, port, config } = ideInfo;
    
    console.log(`[DOMCollector] Collecting DOM from ${config.name} on port ${port}...`);
    
    try {
      // Use Playwright to collect DOM
      const { chromium } = require('playwright');
      const browser = await chromium.launch({ headless: true });
      const page = await browser.newPage();
      
      // Navigate to IDE
      await page.goto(`http://localhost:${port}`);
      
      // Wait for IDE to load
      await page.waitForTimeout(3000);
      
      // Collect DOM structure
      const domStructure = await this.extractDOMStructure(page, config);
      
      // Save results
      const filename = `${type}-dom-${port}-${Date.now()}.json`;
      const filepath = path.join(this.outputDir, filename);
      
      await fs.writeFile(filepath, JSON.stringify(domStructure, null, 2));
      
      this.results.set(`${type}-${port}`, {
        success: true,
        filepath: filepath,
        dom: domStructure,
        timestamp: new Date()
      });
      
      console.log(`[DOMCollector] DOM collected from ${config.name}: ${filepath}`);
      
      await browser.close();
      
    } catch (error) {
      console.error(`[DOMCollector] Failed to collect DOM from ${config.name}:`, error);
      
      this.results.set(`${type}-${port}`, {
        success: false,
        error: error.message,
        timestamp: new Date()
      });
    }
  }

  /**
   * Extract DOM structure from page
   */
  async extractDOMStructure(page, config) {
    return await page.evaluate((selectors) => {
      const getElementInfo = (element) => {
        if (!element) return null;
        
        return {
          tagName: element.tagName,
          id: element.id,
          className: element.className,
          textContent: element.textContent?.substring(0, 200),
          attributes: Array.from(element.attributes).reduce((acc, attr) => {
            acc[attr.name] = attr.value;
            return acc;
          }, {}),
          children: Array.from(element.children).slice(0, 10).map(child => getElementInfo(child))
        };
      };

      const domStructure = {
        title: document.title,
        url: window.location.href,
        timestamp: new Date().toISOString(),
        body: getElementInfo(document.body),
        elements: {}
      };

      // Extract specific elements
      for (const [name, selector] of Object.entries(selectors)) {
        const element = document.querySelector(selector);
        domStructure.elements[name] = getElementInfo(element);
      }

      return domStructure;
    }, config.selectors);
  }

  /**
   * Generate selectors from collected DOM
   */
  async generateSelectors(ideType) {
    const ideResults = Array.from(this.results.entries())
      .filter(([key]) => key.startsWith(ideType))
      .filter(([key, result]) => result.success);

    if (ideResults.length === 0) {
      console.log(`[DOMCollector] No successful DOM collections for ${ideType}`);
      return;
    }

    const selectors = {};
    
    for (const [key, result] of ideResults) {
      const dom = result.dom;
      
      // Generate selectors for common elements
      selectors[key] = {
        chat: this.findBestSelector(dom, 'chat'),
        editor: this.findBestSelector(dom, 'editor'),
        sidebar: this.findBestSelector(dom, 'sidebar'),
        terminal: this.findBestSelector(dom, 'terminal'),
        fileExplorer: this.findBestSelector(dom, 'file-explorer'),
        gitPanel: this.findBestSelector(dom, 'git-panel')
      };
    }

    // Save selectors
    const selectorFile = path.join(this.outputDir, `${ideType}-selectors.js`);
    const selectorContent = `module.exports = ${JSON.stringify(selectors, null, 2)};`;
    
    await fs.writeFile(selectorFile, selectorContent);
    console.log(`[DOMCollector] Selectors saved: ${selectorFile}`);
  }

  /**
   * Find best selector for element
   */
  findBestSelector(dom, elementType) {
    // This is a simplified selector generation
    // In a real implementation, you'd use more sophisticated algorithms
    
    const commonSelectors = {
      chat: ['[data-testid="chat-panel"]', '.chat-panel', '#chat'],
      editor: ['[data-testid="editor"]', '.monaco-editor', '#editor'],
      sidebar: ['[data-testid="sidebar"]', '.sidebar', '#sidebar'],
      terminal: ['[data-testid="terminal"]', '.terminal', '#terminal'],
      'file-explorer': ['[data-testid="file-explorer"]', '.file-explorer', '#files'],
      'git-panel': ['[data-testid="git-panel"]', '.git-panel', '#git']
    };

    return commonSelectors[elementType] || [];
  }

  /**
   * Generate coverage report
   */
  async generateCoverageReport() {
    const report = {
      timestamp: new Date().toISOString(),
      totalIDEs: Object.keys(IDE_CONFIGS).length,
      successfulCollections: 0,
      failedCollections: 0,
      results: {}
    };

    for (const [key, result] of this.results.entries()) {
      const [ideType, port] = key.split('-');
      
      if (!report.results[ideType]) {
        report.results[ideType] = [];
      }
      
      report.results[ideType].push({
        port: parseInt(port),
        success: result.success,
        error: result.error,
        timestamp: result.timestamp
      });

      if (result.success) {
        report.successfulCollections++;
      } else {
        report.failedCollections++;
      }
    }

    // Save coverage report
    const coverageFile = path.join(this.outputDir, 'coverage-report.json');
    await fs.writeFile(coverageFile, JSON.stringify(report, null, 2));
    
    console.log(`[DOMCollector] Coverage report saved: ${coverageFile}`);
    
    return report;
  }

  /**
   * Run complete DOM collection
   */
  async run() {
    console.log('[DOMCollector] Starting DOM collection...');
    
    try {
      // Initialize
      await this.initialize();
      
      // Detect running IDEs
      const runningIDEs = await this.detectRunningIDEs();
      
      if (runningIDEs.length === 0) {
        console.log('[DOMCollector] No running IDEs detected');
        return;
      }
      
      console.log(`[DOMCollector] Found ${runningIDEs.length} running IDE(s)`);
      
      // Collect DOM from each IDE
      for (const ideInfo of runningIDEs) {
        await this.collectDOMFromIDE(ideInfo);
      }
      
      // Generate selectors for each IDE type
      for (const ideType of Object.keys(IDE_CONFIGS)) {
        await this.generateSelectors(ideType);
      }
      
      // Generate coverage report
      const coverageReport = await this.generateCoverageReport();
      
      console.log('[DOMCollector] DOM collection completed successfully');
      console.log(`[DOMCollector] Summary: ${coverageReport.successfulCollections} successful, ${coverageReport.failedCollections} failed`);
      
    } catch (error) {
      console.error('[DOMCollector] DOM collection failed:', error);
      process.exit(1);
    }
  }
}

// CLI interface
if (require.main === module) {
  const collector = new DOMCollector();
  collector.run().catch(console.error);
}

module.exports = DOMCollector; 