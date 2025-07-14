const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const Logger = require('@logging/Logger');

const logger = new Logger('ServiceName');

class BulkDOMAnalyzer {
  constructor() {
    this.results = {
      features: {},
      selectors: {},
      elements: [],
      stats: {}
    };
  }

  // Lade alle DOM-Dateien aus auto-collected
  loadAutoCollectedFiles(targetDir) {
    const collectedPath = targetDir || path.join(__dirname, '../output/auto-collected');
    
    if (!fs.existsSync(collectedPath)) {
      throw new Error(`Directory not found: ${collectedPath}`);
    }

    const allFiles = fs.readdirSync(collectedPath)
      .filter(file => file.endsWith('.md') && file !== 'collection-report.json');
    
    logger.info(`📁 Auto-collected Verzeichnis: ${collectedPath}`);
    logger.info(`📄 Gefundene DOM-Dateien: ${allFiles.length}`);
    
    const sources = {};
    allFiles.forEach(file => {
      const content = fs.readFileSync(path.join(collectedPath, file), 'utf8');
      const htmlContent = this.extractHTML(content);
      sources[file] = htmlContent;
      const elementCount = (htmlContent.match(/<[^>]*>/g) || []).length;
      logger.info(`📄 ${file}: ${elementCount} HTML-Elemente`);
    });
    
    return sources;
  }

  extractHTML(content) {
    // Extrahiere HTML aus den auto-collected Markdown-Dateien
    let htmlContent = '';
    
    // HTML-Blöcke in ```html ... ``` Format
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
      
      logger.info(`🔍 Analyzing ${sourceFile}...`);
      
      const allElements = document.querySelectorAll('*:not(style):not(script):not(meta):not(link):not(title)');
      logger.info(`  └─ ${allElements.length} DOM-Elemente gefunden`);
      
      this.extractFeatures(document, sourceFile);
      this.extractSelectors(document, sourceFile);
      
      return true;
    } catch (error) {
      console.error(`❌ Fehler beim Parsen von ${sourceFile}:`, error.message);
      return false;
    }
  }

  extractFeatures(document, sourceFile) {
    const features = {
      // NEW FEATURES wir suchen (aus den auto-collected Daten)
      commandPalette: this.findElements(document, [
        '.quick-input-widget',
        '.monaco-quick-input-widget', 
        '[aria-label*="Command Palette"]',
        '.command-palette'
      ]),
      
      quickOpen: this.findElements(document, [
        '.quick-input-widget',
        '[placeholder*="Go to File"]',
        '[placeholder*="Search files"]',
        '.file-picker'
      ]),
      
      globalSearch: this.findElements(document, [
        '#workbench.view.search',
        '.search-view',
        '[aria-label*="Search"]',
        '.search-widget'
      ]),
      
      extensionsPanel: this.findElements(document, [
        '#workbench.view.extensions',
        '.extensions-view',
        '[aria-label*="Extensions"]'
      ]),
      
      debugPanel: this.findElements(document, [
        '#workbench.view.debug',
        '.debug-view',
        '[aria-label*="Debug"]'
      ]),
      
      problemsPanel: this.findElements(document, [
        '#workbench.panel.markers',
        '.markers-panel',
        '[aria-label*="Problems"]'
      ]),
      
      outputPanel: this.findElements(document, [
        '#workbench.panel.output',
        '.output-panel',
        '[aria-label*="Output"]'
      ]),

      // EXISTING FEATURES (weiterhin sammeln)
      newChat: this.findElements(document, [
        '[aria-label*="New Chat"]',
        '.new-chat-button'
      ]),
      
      chatInput: this.findElements(document, [
        '.aislash-editor-input',
        '[placeholder*="Ask"]'
      ]),
      
      fileExplorer: this.findElements(document, [
        '#workbench.view.explorer',
        '.pane'
      ]),
      
      terminal: this.findElements(document, [
        '.pane-body',
        '.terminal-wrapper'
      ]),
      
      activeEditor: this.findElements(document, [
        '.monaco-editor',
        '[data-uri*="file://"]'
      ])
    };

    // Features sammeln
    Object.entries(features).forEach(([featureName, elements]) => {
      if (elements.length > 0) {
        if (!this.results.features[featureName]) {
          this.results.features[featureName] = [];
        }
        
        this.results.features[featureName].push({
          source: sourceFile,
          count: elements.length,
          elements: elements.map(el => this.generateSelectorsForElement(el))
        });
        
        logger.info(`  ✅ ${featureName}: ${elements.length} Elemente`);
      }
    });
  }

  findElements(document, selectors) {
    const foundElements = [];
    
    selectors.forEach(selector => {
      try {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          if (!foundElements.includes(el)) {
            foundElements.push(el);
          }
        });
      } catch (error) {
        // Ungültiger Selektor ignorieren
      }
    });
    
    return foundElements;
  }

  generateSelectorsForElement(element) {
    if (!element || !element.tagName) return '';
    
    const selectors = [];
    
    // ID Selektor
    if (element.id) {
      selectors.push(`#${element.id}`);
    }
    
    // Class Selektoren
    if (element.className && typeof element.className === 'string') {
      const classes = element.className.split(' ').filter(c => c.trim());
      if (classes.length > 0) {
        selectors.push(`.${classes[0]}`);
        if (classes.length > 1) {
          selectors.push(`.${classes.join('.')}`);
        }
      }
    }
    
    // Aria-label Selektor
    if (element.getAttribute && element.getAttribute('aria-label')) {
      const ariaLabel = element.getAttribute('aria-label');
      selectors.push(`[aria-label="${ariaLabel}"]`);
    }
    
    // Tag + class Kombination
    if (element.tagName && element.className) {
      const firstClass = element.className.split(' ')[0];
      if (firstClass) {
        selectors.push(`${element.tagName.toLowerCase()}.${firstClass}`);
      }
    }
    
    return selectors[0] || element.tagName.toLowerCase();
  }

  extractSelectors(document, sourceFile) {
    // Speichere alle einzigartigen Selektoren für spätere Optimierung
    const elements = document.querySelectorAll('*[id], *[class], *[aria-label]');
    
    elements.forEach(element => {
      const selector = this.generateSelectorsForElement(element);
      if (selector && !this.results.selectors[selector]) {
        this.results.selectors[selector] = {
          source: sourceFile,
          attributes: this.getElementAttributes(element)
        };
      }
    });
  }

  getElementAttributes(element) {
    const attrs = {};
    if (element.attributes) {
      for (let attr of element.attributes) {
        attrs[attr.name] = attr.value;
      }
    }
    return attrs;
  }

  generateOptimizedSelectors() {
    const optimized = {};
    
    Object.entries(this.results.features).forEach(([featureName, sources]) => {
      if (sources.length > 0) {
        // Nimm den besten Selektor (meistens der erste)
        const bestSource = sources[0];
        if (bestSource.elements && bestSource.elements.length > 0) {
          optimized[featureName] = bestSource.elements[0];
        }
      }
    });
    
    return optimized;
  }

  generateStats() {
    const totalSources = Object.keys(this.results.features).length;
    const totalFeatures = Object.keys(this.results.features).filter(
      feature => this.results.features[feature].length > 0
    ).length;
    
    return {
      totalElements: Object.keys(this.results.selectors).length,
      totalFeatures: totalFeatures,
      featuresFound: totalFeatures,
      sources: totalSources
    };
  }

  analyze(targetDir) {
    logger.info('🚀 Bulk DOM-Analyzer gestartet...\n');

    try {
      // 1. Lade auto-collected DOM-Dateien
      const sources = this.loadAutoCollectedFiles(targetDir);
      
      if (Object.keys(sources).length === 0) {
        throw new Error('Keine DOM-Dateien gefunden!');
      }

      // 2. Analysiere jeden Source
      Object.entries(sources).forEach(([sourceFile, htmlContent]) => {
        if (htmlContent && htmlContent.trim()) {
          this.parseHTML(htmlContent, sourceFile);
        }
      });

      // 3. Generiere optimierte Selektoren
      const optimizedSelectors = this.generateOptimizedSelectors();
      
      // 4. Generiere Statistiken
      const stats = this.generateStats();

      // 5. Erstelle vollständiges Ergebnis
      const finalResults = {
        meta: {
          generatedAt: new Date().toISOString(),
          script: 'bulk-dom-analyzer.js',
          stats
        },
        optimizedSelectors,
        detailedFeatures: this.results.features,
        rawStats: stats
      };

      // 6. Speichere Ergebnisse
      const outputPath = path.join(__dirname, '../output/bulk-analysis-results.json');
      fs.writeFileSync(outputPath, JSON.stringify(finalResults, null, 2));

      logger.info('\n📊 BULK-ANALYSE ABGESCHLOSSEN!');
      logger.info(`📁 Output: ${outputPath}`);
      logger.info(`📈 Features gefunden: ${stats.totalFeatures}`);
      logger.info(`📄 Dateien analysiert: ${Object.keys(sources).length}`);
      
      // Features Übersicht
      logger.info('\n🎯 GEFUNDENE FEATURES:');
      Object.entries(this.results.features).forEach(([feature, sources]) => {
        if (sources.length > 0) {
          const totalElements = sources.reduce((sum, source) => sum + source.count, 0);
          logger.info(`  ✅ ${feature}: ${totalElements} Elemente`);
        }
      });

      return finalResults;

    } catch (error) {
      console.error('❌ Bulk-Analyse fehlgeschlagen:', error.message);
      throw error;
    }
  }
}

if (require.main === module) {
  const analyzer = new BulkDOMAnalyzer();
  
  // Verwende Argument falls gegeben, sonst default
  const targetDir = process.argv[2];
  analyzer.analyze(targetDir);
}

module.exports = BulkDOMAnalyzer; 