const Logger = require('@logging/Logger');
const logger = new Logger('Logger');

class TerminalContentExtractor {
  constructor() {}

  async extractTerminalContent(page) {
    // Simplified terminal content extraction - focus on practical methods
    let terminalText = '';
    
    // Method 1: Try terminal container with specific selectors (most reliable)
    const selectors = [
      '.terminal-wrapper',
      '.terminal-container', 
      '.terminal-panel',
      '.terminal-viewport',
      '.terminal-content'
    ];
    
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        const elementText = element.innerText || element.textContent || '';
        if (elementText.trim() && !elementText.includes('.xterm-') && elementText.length > 10) {
          terminalText = elementText;
          logger.log('Found text in', selector);
          break;
        }
      }
    }
    
    // Method 2: Try view-line elements (if they contain real text)
    if (!terminalText.trim()) {
      const viewLines = document.querySelectorAll('.view-line');
      if (viewLines.length > 0) {
        viewLines.forEach(line => {
          const lineText = line.innerText || line.textContent || '';
          if (lineText.trim() && !lineText.includes('.xterm-') && lineText.length > 2) {
            terminalText += lineText + '\n';
          }
        });
        if (terminalText.trim()) {
          logger.log('Found text in view-lines');
        }
      }
    }
    
    // Method 3: Try terminal tabs (if using tabbed terminal)
    if (!terminalText.trim()) {
      const terminalTabs = document.querySelectorAll('.terminal-tab, .tab-content');
      terminalTabs.forEach(tab => {
        const tabText = tab.innerText || tab.textContent || '';
        if (tabText.trim() && !tabText.includes('.xterm-') && tabText.length > 10) {
          terminalText += tabText + '\n';
        }
      });
      if (terminalText.trim()) {
        logger.log('Found text in terminal tabs');
      }
    }
    
    // Method 4: Last resort - try to get any text from terminal area
    if (!terminalText.trim()) {
      const terminalArea = document.querySelector('.terminal, .xterm, .xterm-screen');
      if (terminalArea) {
        const areaText = terminalArea.innerText || terminalArea.textContent || '';
        if (areaText.trim() && !areaText.includes('.xterm-') && areaText.length > 10) {
          terminalText = areaText;
          logger.log('Found text in terminal area');
        }
      }
    }
    
    return terminalText.trim();
  }
}

module.exports = TerminalContentExtractor;
