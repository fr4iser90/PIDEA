#!/usr/bin/env node

/**
 * Task Organizer
 * 
 * Organizes tasks in docs/09_roadmap into proper categories and structure
 * Usage: node scripts/task-organizer.js [--organize] [--validate] [--report]
 */

const fs = require('fs');
const path = require('path');

class TaskOrganizer {
  constructor() {
    this.roadmapPath = 'docs/09_roadmap';
    this.categories = {
      'ai': 'AI-related features',
      'auto': 'Automation features', 
      'backend': 'Backend development',
      'frontend': 'Frontend development',
      'ide': 'IDE integration features',
      'performance': 'Performance optimization',
      'security': 'Security features',
      'testing': 'Testing infrastructure',
      ,
      'legacy': 'Legacy system tasks',
      'migration': 'Migration tasks',
      'documentation': 'Documentation tasks'
    };
  }

  async run() {
    const args = process.argv.slice(2);
    
    if (args.includes('--help') || args.includes('-h')) {
      this.showHelp();
      return;
    }

    if (args.includes('--organize') || args.includes('-o')) {
      await this.organizeTasks();
    }

    if (args.includes('--validate') || args.includes('-v')) {
      await this.validateTasks();
    }

    if (args.includes('--report') || args.includes('-r')) {
      await this.generateReport();
    }

    if (args.length === 0) {
      console.log('❌ No action specified. Use --organize, --validate, or --report');
      this.showHelp();
    }
  }

  async organizeTasks() {
    console.log('🗂️  Organizing tasks...');
    
    const tasks = this.findTasks();
    const organized = this.categorizeTasks(tasks);
    
    for (const [category, taskList] of Object.entries(organized)) {
      if (taskList.length === 0) continue;
      
      const categoryPath = path.join(this.roadmapPath, 'features', category);
      this.ensureDirectory(categoryPath);
      
      console.log(`📁 Processing category: ${category} (${taskList.length} tasks)`);
      
      for (const task of taskList) {
        const newPath = this.moveTaskToCategory(task, category);
        console.log(`   ✅ Moved: ${path.basename(task)} → ${category}/`);
      }
    }
    
    console.log('✅ Task organization completed!');
  }

  async validateTasks() {
    console.log('🔍 Validating task structure...');
    
    const tasks = this.findTasks();
    const issues = [];
    
    for (const task of tasks) {
      const content = fs.readFileSync(task, 'utf8');
      const issues = this.validateTaskContent(content, task);
      
      if (issues.length > 0) {
        console.log(`⚠️  ${path.basename(task)}:`);
        issues.forEach(issue => console.log(`   - ${issue}`));
      }
    }
    
    if (issues.length === 0) {
      console.log('✅ All tasks are properly structured!');
    }
  }

  async generateReport() {
    console.log('📊 Generating task report...');
    
    const tasks = this.findTasks();
    const organized = this.categorizeTasks(tasks);
    
    console.log('\n📋 Task Report');
    console.log('==============');
    
    let totalTasks = 0;
    let totalHours = 0;
    
    for (const [category, taskList] of Object.entries(organized)) {
      if (taskList.length === 0) continue;
      
      const categoryHours = this.calculateCategoryHours(taskList);
      totalTasks += taskList.length;
      totalHours += categoryHours;
      
      console.log(`\n${category.toUpperCase()} (${taskList.length} tasks, ${categoryHours}h):`);
      console.log(`  ${this.categories[category] || 'Uncategorized'}`);
      
      for (const task of taskList) {
        const taskInfo = this.getTaskInfo(task);
        console.log(`  - ${path.basename(task)} (${taskInfo.hours}h, ${taskInfo.priority})`);
      }
    }
    
    console.log(`\n📈 Summary:`);
    console.log(`  Total Tasks: ${totalTasks}`);
    console.log(`  Total Hours: ${totalHours}`);
    console.log(`  Categories: ${Object.keys(organized).filter(cat => organized[cat].length > 0).length}`);
  }

  findTasks() {
    const tasks = [];
    
    const findInDirectory = (dir) => {
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          findInDirectory(fullPath);
        } else if (item.endsWith('.md') && !item.startsWith('README')) {
          tasks.push(fullPath);
        }
      }
    };
    
    findInDirectory(this.roadmapPath);
    return tasks;
  }

  categorizeTasks(tasks) {
    const organized = {};
    
    // Initialize categories
    for (const category of Object.keys(this.categories)) {
      organized[category] = [];
    }
    
    for (const task of tasks) {
      const category = this.determineCategory(task);
      if (organized[category]) {
        organized[category].push(task);
      } else {
        if (!organized['legacy']) organized['legacy'] = [];
        organized['legacy'].push(task);
      }
    }
    
    return organized;
  }

  determineCategory(taskPath) {
    const filename = path.basename(taskPath, '.md').toLowerCase();
    const content = fs.readFileSync(taskPath, 'utf8').toLowerCase();
    
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
    
    return 'legacy';
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
      ,
      'migration': ['migration', 'migrate', 'legacy'],
      'documentation': ['documentation', 'docs', 'guide', 'manual']
    };
  }

  moveTaskToCategory(taskPath, category) {
    const filename = path.basename(taskPath);
    const newPath = path.join(this.roadmapPath, 'features', category, filename);
    
    // Ensure category directory exists
    this.ensureDirectory(path.dirname(newPath));
    
    // Move file
    fs.renameSync(taskPath, newPath);
    
    return newPath;
  }

  ensureDirectory(dirPath) {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  validateTaskContent(content, taskPath) {
    const issues = [];
    
    // Check for required sections
    const requiredSections = ['## Overview', '## Technical Requirements', '## Success Criteria'];
    for (const section of requiredSections) {
      if (!content.includes(section)) {
        issues.push(`Missing required section: ${section}`);
      }
    }
    
    // Check for metadata
    if (!content.includes('**Priority**:') && !content.includes('**Estimated Hours**:')) {
      issues.push('Missing task metadata');
    }
    
    // Check for proper markdown formatting
    if (!content.startsWith('# ')) {
      issues.push('Missing main heading');
    }
    
    return issues;
  }

  getTaskInfo(taskPath) {
    const content = fs.readFileSync(taskPath, 'utf8');
    
    // Extract hours
    const hoursMatch = content.match(/\*\*Estimated Hours\*\*:\s*(\d+)/);
    const hours = hoursMatch ? parseInt(hoursMatch[1]) : 0;
    
    // Extract priority
    const priorityMatch = content.match(/\*\*Priority\*\*:\s*(High|Medium|Low)/);
    const priority = priorityMatch ? priorityMatch[1] : 'Unknown';
    
    return { hours, priority };
  }

  calculateCategoryHours(taskList) {
    return taskList.reduce((total, task) => {
      return total + this.getTaskInfo(task).hours;
    }, 0);
  }

  showHelp() {
    console.log('Task Organizer');
    console.log('');
    console.log('Usage:');
    console.log('  node scripts/task-organizer.js --organize');
    console.log('  node scripts/task-organizer.js --validate');
    console.log('  node scripts/task-organizer.js --report');
    console.log('');
    console.log('Options:');
    console.log('  --organize, -o    Organize tasks into categories');
    console.log('  --validate, -v    Validate task structure');
    console.log('  --report, -r      Generate task report');
    console.log('  --help, -h        Show this help');
    console.log('');
    console.log('Categories:');
    for (const [category, description] of Object.entries(this.categories)) {
      console.log(`  ${category}: ${description}`);
    }
  }
}

// Run the organizer
if (require.main === module) {
  const organizer = new TaskOrganizer();
  organizer.run().catch(console.error);
}

module.exports = TaskOrganizer; 