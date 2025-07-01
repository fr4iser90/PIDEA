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
  }

  // Lade alle DOM-Source Dateien
  loadDOMSources() {
    const docsPath = path.join(__dirname, '../docs/ides/cursor');
    const sourceFiles = fs.readdirSync(docsPath)
      .filter(file => file.endsWith('-dom-source.md'));
    
    console.log(`📁 Gefundene DOM-Source Dateien: ${sourceFiles.length}`);
    
    const sources = {};
    sourceFiles.forEach(file => {
      const content = fs.readFileSync(path.join(docsPath, file), 'utf8');
      const htmlContent = this.extractHTML(content);
      sources[file] = htmlContent;
      console.log(`📄 ${file}: ${htmlContent.length} Zeichen HTML`);
    });
    
    return sources;
  }

  // Extrahiere HTML aus Markdown
  extractHTML(content) {
    // Falls es reines HTML ist, return as-is
    if (content.startsWith('<')) {
      return content;
    }
    
    // Falls es in ```html blocks ist
    const htmlBlocks = content.match(/```html([\s\S]*?)```/g);
    if (htmlBlocks) {
      return htmlBlocks.map(block => 
        block.replace(/```html\n?/, '').replace(/\n?```/, '')
      ).join('\n');
    }
    
    // Falls es in ``` blocks ohne html ist
    const codeBlocks = content.match(/```([\s\S]*?)```/g);
    if (codeBlocks) {
      return codeBlocks.map(block => 
        block.replace(/```\n?/, '').replace(/\n?```/, '')
      ).join('\n');
    }
    
    return content;
  }

  // Parse HTML mit jsdom
  parseHTML(htmlContent, sourceFile) {
    try {
      const dom = new JSDOM(htmlContent);
      const document = dom.window.document;
      
      console.log(`🔍 Analyzing ${sourceFile}...`);
      
      // Alle Elemente finden
      const allElements = document.querySelectorAll('*');
      console.log(`  └─ ${allElements.length} DOM-Elemente gefunden`);
      
      // Features extrahieren
      this.extractFeatures(document, sourceFile);
      
      // Selektoren extrahieren
      this.extractSelectors(document, sourceFile);
      
      return true;
    } catch (error) {
      console.error(`❌ Fehler beim Parsen von ${sourceFile}:`, error.message);
      return false;
    }
  }

  // Extrahiere Chat-Features
  extractFeatures(document, sourceFile) {
    const features = {
      // Chat Actions
      newChat: this.findElements(document, [
        '[aria-label*="New Chat"]',
        '.codicon-add-two',
        '[aria-label*="Ctrl+N"]'
      ]),
      
      chatHistory: this.findElements(document, [
        '[aria-label*="Chat History"]',
        '.codicon-history-two',
        '[aria-label*="Ctrl+Alt"]'
      ]),
      
      // Chat Input/Output
      chatInput: this.findElements(document, [
        '.aislash-editor-input[contenteditable="true"]',
        '[data-lexical-editor="true"][contenteditable="true"]'
      ]),
      
      userMessages: this.findElements(document, [
        '.aislash-editor-input-readonly[contenteditable="false"]',
        '.composer-human-message'
      ]),
      
      aiMessages: this.findElements(document, [
        '.anysphere-markdown-container-root',
        'span.anysphere-markdown-container-root'
      ]),
      
      // Chat UI Elements
      chatTabs: this.findElements(document, [
        '.composite-bar-action-tab',
        '.action-item.composite-bar-action-tab'
      ]),
      
      sendButton: this.findElements(document, [
        '[aria-label*="Send"]',
        '.chat-send-button',
        '.send-message-button'
      ]),
      
      // Settings & More
      settings: this.findElements(document, [
        '.codicon-settings-gear',
        '[aria-label*="Settings"]'
      ]),
      
      moreActions: this.findElements(document, [
        '.codicon-ellipsis-two',
        '[aria-label*="More Actions"]'
      ]),
      
      // Background Agents
      backgroundAgents: this.findElements(document, [
        '.codicon-cloud-two',
        '[aria-label*="Background Agents"]'
      ])
    };
    
    // Results sammeln
    Object.entries(features).forEach(([featureName, elements]) => {
      if (elements.length > 0) {
        if (!this.results.features[featureName]) {
          this.results.features[featureName] = [];
        }
        this.results.features[featureName].push({
          source: sourceFile,
          count: elements.length,
          elements: elements.map(el => this.elementToSelector(el))
        });
        console.log(`  ✅ ${featureName}: ${elements.length} Elemente`);
      }
    });
  }

  // Finde Elemente anhand von Selektoren
  findElements(document, selectors) {
    const found = [];
    selectors.forEach(selector => {
      try {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          if (!found.includes(el)) {
            found.push(el);
          }
        });
      } catch (e) {
        // Ignoriere ungültige Selektoren
      }
    });
    return found;
  }

  // Extrahiere alle möglichen Selektoren
  extractSelectors(document, sourceFile) {
    const allElements = document.querySelectorAll('*');
    
    allElements.forEach(element => {
      const selectors = this.generateSelectorsForElement(element);
      
      if (selectors.length > 0) {
        this.results.elements.push({
          source: sourceFile,
          tagName: element.tagName,
          selectors: selectors,
          attributes: this.getElementAttributes(element)
        });
      }
    });
  }

  // Generiere mögliche Selektoren für ein Element
  generateSelectorsForElement(element) {
    const selectors = [];
    
    // ID Selector
    if (element.id) {
      selectors.push(`#${element.id}`);
    }
    
    // Class Selectors
    if (element.className) {
      const classString = element.className.toString ? element.className.toString() : element.className;
      const classes = classString.split(' ').filter(c => c.trim());
      if (classes.length > 0) {
        selectors.push(`.${classes.join('.')}`);
        // Auch einzelne Klassen
        classes.forEach(cls => {
          if (cls.trim()) {
            selectors.push(`.${cls.trim()}`);
          }
        });
      }
    }
    
    // Attribute Selectors
    const attributes = this.getElementAttributes(element);
    Object.entries(attributes).forEach(([key, value]) => {
      if (key === 'aria-label' && value) {
        selectors.push(`[aria-label="${value}"]`);
        selectors.push(`[aria-label*="${value.split(' ')[0]}"]`);
      }
      if (key === 'role' && value) {
        selectors.push(`[role="${value}"]`);
      }
      if (key === 'contenteditable' && value) {
        selectors.push(`[contenteditable="${value}"]`);
      }
      if (key.startsWith('data-') && value) {
        selectors.push(`[${key}="${value}"]`);
      }
    });
    
    // Tag + Class Kombinationen
    if (element.className) {
      const classString = element.className.toString ? element.className.toString() : element.className;
      const classes = classString.split(' ').filter(c => c.trim());
      if (classes.length > 0) {
        selectors.push(`${element.tagName.toLowerCase()}.${classes[0]}`);
      }
    }
    
    return selectors;
  }

  // Element zu bestem Selektor
  elementToSelector(element) {
    const selectors = this.generateSelectorsForElement(element);
    
    // Priorität: ID > aria-label > class > tag
    const prioritized = selectors.sort((a, b) => {
      if (a.startsWith('#')) return -1;
      if (b.startsWith('#')) return 1;
      if (a.includes('aria-label')) return -1;
      if (b.includes('aria-label')) return 1;
      if (a.startsWith('.')) return -1;
      if (b.startsWith('.')) return 1;
      return 0;
    });
    
    return prioritized[0] || element.tagName.toLowerCase();
  }

  // Hole alle Attribute eines Elements
  getElementAttributes(element) {
    const attrs = {};
    for (let i = 0; i < element.attributes.length; i++) {
      const attr = element.attributes[i];
      attrs[attr.name] = attr.value;
    }
    return attrs;
  }

  // Generiere optimierte Selektoren
  generateOptimizedSelectors() {
    const optimized = {};
    
    // Features zu optimierten Selektoren
    Object.entries(this.results.features).forEach(([featureName, sources]) => {
      const allSelectors = [];
      sources.forEach(source => {
        allSelectors.push(...source.elements);
      });
      
      // Finde den besten Selektor (kürzester, der eindeutig ist)
      const best = allSelectors.sort((a, b) => a.length - b.length)[0];
      optimized[featureName] = best || null;
    });
    
    return optimized;
  }

  // Generiere Statistiken
  generateStats() {
    return {
      totalElements: this.results.elements.length,
      totalFeatures: Object.keys(this.results.features).length,
      featuresFound: Object.values(this.results.features).filter(f => f.length > 0).length,
      sources: Object.keys(this.results.features).length
    };
  }

  // Schreibe Ergebnisse in Datei
  writeResults(outputPath) {
    const optimizedSelectors = this.generateOptimizedSelectors();
    const stats = this.generateStats();
    
    const output = {
      meta: {
        generatedAt: new Date().toISOString(),
        script: 'dom-analyzer.js',
        stats: stats
      },
      optimizedSelectors: optimizedSelectors,
      detailedFeatures: this.results.features,
      allElements: this.results.elements.slice(0, 100), // Begrenzt für Lesbarkeit
      rawStats: stats
    };
    
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
    console.log(`\n📊 ANALYSE ABGESCHLOSSEN!`);
    console.log(`📁 Output: ${outputPath}`);
    console.log(`📈 Stats: ${stats.totalElements} Elemente, ${stats.featuresFound} Features`);
    
    return output;
  }

  // Hauptanalysemethode
  analyze() {
    console.log('🚀 DOM-Analyzer gestartet...\n');
    
    // 1. Lade DOM-Sources
    const sources = this.loadDOMSources();
    
    // 2. Parse jede Source
    Object.entries(sources).forEach(([sourceFile, htmlContent]) => {
      this.parseHTML(htmlContent, sourceFile);
    });
    
    // 3. Schreibe Ergebnisse
    const outputPath = path.join(__dirname, '../output/dom-analysis-results.json');
    
    // Erstelle output directory falls es nicht existiert
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    return this.writeResults(outputPath);
  }
}

// Hauptausführung
if (require.main === module) {
  const analyzer = new DOMAnalyzer();
  
  try {
    analyzer.analyze();
  } catch (error) {
    console.error('❌ FEHLER:', error.message);
    process.exit(1);
  }
}

module.exports = DOMAnalyzer; 