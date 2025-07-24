# Task Panel Category Improvement - Implementation Plan

## 1. Project Overview
- **Feature/Component Name**: Task Panel Category Improvement - Hierarchical Task Categories
- **Priority**: High
- **Category**: frontend
- **Estimated Time**: 4 hours
- **Dependencies**: Existing TasksPanelComponent, APIChatRepository, backend task APIs, TaskType system
- **Related Issues**: Improve user experience, implement hierarchical task categories, add more action buttons

## 2. Technical Requirements
- **Tech Stack**: React, JavaScript, CSS, HTML, existing PIDEA frontend architecture
- **Architecture Pattern**: Component-based React architecture
- **Database**: PostgreSQL with existing tasks table structure
- **API**: RESTful API with task management endpoints

## 3. Hierarchical Task Category Structure

### Main Categories (Hauptkategorien):
```javascript
const MAIN_CATEGORIES = {
  'docs': 'Documentation Tasks',      // Docs (wird später zu Manual Tasks umbenannt)
  'refactor': 'Refactoring Tasks',    // Code refactoring
  'test': 'Testing Tasks',            // Testing & QA
  'build': 'Build & Deploy',          // Build, deployment, infrastructure
  'security': 'Security Tasks',       // Security & compliance
  'analysis': 'Analysis Tasks',       // Code analysis, performance
  'optimization': 'Optimization Tasks' // Performance optimization
};
```

### Subcategories (Unterkategorien):
```javascript
const SUB_CATEGORIES = {
  // Documentation Tasks
  'docs': {
    'manual': 'Manual Tasks',
    'api': 'API Documentation',
    'user_guide': 'User Guides',
    'technical': 'Technical Docs',
    'tutorial': 'Tutorials'
  },
  
  // Refactoring Tasks
  'refactor': {
    'code_quality': 'Code Quality',
    'naming': 'Naming Conventions',
    'structure': 'Code Structure',
    'patterns': 'Design Patterns',
    'layer_violations': 'Layer Violations',
    'complexity': 'Complexity Reduction'
  },
  
  // Testing Tasks
  'test': {
    'unit': 'Unit Tests',
    'integration': 'Integration Tests',
    'e2e': 'End-to-End Tests',
    'performance': 'Performance Tests',
    'security': 'Security Tests',
    'coverage': 'Test Coverage'
  },
  
  // Build & Deploy
  'build': {
    'deployment': 'Deployment',
    'ci_cd': 'CI/CD Pipeline',
    'docker': 'Docker Configuration',
    'infrastructure': 'Infrastructure',
    'monitoring': 'Monitoring Setup',
    'rollback': 'Rollback Procedures'
  },
  
  // Security Tasks
  'security': {
    'audit': 'Security Audit',
    'vulnerabilities': 'Vulnerability Fixes',
    'authentication': 'Authentication',
    'authorization': 'Authorization',
    'encryption': 'Encryption',
    'compliance': 'Compliance'
  },
  
  // Analysis Tasks
  'analysis': {
    'performance': 'Performance Analysis',
    'code_review': 'Code Review',
    'architecture': 'Architecture Review',
    'dependencies': 'Dependency Analysis',
    'metrics': 'Code Metrics',
    'technical_debt': 'Technical Debt'
  },
  
  // Optimization Tasks
  'optimization': {
    'performance': 'Performance Optimization',
    'memory': 'Memory Optimization',
    'database': 'Database Optimization',
    'caching': 'Caching Strategy',
    'bundling': 'Bundle Optimization',
    'startup': 'Startup Optimization'
  }
};
```

## 4. Database Schema Updates

### Current Structure:
```sql
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  type TEXT NOT NULL,           -- Specific task type
  category TEXT,                -- Main category
  priority TEXT NOT NULL,
  status TEXT NOT NULL,
  project_id TEXT,
  metadata TEXT,                -- JSON for extended data
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### Required Updates:
```sql
-- Add subcategory column
ALTER TABLE tasks ADD COLUMN subcategory TEXT;

-- Update existing tasks to have proper category/subcategory mapping
UPDATE tasks SET 
  category = CASE 
    WHEN type LIKE 'refactor_%' THEN 'refactor'
    WHEN type LIKE 'test_%' THEN 'test'
    WHEN type LIKE 'deploy_%' THEN 'build'
    WHEN type LIKE 'security_%' THEN 'security'
    WHEN type LIKE 'analysis_%' THEN 'analysis'
    WHEN type LIKE 'optimization_%' THEN 'optimization'
    ELSE 'docs'
  END,
  subcategory = CASE 
    WHEN type = 'refactor_node' THEN 'structure'
    WHEN type = 'refactor_naming' THEN 'naming'
    WHEN type = 'test_unit' THEN 'unit'
    WHEN type = 'test_integration' THEN 'integration'
    WHEN type = 'deploy_production' THEN 'deployment'
    WHEN type = 'security_audit' THEN 'audit'
    WHEN type = 'analysis_performance' THEN 'performance'
    WHEN type = 'optimization_startup' THEN 'startup'
    ELSE 'general'
  END;
```

## 5. Frontend Implementation

### 5.1 Task Type Utilities (`frontend/src/utils/taskTypeUtils.js`)
```javascript
export const MAIN_CATEGORIES = {
  'docs': 'Documentation Tasks',
  'refactor': 'Refactoring Tasks',
  'test': 'Testing Tasks',
  'build': 'Build & Deploy',
  'security': 'Security Tasks',
  'analysis': 'Analysis Tasks',
  'optimization': 'Optimization Tasks'
};

export const SUB_CATEGORIES = {
  // ... (as defined above)
};

export const getCategoryInfo = (category, subcategory = null) => {
  const mainCategory = MAIN_CATEGORIES[category] || 'Unknown Category';
  const subCategory = subcategory ? SUB_CATEGORIES[category]?.[subcategory] : null;
  
  return {
    main: mainCategory,
    sub: subCategory,
    display: subCategory ? `${mainCategory} • ${subCategory}` : mainCategory
  };
};

export const getCategoryColor = (category) => {
  const colors = {
    'docs': '#3B82F6',      // Blue
    'refactor': '#F59E0B',  // Amber
    'test': '#10B981',      // Emerald
    'build': '#8B5CF6',     // Violet
    'security': '#EF4444',  // Red
    'analysis': '#06B6D4',  // Cyan
    'optimization': '#84CC16' // Lime
  };
  return colors[category] || '#6B7280';
};

export const getCategoryIcon = (category) => {
  const icons = {
    'docs': '📚',
    'refactor': '🔧',
    'test': '🧪',
    'build': '🚀',
    'security': '🔒',
    'analysis': '🔍',
    'optimization': '⚡'
  };
  return icons[category] || '📋';
};
```

### 5.2 Task Type Badge Component (`frontend/src/components/TaskTypeBadge.jsx`)
```javascript
import React from 'react';
import { getCategoryInfo, getCategoryColor, getCategoryIcon } from '@/utils/taskTypeUtils';

const TaskTypeBadge = ({ category, subcategory, className = '' }) => {
  const categoryInfo = getCategoryInfo(category, subcategory);
  const color = getCategoryColor(category);
  const icon = getCategoryIcon(category);

  return (
    <div className={`task-type-badge ${className}`}>
      <span className="category-icon">{icon}</span>
      <span className="category-text">{categoryInfo.display}</span>
    </div>
  );
};

export default TaskTypeBadge;
```

### 5.3 Enhanced Action Buttons
```javascript
const ACTION_BUTTONS = [
  { id: 'create', label: 'Create Task', icon: '➕', variant: 'primary' },
  { id: 'sync', label: 'Sync', icon: '🔄', variant: 'secondary' },
  { id: 'clean', label: 'Clean', icon: '🗑️', variant: 'secondary' },
  { id: 'refresh', label: 'Refresh', icon: '🔄', variant: 'secondary' },
  { id: 'export', label: 'Export', icon: '📤', variant: 'secondary' },
  { id: 'import', label: 'Import', icon: '📥', variant: 'secondary' },
  { id: 'bulk_edit', label: 'Bulk Edit', icon: '✏️', variant: 'secondary' },
  { id: 'archive', label: 'Archive', icon: '📦', variant: 'secondary' },
  { id: 'duplicate', label: 'Duplicate', icon: '📋', variant: 'secondary' },
  { id: 'move', label: 'Move', icon: '📁', variant: 'secondary' }
];
```

## 6. Implementation Phases

### Phase 1: Database & Backend (1 hour)
- [ ] Update database schema with subcategory column
- [ ] Create migration script for existing tasks
- [ ] Update backend API to handle subcategories
- [ ] Add category mapping utilities

### Phase 2: Frontend Core (2 hours)
- [ ] Create task type utilities
- [ ] Implement TaskTypeBadge component
- [ ] Update TasksPanelComponent to use new structure
- [ ] Add enhanced action buttons
- [ ] Implement category filtering

### Phase 3: UI/UX Enhancement (1 hour)
- [ ] Add category-based task grouping
- [ ] Implement subcategory filtering
- [ ] Add category statistics
- [ ] Create category-based task creation
- [ ] Add drag-and-drop between categories

## 7. Expected Outcomes

### Before:
```
📚 Documentation Tasks
production security audit
Documentation • [object Object] 23.07.2025, 10:26
```

### After:
```
🔒 Security Tasks
production security audit
Security Tasks • Security Audit 23.07.2025, 10:26
[➕ Create] [🔄 Sync] [🗑️ Clean] [🔄 Refresh] [📤 Export] [📥 Import] [✏️ Bulk Edit] [📦 Archive] [📋 Duplicate] [📁 Move]
```

## 8. Testing Strategy
- Unit tests for category utilities
- Integration tests for database migrations
- E2E tests for task panel functionality
- Visual regression tests for UI components

## 9. Success Metrics
- [ ] All tasks display correct categories instead of "Documentation"
- [ ] Hierarchical category structure working
- [ ] Enhanced action buttons functional
- [ ] Category filtering working
- [ ] Performance maintained or improved 