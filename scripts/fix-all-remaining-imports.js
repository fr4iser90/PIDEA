#!/usr/bin/env node

/**
 * Fix All Remaining Imports Script
 * Korrigiert alle verbliebenen @/application/commands/ und @/application/handlers/ Imports
 * auf die korrekten Kategorie-Aliase
 */

const fs = require('fs').promises;
const path = require('path');
const glob = require('glob');

// Mapping von Command-Namen zu Kategorien
const COMMAND_CATEGORIES = {
  'SendMessageCommand': 'management',
  'CreateTaskCommand': 'management',
  'ProcessTodoListCommand': 'management',
  'AutoRefactorCommand': 'management',
  'UpdateTestStatusCommand': 'management',
  'TestCorrectionCommand': 'management',
  'StartStreamingCommand': 'management',
  'StopStreamingCommand': 'management',
  'PortStreamingCommand': 'management',
  'AdvancedAnalysisCommand': 'analysis',
  'AnalyzeArchitectureCommand': 'analysis',
  'AnalyzeCodeQualityCommand': 'analysis',
  'AnalyzeDependenciesCommand': 'analysis',
  'AnalyzeRepoStructureCommand': 'analysis',
  'AnalyzeTechStackCommand': 'analysis',
  'GenerateConfigsCommand': 'generate',
  'GenerateDocumentationCommand': 'generate',
  'GenerateScriptsCommand': 'generate',
  'GenerateTestsCommand': 'generate',
  'OrganizeModulesCommand': 'refactor',
  'RestructureArchitectureCommand': 'refactor',
  'SplitLargeFilesCommand': 'refactor',
  'CleanDependenciesCommand': 'refactor'
};

// Mapping von Handler-Namen zu Kategorien
const HANDLER_CATEGORIES = {
  'SendMessageHandler': 'management',
  'CreateTaskHandler': 'management',
  'ProcessTodoListHandler': 'management',
  'UpdateTestStatusHandler': 'management',
  'TestCorrectionHandler': 'management',
  'StartStreamingHandler': 'management',
  'StopStreamingHandler': 'management',
  'PortStreamingHandler': 'management',
  'GetChatHistoryHandler': 'management',
  'AdvancedAnalysisHandler': 'analysis',
  'AnalyzeArchitectureHandler': 'analysis',
  'AnalyzeCodeQualityHandler': 'analysis',
  'AnalyzeDependenciesHandler': 'analysis',
  'AnalyzeRepoStructureHandler': 'analysis',
  'AnalyzeTechStackHandler': 'analysis',
  'GenerateConfigsHandler': 'generate',
  'GenerateDocumentationHandler': 'generate',
  'GenerateScriptsHandler': 'generate',
  'GenerateTestsHandler': 'generate',
  'OrganizeModulesHandler': 'refactor',
  'RestructureArchitectureHandler': 'refactor',
  'SplitLargeFilesHandler': 'refactor',
  'CleanDependenciesHandler': 'refactor'
};

async function findJavaScriptFiles() {
  return new Promise((resolve, reject) => {
    glob('backend/**/*.js', { ignore: ['node_modules/**', '*.min.js'] }, (err, files) => {
      if (err) reject(err);
      else resolve(files);
    });
  });
}

async function fixFileImports(filePath) {
  try {
    let content = await fs.readFile(filePath, 'utf8');
    let changes = 0;

    // Fix @/application/commands/ imports
    for (const [commandName, category] of Object.entries(COMMAND_CATEGORIES)) {
      const oldPattern = `@/application/commands/${commandName}`;
      const newPattern = `@categories/${category}/${commandName}`;
      
      if (content.includes(oldPattern)) {
        content = content.replace(new RegExp(oldPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), newPattern);
        changes++;
      }
    }

    // Fix @/application/handlers/ imports
    for (const [handlerName, category] of Object.entries(HANDLER_CATEGORIES)) {
      const oldPattern = `@/application/handlers/${handlerName}`;
      const newPattern = `@handler-categories/${category}/${handlerName}`;
      
      if (content.includes(oldPattern)) {
        content = content.replace(new RegExp(oldPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), newPattern);
        changes++;
      }
    }

    // Fix @/application/commands/categories/ imports (already correct format)
    content = content.replace(/@\/application\/commands\/categories\//g, '@categories/');
    content = content.replace(/@\/application\/handlers\/categories\//g, '@handler-categories/');

    if (changes > 0) {
      await fs.writeFile(filePath, content, 'utf8');
      return { filePath, changes };
    }

    return null;
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
    return null;
  }
}

async function main() {
  console.log('🔧 Fixing All Remaining Imports...\n');

  try {
    const files = await findJavaScriptFiles();
    console.log(`📁 Found ${files.length} JavaScript files to process\n`);

    const results = [];
    let totalChanges = 0;

    for (const file of files) {
      const result = await fixFileImports(file);
      if (result) {
        results.push(result);
        totalChanges += result.changes;
        console.log(`✅ ${file}: ${result.changes} imports fixed`);
      }
    }

    console.log(`\n🎉 Import Fix Complete!`);
    console.log(`📊 Files modified: ${results.length}`);
    console.log(`📊 Total imports fixed: ${totalChanges}`);

    if (results.length > 0) {
      console.log(`\n📝 Modified files:`);
      results.forEach(result => {
        console.log(`   - ${result.filePath} (${result.changes} changes)`);
      });
    }

  } catch (error) {
    console.error('❌ Error during import fix:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { fixFileImports, COMMAND_CATEGORIES, HANDLER_CATEGORIES }; 