/**
 * DOMCodeBlockDetector - Dedicated service for DOM-based code block detection
 * Handles extraction of code blocks from IDE DOM elements (Monaco editor, etc.)
 */
class DOMCodeBlockDetector {
  constructor(selectors) {
    this.selectors = selectors;
    this.logger = console; // Simple logger
  }

  /**
   * Detect code blocks from DOM elements
   * @param {Object} page - Playwright page object
   * @returns {Promise<Array>} Array of detected code blocks
   */
  async detectCodeBlocks(page) {
    try {
      this.logger.info('🔍 [DOMCodeBlockDetector] Starting code block detection');
      
      const selectors = this.selectors;
      
      return await page.evaluate((selectors) => {
        // Helper functions that work inside page.evaluate
        const detectLanguageFromElement = (languageElement, filenameElement) => {
          if (languageElement) {
            const classList = languageElement.className;
            if (classList.includes('javascript-lang-file-icon')) return 'javascript';
            if (classList.includes('typescript-lang-file-icon')) return 'typescript';
            if (classList.includes('python-lang-file-icon')) return 'python';
            if (classList.includes('java-lang-file-icon')) return 'java';
            if (classList.includes('cpp-lang-file-icon')) return 'cpp';
            if (classList.includes('csharp-lang-file-icon')) return 'csharp';
            if (classList.includes('php-lang-file-icon')) return 'php';
            if (classList.includes('ruby-lang-file-icon')) return 'ruby';
            if (classList.includes('go-lang-file-icon')) return 'go';
            if (classList.includes('rust-lang-file-icon')) return 'rust';
          }
          
          if (filenameElement) {
            const filename = filenameElement.textContent.toLowerCase();
            const extensionMap = {
              '.js': 'javascript',
              '.jsx': 'javascript',
              '.ts': 'typescript',
              '.tsx': 'typescript',
              '.py': 'python',
              '.java': 'java',
              '.cpp': 'cpp',
              '.c': 'c',
              '.cs': 'csharp',
              '.php': 'php',
              '.rb': 'ruby',
              '.go': 'go',
              '.rs': 'rust',
              '.html': 'html',
              '.css': 'css',
              '.scss': 'scss',
              '.json': 'json',
              '.xml': 'xml',
              '.sql': 'sql',
              '.md': 'markdown'
            };
            
            for (const [ext, lang] of Object.entries(extensionMap)) {
              if (filename.includes(ext)) return lang;
            }
          }
          
          return 'text';
        };

        const calculateConfidence = (container, selectors) => {
          let confidence = 0.5; // Base confidence
          
          // Check for Monaco editor (high confidence)
          if (container.querySelector(selectors.monacoEditor)) confidence += 0.3;
          
          // Check for syntax highlighting (medium confidence)
          if (container.querySelector(selectors.syntaxTokens)) confidence += 0.2;
          
          // Check for filename (low confidence)
          if (container.querySelector(selectors.codeBlockFilename)) confidence += 0.1;
          
          // Check for language indicator (medium confidence)
          if (container.querySelector(selectors.codeBlockLanguage)) confidence += 0.15;
          
          return Math.min(confidence, 1.0);
        };

        const validateSyntax = (codeText, language) => {
          // Basic syntax validation patterns
          const patterns = {
            javascript: {
              valid: /^[\s\S]*$/,
              hasErrors: /(SyntaxError|ReferenceError|TypeError|console\.error)/i,
              hasConsole: /console\.(log|warn|error|info)/i
            },
            typescript: {
              valid: /^[\s\S]*$/,
              hasErrors: /(TS\d+|Type.*error|interface|type\s+\w+)/i,
              hasTypes: /(:\s*\w+|interface|type\s+\w+)/i
            },
            python: {
              valid: /^[\s\S]*$/,
              hasErrors: /(SyntaxError|IndentationError|NameError|print\()/i,
              hasPrint: /print\s*\(/i
            },
            java: {
              valid: /^[\s\S]*$/,
              hasErrors: /(public\s+class|import\s+java|System\.out)/i,
              hasMain: /public\s+static\s+void\s+main/i
            }
          };
          
          const pattern = patterns[language] || patterns.javascript;
          return {
            isValid: pattern.valid.test(codeText),
            hasErrors: pattern.hasErrors.test(codeText),
            hasLanguageFeatures: pattern.hasConsole || pattern.hasTypes || pattern.hasPrint || pattern.hasMain,
            confidence: 0.8,
            language: language
          };
        };

        const codeBlocks = [];
        const containers = document.querySelectorAll(selectors.codeBlocks);
        
        // Log found containers
        const containerCount = containers.length;
        
        containers.forEach((container, index) => {
          const content = container.querySelector(selectors.codeBlockContent);
          const header = container.querySelector(selectors.codeBlockHeader);
          const filename = container.querySelector(selectors.codeBlockFilename);
          const language = container.querySelector(selectors.codeBlockLanguage);
          const editor = container.querySelector(selectors.monacoEditor);
          
          // Initialize variables
          let codeLines = null;
          let codeText = '';
          
          // Debug info (will be logged by the outer function)
          const debugInfo = {
            index: index + 1,
            hasContent: !!content,
            hasHeader: !!header,
            hasFilename: !!filename,
            hasLanguage: !!language,
            hasEditor: !!editor,
            codeLinesFound: 0,
            codeTextLength: 0
          };
          
          if (content && editor) {
            // Try multiple selectors for code lines
            let codeLines = editor.querySelectorAll(selectors.codeLines);
            
            // If no lines found, try alternative selectors
            if (codeLines.length === 0) {
              codeLines = editor.querySelectorAll('.view-line');
            }
            if (codeLines.length === 0) {
              codeLines = editor.querySelectorAll('.monaco-editor .view-line');
            }
            if (codeLines.length === 0) {
              codeLines = editor.querySelectorAll('span[class*="mtk"]');
            }
            
            // If still no lines, use the editor content directly
            let codeText;
            if (codeLines.length > 0) {
              // Join tokens and clean up whitespace
              codeText = Array.from(codeLines)
                .map(line => line.textContent || '')
                .join('')
                .replace(/\s+/g, ' ')
                .trim();
              
              // Remove duplicates (common issue with Monaco editor)
              codeText = codeText.replace(/(.+?)\1+/g, '$1');
            } else {
              codeText = (editor.textContent || editor.innerText || '').trim();
            }
            
            // Detect language from DOM elements
            const detectedLanguage = detectLanguageFromElement(language, filename);
            
            // Calculate confidence score
            const confidence = calculateConfidence(container, selectors);
            
            // Validate syntax
            const syntax = validateSyntax(codeText, detectedLanguage);
            
            // Update debug info
            debugInfo.codeLinesFound = codeLines ? codeLines.length : 0;
            debugInfo.codeTextLength = codeText.length;
            
            codeBlocks.push({
              type: 'dom_code_block',
              language: detectedLanguage,
              content: codeText,
              filename: filename?.textContent || null,
              confidence: confidence,
              syntax: syntax,
              hasApplyButton: !!container.querySelector(selectors.codeBlockApplyButton) && 
                container.querySelector(selectors.codeBlockApplyButton).textContent.includes('Apply'),
              lineCount: codeLines ? codeLines.length : 0,
              characterCount: codeText.length,
              debugInfo: debugInfo
            });
          }
        });
        
        return codeBlocks;
      }, this.selectors);
      
      // Log the results
      this.logger.info(`🔍 [DOMCodeBlockDetector] Found ${codeBlocks.length} code blocks`);
      
      return codeBlocks;
    } catch (error) {
      this.logger.error('❌ [DOMCodeBlockDetector] Error detecting code blocks:', error.message);
      return [];
    }
  }

  /**
   * Extract code blocks from specific container
   * @param {Object} page - Playwright page object
   * @param {string} containerSelector - Specific container selector
   * @returns {Promise<Array>} Array of code blocks from container
   */
  async extractCodeBlocksFromContainer(page, containerSelector) {
    try {
      return await page.evaluate((selectors, containerSelector) => {
        const container = document.querySelector(containerSelector);
        if (!container) return [];
        
        const codeBlocks = [];
        const editors = container.querySelectorAll(selectors.monacoEditor);
        
        editors.forEach((editor, index) => {
          const codeLines = editor.querySelectorAll(selectors.codeLines);
          const codeText = Array.from(codeLines)
            .map(line => line.textContent || '')
            .join('\n')
            .trim();
          
          if (codeText) {
            codeBlocks.push({
              type: 'container_code_block',
              language: 'text', // Will be detected later
              content: codeText,
              lineCount: codeLines.length,
              characterCount: codeText.length,
              containerIndex: index
            });
          }
        });
        
        return codeBlocks;
      }, this.selectors, containerSelector);
    } catch (error) {
      this.logger.error('❌ [DOMCodeBlockDetector] Error extracting from container:', error.message);
      return [];
    }
  }

  /**
   * Get code block statistics
   * @param {Array} codeBlocks - Array of code blocks
   * @returns {Object} Statistics about code blocks
   */
  getCodeBlockStats(codeBlocks) {
    const stats = {
      totalBlocks: codeBlocks.length,
      totalLines: 0,
      totalCharacters: 0,
      languages: {},
      averageConfidence: 0,
      hasApplyButtons: 0,
      hasErrors: 0
    };
    
    if (codeBlocks.length === 0) return stats;
    
    let totalConfidence = 0;
    
    codeBlocks.forEach(block => {
      stats.totalLines += block.lineCount || 0;
      stats.totalCharacters += block.characterCount || 0;
      totalConfidence += block.confidence || 0;
      
      if (block.hasApplyButton) stats.hasApplyButtons++;
      if (block.syntax?.hasErrors) stats.hasErrors++;
      
      const lang = block.language || 'unknown';
      stats.languages[lang] = (stats.languages[lang] || 0) + 1;
    });
    
    stats.averageConfidence = totalConfidence / codeBlocks.length;
    
    return stats;
  }
}

module.exports = DOMCodeBlockDetector; 