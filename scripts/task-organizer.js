
// Dynamic path resolution functions
function getTaskDocumentationPath(task) {
  const { status, priority, category, completedAt } = task;
  
  if (status === 'completed') {
    const quarter = getCompletionQuarter(completedAt);
    return `docs/09_roadmap/completed/${quarter}/${category}/`;
  } else if (status === 'in_progress') {
    return `docs/09_roadmap/in-progress/${category}/`;
  } else if (status === 'pending') {
    return `docs/09_roadmap/pending/${priority}/${category}/`;
  } else if (status === 'blocked') {
    return `docs/09_roadmap/blocked/${category}/`;
  } else if (status === 'cancelled') {
    return `docs/09_roadmap/cancelled/${category}/`;
  }
  
  return `docs/09_roadmap/pending/${priority}/${category}/`;
}

function getCompletionQuarter(completedAt) {
  if (!completedAt) {
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    
    if (month <= 3) return `${year}-q1`;
    if (month <= 6) return `${year}-q2`;
    if (month <= 9) return `${year}-q3`;
    return `${year}-q4`;
  }
  
  const date = new Date(completedAt);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  
  if (month <= 3) return `${year}-q1`;
  if (month <= 6) return `${year}-q2`;
  if (month <= 9) return `${year}-q3`;
  return `${year}-q4`;
}

function getPromptPath(promptType) {
  const promptPaths = {
    'task-create': 'content-library/prompts/task-management/task-create.md',
    'task-execute': 'content-library/prompts/task-management/task-execute.md',
    'task-analyze': 'content-library/prompts/task-management/task-analyze.md',
    'task-review': 'content-library/prompts/task-management/task-review.md'
  };
  
  return promptPaths[promptType] || promptPaths['task-create'];
}

function getWorkflowPath(workflowType) {
  return `backend/framework/workflows/${workflowType}-workflows.json`;
}

const Logger = require('@logging/Logger');

const logger = new Logger('ServiceName');
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
      logger.info('❌ No action specified. Use --organize, --validate, or --report');
      this.showHelp();
    }
  }

  async organizeTasks() {
    logger.info('🗂️  Organizing tasks...');
    
    const tasks = this.findTasks();
    const organized = this.categorizeTasks(tasks);
    
    for (const [category, taskList] of Object.entries(organized)) {
      if (taskList.length === 0) continue;
      
      const categoryPath = path.join(this.roadmapPath, 'features', category);
      this.ensureDirectory(categoryPath);
      
      logger.info(`📁 Processing category: ${category} (${taskList.length} tasks)`);
      
      for (const task of taskList) {
        const newPath = this.moveTaskToCategory(task, category);
        logger.info(`   ✅ Moved: ${path.basename(task)} → ${category}/`);
      }
    }
    
    logger.info('✅ Task organization completed!');
  }

  async validateTasks() {
    logger.info('🔍 Validating task structure...');
    
    const tasks = this.findTasks();
    const issues = [];
    
    for (const task of tasks) {
      const content = fs.readFileSync(task, 'utf8');
      const issues = this.validateTaskContent(content, task);
      
      if (issues.length > 0) {
        logger.info(`⚠️  ${path.basename(task)}:`);
        issues.forEach(issue => logger.info(`   - ${issue}`));
      }
    }
    
    if (issues.length === 0) {
      logger.info('✅ All tasks are properly structured!');
    }
  }

  async generateReport() {
    logger.info('📊 Generating task report...');
    
    const tasks = this.findTasks();
    const organized = this.categorizeTasks(tasks);
    
    logger.info('\n📋 Task Report');
    logger.info('==============');
    
    let totalTasks = 0;
    let totalHours = 0;
    
    for (const [category, taskList] of Object.entries(organized)) {
      if (taskList.length === 0) continue;
      
      const categoryHours = this.calculateCategoryHours(taskList);
      totalTasks += taskList.length;
      totalHours += categoryHours;
      
      logger.info(`\n${category.toUpperCase()} (${taskList.length} tasks, ${categoryHours}h):`);
      logger.info(`  ${this.categories[category] || 'Uncategorized'}`);
      
      for (const task of taskList) {
        const taskInfo = this.getTaskInfo(task);
        logger.info(`  - ${path.basename(task)} (${taskInfo.hours}h, ${taskInfo.priority})`);
      }
    }
    
    logger.info(`\n📈 Summary:`);
    logger.info(`  Total Tasks: ${totalTasks}`);
    logger.info(`  Total Hours: ${totalHours}`);
    logger.info(`  Categories: ${Object.keys(organized).filter(cat => organized[cat].length > 0).length}`);
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
    logger.info('Task Organizer');
    logger.info('');
    logger.info('Usage:');
    logger.info('  node scripts/task-organizer.js --organize');
    logger.info('  node scripts/task-organizer.js --validate');
    logger.info('  node scripts/task-organizer.js --report');
    logger.info('');
    logger.info('Options:');
    logger.info('  --organize, -o    Organize tasks into categories');
    logger.info('  --validate, -v    Validate task structure');
    logger.info('  --report, -r      Generate task report');
    logger.info('  --help, -h        Show this help');
    logger.info('');
    logger.info('Categories:');
    for (const [category, description] of Object.entries(this.categories)) {
      logger.info(`  ${category}: ${description}`);
    }
  }
}

// Run the organizer
if (require.main === module) {
  const organizer = new TaskOrganizer();
  organizer.run().catch(console.error);
}

module.exports = TaskOrganizer; 