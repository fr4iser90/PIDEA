#!/usr/bin/env node

/**
 * Fix Task Priorities Script
 * 
 * This script fixes existing tasks in the database that have invalid priority values
 * stored as [object Object] instead of proper string values.
 */

require('module-alias/register');
const DatabaseConnection = require('@/infrastructure/database/DatabaseConnection');
const AutoSecurityManager = require('@/infrastructure/auto/AutoSecurityManager');
const TaskPriority = require('@/domain/value-objects/TaskPriority');

class TaskPriorityFixer {
  constructor() {
    this.databaseConnection = null;
  }

  async init() {
    try {
      // Get database configuration from AutoSecurityManager
      const autoSecurityManager = new AutoSecurityManager();
      const dbConfig = autoSecurityManager.getDatabaseConfig();
      
      this.databaseConnection = new DatabaseConnection(dbConfig);
      await this.databaseConnection.connect();
      console.log('✅ Database connection established');
    } catch (error) {
      console.error('❌ Failed to connect to database:', error.message);
      throw error;
    }
  }

  async findInvalidPriorities() {
    try {
      const sql = `SELECT id, title, priority FROM tasks WHERE priority = '[object Object]' OR priority IS NULL`;
      const rows = await this.databaseConnection.query(sql);
      
      console.log(`🔍 Found ${rows.length} tasks with invalid priorities:`);
      rows.forEach(row => {
        console.log(`  - ${row.id}: "${row.title}" (priority: ${row.priority})`);
      });
      
      return rows;
    } catch (error) {
      console.error('❌ Failed to find invalid priorities:', error.message);
      throw error;
    }
  }

  async fixTaskPriority(taskId, newPriority = TaskPriority.MEDIUM) {
    try {
      const sql = `UPDATE tasks SET priority = ?, updatedAt = ? WHERE id = ?`;
      const params = [newPriority, new Date().toISOString(), taskId];
      
      await this.databaseConnection.execute(sql, params);
      console.log(`✅ Fixed task ${taskId} priority to: ${newPriority}`);
    } catch (error) {
      console.error(`❌ Failed to fix task ${taskId}:`, error.message);
      throw error;
    }
  }

  async fixAllInvalidPriorities() {
    try {
      const invalidTasks = await this.findInvalidPriorities();
      
      if (invalidTasks.length === 0) {
        console.log('✅ No tasks with invalid priorities found');
        return;
      }

      console.log(`\n🔧 Fixing ${invalidTasks.length} tasks...`);
      
      for (const task of invalidTasks) {
        // Try to determine priority from task title or description
        let priority = TaskPriority.MEDIUM; // default
        
        if (task.title) {
          const title = task.title.toLowerCase();
          if (title.includes('critical') || title.includes('urgent') || title.includes('kritisch')) {
            priority = TaskPriority.CRITICAL;
          } else if (title.includes('high') || title.includes('hoch')) {
            priority = TaskPriority.HIGH;
          } else if (title.includes('low') || title.includes('niedrig') || title.includes('minor')) {
            priority = TaskPriority.LOW;
          }
        }
        
        await this.fixTaskPriority(task.id, priority);
      }
      
      console.log(`\n✅ Successfully fixed ${invalidTasks.length} tasks`);
    } catch (error) {
      console.error('❌ Failed to fix invalid priorities:', error.message);
      throw error;
    }
  }

  async validateFix() {
    try {
      const sql = `SELECT COUNT(*) as count FROM tasks WHERE priority = '[object Object]' OR priority IS NULL`;
      const result = await this.databaseConnection.getOne(sql);
      
      if (result.count === 0) {
        console.log('✅ Validation passed: No tasks with invalid priorities found');
      } else {
        console.log(`⚠️  Validation warning: ${result.count} tasks still have invalid priorities`);
      }
      
      return result.count === 0;
    } catch (error) {
      console.error('❌ Validation failed:', error.message);
      throw error;
    }
  }

  async close() {
    if (this.databaseConnection) {
      await this.databaseConnection.disconnect();
      console.log('✅ Database connection closed');
    }
  }
}

async function main() {
  const fixer = new TaskPriorityFixer();
  
  try {
    console.log('🚀 Starting task priority fix...\n');
    
    await fixer.init();
    await fixer.fixAllInvalidPriorities();
    await fixer.validateFix();
    
    console.log('\n🎉 Task priority fix completed successfully!');
  } catch (error) {
    console.error('\n💥 Task priority fix failed:', error.message);
    process.exit(1);
  } finally {
    await fixer.close();
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = TaskPriorityFixer; 