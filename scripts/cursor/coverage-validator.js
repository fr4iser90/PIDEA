const fs = require('fs');
const path = require('path');

class CoverageValidator {
  constructor() {
    this.analysisFile = path.join(__dirname, '../output/dom-analysis-results.json');
    this.outputFile = path.join(__dirname, '../output/coverage-validation-report.json');
    
    // Erwartete Features basierend auf bereits gefundenen + fehlende
    this.requiredFeatures = {
      // Chat System (bereits gut abgedeckt)
      chat: [
        'newChat', 'chatHistory', 'chatInput', 'userMessages', 
        'aiMessages', 'chatTabs', 'settings', 'moreActions', 'backgroundAgents'
      ],
      
      // File Explorer (bereits gut abgedeckt)
      explorer: [
        'fileExplorer', 'fileTree', 'folderToggle', 'newFile', 'newFolder'
      ],
      
      // Editor (bereits gut abgedeckt)
      editor: [
        'editorTabs', 'activeEditor', 'editorContent', 'tabCloseButton', 'splitEditor'
      ],
      
      // Search & Navigation (teilweise fehlend)
      search: [
        'globalSearch', 'searchInput', 'replaceInput', 'searchResults', 'searchFilters'
      ],
      
      // Git Integration (bereits gut abgedeckt)
      git: [
        'gitSourceControl', 'gitChanges', 'commitInput', 'commitButton'
      ],
      
      // Extensions (fehlend)
      extensions: [
        'extensionsPanel', 'extensionSearch', 'installExtension'
      ],
      
      // Terminal (bereits gut abgedeckt)
      terminal: [
        'terminal', 'newTerminal'
      ],
      
      // Debug & Run (bereits gut abgedeckt)
      debug: [
        'debugPanel', 'runButton', 'debugButton', 'breakpoints'
      ],
      
      // Command & Quick Actions (fehlend)
      commands: [
        'commandPalette', 'quickOpen', 'breadcrumbs'
      ],
      
      // Status & Panels (teilweise fehlend)
      panels: [
        'statusBar', 'problemsPanel', 'outputPanel'
      ],
      
      // AI Features (bereits gut abgedeckt)
      ai: [
        'aiCodeActions'
      ]
    };
    
    this.totalRequiredFeatures = Object.values(this.requiredFeatures).flat().length;
    this.ensureDirectories();
  }

  ensureDirectories() {
    // Erstelle output directory falls es nicht existiert
    const outputDir = path.dirname(this.outputFile);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
      console.log(`📁 Created directory: ${outputDir}`);
    }
  }

  loadAnalysisResults() {
    if (!fs.existsSync(this.analysisFile)) {
      console.log(`⚠️ Analysis file not found: ${this.analysisFile}`);
      console.log('Creating empty analysis results...');
      
      // Erstelle leere Analyse falls Datei nicht existiert
      const emptyResults = {
        meta: {
          generatedAt: new Date().toISOString(),
          script: 'coverage-validator.js',
          stats: { totalElements: 0, totalFeatures: 0, featuresFound: 0, sources: 0 }
        },
        optimizedSelectors: {},
        detailedFeatures: {},
        rawStats: { totalElements: 0, totalFeatures: 0, featuresFound: 0, sources: 0 }
      };
      
      fs.writeFileSync(this.analysisFile, JSON.stringify(emptyResults, null, 2));
      return emptyResults;
    }
    
    try {
      const content = fs.readFileSync(this.analysisFile, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      console.error(`❌ Error reading analysis file: ${error.message}`);
      throw error;
    }
  }

  validateCoverage(analysisResults) {
    const coverage = {
      byCategory: {},
      overall: {
        found: 0,
        missing: 0,
        total: this.totalRequiredFeatures,
        percentage: 0
      },
      missingFeatures: [],
      foundFeatures: []
    };

    // Validiere jede Kategorie
    Object.entries(this.requiredFeatures).forEach(([category, features]) => {
      const categoryResults = {
        found: [],
        missing: [],
        total: features.length,
        percentage: 0
      };

      features.forEach(feature => {
        if (analysisResults.optimizedSelectors && analysisResults.optimizedSelectors[feature]) {
          categoryResults.found.push(feature);
          coverage.foundFeatures.push({
            feature,
            category,
            selector: analysisResults.optimizedSelectors[feature]
          });
        } else {
          categoryResults.missing.push(feature);
          coverage.missingFeatures.push({
            feature,
            category
          });
        }
      });

      categoryResults.percentage = Math.round(
        (categoryResults.found.length / categoryResults.total) * 100
      );

      coverage.byCategory[category] = categoryResults;
    });

    // Berechne Gesamt-Coverage
    coverage.overall.found = coverage.foundFeatures.length;
    coverage.overall.missing = coverage.missingFeatures.length;
    coverage.overall.percentage = Math.round(
      (coverage.overall.found / coverage.overall.total) * 100
    );

    return coverage;
  }

  generateRecommendations(coverage) {
    const recommendations = [];

    // Finde Kategorien mit fehlenden Features
    Object.entries(coverage.byCategory).forEach(([category, results]) => {
      if (results.missing.length > 0) {
        const priority = this.getPriorityForCategory(category);
        const actions = this.getActionsForCategory(category);
        
        recommendations.push({
          priority,
          category,
          missingFeatures: results.missing,
          requiredActions: actions,
          estimatedImpact: `+${results.missing.length} Features`
        });
      }
    });

    // Sortiere nach Priorität
    recommendations.sort((a, b) => a.priority - b.priority);

    return recommendations;
  }

  getPriorityForCategory(category) {
    const priorityMap = {
      commands: 1,    // Höchste Priorität - Command Palette fehlt
      search: 2,      // Global Search fehlt
      extensions: 3,  // Extensions Panel fehlt
      panels: 4,      // Problems/Output Panels fehlen
      debug: 5,
      git: 6,
      terminal: 7,
      editor: 8,
      explorer: 9,
      ai: 10,
      chat: 11        // Niedrigste (bereits gut abgedeckt)
    };

    return priorityMap[category] || 99;
  }

  getActionsForCategory(category) {
    const actionMap = {
      commands: [
        'Ctrl+Shift+P → Command Palette öffnen → DOM sammeln',
        'Ctrl+P → Quick Open öffnen → DOM sammeln',
        'Breadcrumbs im Editor aktivieren'
      ],
      search: [
        'Ctrl+Shift+F → Global Search öffnen → DOM sammeln',
        'Search-Input verwenden → DOM sammeln',
        'Replace-Panel öffnen → DOM sammeln'
      ],
      extensions: [
        'Ctrl+Shift+X → Extensions Panel öffnen → DOM sammeln',
        'Extension suchen → DOM sammeln',
        'Install-Button verwenden → DOM sammeln'
      ],
      panels: [
        'Ctrl+Shift+M → Problems Panel → DOM sammeln',
        'Ctrl+Shift+U → Output Panel → DOM sammeln'
      ]
    };

    return actionMap[category] || [];
  }

  async validate() {
    console.log('🔍 Validiere Feature Coverage...\n');

    try {
      const analysisResults = this.loadAnalysisResults();
      const selectorCount = analysisResults.optimizedSelectors ? 
        Object.keys(analysisResults.optimizedSelectors).length : 0;
      
      console.log(`📊 Analysiere ${selectorCount} gefundene Features`);

      const coverage = this.validateCoverage(analysisResults);
      const recommendations = this.generateRecommendations(coverage);

      const report = {
        meta: {
          generatedAt: new Date().toISOString(),
          validator: 'coverage-validator.js',
          analysisSource: this.analysisFile
        },
        coverage,
        recommendations,
        summary: {
          status: coverage.overall.percentage >= 90 ? 'EXCELLENT' :
                 coverage.overall.percentage >= 75 ? 'GOOD' :
                 coverage.overall.percentage >= 50 ? 'FAIR' : 'POOR',
          progress: `${coverage.overall.found}/${coverage.overall.total} Features (${coverage.overall.percentage}%)`,
          nextPriority: recommendations[0]?.category || 'ALL_COMPLETE',
          readyForProduction: coverage.overall.percentage >= 85
        }
      };

      this.saveReport(report);
      this.displaySummary(report);

      return report;

    } catch (error) {
      console.error('❌ Validation failed:', error.message);
      throw error;
    }
  }

  saveReport(report) {
    try {
      fs.writeFileSync(this.outputFile, JSON.stringify(report, null, 2));
      console.log(`📄 Coverage Report: ${this.outputFile}`);
    } catch (error) {
      console.error(`❌ Failed to save report: ${error.message}`);
    }
  }

  displaySummary(report) {
    const { coverage, summary, recommendations } = report;

    console.log('\n📊 COVERAGE VALIDATION SUMMARY');
    console.log('═'.repeat(50));
    console.log(`Status: ${summary.status}`);
    console.log(`Progress: ${summary.progress}`);
    console.log(`Ready for Production: ${summary.readyForProduction ? '✅ YES' : '❌ NO'}`);

    console.log('\n📈 BY CATEGORY:');
    Object.entries(coverage.byCategory).forEach(([category, results]) => {
      const status = results.percentage >= 90 ? '✅' :
                    results.percentage >= 75 ? '🟡' : '❌';
      console.log(`  ${status} ${category}: ${results.found.length}/${results.total} (${results.percentage}%)`);
    });

    if (coverage.missingFeatures.length > 0) {
      console.log('\n🎯 FEHLENDE FEATURES:');
      coverage.missingFeatures.slice(0, 10).forEach(missing => {
        console.log(`  ❌ ${missing.feature} (${missing.category})`);
      });
      
      if (coverage.missingFeatures.length > 10) {
        console.log(`  ... und ${coverage.missingFeatures.length - 10} weitere`);
      }

      console.log('\n🚀 TOP PRIORITÄTEN:');
      recommendations.slice(0, 3).forEach((rec, i) => {
        console.log(`  ${i + 1}. ${rec.category}: ${rec.missingFeatures.length} Features`);
        rec.requiredActions.slice(0, 2).forEach(action => {
          console.log(`     • ${action}`);
        });
      });
    } else {
      console.log('\n🎉 ALL FEATURES DETECTED!');
      console.log('Ready for selector generation and test creation.');
    }

    console.log('\n📋 NÄCHSTE SCHRITTE:');
    console.log('  npm run auto-collect-dom     # Sammle fehlende DOM-States');
    console.log('  npm run analyze-dom          # Vollständige Analyse');
    console.log('  npm run quick-check          # Schnelle Coverage-Prüfung');
  }

  quickCheck() {
    try {
      const analysisResults = this.loadAnalysisResults();
      const coverage = this.validateCoverage(analysisResults);
      
      console.log(`Coverage: ${coverage.overall.percentage}% (${coverage.overall.found}/${coverage.overall.total})`);
      
      if (coverage.missingFeatures.length > 0) {
        const missing = coverage.missingFeatures.map(f => f.feature).slice(0, 5);
        console.log(`Missing: ${missing.join(', ')}${coverage.missingFeatures.length > 5 ? '...' : ''}`);
      }
      
      return coverage.overall.percentage;
    } catch (error) {
      console.error('Quick check failed:', error.message);
      return 0;
    }
  }
}

if (require.main === module) {
  const validator = new CoverageValidator();
  
  const command = process.argv[2];
  
  async function run() {
    try {
      if (command === 'quick') {
        validator.quickCheck();
      } else {
        await validator.validate();
      }
    } catch (error) {
      console.error('❌ FEHLER:', error.message);
      process.exit(1);
    }
  }
  
  run();
}

module.exports = CoverageValidator; 