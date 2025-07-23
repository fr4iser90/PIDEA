const Logger = require('@logging/Logger');

const logger = new Logger('ServiceName');
#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

class ModalAnalyzer {
  constructor() {
    this.modalPatterns = {
      // Common modal selectors
      dialog: [
        '[role="dialog"]',
        '.monaco-dialog',
        '.modal-dialog',
        '.dialog-modal',
        '.modal',
        '.overlay',
        '.popup',
        '.modal-overlay'
      ],
      
      // Modal content
      content: [
        '.modal-content',
        '.dialog-content',
        '.monaco-dialog-content',
        '[role="document"]',
        '.modal-body'
      ],
      
      // Modal buttons
      buttons: [
        '.modal-footer button',
        '.dialog-footer button',
        '.monaco-dialog button',
        '[role="dialog"] button',
        '.modal button',
        'button[aria-label*="OK"]',
        'button[aria-label*="Cancel"]',
        'button[aria-label*="Close"]',
        'button[aria-label*="Yes"]',
        'button[aria-label*="No"]'
      ],
      
      // Modal headers
      headers: [
        '.modal-header',
        '.dialog-header',
        '.monaco-dialog-header',
        '[role="dialog"] h1',
        '[role="dialog"] h2',
        '[role="dialog"] h3'
      ],
      
      // Close buttons
      closeButtons: [
        '.modal-close',
        '.dialog-close',
        '.monaco-dialog-close',
        'button[aria-label*="Close"]',
        'button[aria-label*="Cancel"]',
        '.close-button',
        '[aria-label*="Close"]'
      ]
    };
  }

  async analyzeModals(htmlContent, sourceFile) {
    try {
      const dom = new JSDOM(htmlContent);
      const document = dom.window.document;
      
      logger.info(`🔍 Analyzing modals in ${sourceFile}...`);
      
      const modalAnalysis = {
        modals: [],
        totalModals: 0,
        modalTypes: {},
        accessibility: {
          hasRoleDialog: false,
          hasAriaLabel: false,
          hasCloseButton: false
        },
        recommendations: []
      };

      // Find all potential modals
      for (const [type, selectors] of Object.entries(this.modalPatterns)) {
        for (const selector of selectors) {
          const elements = document.querySelectorAll(selector);
          
          elements.forEach((element, index) => {
            const modalInfo = this.analyzeModalElement(element, type, index);
            if (modalInfo) {
              modalAnalysis.modals.push(modalInfo);
              modalAnalysis.totalModals++;
              
              // Track modal types
              if (!modalAnalysis.modalTypes[type]) {
                modalAnalysis.modalTypes[type] = 0;
              }
              modalAnalysis.modalTypes[type]++;
            }
          });
        }
      }

      // Analyze accessibility
      modalAnalysis.accessibility = this.analyzeAccessibility(document);
      
      // Generate recommendations
      modalAnalysis.recommendations = this.generateRecommendations(modalAnalysis);

      return modalAnalysis;

    } catch (error) {
      console.error(`❌ Modal analysis failed for ${sourceFile}:`, error.message);
      return {
        modals: [],
        totalModals: 0,
        modalTypes: {},
        accessibility: {},
        recommendations: [],
        error: error.message
      };
    }
  }

  analyzeModalElement(element, type, index) {
    try {
      const tagName = element.tagName.toLowerCase();
      const className = element.className || '';
      const id = element.id || '';
      const role = element.getAttribute('role') || '';
      const ariaLabel = element.getAttribute('aria-label') || '';
      const ariaLabelledBy = element.getAttribute('aria-labelledby') || '';
      const ariaDescribedBy = element.getAttribute('aria-describedby') || '';
      
      // Get text content (first 100 chars)
      const textContent = element.textContent?.trim().substring(0, 100) || '';
      
      // Check for buttons
      const buttons = element.querySelectorAll('button');
      const buttonTexts = Array.from(buttons).map(btn => btn.textContent?.trim() || btn.getAttribute('aria-label') || '').filter(Boolean);
      
      // Check for close functionality
      const hasCloseButton = this.hasCloseButton(element);
      const hasEscapeKey = this.hasEscapeKeyHandler(element);
      
      // Check visibility
      const isVisible = this.isElementVisible(element);
      
      return {
        type,
        index,
        tagName,
        className,
        id,
        role,
        ariaLabel,
        ariaLabelledBy,
        ariaDescribedBy,
        textContent,
        buttonTexts,
        hasCloseButton,
        hasEscapeKey,
        isVisible,
        selector: this.generateSelector(element),
        accessibility: {
          hasRole: !!role,
          hasAriaLabel: !!ariaLabel,
          hasAriaLabelledBy: !!ariaLabelledBy,
          hasAriaDescribedBy: !!ariaDescribedBy
        }
      };

    } catch (error) {
      console.error(`❌ Error analyzing modal element:`, error.message);
      return null;
    }
  }

  hasCloseButton(element) {
    const closeSelectors = [
      'button[aria-label*="Close"]',
      'button[aria-label*="Cancel"]',
      '.close-button',
      '.modal-close',
      '.dialog-close',
      '[aria-label*="Close"]'
    ];
    
    return closeSelectors.some(selector => element.querySelector(selector));
  }

  hasEscapeKeyHandler(element) {
    // Check for onkeydown or similar event handlers
    const hasKeyHandler = element.onkeydown || 
                         element.getAttribute('onkeydown') ||
                         element.querySelector('[onkeydown]');
    
    return !!hasKeyHandler;
  }

  isElementVisible(element) {
    const style = element.style;
    const computedStyle = window.getComputedStyle(element);
    
    return style.display !== 'none' && 
           computedStyle.display !== 'none' &&
           style.visibility !== 'hidden' &&
           computedStyle.visibility !== 'hidden' &&
           element.offsetWidth > 0 &&
           element.offsetHeight > 0;
  }

  generateSelector(element) {
    if (element.id) {
      return `#${element.id}`;
    }
    
    if (element.className) {
      const classes = element.className.split(' ').filter(c => c.trim());
      if (classes.length > 0) {
        return `.${classes[0]}`;
      }
    }
    
    return element.tagName.toLowerCase();
  }

  analyzeAccessibility(document) {
    const dialogs = document.querySelectorAll('[role="dialog"]');
    const modals = document.querySelectorAll('.modal, .modal-dialog, .monaco-dialog');
    
    return {
      hasRoleDialog: dialogs.length > 0,
      hasAriaLabel: Array.from(dialogs).some(d => d.getAttribute('aria-label')),
      hasCloseButton: Array.from(modals).some(m => this.hasCloseButton(m)),
      totalDialogs: dialogs.length,
      totalModals: modals.length
    };
  }

  generateRecommendations(analysis) {
    const recommendations = [];
    
    if (analysis.totalModals === 0) {
      recommendations.push('No modals detected - consider adding modal functionality for better UX');
    }
    
    if (!analysis.accessibility.hasRoleDialog) {
      recommendations.push('Add role="dialog" to modal elements for better accessibility');
    }
    
    if (!analysis.accessibility.hasAriaLabel) {
      recommendations.push('Add aria-label attributes to modal elements for screen readers');
    }
    
    if (!analysis.accessibility.hasCloseButton) {
      recommendations.push('Ensure all modals have close buttons for better UX');
    }
    
    if (analysis.modals.length > 5) {
      recommendations.push('Consider consolidating multiple modals to reduce complexity');
    }
    
    return recommendations;
  }

  async saveAnalysis(analysis, outputPath) {
    try {
      const analysisFile = path.join(outputPath, 'modal-analysis.json');
      fs.writeFileSync(analysisFile, JSON.stringify(analysis, null, 2));
      
      const summaryFile = path.join(outputPath, 'modal-analysis-summary.md');
      const summary = this.generateSummary(analysis);
      fs.writeFileSync(summaryFile, summary);
      
      logger.info(`📄 Modal analysis saved: ${analysisFile}`);
      logger.info(`📄 Summary saved: ${summaryFile}`);
      
      return { analysisFile, summaryFile };
      
    } catch (error) {
      console.error('❌ Failed to save modal analysis:', error.message);
      throw error;
    }
  }

  generateSummary(analysis) {
    const { totalModals, modalTypes, accessibility, recommendations } = analysis;
    
    return `# Modal Analysis Summary

## Overview
- **Total Modals Found**: ${totalModals}
- **Modal Types**: ${Object.keys(modalTypes).length}

## Modal Types Breakdown
${Object.entries(modalTypes).map(([type, count]) => `- **${type}**: ${count}`).join('\n')}

## Accessibility Analysis
- **Has Role Dialog**: ${accessibility.hasRoleDialog ? '✅ Yes' : '❌ No'}
- **Has Aria Label**: ${accessibility.hasAriaLabel ? '✅ Yes' : '❌ No'}
- **Has Close Button**: ${accessibility.hasCloseButton ? '✅ Yes' : '❌ No'}
- **Total Dialogs**: ${accessibility.totalDialogs}
- **Total Modals**: ${accessibility.totalModals}

## Recommendations
${recommendations.map(rec => `- ${rec}`).join('\n')}

## Detailed Modal Information
${analysis.modals.map((modal, index) => `
### Modal ${index + 1} (${modal.type})
- **Tag**: ${modal.tagName}
- **Class**: ${modal.className}
- **ID**: ${modal.id || 'None'}
- **Role**: ${modal.role || 'None'}
- **Aria Label**: ${modal.ariaLabel || 'None'}
- **Buttons**: ${modal.buttonTexts.join(', ') || 'None'}
- **Has Close Button**: ${modal.hasCloseButton ? '✅ Yes' : '❌ No'}
- **Is Visible**: ${modal.isVisible ? '✅ Yes' : '❌ No'}
- **Selector**: ${modal.selector}
`).join('')}

## Next Steps
1. Review accessibility recommendations
2. Test modal functionality
3. Ensure proper keyboard navigation
4. Validate screen reader compatibility
`;
  }
}

module.exports = ModalAnalyzer; 