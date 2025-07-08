const fs = require('fs');
const path = require('path');

class CoverageValidator {
  constructor() {
    this.outputDir = path.join(__dirname, '../output/coverage-validation');
    this.ensureOutputDir();
    
    this.vscodeFeatures = {
      // Critical VSCode Chat Features
      chat: {
        newChat: { priority: 'critical', description: 'New Chat button' },
        chatInput: { priority: 'critical', description: 'Chat input field' },
        sendButton: { priority: 'critical', description: 'Send message button' },
        userMessages: { priority: 'high', description: 'User message display' },
        aiMessages: { priority: 'high', description: 'AI response display' },
        chatHistory: { priority: 'medium', description: 'Chat history/tabs' },
        chatSettings: { priority: 'medium', description: 'Chat settings/options' }
      },
      
      // VSCode Core UI Features
      navigation: {
        fileExplorer: { priority: 'critical', description: 'File explorer panel' },
        commandPalette: { priority: 'critical', description: 'Command palette (Ctrl+Shift+P)' },
        quickOpen: { priority: 'high', description: 'Quick open (Ctrl+P)' },
        globalSearch: { priority: 'high', description: 'Global search (Ctrl+Shift+F)' },
        breadcrumbs: { priority: 'medium', description: 'File breadcrumbs' }
      },
      
      // VSCode Editor Features
      editor: {
        editorTabs: { priority: 'critical', description: 'Editor tabs' },
        activeEditor: { priority: 'critical', description: 'Active editor content' },
        lineNumbers: { priority: 'high', description: 'Line numbers' },
        minimap: { priority: 'medium', description: 'Editor minimap' },
        scrollbars: { priority: 'medium', description: 'Editor scrollbars' }
      },
      
      // VSCode Panels
      panels: {
        activityBar: { priority: 'critical', description: 'Activity bar' },
        sideBar: { priority: 'critical', description: 'Sidebar panels' },
        statusBar: { priority: 'high', description: 'Status bar' },
        titleBar: { priority: 'high', description: 'Title bar' }
      },
      
      // VSCode Development Tools
      development: {
        terminal: { priority: 'high', description: 'Integrated terminal' },
        debugPanel: { priority: 'high', description: 'Debug panel' },
        extensionsPanel: { priority: 'medium', description: 'Extensions panel' },
        sourceControl: { priority: 'high', description: 'Source control panel' },
        problemsPanel: { priority: 'medium', description: 'Problems panel' },
        outputPanel: { priority: 'medium', description: 'Output panel' }
      },
      
      // VSCode Settings & Configuration
      settings: {
        settingsPanel: { priority: 'medium', description: 'Settings panel' },
        settingsSearch: { priority: 'medium', description: 'Settings search' },
        keybindings: { priority: 'low', description: 'Keybindings editor' }
      }
    };
  }

  ensureOutputDir() {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
      console.log(`📁 Created VSCode coverage validation directory: ${this.outputDir}`);
    }
  }

  loadAnalysisResults() {
    const results = {};
    
    // Load bulk analysis results
    const bulkPath = path.join(__dirname, '../output/bulk-analysis/bulk-analysis-results.json');
    if (fs.existsSync(bulkPath)) {
      results.bulk = JSON.parse(fs.readFileSync(bulkPath, 'utf8'));
    }
    
    // Load DOM analysis results
    const domPath = path.join(__dirname, '../output/dom-analysis/dom-analysis-results.json');
    if (fs.existsSync(domPath)) {
      results.dom = JSON.parse(fs.readFileSync(domPath, 'utf8'));
    }
    
    // Load enhanced chat analysis results
    const chatPath = path.join(__dirname, '../output/chat-analysis/enhanced-chat-analysis.json');
    if (fs.existsSync(chatPath)) {
      results.chat = JSON.parse(fs.readFileSync(chatPath, 'utf8'));
    }
    
    // Load merged results
    const mergedPath = path.join(__dirname, '../output/merged-analysis/merged-analysis-results.json');
    if (fs.existsSync(mergedPath)) {
      results.merged = JSON.parse(fs.readFileSync(mergedPath, 'utf8'));
    }
    
    return results;
  }

  validateFeatureCoverage(analysisResults) {
    const coverage = {
      summary: {
        totalFeatures: 0,
        coveredFeatures: 0,
        coveragePercentage: 0,
        criticalFeatures: 0,
        criticalCovered: 0,
        criticalCoveragePercentage: 0
      },
      categories: {},
      missingFeatures: [],
      recommendations: []
    };

    // Validate each feature category
    Object.entries(this.vscodeFeatures).forEach(([category, features]) => {
      coverage.categories[category] = {
        total: Object.keys(features).length,
        covered: 0,
        coverage: 0,
        features: {}
      };

      Object.entries(features).forEach(([featureName, featureInfo]) => {
        coverage.summary.totalFeatures++;
        
        const isCovered = this.checkFeatureCoverage(featureName, analysisResults);
        coverage.categories[category].features[featureName] = {
          ...featureInfo,
          covered: isCovered,
          selectors: this.getFeatureSelectors(featureName, analysisResults)
        };

        if (isCovered) {
          coverage.categories[category].covered++;
          coverage.summary.coveredFeatures++;
        } else {
          coverage.missingFeatures.push({
            category,
            feature: featureName,
            priority: featureInfo.priority,
            description: featureInfo.description
          });
        }

        if (featureInfo.priority === 'critical') {
          coverage.summary.criticalFeatures++;
          if (isCovered) {
            coverage.summary.criticalCovered++;
          }
        }
      });

      coverage.categories[category].coverage = 
        (coverage.categories[category].covered / coverage.categories[category].total) * 100;
    });

    // Calculate overall coverage percentages
    coverage.summary.coveragePercentage = 
      (coverage.summary.coveredFeatures / coverage.summary.totalFeatures) * 100;
    coverage.summary.criticalCoveragePercentage = 
      (coverage.summary.criticalCovered / coverage.summary.criticalFeatures) * 100;

    // Generate recommendations
    coverage.recommendations = this.generateRecommendations(coverage);

    return coverage;
  }

  checkFeatureCoverage(featureName, analysisResults) {
    // Check in bulk analysis results
    if (analysisResults.bulk?.features) {
      Object.values(analysisResults.bulk.features).forEach(sourceFeatures => {
        if (sourceFeatures[featureName] && sourceFeatures[featureName].length > 0) {
          return true;
        }
      });
    }

    // Check in DOM analysis results
    if (analysisResults.dom?.features) {
      Object.values(analysisResults.dom.features).forEach(sourceFeatures => {
        if (sourceFeatures[featureName] && sourceFeatures[featureName].length > 0) {
          return true;
        }
      });
    }

    // Check in chat analysis results
    if (analysisResults.chat?.chatFeatures) {
      if (analysisResults.chat.chatFeatures[featureName] && 
          analysisResults.chat.chatFeatures[featureName].length > 0) {
        return true;
      }
    }

    // Check in merged results
    if (analysisResults.merged?.features) {
      if (analysisResults.merged.features[featureName] && 
          analysisResults.merged.features[featureName].length > 0) {
        return true;
      }
    }

    return false;
  }

  getFeatureSelectors(featureName, analysisResults) {
    const selectors = [];

    // Collect selectors from all analysis sources
    if (analysisResults.bulk?.features) {
      Object.values(analysisResults.bulk.features).forEach(sourceFeatures => {
        if (sourceFeatures[featureName]) {
          sourceFeatures[featureName].forEach(element => {
            if (element.selector) {
              selectors.push(element.selector);
            }
          });
        }
      });
    }

    if (analysisResults.dom?.features) {
      Object.values(analysisResults.dom.features).forEach(sourceFeatures => {
        if (sourceFeatures[featureName]) {
          sourceFeatures[featureName].forEach(element => {
            if (element.selector) {
              selectors.push(element.selector);
            }
          });
        }
      });
    }

    if (analysisResults.chat?.chatSelectors?.[featureName]) {
      selectors.push(...analysisResults.chat.chatSelectors[featureName]);
    }

    if (analysisResults.merged?.selectors?.[featureName]) {
      selectors.push(...analysisResults.merged.selectors[featureName]);
    }

    return [...new Set(selectors)]; // Remove duplicates
  }

  generateRecommendations(coverage) {
    const recommendations = [];

    // Critical features missing
    const missingCritical = coverage.missingFeatures.filter(f => f.priority === 'critical');
    if (missingCritical.length > 0) {
      recommendations.push({
        priority: 'critical',
        type: 'missing_critical_features',
        message: `Missing ${missingCritical.length} critical VSCode features`,
        features: missingCritical.map(f => f.feature),
        action: 'Immediate attention required - these features are essential for VSCode automation'
      });
    }

    // Low coverage categories
    Object.entries(coverage.categories).forEach(([category, catData]) => {
      if (catData.coverage < 50) {
        recommendations.push({
          priority: 'high',
          type: 'low_coverage_category',
          message: `Low coverage in ${category} category (${catData.coverage.toFixed(1)}%)`,
          category,
          coverage: catData.coverage,
          action: `Focus on improving ${category} feature detection`
        });
      }
    })

    // Overall coverage recommendations
    if (coverage.summary.coveragePercentage < 70) {
      recommendations.push({
        priority: 'medium',
        type: 'overall_low_coverage',
        message: `Overall coverage is ${coverage.summary.coveragePercentage.toFixed(1)}%`,
        coverage: coverage.summary.coveragePercentage,
        action: 'Consider expanding DOM collection to include more VSCode states'
      });
    }

    // Selector quality recommendations
    if (coverage.summary.coveredFeatures > 0) {
      recommendations.push({
        priority: 'medium',
        type: 'selector_optimization',
        message: 'Optimize selectors for better reliability',
        action: 'Review and consolidate selectors for covered features'
      });
    }

    return recommendations;
  }

  async validate() {
    console.log('🚀 VSCode Coverage Validator starting...\n');

    try {
      // 1. Load analysis results
      console.log('📊 Loading analysis results...');
      const analysisResults = this.loadAnalysisResults();
      
      if (Object.keys(analysisResults).length === 0) {
        throw new Error('No analysis results found! Run analysis scripts first.');
      }

      // 2. Validate feature coverage
      console.log('🔍 Validating VSCode feature coverage...');
      const coverage = this.validateFeatureCoverage(analysisResults);

      // 3. Save validation results
      this.saveValidationResults(coverage);

      // 4. Generate summary report
      this.generateSummaryReport(coverage);

      console.log('\n✅ VSCode Coverage Validation completed!');
      console.log(`📊 Overall Coverage: ${coverage.summary.coveragePercentage.toFixed(1)}%`);
      console.log(`🎯 Critical Coverage: ${coverage.summary.criticalCoveragePercentage.toFixed(1)}%`);
      console.log(`📁 Results saved to: ${this.outputDir}`);

      return coverage;

    } catch (error) {
      console.error('❌ Coverage validation failed:', error.message);
      throw error;
    }
  }

  saveValidationResults(coverage) {
    // Save detailed coverage results
    const coveragePath = path.join(this.outputDir, 'coverage-validation-results.json');
    fs.writeFileSync(coveragePath, JSON.stringify(coverage, null, 2));

    // Save summary statistics
    const summaryPath = path.join(this.outputDir, 'coverage-summary.json');
    fs.writeFileSync(summaryPath, JSON.stringify(coverage.summary, null, 2));

    // Save missing features
    const missingPath = path.join(this.outputDir, 'missing-features.json');
    fs.writeFileSync(missingPath, JSON.stringify(coverage.missingFeatures, null, 2));

    // Save recommendations
    const recommendationsPath = path.join(this.outputDir, 'recommendations.json');
    fs.writeFileSync(recommendationsPath, JSON.stringify(coverage.recommendations, null, 2));
  }

  generateSummaryReport(coverage) {
    const report = `# VSCode Coverage Validation Report

## Summary
- **Overall Coverage**: ${coverage.summary.coveragePercentage.toFixed(1)}%
- **Critical Features Coverage**: ${coverage.summary.criticalCoveragePercentage.toFixed(1)}%
- **Total Features**: ${coverage.summary.totalFeatures}
- **Covered Features**: ${coverage.summary.coveredFeatures}
- **Missing Features**: ${coverage.missingFeatures.length}

## Coverage by Category
${Object.entries(coverage.categories)
  .map(([category, data]) => `- **${category}**: ${data.coverage.toFixed(1)}% (${data.covered}/${data.total})`)
  .join('\n')}

## Critical Missing Features
${coverage.missingFeatures
  .filter(f => f.priority === 'critical')
  .map(f => `- **${f.feature}**: ${f.description}`)
  .join('\n')}

## Recommendations
${coverage.recommendations
  .map(r => `- **${r.priority.toUpperCase()}**: ${r.message} - ${r.action}`)
  .join('\n')}

## Analysis Details
- **Generated**: ${new Date().toISOString()}
- **IDE**: VSCode
- **Validation Method**: Feature Coverage Analysis

## Files Generated
- \`coverage-validation-results.json\` - Complete coverage data
- \`coverage-summary.json\` - Summary statistics
- \`missing-features.json\` - Missing features list
- \`recommendations.json\` - Actionable recommendations
- \`coverage-validation-report.md\` - This report
`;

    const reportPath = path.join(this.outputDir, 'coverage-validation-report.md');
    fs.writeFileSync(reportPath, report);
  }
}

// Auto-run if called directly
if (require.main === module) {
  async function run() {
    const validator = new CoverageValidator();
    try {
      await validator.validate();
      console.log('\n🎉 Coverage validation completed successfully!');
    } catch (error) {
      console.error('\n❌ Coverage validation failed:', error.message);
      process.exit(1);
    }
  }
  
  run();
}

module.exports = CoverageValidator; 