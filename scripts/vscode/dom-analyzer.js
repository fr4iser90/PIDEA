const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

class DOMAnalyzer {
  constructor() {
    this.results = {
      features: {},
      selectors: {},
      elements: [],
      stats: {}
    };
    this.outputDir = path.join(__dirname, '../output/dom-analysis');
    this.ensureOutputDir();
  }

  ensureOutputDir() {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
      console.log(`📁 Created VSCode DOM analysis directory: ${this.outputDir}`);
    }
  }

  loadDOMFiles() {
    const autoCollectedPath = path.join(__dirname, '../output/auto-collected');
    const enhancedPath = path.join(__dirname, '../output/enhanced-collected');
    
    let sourcePath = enhancedPath;
    if (!fs.existsSync(enhancedPath)) {
      sourcePath = autoCollectedPath;
      console.log(`⚠️ Enhanced collection not found, using fallback: ${autoCollectedPath}`);
    }
    
    if (!fs.existsSync(sourcePath)) {
      throw new Error(`No VSCode DOM collection found in: ${sourcePath}`);
    }

    const allFiles = fs.readdirSync(sourcePath)
      .filter(file => file.endsWith('.md') && !file.includes('collection-report'));
    
    console.log(`📁 VSCode DOM Analysis Source: ${sourcePath}`);
    console.log(`📄 Found ${allFiles.length} VSCode DOM files`);
    
    const sources = {};
    allFiles.forEach(file => {
      const content = fs.readFileSync(path.join(sourcePath, file), 'utf8');
      const htmlContent = this.extractHTML(content);
      sources[file] = htmlContent;
      
      const elementCount = (htmlContent.match(/<[^>]*>/g) || []).length;
      console.log(`📄 ${file}: ${elementCount} HTML elements`);
    });
    
    return sources;
  }

  extractHTML(content) {
    let htmlContent = '';
    
    // Extract HTML blocks from markdown files
    const htmlBlocks = content.match(/```html([\s\S]*?)```/g);
    if (htmlBlocks) {
      htmlContent += htmlBlocks.map(block => 
        block.replace(/```html\n?/, '').replace(/\n?```/, '')
      ).join('\n');
    }
    
    return htmlContent.trim();
  }

  parseHTML(htmlContent, sourceFile) {
    try {
      const dom = new JSDOM(htmlContent);
      const document = dom.window.document;
      
      console.log(`🔍 Analyzing VSCode DOM in ${sourceFile}...`);
      
      const allElements = document.querySelectorAll('*:not(style):not(script):not(meta):not(link):not(title)');
      console.log(`  └─ ${allElements.length} DOM elements found`);
      
      this.extractVSCodeFeatures(document, sourceFile);
      this.extractVSCodeSelectors(document, sourceFile);
      
      return true;
    } catch (error) {
      console.error(`❌ Error parsing ${sourceFile}:`, error.message);
      return false;
    }
  }

  extractVSCodeFeatures(document, sourceFile) {
    const features = {
      // VSCode Chat System
      newChat: this.findElements(document, [
        '[aria-label*="New Chat"]',
        '[title*="New Chat"]',
        '.codicon-add-two',
        '.action-label[aria-label*="New"]',
        'button[aria-label*="New Chat"]',
        'a[aria-label*="New Chat"]',
        '.new-chat-button',
        '[data-testid*="new-chat"]'
      ]),
      
      chatInput: this.findElements(document, [
        '.aislash-editor-input',
        '[placeholder*="Ask"]',
        '[placeholder*="chat"]',
        '.chat-input',
        '[data-testid*="chat-input"]',
        'textarea[data-testid="chat-input"]',
        'textarea[placeholder*="Type your task"]'
      ]),
      
      sendButton: this.findElements(document, [
        '[aria-label*="Send"]',
        '.send-button',
        'button[title*="Send"]',
        '.codicon-send',
        '[data-testid*="send"]'
      ]),
      
      userMessages: this.findElements(document, [
        'div.composer-human-message',
        '.user-message',
        '.human-message',
        '.aislash-editor-input-readonly',
        '[data-role="user"]',
        '.message.user'
      ]),
      
      aiMessages: this.findElements(document, [
        'span.anysphere-markdown-container-root',
        '.ai-message',
        '.assistant-message',
        '.markdown-container',
        '[data-role="assistant"]',
        '.message.assistant',
        '.anysphere-markdown-container-root'
      ]),
      
      chatHistory: this.findElements(document, [
        'li.action-item',
        '.chat-tab',
        '[aria-label*="Plan for"]',
        '[role="tab"]',
        '.tab[data-testid*="chat"]'
      ]),
      
      chatSettings: this.findElements(document, [
        '[aria-label="Settings"]',
        '.settings-button',
        '[data-testid*="settings"]',
        '.chat-settings'
      ]),

      // VSCode File Explorer
      fileExplorer: this.findElements(document, [
        '.explorer-viewlet',
        '[id*="explorer"]',
        '.pane[aria-label*="Explorer"]',
        '.monaco-pane-view .pane'
      ]),
      
      fileTree: this.findElements(document, [
        '.monaco-tree',
        '.explorer-item',
        '.monaco-list',
        '[role="tree"]'
      ]),
      
      folderToggle: this.findElements(document, [
        '.folder-icon',
        '.expand-collapse-button',
        '.codicon-chevron-right',
        '.codicon-chevron-down'
      ]),
      
      newFile: this.findElements(document, [
        '[aria-label*="New File"]',
        '.new-file-button',
        '[title*="New File"]'
      ]),
      
      newFolder: this.findElements(document, [
        '[aria-label*="New Folder"]',
        '.new-folder-button',
        '[title*="New Folder"]'
      ]),

      // VSCode Editor
      editorTabs: this.findElements(document, [
        '.tabs-container',
        '.tab',
        '.editor-tab',
        '[role="tab"]'
      ]),
      
      activeEditor: this.findElements(document, [
        '.editor-instance',
        '.monaco-editor',
        '.active-editor'
      ]),
      
      editorContent: this.findElements(document, [
        '.monaco-editor-background',
        '.view-lines',
        '.monaco-editor textarea'
      ]),
      
      lineNumbers: this.findElements(document, [
        '.margin-view-overlays',
        '.line-numbers',
        '.monaco-editor .margin'
      ]),

      // VSCode Command Palette & Navigation
      commandPalette: this.findElements(document, [
        '.quick-input-widget',
        '.monaco-quick-input',
        '[role="dialog"]'
      ]),
      
      quickOpen: this.findElements(document, [
        '.quick-input-widget',
        '.monaco-quick-input',
        '.quick-input'
      ]),
      
      globalSearch: this.findElements(document, [
        '.search-viewlet',
        '.search-panel',
        '[id*="search"]'
      ]),
      
      searchInput: this.findElements(document, [
        '.search-input',
        '.search-widget',
        '[data-testid*="search"]'
      ]),

      // VSCode Panels
      activityBar: this.findElements(document, [
        '.activitybar',
        '.activity-bar',
        '[role="navigation"]'
      ]),
      
      sideBar: this.findElements(document, [
        '.sidebar',
        '.side-bar',
        '.pane.sidebar'
      ]),
      
      statusBar: this.findElements(document, [
        '.statusbar',
        '.status-bar',
        '.part.statusbar'
      ]),
      
      titleBar: this.findElements(document, [
        '.titlebar',
        '.title-bar',
        '.part.titlebar'
      ]),

      // VSCode Terminal
      terminal: this.findElements(document, [
        '.terminal',
        '.xterm',
        '.terminal-container',
        '[data-testid*="terminal"]'
      ]),
      
      terminalTabs: this.findElements(document, [
        '.terminal-tabs',
        '.terminal-tab',
        '[data-testid*="terminal-tab"]'
      ]),

      // VSCode Extensions
      extensionsPanel: this.findElements(document, [
        '.extensions-viewlet',
        '.extensions-panel',
        '[id*="extensions"]'
      ]),
      
      extensionItems: this.findElements(document, [
        '.extension-item',
        '.extension',
        '[data-testid*="extension"]'
      ]),

      // VSCode Debug
      debugPanel: this.findElements(document, [
        '.debug-viewlet',
        '.debug-panel',
        '[id*="debug"]'
      ]),
      
      debugControls: this.findElements(document, [
        '.debug-toolbar',
        '.debug-controls',
        '.debug-actions'
      ]),

      // VSCode Source Control
      sourceControl: this.findElements(document, [
        '.scm-viewlet',
        '.source-control',
        '[id*="scm"]'
      ]),
      
      gitChanges: this.findElements(document, [
        '.git-changes',
        '.scm-changes',
        '[data-testid*="git"]'
      ]),

      // VSCode Settings
      settingsPanel: this.findElements(document, [
        '.settings-editor',
        '.settings-panel',
        '[id*="settings"]'
      ]),
      
      settingsSearch: this.findElements(document, [
        '.settings-search',
        '.settings-input',
        '[data-testid*="settings"]'
      ]),

      // VSCode Problems
      problemsPanel: this.findElements(document, [
        '.problems-viewlet',
        '.problems-panel',
        '[id*="problems"]'
      ]),
      
      problemItems: this.findElements(document, [
        '.problem-item',
        '.problem',
        '[data-testid*="problem"]'
      ]),

      // VSCode Output
      outputPanel: this.findElements(document, [
        '.output-viewlet',
        '.output-panel',
        '[id*="output"]'
      ]),
      
      outputChannels: this.findElements(document, [
        '.output-channel',
        '.output-item',
        '[data-testid*="output"]'
      ])
    };

    // Store features for this source
    this.results.features[sourceFile] = features;
    
    // Count total elements found
    let totalElements = 0;
    Object.values(features).forEach(elements => {
      totalElements += elements.length;
    });
    
    console.log(`  └─ ${totalElements} VSCode feature elements detected`);
  }

  findElements(document, selectors) {
    const elements = [];
    
    for (const selector of selectors) {
      try {
        const found = document.querySelectorAll(selector);
        found.forEach(element => {
          elements.push({
            selector,
            element: element.outerHTML,
            attributes: this.getElementAttributes(element),
            text: element.textContent?.trim().substring(0, 100) || ''
          });
        });
      } catch (error) {
        // Invalid selector, skip
        continue;
      }
    }
    
    return elements;
  }

  generateSelectorsForElement(element) {
    const selectors = [];
    
    // ID selector
    if (element.id) {
      selectors.push(`#${element.id}`);
    }
    
    // Class selectors
    if (element.className) {
      const classes = element.className.split(' ').filter(c => c.trim());
      classes.forEach(cls => {
        selectors.push(`.${cls}`);
      });
    }
    
    // Attribute selectors
    if (element.getAttribute('aria-label')) {
      selectors.push(`[aria-label="${element.getAttribute('aria-label')}"]`);
    }
    
    if (element.getAttribute('data-testid')) {
      selectors.push(`[data-testid="${element.getAttribute('data-testid')}"]`);
    }
    
    if (element.getAttribute('title')) {
      selectors.push(`[title="${element.getAttribute('title')}"]`);
    }
    
    // Tag selector
    selectors.push(element.tagName.toLowerCase());
    
    return selectors;
  }

  extractVSCodeSelectors(document, sourceFile) {
    const selectors = {};
    
    // Find all interactive elements
    const interactiveElements = document.querySelectorAll('button, a, input, textarea, [role="button"], [tabindex]');
    
    interactiveElements.forEach(element => {
      const elementSelectors = this.generateSelectorsForElement(element);
      const elementInfo = {
        tag: element.tagName.toLowerCase(),
        attributes: this.getElementAttributes(element),
        text: element.textContent?.trim().substring(0, 50) || '',
        selectors: elementSelectors
      };
      
      selectors[`${element.tagName.toLowerCase()}_${Object.keys(selectors).length}`] = elementInfo;
    });
    
    this.results.selectors[sourceFile] = selectors;
  }

  getElementAttributes(element) {
    const attributes = {};
    for (const attr of element.attributes) {
      attributes[attr.name] = attr.value;
    }
    return attributes;
  }

  generateOptimizedSelectors() {
    const optimized = {};
    
    // Combine selectors from all sources
    Object.values(this.results.selectors).forEach(sourceSelectors => {
      Object.entries(sourceSelectors).forEach(([key, info]) => {
        if (!optimized[key]) {
          optimized[key] = {
            selectors: info.selectors,
            count: 1,
            sources: [info]
          };
        } else {
          optimized[key].count++;
          optimized[key].sources.push(info);
        }
      });
    });
    
    return optimized;
  }

  generateStats() {
    const stats = {
      totalSources: Object.keys(this.results.features).length,
      totalElements: 0,
      featureCounts: {},
      selectorCounts: {}
    };
    
    // Count elements by feature
    Object.values(this.results.features).forEach(features => {
      Object.entries(features).forEach(([feature, elements]) => {
        if (!stats.featureCounts[feature]) {
          stats.featureCounts[feature] = 0;
        }
        stats.featureCounts[feature] += elements.length;
        stats.totalElements += elements.length;
      });
    });
    
    // Count selectors
    Object.values(this.results.selectors).forEach(selectors => {
      Object.entries(selectors).forEach(([key, info]) => {
        if (!stats.selectorCounts[key]) {
          stats.selectorCounts[key] = 0;
        }
        stats.selectorCounts[key]++;
      });
    });
    
    this.results.stats = stats;
    return stats;
  }

  async analyze() {
    console.log('🚀 VSCode DOM Analyzer starting...\n');

    try {
      // 1. Load DOM files
      const sources = this.loadDOMFiles();
      
      if (Object.keys(sources).length === 0) {
        throw new Error('No VSCode DOM files found for analysis!');
      }

      // 2. Parse each source
      let successCount = 0;
      Object.entries(sources).forEach(([sourceFile, htmlContent]) => {
        if (htmlContent && htmlContent.trim()) {
          const success = this.parseHTML(htmlContent, sourceFile);
          if (success) successCount++;
        }
      });

      // 3. Generate statistics
      const stats = this.generateStats();
      
      // 4. Generate optimized selectors
      const optimizedSelectors = this.generateOptimizedSelectors();
      
      // 5. Save results
      this.saveResults(stats, optimizedSelectors);

      console.log('\n📊 VSCode DOM Analysis completed!');
      console.log(`📁 Sources processed: ${successCount}/${Object.keys(sources).length}`);
      console.log(`🔍 Total elements analyzed: ${stats.totalElements}`);
      console.log(`🎯 Features detected: ${Object.keys(stats.featureCounts).length}`);
      console.log(`🔧 Selectors generated: ${Object.keys(optimizedSelectors).length}`);

      return {
        stats,
        optimizedSelectors,
        features: this.results.features,
        selectors: this.results.selectors
      };

    } catch (error) {
      console.error('❌ VSCode DOM analysis failed:', error.message);
      throw error;
    }
  }

  saveResults(stats, optimizedSelectors) {
    // Save statistics
    const statsPath = path.join(this.outputDir, 'dom-analysis-stats.json');
    fs.writeFileSync(statsPath, JSON.stringify(stats, null, 2));

    // Save optimized selectors
    const selectorsPath = path.join(this.outputDir, 'dom-optimized-selectors.json');
    fs.writeFileSync(selectorsPath, JSON.stringify(optimizedSelectors, null, 2));

    // Save detailed results
    const resultsPath = path.join(this.outputDir, 'dom-analysis-results.json');
    fs.writeFileSync(resultsPath, JSON.stringify(this.results, null, 2));

    // Generate summary report
    this.generateSummaryReport(stats, optimizedSelectors);

    console.log(`📁 Results saved to: ${this.outputDir}`);
  }

  generateSummaryReport(stats, optimizedSelectors) {
    const report = `# VSCode DOM Analysis Report

## Summary
- **Sources Analyzed**: ${stats.totalSources}
- **Total Elements**: ${stats.totalElements}
- **Features Detected**: ${Object.keys(stats.featureCounts).length}
- **Selectors Generated**: ${Object.keys(optimizedSelectors).length}

## Top VSCode Features by Element Count
${Object.entries(stats.featureCounts)
  .sort(([,a], [,b]) => b - a)
  .slice(0, 10)
  .map(([feature, count]) => `- **${feature}**: ${count} elements`)
  .join('\n')}

## Most Common Selectors
${Object.entries(optimizedSelectors)
  .sort(([,a], [,b]) => b.count - a.count)
  .slice(0, 10)
  .map(([selector, info]) => `- **${selector}**: ${info.count} occurrences`)
  .join('\n')}

## Analysis Details
- **Generated**: ${new Date().toISOString()}
- **IDE**: VSCode
- **Method**: DOM Analysis

## Files Generated
- \`dom-analysis-stats.json\` - Statistical summary
- \`dom-optimized-selectors.json\` - Optimized selectors
- \`dom-analysis-results.json\` - Detailed results
- \`dom-analysis-report.md\` - This report
`;

    const reportPath = path.join(this.outputDir, 'dom-analysis-report.md');
    fs.writeFileSync(reportPath, report);
  }
}

// Auto-run if called directly
if (require.main === module) {
  async function run() {
    const analyzer = new DOMAnalyzer();
    try {
      await analyzer.analyze();
      console.log('\n🎉 VSCode DOM Analysis completed successfully!');
    } catch (error) {
      console.error('\n❌ VSCode DOM Analysis failed:', error.message);
      process.exit(1);
    }
  }
  
  run();
}

module.exports = DOMAnalyzer; 