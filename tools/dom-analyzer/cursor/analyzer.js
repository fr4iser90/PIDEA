#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const readline = require('readline');

/**
 * Cursor Selector Analyzer - All-in-One Tool
 * Handles scanning, validation, testing, export, and backend updates
 */

class CursorAnalyzer {
  constructor() {
    this.version = null; // Will be detected from running IDE
    this.categories = {};
    this.results = {};
    this.loadCategories();
  }

  /**
   * Find project root by looking for package.json
   */
  findProjectRoot() {
    let currentDir = __dirname;
    
    while (currentDir !== path.dirname(currentDir)) {
      const packageJsonPath = path.join(currentDir, 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        return currentDir;
      }
      currentDir = path.dirname(currentDir);
    }
    
    throw new Error('Could not find project root (package.json)');
  }

  /**
   * Get relative path from project root
   */
  getProjectPath(relativePath) {
    const projectRoot = this.findProjectRoot();
    return path.join(projectRoot, relativePath);
  }

  /**
   * Get relative path from current directory
   */
  getRelativePath(relativePath) {
    return path.join(__dirname, relativePath);
  }

  /**
   * Load all selector categories
   */
  loadCategories() {
    const categoriesDir = path.join(__dirname, 'selector-categories');
    const categoryFiles = fs.readdirSync(categoriesDir).filter(file => file.endsWith('.json'));
    
    for (const file of categoryFiles) {
      const categoryName = path.basename(file, '.json');
      const filePath = path.join(categoriesDir, file);
      this.categories[categoryName] = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
    
    console.log(`📁 Loaded ${Object.keys(this.categories).length} selector categories`);
  }

  /**
   * Connect to existing Cursor IDE and detect version
   */
  async connectToCursor(port = 9222) {
    try {
      const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
      const contexts = browser.contexts();
      
      if (contexts.length === 0) {
        throw new Error('No browser contexts found');
      }
      
      const context = contexts[0];
      const pages = context.pages();
      
      if (pages.length === 0) {
        throw new Error('No pages found');
      }
      
      let mainPage = pages.find(page => {
        const url = page.url();
        return url.includes('cursor') || url.includes('vscode');
      });
      
      if (!mainPage) {
        mainPage = pages[0];
      }
      
      // Detect version from the running IDE using the correct port
      await this.detectVersion(mainPage, port);
      
      console.log(`🎯 Connected to Cursor IDE: ${mainPage.url()}`);
      console.log(`📋 Detected version: ${this.version}`);
      return mainPage;
      
    } catch (error) {
      console.error('❌ Failed to connect to Cursor IDE:', error.message);
      throw error;
    }
  }

  /**
   * Detect Cursor version from running IDE
   */
  async detectVersion(page, port) {
    try {
      // Get version from Chrome DevTools Protocol using the correct port
      const versionUrl = `http://localhost:${port}/json/version`;
      console.log(`🔍 Checking version at: ${versionUrl}`);
      
      try {
        const response = await fetch(versionUrl);
        const versionData = await response.json();
        
        if (versionData['User-Agent']) {
          const userAgent = versionData['User-Agent'];
          const versionMatch = userAgent.match(/Cursor\/(\d+\.\d+\.\d+)/);
          if (versionMatch) {
            this.version = versionMatch[1];
            console.log(`✅ Version detected from DevTools Protocol: ${this.version}`);
            return;
          }
        }
      } catch (e) {
        console.log('⚠️  DevTools Protocol version detection failed, trying alternatives...');
      }
      
      // Fallback: try to get from page title or URL
      const title = await page.title();
      const versionMatch = title.match(/(\d+\.\d+\.\d+)/);
      if (versionMatch) {
        this.version = versionMatch[1];
        console.log(`✅ Version detected from title: ${this.version}`);
        return;
      }
      
      // Last resort: use timestamp as version
      this.version = new Date().toISOString().split('T')[0];
      console.log('⚠️  Could not detect version, using date as fallback');
      
    } catch (error) {
      console.error('❌ Version detection failed:', error.message);
      this.version = 'unknown';
    }
  }

  /**
   * Scan all UI components
   */
  async scanAllComponents(page) {
    console.log('🔍 Starting complete Cursor UI scan...');
    
    // Scan each category
    for (const [categoryName, category] of Object.entries(this.categories)) {
      console.log(`📁 Scanning ${categoryName}...`);
      await this.scanCategory(page, categoryName, category);
    }
  }

  /**
   * Scan a specific category
   */
  async scanCategory(page, categoryName, category) {
    const categoryResults = {
      total: 0,
      found: 0,
      selectors: {}
    };

    // Recursively scan all selectors
    await this.scanSelectorsRecursive(page, categoryName, category.selectors, categoryResults);

    this.results[categoryName] = categoryResults;
    console.log(`  ✅ ${categoryName}: ${categoryResults.found}/${categoryResults.total} selectors found`);
  }

  /**
   * Recursively scan selectors
   */
  async scanSelectorsRecursive(page, categoryName, selectors, results, prefix = '') {
    for (const [name, selector] of Object.entries(selectors)) {
      const fullName = prefix ? `${prefix}.${name}` : name;
      
      if (typeof selector === 'string') {
        results.total++;
        try {
          const elements = await page.locator(selector).all();
          if (elements.length > 0) {
            results.found++;
            results.selectors[fullName] = {
              selector,
              count: elements.length,
              found: true
            };
          } else {
            results.selectors[fullName] = {
              selector,
              count: 0,
              found: false
            };
          }
        } catch (e) {
          results.selectors[fullName] = {
            selector,
            count: 0,
            found: false,
            error: e.message
          };
        }
      } else if (typeof selector === 'object' && selector !== null) {
        await this.scanSelectorsRecursive(page, categoryName, selector, results, fullName);
      }
    }
  }

  /**
   * Validate selectors against live Cursor
   */
  async validateSelectors(page) {
    console.log('🔍 Starting selector validation...');
    
    const validationResults = {};
    
    for (const [categoryName, category] of Object.entries(this.categories)) {
      console.log(`📁 Validating ${categoryName}...`);
      validationResults[categoryName] = await this.validateCategory(page, categoryName, category);
    }
    
    return validationResults;
  }

  /**
   * Validate a category
   */
  async validateCategory(page, categoryName, category) {
    const results = {
      total: 0,
      valid: 0,
      invalid: 0,
      hidden: 0,
      errors: 0,
      selectors: {}
    };
    
    await this.validateSelectorsRecursive(page, categoryName, category.selectors, results);
    return results;
  }

  /**
   * Recursively validate selectors
   */
  async validateSelectorsRecursive(page, categoryName, selectors, results, prefix = '') {
    for (const [name, selector] of Object.entries(selectors)) {
      const fullName = prefix ? `${prefix}.${name}` : name;
      
      if (typeof selector === 'string') {
        results.total++;
        const result = await this.validateSelector(page, selector);
        results.selectors[fullName] = result;
        
        if (result.status === 'valid') {
          results.valid++;
        } else if (result.status === 'hidden') {
          results.hidden++;
        } else if (result.status === 'invalid') {
          results.invalid++;
        } else {
          results.errors++;
        }
      } else if (typeof selector === 'object' && selector !== null) {
        await this.validateSelectorsRecursive(page, categoryName, selector, results, fullName);
      }
    }
  }

  /**
   * Validate a single selector
   */
  async validateSelector(page, selector) {
    try {
      const elements = await page.locator(selector).all();
      const count = elements.length;
      const exists = count > 0;
      
      let visible = false;
      if (exists) {
        for (const element of elements) {
          try {
            const isVisible = await element.isVisible();
            if (isVisible) {
              visible = true;
              break;
            }
          } catch (e) {
            // Element might be detached, continue
          }
        }
      }
      
      return {
        selector,
        exists,
        visible,
        count,
        status: exists ? (visible ? 'valid' : 'hidden') : 'invalid'
      };
      
    } catch (error) {
      return {
        selector,
        exists: false,
        visible: false,
        count: 0,
        status: 'error',
        error: error.message
      };
    }
  }

  /**
   * Test selectors functionality
   */
  async testSelectors(page, validationResults) {
    console.log('🧪 Starting selector testing...');
    
    const testResults = {};
    
    for (const [categoryName, categoryData] of Object.entries(validationResults)) {
      console.log(`📁 Testing ${categoryName}...`);
      testResults[categoryName] = await this.testCategory(page, categoryName, categoryData);
    }
    
    return testResults;
  }

  /**
   * Test a category
   */
  async testCategory(page, categoryName, categoryData) {
    const results = {
      total: 0,
      valid: 0,
      invalid: 0,
      hidden: 0,
      errors: 0,
      selectors: {}
    };
    
    for (const [selectorName, selectorData] of Object.entries(categoryData.selectors)) {
      if (selectorData.status === 'valid' || selectorData.status === 'hidden') {
        results.total++;
        const testResult = await this.validateSelector(page, selectorData.selector);
        results.selectors[selectorName] = testResult;
        
        if (testResult.status === 'valid') {
          results.valid++;
        } else if (testResult.status === 'hidden') {
          results.hidden++;
        } else if (testResult.status === 'invalid') {
          results.invalid++;
        } else {
          results.errors++;
        }
      }
    }
    
    return results;
  }

  /**
   * Save report with version
   */
  saveReport(report, reportType) {
    const filename = `${reportType}-report-v${this.version}.json`;
    const reportsDir = path.join(__dirname, 'reports');
    
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    const filepath = path.join(reportsDir, filename);
    fs.writeFileSync(filepath, JSON.stringify(report, null, 2));
    return filepath;
  }

  /**
   * Export final selector library
   */
  exportSelectors(validationResults, testResults) {
    console.log('📤 Exporting final selector library...');
    
    const outputDir = path.join(__dirname, 'output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Generate final library
    const finalLibrary = {
      metadata: {
        name: "Cursor Selector Library",
        version: this.version,
        timestamp: new Date().toISOString()
      },
      categories: {}
    };
    
    // Process each category
    for (const [categoryName, category] of Object.entries(this.categories)) {
      finalLibrary.categories[categoryName] = {
        name: category.name,
        description: category.description,
        version: category.version,
        selectors: this.extractValidSelectors(categoryName, category.selectors, validationResults)
      };
    }
    
    // Save final library
    const libraryPath = path.join(outputDir, `cursor-selectors-v${this.version}.json`);
    fs.writeFileSync(libraryPath, JSON.stringify(finalLibrary, null, 2));
    
    // Save analysis report
    const analysisReport = {
      timestamp: new Date().toISOString(),
      version: this.version,
      validation: validationResults,
      testing: testResults,
      summary: this.generateSummary(validationResults, testResults)
    };
    
    const reportPath = path.join(outputDir, `analysis-report-v${this.version}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(analysisReport, null, 2));
    
    console.log(`✅ Final library exported to: ${libraryPath}`);
    console.log(`✅ Analysis report exported to: ${reportPath}`);
    
    return { libraryPath, reportPath };
  }

  /**
   * Export backend format selector library
   */
  exportBackendFormat(validationResults, testResults) {
    console.log('📤 Exporting backend format selector library...');
    
    const outputDir = path.join(__dirname, 'output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Generate backend format
    const backendFormat = {};
    
    // Process each category
    for (const [categoryName, category] of Object.entries(this.categories)) {
      const categoryKey = categoryName === 'chat' ? 'chatSelectors' : 
                        categoryName === 'command-palette' ? 'commandPaletteSelectors' :
                        categoryName === 'file-operations' ? 'fileOperationSelectors' :
                        categoryName === 'menu-navigation' ? 'menuNavigationSelectors' :
                        categoryName === 'project-management' ? 'projectManagementSelectors' :
                        categoryName === 'welcome-screen' ? 'welcomeScreenSelectors' :
                        categoryName === 'workspace' ? 'workspaceSelectors' :
                        `${categoryName}Selectors`;
      
      backendFormat[categoryKey] = {};
      
      // Extract only valid selectors as simple strings
      const validSelectors = this.extractValidSelectors(categoryName, category.selectors, validationResults);
      this.flattenSelectors(validSelectors, backendFormat[categoryKey]);
    }
    
    // Save backend format
    const backendPath = path.join(outputDir, `cursor-selectors-backend-v${this.version}.json`);
    fs.writeFileSync(backendPath, JSON.stringify(backendFormat, null, 2));
    
    console.log(`✅ Backend format exported to: ${backendPath}`);
    
    return backendPath;
  }

  /**
   * Flatten selectors to simple string format
   */
  flattenSelectors(selectors, target, prefix = '') {
    for (const [name, selector] of Object.entries(selectors)) {
      if (typeof selector === 'string') {
        // This shouldn't happen in our current structure
        target[prefix ? `${prefix}.${name}` : name] = selector;
      } else if (selector.selector) {
        // Selector with metadata - extract just the selector string
        target[prefix ? `${prefix}.${name}` : name] = selector.selector;
      } else if (typeof selector === 'object') {
        // Nested object - recurse
        this.flattenSelectors(selector, target, prefix ? `${prefix}.${name}` : name);
      }
    }
  }

  /**
   * Extract only valid selectors
   */
  extractValidSelectors(categoryName, selectors, validationResults, prefix = '') {
    const validSelectors = {};
    
    for (const [name, selector] of Object.entries(selectors)) {
      const fullName = prefix ? `${prefix}.${name}` : name;
      
      if (typeof selector === 'string') {
        const categoryData = validationResults[categoryName];
        const selectorData = categoryData?.selectors[fullName];
        
        if (selectorData && (selectorData.status === 'valid' || selectorData.status === 'hidden')) {
          validSelectors[name] = {
            selector,
            status: selectorData.status,
            count: selectorData.count,
            visible: selectorData.visible
          };
        }
      } else if (typeof selector === 'object' && selector !== null) {
        const nestedSelectors = this.extractValidSelectors(categoryName, selector, validationResults, fullName);
        if (Object.keys(nestedSelectors).length > 0) {
          validSelectors[name] = nestedSelectors;
        }
      }
    }
    
    return validSelectors;
  }

  /**
   * Generate summary
   */
  generateSummary(validationResults, testResults) {
    const totalSelectors = Object.values(validationResults).reduce((sum, cat) => sum + cat.total, 0);
    const validSelectors = Object.values(validationResults).reduce((sum, cat) => sum + cat.valid, 0);
    const successRate = totalSelectors > 0 ? (validSelectors / totalSelectors) * 100 : 0;
    
    return {
      totalSelectors,
      validSelectors,
      successRate: Math.round(successRate * 100) / 100,
      categories: Object.keys(this.categories).length
    };
  }

  /**
   * Compare with backend selectors
   */
  compareWithBackend() {
    console.log('🔍 Comparing with backend selectors...');
    
    try {
      const backendPath = this.getProjectPath(`backend/selectors/cursor/${this.version}.json`);
      const outputPath = this.getRelativePath(`output/cursor-selectors-v${this.version}.json`);
      
      if (!fs.existsSync(backendPath)) {
        console.log('⚠️  Backend selectors not found');
        return;
      }
      
      if (!fs.existsSync(outputPath)) {
        console.log('⚠️  Output selectors not found. Run analysis first.');
        return;
      }
      
      const backendSelectors = JSON.parse(fs.readFileSync(backendPath, 'utf8'));
      const newSelectors = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
      
      console.log('\n📊 COMPARISON RESULTS:');
      console.log(`Backend: ${Object.keys(backendSelectors).length} categories`);
      console.log(`New: ${Object.keys(newSelectors.categories).length} categories`);
      
      // Check chat selectors specifically
      const backendChat = backendSelectors.chatSelectors || {};
      const newChat = newSelectors.categories?.chat?.selectors || {};
      
      console.log(`\n💬 Chat Selectors:`);
      console.log(`Backend: ${Object.keys(backendChat).length} selectors`);
      console.log(`New: ${Object.keys(newChat).length} selectors`);
      
      const commonKeys = Object.keys(backendChat).filter(key => newChat[key]);
      console.log(`Common: ${commonKeys.length} selectors`);
      
    } catch (error) {
      console.error('❌ Comparison failed:', error.message);
    }
  }

  /**
   * Compare different Cursor versions
   */
  compareVersions(version1, version2) {
    console.log(`🔍 Comparing Cursor versions: ${version1} vs ${version2}`);
    
    try {
      const reportsDir = path.join(__dirname, 'reports');
      
      // Find validation reports for both versions
      const v1Report = path.join(reportsDir, `validation-report-v${version1}.json`);
      const v2Report = path.join(reportsDir, `validation-report-v${version2}.json`);
      
      if (!fs.existsSync(v1Report)) {
        console.log(`❌ Validation report for ${version1} not found`);
        return;
      }
      
      if (!fs.existsSync(v2Report)) {
        console.log(`❌ Validation report for ${version2} not found`);
        return;
      }
      
      const v1Data = JSON.parse(fs.readFileSync(v1Report, 'utf8'));
      const v2Data = JSON.parse(fs.readFileSync(v2Report, 'utf8'));
      
      console.log('\n📊 VERSION COMPARISON RESULTS:');
      console.log(`=====================================`);
      console.log(`Version ${version1}: ${this.getTotalSelectors(v1Data.results)} total selectors`);
      console.log(`Version ${version2}: ${this.getTotalSelectors(v2Data.results)} total selectors`);
      console.log(`=====================================`);
      
      // Compare each category
      const categories = Object.keys(v1Data.results);
      for (const category of categories) {
        const v1Category = v1Data.results[category];
        const v2Category = v2Data.results[category];
        
        if (!v2Category) {
          console.log(`\n📁 ${category}:`);
          console.log(`  ❌ Category not found in ${version2}`);
          continue;
        }
        
        console.log(`\n📁 ${category}:`);
        console.log(`  ${version1}: ${v1Category.valid}/${v1Category.total} valid selectors`);
        console.log(`  ${version2}: ${v2Category.valid}/${v2Category.total} valid selectors`);
        
        // Find differences
        const differences = this.findSelectorDifferences(v1Category.selectors, v2Category.selectors);
        
        // Show detailed differences
        if (differences.added.length > 0) {
          console.log(`  ✅ Added in ${version2}: ${differences.added.length} selectors`);
          differences.added.slice(0, 3).forEach(selector => {
            console.log(`    + ${selector}`);
          });
          if (differences.added.length > 3) {
            console.log(`    ... and ${differences.added.length - 3} more`);
          }
        }
        
        if (differences.removed.length > 0) {
          console.log(`  ❌ Removed in ${version2}: ${differences.removed.length} selectors`);
          differences.removed.slice(0, 3).forEach(selector => {
            console.log(`    - ${selector}`);
          });
          if (differences.removed.length > 3) {
            console.log(`    ... and ${differences.removed.length - 3} more`);
          }
        }
        
        if (differences.changed.length > 0) {
          console.log(`  🔄 Changed in ${version2}: ${differences.changed.length} selectors`);
          differences.changed.slice(0, 3).forEach(change => {
            console.log(`    ~ ${change.name}: "${change.old}" → "${change.new}"`);
          });
          if (differences.changed.length > 3) {
            console.log(`    ... and ${differences.changed.length - 3} more`);
          }
        }
        
        // Show status differences
        const statusDifferences = this.findStatusDifferences(v1Category.selectors, v2Category.selectors);
        if (statusDifferences.length > 0) {
          console.log(`  🔍 Status changes: ${statusDifferences.length} selectors`);
          statusDifferences.slice(0, 3).forEach(change => {
            console.log(`    ~ ${change.name}: ${change.oldStatus} → ${change.newStatus}`);
          });
          if (statusDifferences.length > 3) {
            console.log(`    ... and ${statusDifferences.length - 3} more`);
          }
        }
      }
      
      // Save comparison report with detailed status changes
      const comparisonReport = {
        timestamp: new Date().toISOString(),
        versions: { v1: version1, v2: version2 },
        summary: {
          v1Total: this.getTotalSelectors(v1Data.results),
          v2Total: this.getTotalSelectors(v2Data.results),
          categories: categories.length
        },
        details: this.generateDetailedComparison(v1Data.results, v2Data.results),
        statusChanges: this.generateStatusChangesReport(v1Data.results, v2Data.results)
      };
      
      const comparisonPath = path.join(reportsDir, `version-comparison-${version1}-vs-${version2}.json`);
      fs.writeFileSync(comparisonPath, JSON.stringify(comparisonReport, null, 2));
      
      console.log(`\n✅ Comparison report saved: ${comparisonPath}`);
      
    } catch (error) {
      console.error('❌ Version comparison failed:', error.message);
    }
  }

  /**
   * Get total selectors from results
   */
  getTotalSelectors(results) {
    return Object.values(results).reduce((sum, category) => sum + category.total, 0);
  }

  /**
   * Find differences between two selector sets
   */
  findSelectorDifferences(selectors1, selectors2) {
    const added = [];
    const removed = [];
    const changed = [];
    
    const keys1 = Object.keys(selectors1);
    const keys2 = Object.keys(selectors2);
    
    // Find added selectors
    for (const key of keys2) {
      if (!keys1.includes(key)) {
        added.push(key);
      }
    }
    
    // Find removed selectors
    for (const key of keys1) {
      if (!keys2.includes(key)) {
        removed.push(key);
      }
    }
    
    // Find changed selectors
    for (const key of keys1) {
      if (keys2.includes(key)) {
        const s1 = selectors1[key];
        const s2 = selectors2[key];
        
        if (s1.selector !== s2.selector) {
          changed.push({
            name: key,
            old: s1.selector,
            new: s2.selector
          });
        }
      }
    }
    
    return { added, removed, changed };
  }

  /**
   * Generate detailed comparison
   */
  generateDetailedComparison(results1, results2) {
    const details = {};
    
    for (const category of Object.keys(results1)) {
      if (results2[category]) {
        details[category] = this.findSelectorDifferences(
          results1[category].selectors,
          results2[category].selectors
        );
      }
    }
    
    return details;
  }

  /**
   * Find status differences between selectors
   */
  findStatusDifferences(selectors1, selectors2) {
    const changes = [];
    
    for (const key of Object.keys(selectors1)) {
      if (selectors2[key]) {
        const s1 = selectors1[key];
        const s2 = selectors2[key];
        
        if (s1.status !== s2.status) {
          changes.push({
            name: key,
            oldStatus: s1.status,
            newStatus: s2.status,
            oldCount: s1.count,
            newCount: s2.count
          });
        }
      }
    }
    
    return changes;
  }

  /**
   * Generate status changes report for all categories
   */
  generateStatusChangesReport(results1, results2) {
    const statusChanges = {};
    
    for (const category of Object.keys(results1)) {
      if (results2[category]) {
        const changes = this.findStatusDifferences(
          results1[category].selectors,
          results2[category].selectors
        );
        
        if (changes.length > 0) {
          statusChanges[category] = changes;
        }
      }
    }
    
    return statusChanges;
  }

  /**
   * Update backend selectors
   */
  updateBackend() {
    console.log('🔄 Updating backend selectors...');
    
    try {
      const backendPath = this.getProjectPath(`backend/selectors/cursor/${this.version}.json`);
      const outputPath = this.getRelativePath(`output/cursor-selectors-v${this.version}.json`);
      
      if (!fs.existsSync(outputPath)) {
        console.log('⚠️  Output selectors not found. Run analysis first.');
        return;
      }
      
      // Create backup
      if (fs.existsSync(backendPath)) {
        const backupPath = backendPath.replace('.json', `.backup-${Date.now()}.json`);
        fs.copyFileSync(backendPath, backupPath);
        console.log(`💾 Backup created: ${path.basename(backupPath)}`);
      }
      
      const newSelectors = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
      
      // Convert to backend format
      const backendFormat = {};
      for (const [categoryName, categoryData] of Object.entries(newSelectors.categories)) {
        if (categoryData.selectors) {
          const categoryKey = categoryName === 'chat' ? 'chatSelectors' : 
                            categoryName === 'command-palette' ? 'commandPaletteSelectors' :
                            categoryName === 'file-operations' ? 'fileOperationSelectors' :
                            categoryName === 'menu-navigation' ? 'menuNavigationSelectors' :
                            categoryName === 'project-management' ? 'projectManagementSelectors' :
                            categoryName === 'welcome-screen' ? 'welcomeScreenSelectors' :
                            categoryName === 'workspace' ? 'workspaceSelectors' :
                            `${categoryName}Selectors`;
          
          backendFormat[categoryKey] = {};
          
          for (const [selectorName, selectorData] of Object.entries(categoryData.selectors)) {
            if (selectorData.status === 'valid') {
              backendFormat[categoryKey][selectorName] = selectorData.selector;
            }
          }
        }
      }
      
      // Write updated selectors
      fs.writeFileSync(backendPath, JSON.stringify(backendFormat, null, 2));
      
      console.log('✅ Backend selectors updated successfully!');
      console.log(`📁 Updated file: ${backendPath}`);
      
    } catch (error) {
      console.error('❌ Backend update failed:', error.message);
    }
  }

  /**
   * Interactive menu
   */
  async showMenu() {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const question = (prompt) => new Promise(resolve => rl.question(prompt, resolve));

    while (true) {
      console.log('\n🎯 CURSOR SELECTOR ANALYZER');
      console.log('============================');
      console.log('1. 🔍 Scan UI Components');
      console.log('2. ✅ Validate Selectors');
      console.log('3. 🧪 Test Selectors');
      console.log('4. 📤 Export Results');
      console.log('5. 🔄 Compare with Backend');
      console.log('6. 🚀 Update Backend');
      console.log('7. 🎯 Run Complete Analysis');
      console.log('8. ❌ Exit');
      console.log('============================');

      const choice = await question('Choose option (1-8): ');

      switch (choice.trim()) {
        case '1':
          await this.runScanning();
          break;
        case '2':
          await this.runValidation();
          break;
        case '3':
          await this.runTesting();
          break;
        case '4':
          await this.runExport();
          break;
        case '5':
          this.compareWithBackend();
          break;
        case '6':
          this.updateBackend();
          break;
        case '7':
          await this.runCompleteAnalysis();
          break;
        case '8':
          console.log('👋 Goodbye!');
          rl.close();
          process.exit(0);
        default:
          console.log('❌ Invalid option. Please choose 1-8.');
      }
    }
  }

  /**
   * Run scanning
   */
  async runScanning(port = 9222) {
    try {
      console.log('🔍 Starting UI scanning...');
      const page = await this.connectToCursor(port);
      await this.scanAllComponents(page);
      
      const report = {
        timestamp: new Date().toISOString(),
        version: this.version,
        results: this.results
      };
      
      const filepath = this.saveReport(report, 'scan');
      console.log(`✅ Scan completed! Report saved to: ${filepath}`);
      
    } catch (error) {
      console.error('❌ Scanning failed:', error.message);
    }
  }

  /**
   * Run validation
   */
  async runValidation(port = 9222) {
    try {
      console.log('✅ Starting selector validation...');
      const page = await this.connectToCursor(port);
      const validationResults = await this.validateSelectors(page);
      
      const report = {
        timestamp: new Date().toISOString(),
        version: this.version,
        results: validationResults,
        summary: this.generateSummary(validationResults, {})
      };
      
      const filepath = this.saveReport(report, 'validation');
      console.log(`✅ Validation completed! Report saved to: ${filepath}`);
      
    } catch (error) {
      console.error('❌ Validation failed:', error.message);
    }
  }

  /**
   * Run testing
   */
  async runTesting() {
    try {
      console.log('🧪 Starting selector testing...');
      
      // Load latest validation report
      const reportsDir = path.join(__dirname, 'reports');
      const validationFiles = fs.readdirSync(reportsDir).filter(file => 
        file.startsWith('validation-report-v') && file.endsWith('.json')
      );
      
      if (validationFiles.length === 0) {
        console.log('⚠️  No validation report found. Run validation first.');
        return;
      }
      
      const latestValidation = validationFiles.sort().pop();
      const validationPath = path.join(reportsDir, latestValidation);
      const validationData = JSON.parse(fs.readFileSync(validationPath, 'utf8'));
      
      const page = await this.connectToCursor();
      const testResults = await this.testSelectors(page, validationData.results);
      
      const report = {
        timestamp: new Date().toISOString(),
        version: this.version,
        results: testResults,
        summary: this.generateSummary({}, testResults)
      };
      
      const filepath = this.saveReport(report, 'test');
      console.log(`✅ Testing completed! Report saved to: ${filepath}`);
      
    } catch (error) {
      console.error('❌ Testing failed:', error.message);
    }
  }

  /**
   * Run export
   */
  async runExport() {
    try {
      console.log('📤 Starting export...');
      
      // Load latest reports
      const reportsDir = path.join(__dirname, 'reports');
      const validationFiles = fs.readdirSync(reportsDir).filter(file => 
        file.startsWith('validation-report-v') && file.endsWith('.json')
      );
      const testFiles = fs.readdirSync(reportsDir).filter(file => 
        file.startsWith('test-report-v') && file.endsWith('.json')
      );
      
      if (validationFiles.length === 0) {
        console.log('⚠️  No validation report found. Run validation first.');
        return;
      }
      
      const latestValidation = validationFiles.sort().pop();
      const validationPath = path.join(reportsDir, latestValidation);
      const validationData = JSON.parse(fs.readFileSync(validationPath, 'utf8'));
      
      let testData = {};
      if (testFiles.length > 0) {
        const latestTest = testFiles.sort().pop();
        const testPath = path.join(reportsDir, latestTest);
        testData = JSON.parse(fs.readFileSync(testPath, 'utf8'));
      }
      
      const exportPaths = this.exportSelectors(validationData.results, testData.results || {});
      console.log('✅ Export completed!');
      
    } catch (error) {
      console.error('❌ Export failed:', error.message);
    }
  }

  /**
   * Run export backend format
   */
  async runExportBackend(port = 9222) {
    try {
      console.log('📤 Starting backend format export...');
      
      // If no validation report exists, run complete analysis first
      const reportsDir = path.join(__dirname, 'reports');
      const validationFiles = fs.readdirSync(reportsDir).filter(file => 
        file.startsWith('validation-report-v') && file.endsWith('.json')
      );
      
      if (validationFiles.length === 0) {
        console.log('⚠️  No validation report found. Running complete analysis first...');
        await this.runCompleteAnalysis(port);
        return;
      }
      
      // Load latest reports
      const testFiles = fs.readdirSync(reportsDir).filter(file => 
        file.startsWith('test-report-v') && file.endsWith('.json')
      );
      
      const latestValidation = validationFiles.sort().pop();
      const validationPath = path.join(reportsDir, latestValidation);
      const validationData = JSON.parse(fs.readFileSync(validationPath, 'utf8'));
      
      // Set version from report
      this.version = validationData.version;
      
      let testData = {};
      if (testFiles.length > 0) {
        const latestTest = testFiles.sort().pop();
        const testPath = path.join(reportsDir, latestTest);
        testData = JSON.parse(fs.readFileSync(testPath, 'utf8'));
      }
      
      const backendPath = this.exportBackendFormat(validationData.results, testData.results || {});
      console.log('✅ Backend format export completed!');
      
      // Also create backend file
      console.log('📁 Creating backend file...');
      this.createBackendFile(validationData.results, testData.results || {});
      console.log('✅ Backend file creation completed!');
      
    } catch (error) {
      console.error('❌ Backend format export failed:', error.message);
    }
  }

  /**
   * Create backend file in the correct location
   */
  createBackendFile(validationResults, testResults) {
    try {
      console.log('📁 Creating backend file...');
      
      // Get backend format data
      const backendFormat = {};
      
      // Process each category
      for (const [categoryName, category] of Object.entries(this.categories)) {
        const categoryKey = categoryName === 'chat' ? 'chatSelectors' : 
                          categoryName === 'command-palette' ? 'commandPaletteSelectors' :
                          categoryName === 'file-operations' ? 'fileOperationSelectors' :
                          categoryName === 'menu-navigation' ? 'menuNavigationSelectors' :
                          categoryName === 'project-management' ? 'projectManagementSelectors' :
                          categoryName === 'welcome-screen' ? 'welcomeScreenSelectors' :
                          categoryName === 'workspace' ? 'workspaceSelectors' :
                          `${categoryName}Selectors`;
        
        backendFormat[categoryKey] = {};
        
        // Extract only valid selectors as simple strings
        const validSelectors = this.extractValidSelectors(categoryName, category.selectors, validationResults);
        this.flattenSelectors(validSelectors, backendFormat[categoryKey]);
      }
      
      // Create backend directory if it doesn't exist
      const backendDir = this.getProjectPath(`backend/selectors/cursor`);
      if (!fs.existsSync(backendDir)) {
        fs.mkdirSync(backendDir, { recursive: true });
        console.log(`📁 Created backend directory: ${backendDir}`);
      }
      
      // Save backend file
      const backendPath = path.join(backendDir, `${this.version}.json`);
      fs.writeFileSync(backendPath, JSON.stringify(backendFormat, null, 2));
      
      console.log(`✅ Backend file created: ${backendPath}`);
      
      return backendPath;
      
    } catch (error) {
      console.error('❌ Backend file creation failed:', error.message);
    }
  }

  /**
   * Check if there are changes compared to the last version
   */
  async checkForChanges() {
    try {
      const reportsDir = path.join(__dirname, 'reports');
      const validationFiles = fs.readdirSync(reportsDir).filter(file => 
        file.startsWith('validation-report-v') && file.endsWith('.json')
      );
      
      if (validationFiles.length < 2) {
        console.log('ℹ️  Less than 2 validation reports found - assuming changes exist');
        return true;
      }
      
      // Get the two most recent reports
      const sortedFiles = validationFiles.sort();
      const latestFile = sortedFiles[sortedFiles.length - 1];
      const previousFile = sortedFiles[sortedFiles.length - 2];
      
      const latestPath = path.join(reportsDir, latestFile);
      const previousPath = path.join(reportsDir, previousFile);
      
      const latestData = JSON.parse(fs.readFileSync(latestPath, 'utf8'));
      const previousData = JSON.parse(fs.readFileSync(previousPath, 'utf8'));
      
      // Compare total selectors
      const latestTotal = this.getTotalSelectors(latestData.results);
      const previousTotal = this.getTotalSelectors(previousData.results);
      
      if (latestTotal !== previousTotal) {
        console.log(`📊 Selector count changed: ${previousTotal} → ${latestTotal}`);
        return true;
      }
      
      // Compare valid selectors
      const latestValid = Object.values(latestData.results).reduce((sum, cat) => sum + cat.valid, 0);
      const previousValid = Object.values(previousData.results).reduce((sum, cat) => sum + cat.valid, 0);
      
      if (latestValid !== previousValid) {
        console.log(`✅ Valid selector count changed: ${previousValid} → ${latestValid}`);
        return true;
      }
      
      // Check for selector differences
      for (const category of Object.keys(latestData.results)) {
        if (previousData.results[category]) {
          const differences = this.findSelectorDifferences(
            previousData.results[category].selectors,
            latestData.results[category].selectors
          );
          
          if (differences.added.length > 0 || differences.removed.length > 0 || differences.changed.length > 0) {
            console.log(`🔄 Changes detected in ${category}: +${differences.added.length} -${differences.removed.length} ~${differences.changed.length}`);
            return true;
          }
        }
      }
      
      console.log('ℹ️  No significant changes detected');
      return false;
      
    } catch (error) {
      console.error('❌ Change detection failed:', error.message);
      return true; // Assume changes exist if detection fails
    }
  }

  /**
   * Run complete analysis
   */
  async runCompleteAnalysis(port = 9222) {
    try {
      console.log('🚀 Starting complete analysis...');
      
      const page = await this.connectToCursor(port);
      
      // 1. Scan
      console.log('\n📋 Phase 1: Scanning...');
      await this.scanAllComponents(page);
      const scanReport = {
        timestamp: new Date().toISOString(),
        version: this.version,
        results: this.results
      };
      this.saveReport(scanReport, 'scan');
      
      // 2. Validate
      console.log('\n✅ Phase 2: Validation...');
      const validationResults = await this.validateSelectors(page);
      const validationReport = {
        timestamp: new Date().toISOString(),
        version: this.version,
        results: validationResults,
        summary: this.generateSummary(validationResults, {})
      };
      this.saveReport(validationReport, 'validation');
      
      // 3. Test
      console.log('\n🧪 Phase 3: Testing...');
      const testResults = await this.testSelectors(page, validationResults);
      const testReport = {
        timestamp: new Date().toISOString(),
        version: this.version,
        results: testResults,
        summary: this.generateSummary({}, testResults)
      };
      this.saveReport(testReport, 'test');
      
      // 4. Export
      console.log('\n📤 Phase 4: Export...');
      this.exportSelectors(validationResults, testResults);
      
      // 5. Check for changes and export backend format if needed
      console.log('\n🔍 Phase 5: Change Detection...');
      const hasChanges = await this.checkForChanges();
      
      if (hasChanges) {
        console.log('\n📤 Phase 6: Backend Export (Changes Detected)...');
        this.exportBackendFormat(validationResults, testResults);
        console.log(`✅ Backend format exported for version ${this.version}`);
        
        // Also create backend file
        console.log('\n📁 Phase 6b: Creating Backend File...');
        this.createBackendFile(validationResults, testResults);
        console.log(`✅ Backend file created for version ${this.version}`);
      } else {
        console.log('\nℹ️  Phase 6: No Backend Export (No Changes)...');
        console.log('ℹ️  No significant changes detected - skipping backend export');
      }
      
      // 6. Compare
      console.log('\n🔍 Phase 7: Comparison...');
      this.compareWithBackend();
      
      console.log('\n🎉 Complete analysis finished!');
      
    } catch (error) {
      console.error('❌ Complete analysis failed:', error.message);
    }
    
    process.exit(0);
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  
  // Extract port from arguments
  let port = 9222;
  const portArg = args.find(arg => arg.startsWith('--port='));
  if (portArg) {
    port = parseInt(portArg.split('=')[1]);
  }
  
  if (args.includes('--menu') || args.length === 0) {
    // Interactive menu mode
    const analyzer = new CursorAnalyzer();
    analyzer.showMenu();
  } else if (args.includes('--complete')) {
    // Complete analysis mode
    const analyzer = new CursorAnalyzer();
    analyzer.runCompleteAnalysis(port);
  } else if (args.includes('--scan')) {
    // Scan only
    const analyzer = new CursorAnalyzer();
    analyzer.runScanning(port);
  } else if (args.includes('--validate')) {
    // Validate only
    const analyzer = new CursorAnalyzer();
    analyzer.runValidation(port);
  } else if (args.includes('--test')) {
    // Test only
    const analyzer = new CursorAnalyzer();
    analyzer.runTesting();
  } else if (args.includes('--export')) {
    // Export only
    const analyzer = new CursorAnalyzer();
    analyzer.runExport();
  } else if (args.includes('--export-backend')) {
    // Export backend format only
    const analyzer = new CursorAnalyzer();
    analyzer.runExportBackend(port);
  } else if (args.includes('--compare')) {
    // Compare only
    const analyzer = new CursorAnalyzer();
    analyzer.compareWithBackend();
  } else if (args.includes('--update-backend')) {
    // Update backend only
    const analyzer = new CursorAnalyzer();
    analyzer.updateBackend();
  } else if (args.includes('--compare-versions')) {
    // Compare versions
    const analyzer = new CursorAnalyzer();
    const versions = args.filter(arg => arg.match(/^\d+\.\d+\.\d+$/));
    if (versions.length >= 2) {
      analyzer.compareVersions(versions[0], versions[1]);
    } else {
      console.log('❌ Please provide two versions to compare');
      console.log('Usage: node analyzer.js --compare-versions 1.5.7 1.6.46');
    }
  } else {
    console.log('🎯 Cursor Selector Analyzer');
    console.log('Usage:');
    console.log('  node analyzer.js                    # Interactive menu');
    console.log('  node analyzer.js --menu             # Interactive menu');
    console.log('  node analyzer.js --complete --port=9223  # Complete analysis on port 9223');
    console.log('  node analyzer.js --scan --port=9223      # Scan only on port 9223');
    console.log('  node analyzer.js --validate --port=9223  # Validate only on port 9223');
    console.log('  node analyzer.js --test            # Test only');
    console.log('  node analyzer.js --export          # Export only');
    console.log('  node analyzer.js --export-backend --port=9223  # Export backend format on port 9223');
    console.log('  node analyzer.js --compare         # Compare only');
    console.log('  node analyzer.js --update-backend  # Update backend only');
    console.log('  node analyzer.js --compare-versions 1.5.7 1.6.46  # Compare versions');
  }
}

module.exports = CursorAnalyzer;
