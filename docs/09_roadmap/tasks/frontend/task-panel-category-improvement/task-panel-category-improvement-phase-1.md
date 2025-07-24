# Task Panel Category Improvement - Phase 1: Database & Backend Setup

## 📋 Phase Overview
- **Phase**: 1 of 3
- **Focus**: Database & Backend Setup
- **Estimated Time**: 1 hour
- **Status**: Planning
- **Dependencies**: None

## 🎯 Objectives
- Update database schema with subcategory column
- Create migration script for existing tasks
- Update backend API to handle subcategories
- Add category mapping utilities
- Ensure backward compatibility

## 📁 Files to Create/Modify

### Database Files:
- [ ] `database/migrations/add_subcategory_to_tasks.sql` - Database migration
- [ ] `backend/scripts/migrate_task_categories.js` - Migration script
- [ ] `backend/config/task-categories.js` - Category configuration

### Backend Files:
- [ ] `backend/domain/entities/Task.js` - Update Task entity
- [ ] `backend/domain/repositories/TaskRepository.js` - Update repository methods
- [ ] `backend/application/services/TaskApplicationService.js` - Update service methods
- [ ] `backend/presentation/api/TaskController.js` - Update API endpoints

## 🔧 Implementation Steps

### Step 1: Database Schema Update
```sql
-- Add subcategory column to tasks table
ALTER TABLE tasks ADD COLUMN subcategory TEXT;

-- Create index for better performance
CREATE INDEX idx_tasks_category_subcategory ON tasks(category, subcategory);
```

**Note**: Current database schema in `database/init-postgres.sql` and `database/init-sqlite.sql` does NOT include the subcategory column. This needs to be added to both files.

### Step 2: Category Mapping Configuration
```javascript
// backend/config/task-categories.js
const MAIN_CATEGORIES = {
  'manual': 'Manual Tasks',
  'refactor': 'Refactoring Tasks', 
  'test': 'Testing Tasks',
  'build': 'Build & Deploy',
  'security': 'Security Tasks',
  'analysis': 'Analysis Tasks',
  'optimization': 'Optimization Tasks',
  'documentation': 'Documentation Tasks'
};

const SUB_CATEGORIES = {
  'manual': {
    'implementation': 'Implementation Tasks',
    'index': 'Index Tasks',
    'phase': 'Phase Tasks',
    'summary': 'Summary Tasks',
    'general': 'General Manual Tasks'
  },
  'refactor': {
    'code_quality': 'Code Quality',
    'naming': 'Naming Conventions', 
    'structure': 'Code Structure',
    'patterns': 'Design Patterns',
    'layer_violations': 'Layer Violations',
    'complexity': 'Complexity Reduction'
  },
  // ... weitere Kategorien
  'documentation': {
    'api': 'API Documentation',
    'user': 'User Documentation',
    'technical': 'Technical Documentation',
    'code': 'Code Documentation',
    'guides': 'User Guides',
    'tutorials': 'Tutorials',
    'structure': 'Documentation Structure',
    'maintenance': 'Documentation Maintenance'
  }
};

module.exports = { MAIN_CATEGORIES, SUB_CATEGORIES };
```

### Step 3: Migration Script
```javascript
// backend/scripts/migrate_task_categories.js
const { TaskRepository } = require('../domain/repositories/TaskRepository');
const { MAIN_CATEGORIES, SUB_CATEGORIES } = require('../config/task-categories');

async function migrateTaskCategories() {
  const taskRepo = new TaskRepository();
  const tasks = await taskRepo.findAll();
  
  for (const task of tasks) {
    const { category, subcategory } = mapTaskTypeToCategories(task.type);
    
    await taskRepo.update(task.id, {
      category,
      subcategory
    });
  }
}

function mapTaskTypeToCategories(taskType) {
  // Mapping logic based on existing task types
  if (taskType.startsWith('refactor_')) {
    return { category: 'refactor', subcategory: getRefactorSubcategory(taskType) };
  }
  if (taskType.startsWith('test_')) {
    return { category: 'test', subcategory: getTestSubcategory(taskType) };
  }
  if (taskType.startsWith('documentation_')) {
    return { category: 'documentation', subcategory: getDocumentationSubcategory(taskType) };
  }
  // ... weitere Mappings
  
  return { category: 'manual', subcategory: 'general' };
}
```

### Step 4: Update Task Entity
```javascript
// backend/domain/entities/Task.js
class Task {
  constructor(data) {
    this.id = data.id;
    this.title = data.title;
    this.description = data.description;
    this.type = data.type;
    this.category = data.category || 'manual';
    this.subcategory = data.subcategory || 'general';
    this.priority = data.priority;
    this.status = data.status;
    this.projectId = data.projectId;
    this.metadata = data.metadata;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }
  
  // ... weitere Methoden
}
```

### Step 5: Update Repository Methods
```javascript
// backend/domain/repositories/TaskRepository.js
class TaskRepository {
  async findByCategory(category, subcategory = null) {
    const query = subcategory 
      ? 'SELECT * FROM tasks WHERE category = ? AND subcategory = ?'
      : 'SELECT * FROM tasks WHERE category = ?';
    const params = subcategory ? [category, subcategory] : [category];
    
    return this.query(query, params);
  }
  
  async getCategoryStats() {
    const query = `
      SELECT 
        category,
        subcategory,
        COUNT(*) as count,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed
      FROM tasks 
      GROUP BY category, subcategory
      ORDER BY category, subcategory
    `;
    
    return this.query(query);
  }
}
```

## 🧪 Testing Strategy

### Database Tests:
- [ ] Test migration script with sample data
- [ ] Verify category/subcategory mapping accuracy
- [ ] Test backward compatibility with existing tasks
- [ ] Performance test with large dataset

### API Tests:
- [ ] Test new category filtering endpoints
- [ ] Test subcategory filtering
- [ ] Test category statistics endpoint
- [ ] Verify existing endpoints still work

## ✅ Success Criteria
- [ ] Database migration completed successfully
- [ ] All existing tasks have proper category/subcategory mapping
- [ ] Backend API supports new category structure
- [ ] No breaking changes to existing functionality
- [ ] Performance maintained or improved
- [ ] All tests passing

## 🚨 Risk Mitigation
- **Data Loss Risk**: Create backup before migration
- **Performance Risk**: Add proper database indexes
- **Breaking Changes**: Maintain backward compatibility
- **Mapping Errors**: Comprehensive testing with sample data

## 📋 Checklist
- [ ] Create database migration script
- [ ] Create category configuration file
- [ ] Create migration script for existing tasks
- [ ] Update Task entity with subcategory field
- [ ] Update TaskRepository with new methods
- [ ] Update TaskApplicationService
- [ ] Update TaskController API endpoints
- [ ] Test migration with sample data
- [ ] Test all API endpoints
- [ ] Update documentation
- [ ] Create rollback plan 