const Logger = require('@logging/Logger');

const logger = new Logger('ServiceName');

#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

class EnhancedCoverageRunner {
  constructor() {
    this.results = {
      coverage: {},
      missingFeatures: [],
      recommendations: [],
      stats: {}
    };
    
    this.outputDir = path.join(__dirname, '../output/enhanced-coverage');
    this.ensureOutputDir();
  }

  ensureOutputDir() {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
      logger.info(`📁 Created VSCode enhanced coverage directory: ${this.outputDir}`);
    }
  }

  // Load all available DOM files for comprehensive coverage analysis
  loadAllDOMFiles() {
    const sources = {};
    
    // Try enhanced collection first
    const enhancedPath = path.join(__dirname, '../output/enhanced-collected');
    if (fs.existsSync(enhancedPath)) {
      const enhancedFiles = fs.readdirSync(enhancedPath)
        .filter(file => file.endsWith('.md') && !file.includes('collection-report'));
      
      enhancedFiles.forEach(file => {
        const content = fs.readFileSync(path.join(enhancedPath, file), 'utf8');
        const htmlContent = this.extractHTML(content);
        sources[`enhanced-${file}`] = htmlContent;
      });
      
      logger.info(`📁 Enhanced VSCode collection: ${enhancedFiles.length} files`);
    }
    
    // Fallback to auto collection
    const autoPath = path.join(__dirname, '../output/auto-collected');
    if (fs.existsSync(autoPath)) {
      const autoFiles = fs.readdirSync(autoPath)
        .filter(file => file.endsWith('.md') && !file.includes('collection-report'));
      
      autoFiles.forEach(file => {
        const content = fs.readFileSync(path.join(autoPath, file), 'utf8');
        const htmlContent = this.extractHTML(content);
        sources[`auto-${file}`] = htmlContent;
      });
      
      logger.info(`📁 Auto VSCode collection: ${autoFiles.length} files`);
    }
    
    if (Object.keys(sources).length === 0) {
      throw new Error('No VSCode DOM files found for coverage analysis!');
    }
    
    logger.info(`📄 Total VSCode DOM files: ${Object.keys(sources).length}`);
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

  async runEnhancedCoverage() {
    logger.info('🚀 VSCode Enhanced Coverage Analysis starting...\n');

    try {
      // 1. Load all DOM files
      const sources = this.loadAllDOMFiles();
      
      // 2. Define comprehensive VSCode feature requirements
      const requiredFeatures = this.defineVSCodeFeatureRequirements();
      
      // 3. Analyze coverage across all sources
      const coverageResults = this.analyzeCoverage(sources, requiredFeatures);
      
      // 4. Generate enhanced coverage report
      const report = this.generateEnhancedReport(coverageResults);
      
      // 5. Save results
      this.saveResults(report);
      
      // 6. Generate actionable recommendations
      this.generateActionableRecommendations(coverageResults);

      logger.info('\n📊 VSCode ENHANCED COVERAGE ANALYSIS COMPLETED!');
      logger.info(`📁 Output: ${this.outputDir}`);
      logger.info(`🎯 Coverage Score: ${report.summary.coverageScore}%`);
      logger.info(`❌ Missing Features: ${report.summary.missingFeatures}`);
      logger.info(`💡 Recommendations: ${report.summary.recommendations}`);

      return report;

    } catch (error) {
      console.error('❌ VSCode enhanced coverage analysis failed:', error.message);
      throw error;
    }
  }

  defineVSCodeFeatureRequirements() {
    return {
      // === CRITICAL VSCode CHAT FEATURES ===
      critical: {
        newChat: {
          description: 'VSCode New Chat button',
          selectors: [
            '[aria-label*="New Chat"]',
            '[title*="New Chat"]',
            '.codicon-add-two',
            '.action-label[aria-label*="New"]'
          ],
          required: true
        },
        chatInput: {
          description: 'VSCode Chat input field',
          selectors: [
            'textarea[data-testid="chat-input"]',
            'textarea[placeholder*="Type your task"]',
            '.aislash-editor-input[contenteditable="true"]',
            '[contenteditable="true"]'
          ],
          required: true
        },
        sendButton: {
          description: 'VSCode Send message button',
          selectors: [
            '.codicon-send',
            '.action-label[aria-label*="Send"]',
            '.chat-execute-toolbar .codicon-send'
          ],
          required: true
        },
        commandPalette: {
          description: 'VSCode Command Palette',
          selectors: [
            '.quick-input-widget',
            '.monaco-quick-input',
            '[role="dialog"]'
          ],
          required: true
        }
      },
      
      // === IMPORTANT VSCode FEATURES ===
      important: {
        fileExplorer: {
          description: 'VSCode File Explorer',
          selectors: [
            '.explorer-viewlet',
            '[id*="explorer"]',
            '.pane[aria-label*="Explorer"]'
          ],
          required: false
        },
        editor: {
          description: 'VSCode Editor',
          selectors: [
            '.monaco-editor',
            '.editor-instance',
            '.view-lines'
          ],
          required: false
        },
        terminal: {
          description: 'VSCode Terminal',
          selectors: [
            '.terminal-wrapper',
            '.xterm-screen',
            '.integrated-terminal'
          ],
          required: false
        },
        search: {
          description: 'VSCode Global Search',
          selectors: [
            '.search-viewlet',
            '[id*="search"]',
            '.search-input'
          ],
          required: false
        },
        git: {
          description: 'VSCode Git Source Control',
          selectors: [
            '.scm-viewlet',
            '[id*="scm"]',
            '.scm-resource'
          ],
          required: false
        },
        extensions: {
          description: 'VSCode Extensions Panel',
          selectors: [
            '.extensions-viewlet',
            '[id*="extensions"]',
            '.extensions-search'
          ],
          required: false
        },
        debug: {
          description: 'VSCode Debug Panel',
          selectors: [
            '.debug-viewlet',
            '[id*="debug"]',
            '.codicon-debug-alt'
          ],
          required: false
        }
      },
      
      // === ENHANCED VSCode FEATURES ===
      enhanced: {
        userMessages: {
          description: 'VSCode User Messages',
          selectors: [
            '.user-message',
            '.human-message',
            '.aislash-editor-input-readonly'
          ],
          required: false
        },
        aiMessages: {
          description: 'VSCode AI Messages',
          selectors: [
            '.ai-message',
            '.assistant-message',
            '.anysphere-markdown-container-root'
          ],
          required: false
        },
        chatHistory: {
          description: 'VSCode Chat History',
          selectors: [
            '[aria-label*="Chat History"]',
            '.chat-history',
            '.chat-history-button'
          ],
          required: false
        },
        chatSettings: {
          description: 'VSCode Chat Settings',
          selectors: [
            '[aria-label="Settings"]',
            '.chat-settings',
            '.settings-button'
          ],
          required: false
        },
        contextMenu: {
          description: 'VSCode Context Menu',
          selectors: [
            '.monaco-menu',
            '.context-menu',
            '[role="menu"]'
          ],
          required: false
        },
        notification: {
          description: 'VSCode Notification Overlay',
          selectors: [
            '.monaco-notification-overlay',
            '.notification-overlay',
            '.monaco-overlay'
          ],
          required: false
        },
        breadcrumbs: {
          description: 'VSCode Breadcrumbs',
          selectors: [
            '.breadcrumbs',
            '.breadcrumb-item'
          ],
          required: false
        },
        statusBar: {
          description: 'VSCode Status Bar',
          selectors: [
            '.statusbar',
            '.monaco-workbench .part.statusbar'
          ],
          required: false
        }
      }
    };
  }

  analyzeCoverage(sources, requiredFeatures) {
    logger.info('🔍 Analyzing VSCode feature coverage across all sources...');
    
    const coverage = {
      critical: {},
      important: {},
      enhanced: {},
      missing: [],
      found: [],
      stats: {
        totalSources: Object.keys(sources).length,
        totalFeatures: 0,
        foundFeatures: 0,
        missingFeatures: 0
      }
    };
    
    // Analyze each feature category
    Object.entries(requiredFeatures).forEach(([category, features]) => {
      Object.entries(features).forEach(([featureName, featureDef]) => {
        const found = this.findFeatureInSources(sources, featureDef.selectors);
        
        if (found.length > 0) {
          coverage[category][featureName] = {
            found: true,
            sources: found,
            bestSelector: this.selectBestSelector(found.map(f => f.selector)),
            description: featureDef.description,
            required: featureDef.required
          };
          coverage.found.push(featureName);
          coverage.stats.foundFeatures++;
        } else {
          coverage[category][featureName] = {
            found: false,
            sources: [],
            description: featureDef.description,
            required: featureDef.required
          };
          coverage.missing.push(featureName);
          coverage.stats.missingFeatures++;
        }
        
        coverage.stats.totalFeatures++;
      });
    });
    
    logger.info(`  ✅ Found: ${coverage.stats.foundFeatures} VSCode features`);
    logger.info(`  ❌ Missing: ${coverage.stats.missingFeatures} VSCode features`);
    
    return coverage;
  }

  findFeatureInSources(sources, selectors) {
    const found = [];
    
    Object.entries(sources).forEach(([sourceName, htmlContent]) => {
      try {
        const dom = new JSDOM(htmlContent);
        const document = dom.window.document;
        
        selectors.forEach(selector => {
          try {
            const elements = document.querySelectorAll(selector);
            if (elements.length > 0) {
              found.push({
                source: sourceName,
                selector: selector,
                count: elements.length,
                element: this.getElementInfo(elements[0])
              });
            }
          } catch (error) {
            // Invalid selector, continue
          }
        });
      } catch (error) {
        // Invalid HTML, continue
      }
    });
    
    return found;
  }

  getElementInfo(element) {
    return {
      tagName: element.tagName,
      className: element.className,
      id: element.id,
      ariaLabel: element.getAttribute('aria-label'),
      role: element.getAttribute('role')
    };
  }

  selectBestSelector(selectors) {
    if (selectors.length === 0) return null;
    
    // Prioritize selectors: ID > specific aria-label > class > tag
    const prioritized = selectors.sort((a, b) => {
      // IDs have highest priority
      if (a.startsWith('#')) return -1;
      if (b.startsWith('#')) return 1;
      
      // Specific aria-labels have priority
      if (a.includes('aria-label="') && b.includes('aria-label*=')) return -1;
      if (b.includes('aria-label="') && a.includes('aria-label*=')) return 1;
      
      // Classes have priority over tags
      if (a.startsWith('.') && !b.startsWith('.')) return -1;
      if (b.startsWith('.') && !a.startsWith('.')) return 1;
      
      // Shorter selectors are preferred
      return a.length - b.length;
    });
    
    return prioritized[0];
  }

  generateEnhancedReport(coverageResults) {
    const totalFeatures = coverageResults.stats.totalFeatures;
    const foundFeatures = coverageResults.stats.foundFeatures;
    const coverageScore = Math.round((foundFeatures / totalFeatures) * 100);
    
    const report = {
      meta: {
        generatedAt: new Date().toISOString(),
        script: 'run-enhanced-coverage.js',
        totalSources: coverageResults.stats.totalSources,
        totalFeatures: totalFeatures,
        foundFeatures: foundFeatures,
        missingFeatures: coverageResults.stats.missingFeatures
      },
      coverage: coverageResults,
      summary: {
        coverageScore: coverageScore,
        status: coverageScore >= 90 ? 'EXCELLENT' :
                coverageScore >= 75 ? 'GOOD' :
                coverageScore >= 50 ? 'FAIR' : 'POOR',
        criticalCoverage: this.calculateCategoryCoverage(coverageResults.critical),
        importantCoverage: this.calculateCategoryCoverage(coverageResults.important),
        enhancedCoverage: this.calculateCategoryCoverage(coverageResults.enhanced),
        missingFeatures: coverageResults.missing.length,
        recommendations: 0
      },
      recommendations: []
    };
    
    // Generate recommendations based on missing features
    this.generateCoverageRecommendations(coverageResults, report);
    
    report.summary.recommendations = report.recommendations.length;
    
    return report;
  }

  calculateCategoryCoverage(category) {
    const total = Object.keys(category).length;
    const found = Object.values(category).filter(f => f.found).length;
    return total > 0 ? Math.round((found / total) * 100) : 0;
  }

  generateCoverageRecommendations(coverageResults, report) {
    // Critical missing features
    const missingCritical = Object.entries(coverageResults.critical)
      .filter(([name, data]) => !data.found && data.required);
    
    if (missingCritical.length > 0) {
      report.recommendations.push({
        priority: 'CRITICAL',
        title: 'Fix Missing Critical VSCode Features',
        description: `${missingCritical.length} critical VSCode features are missing`,
        features: missingCritical.map(([name, data]) => ({
          name: name,
          description: data.description
        })),
        actions: [
          'Collect additional VSCode DOM states',
          'Implement dynamic feature detection',
          'Add fallback selectors',
          'Test with different VSCode versions'
        ]
      });
    }
    
    // Important missing features
    const missingImportant = Object.entries(coverageResults.important)
      .filter(([name, data]) => !data.found);
    
    if (missingImportant.length > 0) {
      report.recommendations.push({
        priority: 'IMPORTANT',
        title: 'Address Missing Important VSCode Features',
        description: `${missingImportant.length} important VSCode features are missing`,
        features: missingImportant.map(([name, data]) => ({
          name: name,
          description: data.description
        })),
        actions: [
          'Collect specific VSCode panel states',
          'Add panel-specific selectors',
          'Implement panel activation strategies'
        ]
      });
    }
    
    // Coverage improvement suggestions
    if (report.summary.coverageScore < 90) {
      report.recommendations.push({
        priority: 'ENHANCEMENT',
        title: 'Improve VSCode Coverage Score',
        description: `Current coverage: ${report.summary.coverageScore}% (target: 90%+)`,
        actions: [
          'Run enhanced DOM collection',
          'Add missing VSCode state configurations',
          'Implement comprehensive modal analysis',
          'Add context menu and notification states'
        ]
      });
    }
  }

  generateActionableRecommendations(coverageResults) {
    const recommendations = [];
    
    // Generate specific actions based on missing features
    coverageResults.missing.forEach(featureName => {
      const recommendation = this.generateFeatureRecommendation(featureName);
      if (recommendation) {
        recommendations.push(recommendation);
      }
    });
    
    this.results.recommendations = recommendations;
  }

  generateFeatureRecommendation(featureName) {
    const recommendations = {
      newChat: {
        action: 'Collect VSCode New Chat modal state',
        steps: [
          'Click New Chat button in VSCode',
          'Wait for modal to appear',
          'Collect DOM state',
          'Add modal button selectors'
        ]
      },
      chatInput: {
        action: 'Focus VSCode chat input field',
        steps: [
          'Activate VSCode chat panel',
          'Click in chat input area',
          'Collect focused input state',
          'Add input field selectors'
        ]
      },
      commandPalette: {
        action: 'Open VSCode Command Palette',
        steps: [
          'Press Ctrl+Shift+P',
          'Wait for palette to appear',
          'Collect modal state',
          'Add palette selectors'
        ]
      },
      fileExplorer: {
        action: 'Activate VSCode File Explorer',
        steps: [
          'Click Explorer panel icon',
          'Expand file tree',
          'Collect explorer state',
          'Add tree selectors'
        ]
      }
    };
    
    return recommendations[featureName];
  }

  saveResults(report) {
    const outputFile = path.join(this.outputDir, 'vscode-enhanced-coverage.json');
    fs.writeFileSync(outputFile, JSON.stringify(report, null, 2));
    
    // Also save a summary report
    const summaryFile = path.join(this.outputDir, 'vscode-enhanced-coverage-summary.md');
    const summary = this.generateSummaryReport(report);
    fs.writeFileSync(summaryFile, summary);
    
    logger.info(`📄 VSCode enhanced coverage saved: ${outputFile}`);
    logger.info(`📄 VSCode coverage summary saved: ${summaryFile}`);
  }

  generateSummaryReport(report) {
    const { summary, coverage, recommendations } = report;
    
    return `# VSCode Enhanced Coverage Summary

## Overview
- **Generated**: ${report.meta.generatedAt}
- **Coverage Score**: ${summary.coverageScore}% (${summary.status})
- **Total Features**: ${report.meta.totalFeatures}
- **Found Features**: ${report.meta.foundFeatures}
- **Missing Features**: ${report.meta.missingFeatures}

## Coverage by Category
- **Critical**: ${summary.criticalCoverage}%
- **Important**: ${summary.importantCoverage}%
- **Enhanced**: ${summary.enhancedCoverage}%

## Found VSCode Features
${Object.entries(coverage.critical).filter(([name, data]) => data.found).map(([name, data]) => 
  `- ✅ **${name}**: ${data.description} (\`${data.bestSelector}\`)`
).join('\n')}

${Object.entries(coverage.important).filter(([name, data]) => data.found).map(([name, data]) => 
  `- ✅ **${name}**: ${data.description} (\`${data.bestSelector}\`)`
).join('\n')}

## Missing VSCode Features
${Object.entries(coverage.critical).filter(([name, data]) => !data.found).map(([name, data]) => 
  `- ❌ **${name}**: ${data.description} (CRITICAL)`
).join('\n')}

${Object.entries(coverage.important).filter(([name, data]) => !data.found).map(([name, data]) => 
  `- ❌ **${name}**: ${data.description} (IMPORTANT)`
).join('\n')}

## Recommendations
${recommendations.map(rec => 
  `- **${rec.priority}**: ${rec.title} - ${rec.description}`
).join('\n')}

## Next Steps
1. Address critical missing features first
2. Implement recommended collection strategies
3. Run enhanced DOM collection
4. Validate coverage improvements
`;
  }
}

// CLI Usage
if (require.main === module) {
  const runner = new EnhancedCoverageRunner();
  
  async function run() {
    try {
      await runner.runEnhancedCoverage();
    } catch (error) {
      console.error('❌ VSCode enhanced coverage failed:', error.message);
      process.exit(1);
    }
  }
  
  run();
}

module.exports = EnhancedCoverageRunner; 