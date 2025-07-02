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
    const allFiles = fs.readdirSync(docsPath)
      .filter(file => file.endsWith('-dom-source.md'));
    
    // Priorisiere all-cursor-dom-source.md 
    const completeFile = allFiles.find(file => file.startsWith('all-'));
    
    let sourceFiles;
    if (completeFile) {
      sourceFiles = [completeFile];
      console.log(`📁 Verwende komplette DOM-Source: ${completeFile}`);
    } else {
      // Fallback zu individuellen Dateien falls all-* nicht existiert
      sourceFiles = allFiles.filter(file => !file.startsWith('all-'));
      console.log(`📁 Fallback zu individuellen Dateien: ${sourceFiles.length} gefunden`);
    }
    
    console.log(`📁 Analyse-Dateien: ${sourceFiles.length}`);
    
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
    // Falls es reines HTML ist, CSS-Style-Blöcke entfernen
    if (content.startsWith('<')) {
      return this.cleanHTML(content);
    }
    
    // Extrahiere nur HTML-Blöcke (keine CSS, JS, etc.)
    let htmlContent = '';
    
    // 1. Explizite ```html blocks
    const htmlBlocks = content.match(/```html([\s\S]*?)```/g);
    if (htmlBlocks) {
      htmlContent += htmlBlocks.map(block => 
        block.replace(/```html\n?/, '').replace(/\n?```/, '')
      ).join('\n');
    }
    
    // 2. Code-Blöcke ohne Label prüfen ob sie HTML enthalten
    const codeBlocks = content.match(/```\n([\s\S]*?)```/g);
    if (codeBlocks) {
      codeBlocks.forEach(block => {
        const blockContent = block.replace(/```\n?/, '').replace(/\n?```/, '');
        
        // Nur hinzufügen wenn es HTML-Tags enthält und KEINE CSS-Variablen
        if (blockContent.includes('<') && 
            blockContent.includes('>') && 
            !blockContent.includes('--vscode-') &&
            !blockContent.includes(': #') &&
            !blockContent.includes('color:') &&
            !blockContent.includes('background:')) {
          htmlContent += blockContent + '\n';
        }
      });
    }
    
    // 3. HTML-Zeilen direkt im Text (ohne Code-Blöcke)
    const lines = content.split('\n');
    lines.forEach(line => {
      if (line.trim().startsWith('<') && 
          line.trim().includes('>') &&
          !line.includes('--vscode-') &&
          !line.includes(': #')) {
        htmlContent += line + '\n';
      }
    });
    
    return htmlContent;
  }

  // HTML von CSS-Style-Blöcken säubern
  cleanHTML(html) {
    if (!html || !html.includes('<')) return '';
    
    // Entferne alle <style>...</style> Blöcke komplett
    let cleaned = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
    
    // Entferne auch <script> Blöcke
    cleaned = cleaned.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    
    // Entferne leere Zeilen
    cleaned = cleaned.replace(/^\s*\n/gm, '');
    
    return cleaned.trim();
  }

  // Parse HTML mit jsdom
  parseHTML(htmlContent, sourceFile) {
    try {
      const dom = new JSDOM(htmlContent);
      const document = dom.window.document;
      
      console.log(`🔍 Analyzing ${sourceFile}...`);
      
      // Alle Elemente finden (ABER style/script/meta Tags ignorieren)
      const allElements = document.querySelectorAll('*:not(style):not(script):not(meta):not(link):not(title)');
      console.log(`  └─ ${allElements.length} DOM-Elemente gefunden`);
      
      // Features extrahieren
      this.extractFeatures(document, sourceFile);
      
      // Selektoren extrahieren (nur strukturelle Elemente)
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
      // === EXISTING CHAT FEATURES ===
      newChat: this.findElements(document, [
        '[aria-label*="New Chat"]',
        '[title*="New Chat"]',
        '.new-chat-button',
        '[data-testid*="new-chat"]'
      ]),
      
      chatHistory: this.findElements(document, [
        '[aria-label*="Chat History"]',
        '[aria-label*="Show Chat History"]',
        '.chat-history',
        '[data-testid*="chat-history"]'
      ]),
      
      chatInput: this.findElements(document, [
        '.aislash-editor-input',
        '[placeholder*="Ask"]',
        '[placeholder*="chat"]',
        '.chat-input',
        '[data-testid*="chat-input"]'
      ]),
      
      userMessages: this.findElements(document, [
        'div.composer-human-message',
        '.user-message',
        '.human-message',
        '.aislash-editor-input-readonly'
      ]),
      
      aiMessages: this.findElements(document, [
        'span.anysphere-markdown-container-root',
        '.ai-message',
        '.assistant-message',
        '.markdown-container'
      ]),
      
      chatTabs: this.findElements(document, [
        'li.action-item',
        '.chat-tab',
        '[aria-label*="Plan for"]',
        '[role="tab"]'
      ]),
      
      sendButton: this.findElements(document, [
        '[aria-label*="Send Message"]',
        '[aria-label*="Send"]',
        '.chat-send-button',
        '.send-message-button',
        'button[type="submit"]'
      ]),
      
      settings: this.findElements(document, [
        '[aria-label="Settings"]',
        '.settings-button',
        '[data-testid*="settings"]'
      ]),
      
      moreActions: this.findElements(document, [
        '[aria-label*="More Actions"]',
        '[aria-label*="Close, Export, Settings"]',
        'span.codicon',
        '.more-actions'
      ]),
      
      backgroundAgents: this.findElements(document, [
        '[aria-label*="Background Agents"]',
        '.background-agents',
        '[data-testid*="background"]'
      ]),

      // === EXPLORER & FILE TREE ===
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
      
      fileContextMenu: this.findElements(document, [
        '.monaco-menu',
        '.context-menu',
        '[role="menu"]'
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

      // === EDITOR ===
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
      
      tabCloseButton: this.findElements(document, [
        '.tab-close',
        '.codicon-close',
        '[aria-label*="Close"]'
      ]),
      
      splitEditor: this.findElements(document, [
        '[aria-label*="Split Editor"]',
        '.split-editor',
        '.editor-actions'
      ]),

      // === SEARCH & REPLACE ===
      globalSearch: this.findElements(document, [
        '.search-viewlet',
        '[id*="search"]',
        '.search-view'
      ]),
      
      searchInput: this.findElements(document, [
        '.search-input',
        '[placeholder*="Search"]',
        '.monaco-inputbox input'
      ]),
      
      replaceInput: this.findElements(document, [
        '.replace-input',
        '[placeholder*="Replace"]'
      ]),
      
      searchResults: this.findElements(document, [
        '.search-results',
        '.monaco-tree-row',
        '.search-result'
      ]),
      
      searchFilters: this.findElements(document, [
        '.search-actions',
        '.regex-button',
        '.case-sensitive-button',
        '.whole-word-button'
      ]),

      // === GIT SOURCE CONTROL ===
      gitSourceControl: this.findElements(document, [
        '.scm-viewlet',
        '[id*="scm"]',
        '.source-control-view'
      ]),
      
      gitChanges: this.findElements(document, [
        '.scm-resource',
        '.change-item',
        '.monaco-list-row'
      ]),
      
      gitStaging: this.findElements(document, [
        '.scm-changes-container',
        '.staged-changes',
        '.unstaged-changes'
      ]),
      
      commitInput: this.findElements(document, [
        '.scm-commit-input',
        '[placeholder*="Message"]',
        '.monaco-inputbox'
      ]),
      
      commitButton: this.findElements(document, [
        '.commit-button',
        '[aria-label*="Commit"]'
      ]),
      
      gitBranch: this.findElements(document, [
        '.git-branch',
        '.branch-status',
        '.statusbar-item[title*="branch"]'
      ]),

      // === EXTENSIONS ===
      extensionsPanel: this.findElements(document, [
        '.extensions-viewlet',
        '[id*="extensions"]',
        '.extensions-view'
      ]),
      
      extensionSearch: this.findElements(document, [
        '.extensions-search',
        '[placeholder*="Search Extensions"]'
      ]),
      
      installExtension: this.findElements(document, [
        '.install-button',
        '[aria-label*="Install"]'
      ]),

      // === TERMINAL ===
      terminal: this.findElements(document, [
        '.terminal-wrapper',
        '.xterm-screen',
        '.integrated-terminal'
      ]),
      
      newTerminal: this.findElements(document, [
        '[aria-label*="New Terminal"]',
        '.new-terminal-button'
      ]),
      
      terminalTabs: this.findElements(document, [
        '.terminal-tab',
        '.terminal-tabs-container'
      ]),
      
      terminalInput: this.findElements(document, [
        '.xterm-cursor-layer',
        '.terminal-input'
      ]),

      // === DEBUG & RUN ===
      debugPanel: this.findElements(document, [
        '.debug-viewlet',
        '[id*="debug"]',
        '.debug-view'
      ]),
      
      runButton: this.findElements(document, [
        '[aria-label*="Run"]',
        '.run-button',
        '.codicon-play'
      ]),
      
      debugButton: this.findElements(document, [
        '[aria-label*="Debug"]',
        '.debug-button',
        '.codicon-debug-alt'
      ]),
      
      breakpoints: this.findElements(document, [
        '.breakpoint',
        '.debug-breakpoint',
        '.glyph-margin-widgets'
      ]),

      // === COMMAND PALETTE & NAVIGATION ===
      commandPalette: this.findElements(document, [
        '.quick-input-widget',
        '.monaco-quick-input',
        '[placeholder*="Type a command"]'
      ]),
      
      quickOpen: this.findElements(document, [
        '.quick-input-widget',
        '[placeholder*="Go to File"]'
      ]),
      
      breadcrumbs: this.findElements(document, [
        '.breadcrumbs',
        '.breadcrumb-item'
      ]),

      // === STATUS BAR ===
      statusBar: this.findElements(document, [
        '.statusbar',
        '.monaco-workbench .part.statusbar'
      ]),
      
      languageSelector: this.findElements(document, [
        '.language-status',
        '[title*="Select Language Mode"]'
      ]),
      
      cursorPosition: this.findElements(document, [
        '.cursor-position',
        '[title*="Go to Line"]'
      ]),

      // === PANELS ===
      problemsPanel: this.findElements(document, [
        '.markers-panel',
        '.problems-panel'
      ]),
      
      outputPanel: this.findElements(document, [
        '.output-panel',
        '.output-view'
      ]),

      // === CURSOR AI FEATURES ===
      copilotSuggestions: this.findElements(document, [
        '.ghost-text',
        '.inline-suggestion',
        '.copilot-suggestion'
      ]),
      
      inlineChat: this.findElements(document, [
        '.inline-chat',
        '.chat-widget',
        '.interactive-session'
      ]),
      
      aiCodeActions: this.findElements(document, [
        '.code-action',
        '.lightbulb-glyph',
        '.monaco-editor .suggest-widget'
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
    // NUR strukturelle HTML-Elemente (keine style/script/meta Tags)
    const structuralElements = document.querySelectorAll('*:not(style):not(script):not(meta):not(link):not(title):not(head)');
    
    structuralElements.forEach(element => {
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
        // Vollständiges aria-label hat Priorität
        selectors.push(`[aria-label="${value}"]`);
        // Nur bei langen Labels auch Teilstring-Varianten
        if (value.length > 20) {
          const words = value.split(' ');
          if (words.length > 1) {
            selectors.push(`[aria-label*="${words[0]}"]`);
            selectors.push(`[aria-label*="${words.slice(0, 2).join(' ')}"]`);
          }
        }
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
    
    // Priorität: ID > spezifische aria-label > kombinierte Selektoren > class > tag
    const prioritized = selectors.sort((a, b) => {
      // IDs haben höchste Priorität
      if (a.startsWith('#')) return -1;
      if (b.startsWith('#')) return 1;
      
      // Vollständige aria-labels haben Priorität vor Teilstrings
      if (a.includes('aria-label="') && b.includes('aria-label*=')) return -1;
      if (b.includes('aria-label="') && a.includes('aria-label*=')) return 1;
      
      // Kombinierte Selektoren (tag + class) haben Priorität
      if (a.includes('.') && !a.startsWith('.') && b.startsWith('.')) return -1;
      if (b.includes('.') && !b.startsWith('.') && a.startsWith('.')) return 1;
      
      // Spezifische Klassen haben Priorität vor generischen
      if (a.startsWith('.') && b.startsWith('.')) {
        const aSpecific = a.includes('-') || a.includes('_');
        const bSpecific = b.includes('-') || b.includes('_');
        if (aSpecific && !bSpecific) return -1;
        if (bSpecific && !aSpecific) return 1;
      }
      
      // aria-label hat Priorität vor Klassen
      if (a.includes('aria-label') && !b.includes('aria-label')) return -1;
      if (b.includes('aria-label') && !a.includes('aria-label')) return 1;
      
      // Klassen haben Priorität vor Tags
      if (a.startsWith('.') && !b.startsWith('.')) return -1;
      if (b.startsWith('.') && !a.startsWith('.')) return 1;
      
      // Bei gleicher Priorität: längerer = spezifischer
      return b.length - a.length;
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

  async runAutomaticWorkflow() {
    try {
      // 1. Coverage Validation
      console.log('\n✅ [1/2] Coverage Validation...');
      const CoverageValidator = require('./coverage-validator');
      const validator = new CoverageValidator();
      await validator.validate();

      // 2. Selector Generation
      console.log('\n🔧 [2/2] Selector Generierung...');
      const SelectorGenerator = require('./selector-generator');
      const generator = new SelectorGenerator();
      await generator.generate();

      console.log('\n🎉 VOLLSTÄNDIGE DOM-ANALYSE ABGESCHLOSSEN!');
      console.log('📁 Alle Dateien generiert in: cursor-chat-agent/generated/');

    } catch (error) {
      console.error('❌ Automatischer Workflow fehlgeschlagen:', error.message);
      throw error;
    }
  }

  // Hauptanalysemethode
  async analyze() {
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
    
    const result = this.writeResults(outputPath);

    // 4. AUTOMATISCHER WORKFLOW WENN VOM npm script ausgeführt
    if (require.main === module) {
      await this.runAutomaticWorkflow();
    }

    return result;
  }
}

// Hauptausführung
if (require.main === module) {
  const analyzer = new DOMAnalyzer();
  
  async function run() {
    try {
      await analyzer.analyze();
    } catch (error) {
      console.error('❌ FEHLER:', error.message);
      process.exit(1);
    }
  }
  
  run();
}

module.exports = DOMAnalyzer; 