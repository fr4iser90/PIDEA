const fs = require('fs');
const path = require('path');

async function mergeAnalysisResults() {
  console.log('🔄 Merging VSCode analysis results...\n');

  try {
    const outputDir = path.join(__dirname, '../output');
    const generatedDir = path.join(__dirname, '../../generated');
    
    // Ensure generated directory exists
    if (!fs.existsSync(generatedDir)) {
      fs.mkdirSync(generatedDir, { recursive: true });
      console.log(`📁 Created generated directory: ${generatedDir}`);
    }

    // Load all analysis results
    const results = await loadAllResults(outputDir);
    
    if (Object.keys(results).length === 0) {
      throw new Error('No VSCode analysis results found to merge!');
    }

    // Merge and optimize selectors
    const mergedResults = mergeAndOptimize(results);
    
    // Generate final VSCode selectors
    const finalSelectors = generateFinalVSCodeSelectors(mergedResults);
    
    // Save merged results
    await saveMergedResults(mergedResults, finalSelectors, generatedDir);
    
    console.log('\n✅ VSCode analysis results merged successfully!');
    console.log(`📁 Generated files in: ${generatedDir}`);
    console.log(`🎯 Total VSCode features: ${Object.keys(finalSelectors).length}`);
    
    return { mergedResults, finalSelectors };

  } catch (error) {
    console.error('❌ VSCode merge failed:', error.message);
    throw error;
  }
}

async function loadAllResults(outputDir) {
  const results = {};
  
  // Expected VSCode analysis files
  const expectedFiles = [
    'dom-analysis-results.json',
    'bulk-analysis-results.json',
    'enhanced-vscode-chat-analysis.json',
    'coverage-validation-report.json'
  ];
  
  console.log('📁 Loading VSCode analysis files...');
  
  for (const filename of expectedFiles) {
    const filepath = path.join(outputDir, filename);
    
    if (fs.existsSync(filepath)) {
      try {
        const content = fs.readFileSync(filepath, 'utf8');
        const data = JSON.parse(content);
        results[filename] = data;
        console.log(`  ✅ ${filename}: ${Object.keys(data.optimizedSelectors || {}).length} selectors`);
      } catch (error) {
        console.warn(`  ⚠️ Failed to load ${filename}: ${error.message}`);
      }
    } else {
      console.log(`  ⚠️ ${filename}: Not found`);
    }
  }
  
  return results;
}

function mergeAndOptimize(results) {
  console.log('\n🔄 Merging and optimizing VSCode selectors...');
  
  const merged = {
    meta: {
      mergedAt: new Date().toISOString(),
      sources: Object.keys(results),
      totalFeatures: 0,
      conflicts: 0
    },
    selectors: {},
    conflicts: [],
    recommendations: []
  };
  
  // Collect all selectors from different sources
  const allSelectors = new Map();
  
  Object.entries(results).forEach(([source, data]) => {
    if (data.optimizedSelectors) {
      Object.entries(data.optimizedSelectors).forEach(([feature, selector]) => {
        if (!allSelectors.has(feature)) {
          allSelectors.set(feature, []);
        }
        allSelectors.get(feature).push({
          selector,
          source,
          priority: getSourcePriority(source)
        });
      });
    }
  });
  
  // Resolve conflicts and select best selectors
  allSelectors.forEach((selectors, feature) => {
    if (selectors.length === 1) {
      // No conflict
      merged.selectors[feature] = selectors[0].selector;
    } else {
      // Conflict - resolve by priority and specificity
      const resolved = resolveSelectorConflict(feature, selectors);
      merged.selectors[feature] = resolved.selector;
      
      if (resolved.conflict) {
        merged.conflicts.push({
          feature,
          candidates: selectors,
          resolved: resolved.selector,
          reason: resolved.reason
        });
        merged.meta.conflicts++;
      }
    }
  });
  
  merged.meta.totalFeatures = Object.keys(merged.selectors).length;
  
  // Generate recommendations based on conflicts
  if (merged.conflicts.length > 0) {
    merged.recommendations.push({
      type: 'CONFLICT_RESOLUTION',
      description: `${merged.conflicts.length} VSCode selector conflicts were resolved`,
      actions: [
        'Review resolved selectors for accuracy',
        'Test conflicting features manually',
        'Update selectors based on VSCode version'
      ]
    });
  }
  
  console.log(`  ✅ Merged ${merged.meta.totalFeatures} VSCode features`);
  console.log(`  ⚠️ Resolved ${merged.meta.conflicts} conflicts`);
  
  return merged;
}

function getSourcePriority(source) {
  // Priority order for VSCode analysis sources
  const priorities = {
    'enhanced-vscode-chat-analysis.json': 1,  // Highest - most specific
    'dom-analysis-results.json': 2,           // Good - comprehensive
    'bulk-analysis-results.json': 3,          // Medium - bulk analysis
    'coverage-validation-report.json': 4      // Lowest - validation only
  };
  
  return priorities[source] || 99;
}

function resolveSelectorConflict(feature, selectors) {
  // Sort by priority first
  selectors.sort((a, b) => a.priority - b.priority);
  
  // If same priority, prefer more specific selectors
  const samePriority = selectors.filter(s => s.priority === selectors[0].priority);
  
  if (samePriority.length === 1) {
    return {
      selector: samePriority[0].selector,
      conflict: false,
      reason: 'Single highest priority selector'
    };
  }
  
  // Multiple same priority - choose most specific
  const mostSpecific = samePriority.reduce((best, current) => {
    const bestScore = calculateSpecificity(best.selector);
    const currentScore = calculateSpecificity(current.selector);
    return currentScore > bestScore ? current : best;
  });
  
  return {
    selector: mostSpecific.selector,
    conflict: true,
    reason: `Resolved by specificity (${samePriority.length} candidates)`
  };
}

function calculateSpecificity(selector) {
  let score = 0;
  
  // ID selectors have highest specificity
  if (selector.includes('#')) score += 1000;
  
  // Class selectors
  const classMatches = selector.match(/\./g);
  if (classMatches) score += classMatches.length * 100;
  
  // Attribute selectors
  const attrMatches = selector.match(/\[/g);
  if (attrMatches) score += attrMatches.length * 50;
  
  // Tag selectors
  const tagMatches = selector.match(/^[a-zA-Z]/);
  if (tagMatches) score += 10;
  
  // Longer selectors are more specific
  score += selector.length;
  
  return score;
}

function generateFinalVSCodeSelectors(mergedResults) {
  console.log('\n🔧 Generating final VSCode selectors...');
  
  const finalSelectors = {
    // === VSCode CHAT FEATURES ===
    newChat: mergedResults.selectors.newChat || '[aria-label*="New Chat"]',
    chatInput: mergedResults.selectors.chatInput || 'textarea[data-testid="chat-input"]',
    sendButton: mergedResults.selectors.sendButton || '.codicon-send',
    userMessages: mergedResults.selectors.userMessages || '.user-message',
    aiMessages: mergedResults.selectors.aiMessages || '.ai-message',
    chatHistory: mergedResults.selectors.chatHistory || '[aria-label*="Chat History"]',
    chatSettings: mergedResults.selectors.chatSettings || '[aria-label="Settings"]',
    moreActions: mergedResults.selectors.moreActions || '[aria-label*="More Actions"]',
    chatTabs: mergedResults.selectors.chatTabs || 'li.action-item',
    chatContainer: mergedResults.selectors.chatContainer || '.aislash-container',
    chatLoading: mergedResults.selectors.chatLoading || '.loading',
    chatError: mergedResults.selectors.chatError || '.error',
    
    // === VSCode EXPLORER & FILE TREE ===
    fileExplorer: mergedResults.selectors.fileExplorer || '.explorer-viewlet',
    fileTree: mergedResults.selectors.fileTree || '.monaco-tree',
    folderToggle: mergedResults.selectors.folderToggle || '.codicon-chevron-right',
    newFile: mergedResults.selectors.newFile || '[aria-label*="New File"]',
    newFolder: mergedResults.selectors.newFolder || '[aria-label*="New Folder"]',
    
    // === VSCode EDITOR ===
    editorTabs: mergedResults.selectors.editorTabs || '.tabs-container',
    activeEditor: mergedResults.selectors.activeEditor || '.monaco-editor',
    editorContent: mergedResults.selectors.editorContent || '.view-lines',
    tabCloseButton: mergedResults.selectors.tabCloseButton || '.codicon-close',
    splitEditor: mergedResults.selectors.splitEditor || '[aria-label*="Split Editor"]',
    
    // === VSCode SEARCH & REPLACE ===
    globalSearch: mergedResults.selectors.globalSearch || '.search-viewlet',
    searchInput: mergedResults.selectors.searchInput || '.search-input',
    replaceInput: mergedResults.selectors.replaceInput || '.replace-input',
    searchResults: mergedResults.selectors.searchResults || '.search-results',
    searchFilters: mergedResults.selectors.searchFilters || '.search-actions',
    
    // === VSCode GIT SOURCE CONTROL ===
    gitSourceControl: mergedResults.selectors.gitSourceControl || '.scm-viewlet',
    gitChanges: mergedResults.selectors.gitChanges || '.scm-resource',
    commitInput: mergedResults.selectors.commitInput || '.scm-commit-input',
    commitButton: mergedResults.selectors.commitButton || '.commit-button',
    gitBranch: mergedResults.selectors.gitBranch || '.git-branch',
    
    // === VSCode EXTENSIONS ===
    extensionsPanel: mergedResults.selectors.extensionsPanel || '.extensions-viewlet',
    extensionSearch: mergedResults.selectors.extensionSearch || '.extensions-search',
    installExtension: mergedResults.selectors.installExtension || '.install-button',
    
    // === VSCode TERMINAL ===
    terminal: mergedResults.selectors.terminal || '.terminal-wrapper',
    newTerminal: mergedResults.selectors.newTerminal || '[aria-label*="New Terminal"]',
    terminalTabs: mergedResults.selectors.terminalTabs || '.terminal-tab',
    terminalInput: mergedResults.selectors.terminalInput || '.xterm-cursor-layer',
    
    // === VSCode DEBUG & RUN ===
    debugPanel: mergedResults.selectors.debugPanel || '.debug-viewlet',
    runButton: mergedResults.selectors.runButton || '.codicon-play',
    debugButton: mergedResults.selectors.debugButton || '.codicon-debug-alt',
    breakpoints: mergedResults.selectors.breakpoints || '.breakpoint',
    
    // === VSCode COMMAND PALETTE & NAVIGATION ===
    commandPalette: mergedResults.selectors.commandPalette || '.quick-input-widget',
    quickOpen: mergedResults.selectors.quickOpen || '.quick-input-widget',
    breadcrumbs: mergedResults.selectors.breadcrumbs || '.breadcrumbs',
    
    // === VSCode STATUS BAR ===
    statusBar: mergedResults.selectors.statusBar || '.statusbar',
    languageSelector: mergedResults.selectors.languageSelector || '.language-status',
    cursorPosition: mergedResults.selectors.cursorPosition || '.cursor-position',
    
    // === VSCode PANELS ===
    problemsPanel: mergedResults.selectors.problemsPanel || '.markers-panel',
    outputPanel: mergedResults.selectors.outputPanel || '.output-panel',
    
    // === VSCode AI FEATURES ===
    copilotSuggestions: mergedResults.selectors.copilotSuggestions || '.ghost-text',
    inlineChat: mergedResults.selectors.inlineChat || '.inline-chat',
    aiCodeActions: mergedResults.selectors.aiCodeActions || '.code-action'
  };
  
  // Add any additional selectors from merged results
  Object.entries(mergedResults.selectors).forEach(([feature, selector]) => {
    if (!finalSelectors[feature]) {
      finalSelectors[feature] = selector;
    }
  });
  
  console.log(`  ✅ Generated ${Object.keys(finalSelectors).length} VSCode selectors`);
  
  return finalSelectors;
}

async function saveMergedResults(mergedResults, finalSelectors, generatedDir) {
  // Save merged analysis results
  const mergedFile = path.join(generatedDir, 'vscode-merged-analysis.json');
  fs.writeFileSync(mergedFile, JSON.stringify(mergedResults, null, 2));
  
  // Save final VSCode selectors
  const selectorsFile = path.join(generatedDir, 'vscode-selectors.json');
  fs.writeFileSync(selectorsFile, JSON.stringify(finalSelectors, null, 2));
  
  // Generate VSCode selector summary
  const summaryFile = path.join(generatedDir, 'vscode-selectors-summary.md');
  const summary = generateVSCodeSelectorSummary(finalSelectors, mergedResults);
  fs.writeFileSync(summaryFile, summary);
  
  // Generate VSCode JavaScript module
  const jsModuleFile = path.join(generatedDir, 'VSCodeSelectors.js');
  const jsModule = generateVSCodeJSModule(finalSelectors);
  fs.writeFileSync(jsModuleFile, jsModule);
  
  console.log(`📄 VSCode merged analysis: ${mergedFile}`);
  console.log(`📄 VSCode selectors: ${selectorsFile}`);
  console.log(`📄 VSCode summary: ${summaryFile}`);
  console.log(`📄 VSCode JS module: ${jsModuleFile}`);
}

function generateVSCodeSelectorSummary(selectors, mergedResults) {
  const categories = {
    'Chat Features': ['newChat', 'chatInput', 'sendButton', 'userMessages', 'aiMessages', 'chatHistory', 'chatSettings', 'moreActions', 'chatTabs', 'chatContainer', 'chatLoading', 'chatError'],
    'Explorer & File Tree': ['fileExplorer', 'fileTree', 'folderToggle', 'newFile', 'newFolder'],
    'Editor': ['editorTabs', 'activeEditor', 'editorContent', 'tabCloseButton', 'splitEditor'],
    'Search & Replace': ['globalSearch', 'searchInput', 'replaceInput', 'searchResults', 'searchFilters'],
    'Git Source Control': ['gitSourceControl', 'gitChanges', 'commitInput', 'commitButton', 'gitBranch'],
    'Extensions': ['extensionsPanel', 'extensionSearch', 'installExtension'],
    'Terminal': ['terminal', 'newTerminal', 'terminalTabs', 'terminalInput'],
    'Debug & Run': ['debugPanel', 'runButton', 'debugButton', 'breakpoints'],
    'Command Palette & Navigation': ['commandPalette', 'quickOpen', 'breadcrumbs'],
    'Status Bar': ['statusBar', 'languageSelector', 'cursorPosition'],
    'Panels': ['problemsPanel', 'outputPanel'],
    'AI Features': ['copilotSuggestions', 'inlineChat', 'aiCodeActions']
  };
  
  let summary = `# VSCode Selectors Summary

## Overview
- **Generated**: ${new Date().toISOString()}
- **Total Features**: ${Object.keys(selectors).length}
- **Sources Merged**: ${mergedResults.meta.sources.length}
- **Conflicts Resolved**: ${mergedResults.meta.conflicts}

## Selectors by Category

`;

  Object.entries(categories).forEach(([category, features]) => {
    summary += `### ${category}\n`;
    features.forEach(feature => {
      const selector = selectors[feature];
      if (selector) {
        summary += `- **${feature}**: \`${selector}\`\n`;
      }
    });
    summary += '\n';
  });
  
  if (mergedResults.conflicts.length > 0) {
    summary += `## Resolved Conflicts\n\n`;
    mergedResults.conflicts.forEach(conflict => {
      summary += `- **${conflict.feature}**: ${conflict.reason}\n`;
      summary += `  - Resolved: \`${conflict.resolved}\`\n`;
      summary += `  - Candidates: ${conflict.candidates.length}\n\n`;
    });
  }
  
  return summary;
}

function generateVSCodeJSModule(selectors) {
  let module = `/**
 * VSCode Selectors - Auto-generated from analysis
 * Generated: ${new Date().toISOString()}
 * Total Features: ${Object.keys(selectors).length}
 */

const VSCodeSelectors = {
`;

  Object.entries(selectors).forEach(([feature, selector]) => {
    module += `  ${feature}: '${selector}',\n`;
  });
  
  module += `};

// VSCode feature categories for easy access
VSCodeSelectors.categories = {
  chat: ['newChat', 'chatInput', 'sendButton', 'userMessages', 'aiMessages', 'chatHistory', 'chatSettings', 'moreActions', 'chatTabs', 'chatContainer', 'chatLoading', 'chatError'],
  explorer: ['fileExplorer', 'fileTree', 'folderToggle', 'newFile', 'newFolder'],
  editor: ['editorTabs', 'activeEditor', 'editorContent', 'tabCloseButton', 'splitEditor'],
  search: ['globalSearch', 'searchInput', 'replaceInput', 'searchResults', 'searchFilters'],
  git: ['gitSourceControl', 'gitChanges', 'commitInput', 'commitButton', 'gitBranch'],
  extensions: ['extensionsPanel', 'extensionSearch', 'installExtension'],
  terminal: ['terminal', 'newTerminal', 'terminalTabs', 'terminalInput'],
  debug: ['debugPanel', 'runButton', 'debugButton', 'breakpoints'],
  navigation: ['commandPalette', 'quickOpen', 'breadcrumbs'],
  status: ['statusBar', 'languageSelector', 'cursorPosition'],
  panels: ['problemsPanel', 'outputPanel'],
  ai: ['copilotSuggestions', 'inlineChat', 'aiCodeActions']
};

// Helper methods for VSCode automation
VSCodeSelectors.getChatSelectors = () => {
  return VSCodeSelectors.categories.chat.reduce((acc, feature) => {
    acc[feature] = VSCodeSelectors[feature];
    return acc;
  }, {});
};

VSCodeSelectors.getEditorSelectors = () => {
  return VSCodeSelectors.categories.editor.reduce((acc, feature) => {
    acc[feature] = VSCodeSelectors[feature];
    return acc;
  }, {});
};

VSCodeSelectors.getCriticalSelectors = () => {
  return {
    newChat: VSCodeSelectors.newChat,
    chatInput: VSCodeSelectors.chatInput,
    sendButton: VSCodeSelectors.sendButton,
    commandPalette: VSCodeSelectors.commandPalette,
    fileExplorer: VSCodeSelectors.fileExplorer
  };
};

module.exports = VSCodeSelectors;
`;

  return module;
}

// CLI Usage
if (require.main === module) {
  mergeAnalysisResults().catch(error => {
    console.error('❌ VSCode merge failed:', error.message);
    process.exit(1);
  });
}

module.exports = { mergeAnalysisResults }; 