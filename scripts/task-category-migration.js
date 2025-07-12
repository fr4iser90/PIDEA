#!/usr/bin/env node

/**
 * Task Category Migration Script
 * 
 * Migrates existing tasks to include categories based on their content
 * Usage: node scripts/task-category-migration.js [--dry-run] [--update]
 */

const fs = require('fs');
const path = require('path');

class TaskCategoryMigration {
  constructor() {
    this.categories = {
      'ai': 'AI-related features',
      'auto': 'Automation features', 
      'backend': 'Backend development',
      'frontend': 'Frontend development',
      'ide': 'IDE integration features',
      'performance': 'Performance optimization',
      'security': 'Security features',
      'testing': 'Testing infrastructure',
      'unified-workflow': 'Unified workflow system',
      'legacy': 'Legacy system tasks',
      'migration': 'Migration tasks',
      'documentation': 'Documentation tasks',
      '': ' tasks'
    };
  }

  async run() {
    const args = process.argv.slice(2);
    const isDryRun = args.includes('--dry-run');
    const shouldUpdate = args.includes('--update');
    
    if (args.includes('--help') || args.includes('-h')) {
      this.showHelp();
      return;
    }

    console.log('🔄 Task Category Migration');
    console.log('==========================');
    console.log(`Mode: ${isDryRun ? 'DRY RUN' : shouldUpdate ? 'UPDATE' : 'ANALYSIS'}`);
    console.log('');

    try {
      // Find all task files
      const taskFiles = this.findTaskFiles();
      console.log(`📁 Found ${taskFiles.length} task files`);
      console.log('');

      // Analyze and categorize tasks
      const categorizedTasks = this.categorizeTasks(taskFiles);
      
      // Display results
      this.displayResults(categorizedTasks, isDryRun);
      
      // Update files if requested
      if (shouldUpdate && !isDryRun) {
        await this.updateTaskFiles(categorizedTasks);
      }

    } catch (error) {
      console.error('❌ Migration failed:', error.message);
      process.exit(1);
    }
  }

  findTaskFiles() {
    const taskFiles = [];
    const roadmapPath = 'docs/09_roadmap';
    
    const findInDirectory = (dir) => {
      if (!fs.existsSync(dir)) return;
      
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          findInDirectory(fullPath);
        } else if (item.endsWith('.md') && !item.startsWith('README')) {
          taskFiles.push(fullPath);
        }
      }
    };
    
    findInDirectory(roadmapPath);
    return taskFiles;
  }

  categorizeTasks(taskFiles) {
    const categorized = {};
    
    // Initialize categories
    for (const category of Object.keys(this.categories)) {
      categorized[category] = [];
    }
    
    for (const taskFile of taskFiles) {
      const category = this.determineTaskCategory(taskFile);
      if (categorized[category]) {
        categorized[category].push(taskFile);
      } else {
        if (!categorized['']) categorized[''] = [];
        categorized[''].push(taskFile);
      }
    }
    
    return categorized;
  }

  determineTaskCategory(taskFile) {
    const filename = path.basename(taskFile, '.md').toLowerCase();
    const content = fs.readFileSync(taskFile, 'utf8').toLowerCase();
    
    // Check filename for category indicators
    for (const [category, keywords] of Object.entries(this.getCategoryKeywords())) {
      if (filename.includes(category) || keywords.some(keyword => filename.includes(keyword))) {
        return category;
      }
    }
    
    // Check content for category indicators
    for (const [category, keywords] of Object.entries(this.getCategoryKeywords())) {
      if (keywords.some(keyword => content.includes(keyword))) {
        return category;
      }
    }
    
    return '';
  }

  getCategoryKeywords() {
    return {
      'ai': ['ai', 'artificial', 'intelligence', 'machine', 'learning', 'neural'],
      'auto': ['auto', 'automation', 'automated', 'workflow'],
      'backend': ['backend', 'api', 'server', 'database', 'service'],
      'frontend': ['frontend', 'ui', 'ux', 'interface', 'react', 'vue'],
      'ide': ['ide', 'editor', 'vscode', 'cursor', 'integration'],
      'performance': ['performance', 'optimization', 'speed', 'efficiency'],
      'security': ['security', 'auth', 'authentication', 'encryption'],
      'testing': ['test', 'testing', 'unit', 'integration', 'e2e'],
      'unified-workflow': ['unified', 'workflow', 'unified-workflow'],
      'migration': ['migration', 'migrate', 'legacy'],
      'documentation': ['documentation', 'docs', 'guide', 'manual']
    };
  }

  displayResults(categorizedTasks, isDryRun) {
    console.log('📊 Categorization Results:');
    console.log('==========================');
    
    let totalTasks = 0;
    
    for (const [category, taskList] of Object.entries(categorizedTasks)) {
      if (taskList.length === 0) continue;
      
      totalTasks += taskList.length;
      console.log(`\n${category.toUpperCase()} (${taskList.length} tasks):`);
      console.log(`  ${this.categories[category] || 'Uncategorized'}`);
      
      for (const task of taskList) {
        const relativePath = path.relative('docs/09_roadmap', task);
        console.log(`  - ${relativePath}`);
      }
    }
    
    console.log(`\n📈 Summary:`);
    console.log(`  Total Tasks: ${totalTasks}`);
    console.log(`  Categories Used: ${Object.keys(categorizedTasks).filter(cat => categorizedTasks[cat].length > 0).length}`);
    
    if (isDryRun) {
      console.log('\n💡 This was a dry run. Use --update to actually modify files.');
    }
  }

  async updateTaskFiles(categorizedTasks) {
    console.log('\n🔄 Updating task files...');
    
    for (const [category, taskList] of Object.entries(categorizedTasks)) {
      if (taskList.length === 0) continue;
      
      console.log(`\n📁 Processing ${category} (${taskList.length} tasks):`);
      
      for (const taskFile of taskList) {
        await this.updateTaskFile(taskFile, category);
      }
    }
    
    console.log('\n✅ Task files updated successfully!');
  }

  async updateTaskFile(taskFile, category) {
    try {
      const content = fs.readFileSync(taskFile, 'utf8');
      const updatedContent = this.addCategoryToTask(content, category);
      
      if (content !== updatedContent) {
        fs.writeFileSync(taskFile, updatedContent, 'utf8');
        const relativePath = path.relative('docs/09_roadmap', taskFile);
        console.log(`  ✅ Updated: ${relativePath} → ${category}`);
      } else {
        const relativePath = path.relative('docs/09_roadmap', taskFile);
        console.log(`  ⚠️  No changes needed: ${relativePath}`);
      }
    } catch (error) {
      console.error(`  ❌ Failed to update ${taskFile}: ${error.message}`);
    }
  }

  addCategoryToTask(content, category) {
    // Check if category already exists
    if (content.includes('**Category**:') || content.includes('**category**:')) {
      return content; // Already has category
    }
    
    // Find metadata section and add category
    const metadataPattern = /## Metadata[\s\S]*?(?=##|$)/;
    const match = content.match(metadataPattern);
    
    if (match) {
      // Add category to existing metadata section
      const metadataSection = match[0];
      const updatedMetadata = metadataSection.replace(
        /(\*\*Priority\*\*:.*\n)/,
        `$1- **Category**: ${category}\n`
      );
      
      return content.replace(metadataSection, updatedMetadata);
    } else {
      // Add new metadata section before References
      const referencesPattern = /## References/;
      if (content.match(referencesPattern)) {
        return content.replace(
          /## References/,
          `## Metadata
- **Category**: ${category}

## References`
        );
      } else {
        // Add at the end
        return content + `\n\n## Metadata
- **Category**: ${category}`;
      }
    }
  }

  showHelp() {
    console.log('Task Category Migration');
    console.log('');
    console.log('Usage:');
    console.log('  node scripts/task-category-migration.js --dry-run');
    console.log('  node scripts/task-category-migration.js --update');
    console.log('');
    console.log('Options:');
    console.log('  --dry-run    Analyze tasks without making changes');
    console.log('  --update     Update task files with categories');
    console.log('  --help, -h   Show this help');
    console.log('');
    console.log('Categories:');
    for (const [category, description] of Object.entries(this.categories)) {
      console.log(`  ${category}: ${description}`);
    }
  }
}

// Run the migration
if (require.main === module) {
  const migration = new TaskCategoryMigration();
  migration.run().catch(console.error);
}

module.exports = TaskCategoryMigration; 