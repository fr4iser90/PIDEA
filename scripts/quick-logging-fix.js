#!/usr/bin/env node

/**
 * Quick Logging Fix Script
 * Fixes the most common legacy logging patterns in main application files
 */

require('module-alias/register');
const fs = require('fs');
const path = require('path');

// Files to fix with their specific patterns
const filesToFix = [
  {
    file: 'backend/presentation/api/ChatController.js',
    patterns: [
      { from: "const logger = new Logger('Logger');", to: "const ServiceLogger = require('@logging/ServiceLogger');\nconst logger = new ServiceLogger('ChatController');" },
      { from: /logger\.log\(/g, to: 'logger.info(' }
    ]
  },
  {
    file: 'backend/presentation/api/AnalysisController.js',
    patterns: [
      { from: "const logger = new Logger('Logger');", to: "const ServiceLogger = require('@logging/ServiceLogger');\nconst logger = new ServiceLogger('AnalysisController');" },
      { from: /logger\.log\(/g, to: 'logger.info(' }
    ]
  },
  {
    file: 'backend/presentation/api/AuthController.js',
    patterns: [
      { from: "const logger = new Logger('Logger');", to: "const ServiceLogger = require('@logging/ServiceLogger');\nconst logger = new ServiceLogger('AuthController');" },
      { from: /logger\.log\(/g, to: 'logger.info(' }
    ]
  },
  {
    file: 'backend/presentation/api/TaskController.js',
    patterns: [
      { from: "const logger = new Logger('Logger');", to: "const ServiceLogger = require('@logging/ServiceLogger');\nconst logger = new ServiceLogger('TaskController');" },
      { from: /logger\.log\(/g, to: 'logger.info(' }
    ]
  },
  {
    file: 'backend/presentation/api/IDEMirrorController.js',
    patterns: [
      { from: "const logger = new Logger('Logger');", to: "const ServiceLogger = require('@logging/ServiceLogger');\nconst logger = new ServiceLogger('IDEMirrorController');" },
      { from: /logger\.log\(/g, to: 'logger.info(' }
    ]
  },
  {
    file: 'backend/presentation/api/ide/IDEFeatureController.js',
    patterns: [
      { from: "const logger = new Logger('Logger');", to: "const ServiceLogger = require('@logging/ServiceLogger');\nconst logger = new ServiceLogger('IDEFeatureController');" },
      { from: /logger\.log\(/g, to: 'logger.info(' }
    ]
  },
  {
    file: 'backend/presentation/api/ide/IDEController.js',
    patterns: [
      { from: "const logger = new Logger('IDEController');", to: "const ServiceLogger = require('@logging/ServiceLogger');\nconst logger = new ServiceLogger('IDEController');" },
      { from: /logger\.log\(/g, to: 'logger.info(' }
    ]
  },
  {
    file: 'backend/presentation/api/ide/IDESelectionController.js',
    patterns: [
      { from: "const logger = new Logger('Logger');", to: "const ServiceLogger = require('@logging/ServiceLogger');\nconst logger = new ServiceLogger('IDESelectionController');" },
      { from: /logger\.log\(/g, to: 'logger.info(' }
    ]
  },
  {
    file: 'backend/presentation/api/CodeExplorerController.js',
    patterns: [
      { from: "const logger = new Logger('Logger');", to: "const ServiceLogger = require('@logging/ServiceLogger');\nconst logger = new ServiceLogger('CodeExplorerController');" },
      { from: /logger\.log\(/g, to: 'logger.info(' }
    ]
  },
  {
    file: 'backend/presentation/api/WorkflowController.js',
    patterns: [
      { from: "const logger = new Logger('Logger');", to: "const ServiceLogger = require('@logging/ServiceLogger');\nconst logger = new ServiceLogger('WorkflowController');" },
      { from: /logger\.log\(/g, to: 'logger.info(' }
    ]
  },
  {
    file: 'backend/presentation/api/AutoFinishController.js',
    patterns: [
      { from: "const logger = new Logger('Logger');", to: "const ServiceLogger = require('@logging/ServiceLogger');\nconst logger = new ServiceLogger('AutoFinishController');" },
      { from: /logger\.log\(/g, to: 'logger.info(' }
    ]
  },
  {
    file: 'backend/presentation/api/GitController.js',
    patterns: [
      { from: "const logger = new Logger('Logger');", to: "const ServiceLogger = require('@logging/ServiceLogger');\nconst logger = new ServiceLogger('GitController');" },
      { from: /logger\.log\(/g, to: 'logger.info(' }
    ]
  },
  {
    file: 'backend/presentation/api/DocumentationController.js',
    patterns: [
      { from: "const logger = new Logger('Logger');", to: "const ServiceLogger = require('@logging/ServiceLogger');\nconst logger = new ServiceLogger('DocumentationController');" },
      { from: /logger\.log\(/g, to: 'logger.info(' }
    ]
  },
  {
    file: 'backend/presentation/api/ContentLibraryController.js',
    patterns: [
      { from: "const logger = new Logger('Logger');", to: "const ServiceLogger = require('@logging/ServiceLogger');\nconst logger = new ServiceLogger('ContentLibraryController');" },
      { from: /logger\.log\(/g, to: 'logger.info(' }
    ]
  },
  {
    file: 'backend/presentation/api/AnalyzeAllController.js',
    patterns: [
      { from: "const logger = new Logger('Logger');", to: "const ServiceLogger = require('@logging/ServiceLogger');\nconst logger = new ServiceLogger('AnalyzeAllController');" },
      { from: /logger\.log\(/g, to: 'logger.info(' }
    ]
  }
];

function fixFile(filePath, patterns) {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  File not found: ${filePath}`);
      return false;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    for (const pattern of patterns) {
      if (pattern.from instanceof RegExp) {
        if (pattern.from.test(content)) {
          content = content.replace(pattern.from, pattern.to);
          modified = true;
        }
      } else {
        if (content.includes(pattern.from)) {
          content = content.replace(pattern.from, pattern.to);
          modified = true;
        }
      }
    }

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Fixed: ${filePath}`);
      return true;
    } else {
      console.log(`ℹ️  No changes needed: ${filePath}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error fixing ${filePath}:`, error.message);
    return false;
  }
}

function main() {
  console.log('🔧 Quick Logging Fix Script\n');
  
  let fixedCount = 0;
  let totalFiles = filesToFix.length;

  for (const fileConfig of filesToFix) {
    if (fixFile(fileConfig.file, fileConfig.patterns)) {
      fixedCount++;
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Files processed: ${totalFiles}`);
  console.log(`   Files fixed: ${fixedCount}`);
  console.log(`   Success rate: ${((fixedCount / totalFiles) * 100).toFixed(1)}%`);
  
  if (fixedCount > 0) {
    console.log('\n🎉 Quick logging fix completed!');
    console.log('   Restart your application to see the changes.');
  } else {
    console.log('\nℹ️  No files needed fixing.');
  }
}

if (require.main === module) {
  main();
}

module.exports = { fixFile, filesToFix }; 