/**
 * Task Type Utilities
 * Provides category mapping, colors, icons, and display functions for task categories
 * Based on actual PIDEA backend categories
 */

export const MAIN_CATEGORIES = {
  'manual': 'Manual Tasks',
  'analysis': 'Analysis Tasks',
  'testing': 'Testing Tasks',
  'refactoring': 'Refactoring Tasks',
  'deployment': 'Deployment Tasks',
  'generate': 'Generate Tasks',
  'management': 'Management Tasks',
  'security': 'Security Tasks',
  'validation': 'Validation Tasks',
  'optimization': 'Optimization Tasks',
  'documentation': 'Documentation Tasks'
};

export const SUB_CATEGORIES = {
  // Manual Tasks
  'manual': {
    'implementation': 'Implementation Tasks',
    'index': 'Index Tasks',
    'phase': 'Phase Tasks',
    'summary': 'Summary Tasks',
    'general': 'General Manual Tasks'
  },
  
  // Analysis Tasks
  'analysis': {
    'architecture': 'Architecture Analysis',
    'code_quality': 'Code Quality Analysis',
    'dependencies': 'Dependency Analysis',
    'repo_structure': 'Repository Structure',
    'tech_stack': 'Technology Stack',
    'performance': 'Performance Analysis',
    'security': 'Security Analysis',
    'layer_violations': 'Layer Violations'
  },
  
  // Testing Tasks
  'testing': {
    'unit': 'Unit Tests',
    'integration': 'Integration Tests',
    'e2e': 'End-to-End Tests',
    'performance': 'Performance Tests',
    'security': 'Security Tests',
    'coverage': 'Test Coverage',
    'fix': 'Test Fixes',
    'refactor': 'Test Refactoring',
    'status': 'Test Status',
    'report': 'Test Reports'
  },
  
  // Refactoring Tasks
  'refactoring': {
    'organize_modules': 'Organize Modules',
    'restructure_architecture': 'Restructure Architecture',
    'split_large_files': 'Split Large Files',
    'clean_dependencies': 'Clean Dependencies',
    'node': 'Node.js Refactoring',
    'react': 'React Refactoring',
    'frontend': 'Frontend Refactoring',
    'backend': 'Backend Refactoring',
    'database': 'Database Refactoring',
    'api': 'API Refactoring'
  },
  
  // Deployment Tasks
  'deployment': {
    'production': 'Production Deployment',
    'staging': 'Staging Deployment',
    'docker': 'Docker Deployment',
    'kubernetes': 'Kubernetes Deployment',
    'infrastructure': 'Infrastructure Setup',
    'monitoring': 'Monitoring Setup',
    'rollback': 'Rollback Procedures',
    'ci_cd': 'CI/CD Pipeline'
  },
  
  // Generate Tasks
  'generate': {
    'configs': 'Generate Configs',
    'documentation': 'Generate Documentation',
    'scripts': 'Generate Scripts',
    'tests': 'Generate Tests',
    'api_docs': 'Generate API Docs',
    'user_guides': 'Generate User Guides'
  },
  
  // Management Tasks
  'management': {
    'port_streaming': 'Port Streaming',
    'process_todo': 'Process Todo List',
    'send_message': 'Send Message',
    'start_streaming': 'Start Streaming',
    'stop_streaming': 'Stop Streaming',
    'test_correction': 'Test Correction',
    'update_test_status': 'Update Test Status',
    'create_task': 'Create Task'
  },
  
  // Security Tasks
  'security': {
    'audit': 'Security Audit',
    'vulnerabilities': 'Vulnerability Fixes',
    'authentication': 'Authentication',
    'authorization': 'Authorization',
    'encryption': 'Encryption',
    'compliance': 'Compliance',
    'scan': 'Security Scan',
    'fix': 'Security Fixes'
  },
  
  // Validation Tasks
  'validation': {
    'input': 'Input Validation',
    'configuration': 'Configuration Validation',
    'data': 'Data Validation',
    'schema': 'Schema Validation',
    'format': 'Format Validation'
  },
  
  // Optimization Tasks
  'optimization': {
    'performance': 'Performance Optimization',
    'memory': 'Memory Optimization',
    'database': 'Database Optimization',
    'caching': 'Caching Strategy',
    'bundling': 'Bundle Optimization',
    'startup': 'Startup Optimization',
    'code': 'Code Optimization',
    'resource': 'Resource Optimization'
  },
  
  // Documentation Tasks
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

/**
 * Get category information including main category, subcategory, and display text
 * @param {string} category - Main category
 * @param {string} subcategory - Subcategory (optional)
 * @returns {Object} Category info object
 */
export const getCategoryInfo = (category, subcategory = null) => {
  const mainCategory = MAIN_CATEGORIES[category] || 'Unknown Category';
  const subCategory = subcategory ? SUB_CATEGORIES[category]?.[subcategory] : null;
  
  return {
    main: mainCategory,
    sub: subCategory,
    display: subCategory ? `${mainCategory} • ${subCategory}` : mainCategory
  };
};

/**
 * Get color for a category
 * @param {string} category - Category name
 * @returns {string} Hex color code
 */
export const getCategoryColor = (category) => {
  const colors = {
    'manual': '#3B82F6',      // Blue
    'analysis': '#06B6D4',    // Cyan
    'testing': '#10B981',     // Emerald
    'refactoring': '#F59E0B', // Amber
    'deployment': '#8B5CF6',  // Violet
    'generate': '#84CC16',    // Lime
    'management': '#6B7280',  // Gray
    'security': '#EF4444',    // Red
    'validation': '#F97316',  // Orange
    'optimization': '#84CC16', // Lime
    'documentation': '#8B5A2B' // Brown
  };
  return colors[category] || '#6B7280';
};

/**
 * Get icon for a category
 * @param {string} category - Category name
 * @returns {string} Emoji icon
 */
export const getCategoryIcon = (category) => {
  const icons = {
    'manual': '📚',
    'analysis': '🔍',
    'testing': '🧪',
    'refactoring': '🔧',
    'deployment': '🚀',
    'generate': '⚡',
    'management': '⚙️',
    'security': '🔒',
    'validation': '✅',
    'optimization': '⚡',
    'documentation': '📖'
  };
  return icons[category] || '📋';
};

/**
 * Get display text for task category and structure
 * @param {string} category - Task category
 * @param {string} subcategory - Task subcategory
 * @param {string} structure - Task structure (legacy field)
 * @returns {string} Formatted display text
 */
export const getCategoryDisplay = (category, subcategory, structure) => {
  if (category && subcategory) {
    return `${MAIN_CATEGORIES[category] || category} • ${SUB_CATEGORIES[category]?.[subcategory] || subcategory}`;
  }
  if (category) {
    return MAIN_CATEGORIES[category] || category;
  }
  if (structure) {
    return `${structure.charAt(0).toUpperCase() + structure.slice(1)} Tasks`;
  }
  return 'Manual Tasks';
};

/**
 * Get all categories for dropdown/select components
 * @returns {Array} Array of category objects with value and label
 */
export const getAllCategories = () => {
  return Object.entries(MAIN_CATEGORIES).map(([value, label]) => ({
    value,
    label
  }));
};

/**
 * Get subcategories for a specific category
 * @param {string} category - Main category
 * @returns {Array} Array of subcategory objects with value and label
 */
export const getSubcategoriesForCategory = (category) => {
  const subcategories = SUB_CATEGORIES[category];
  if (!subcategories) return [];
  
  return Object.entries(subcategories).map(([value, label]) => ({
    value,
    label
  }));
};

/**
 * Validate if a category/subcategory combination is valid
 * @param {string} category - Main category
 * @param {string} subcategory - Subcategory
 * @returns {boolean} True if valid combination
 */
export const isValidCategoryCombination = (category, subcategory) => {
  if (!category || !MAIN_CATEGORIES[category]) return false;
  if (!subcategory) return true; // Subcategory is optional
  return SUB_CATEGORIES[category] && SUB_CATEGORIES[category][subcategory];
};

/**
 * Map task type to category/subcategory based on backend TaskType
 * @param {string} taskType - Task type from backend
 * @returns {Object} Category mapping
 */
export const mapTaskTypeToCategory = (taskType) => {
  if (!taskType) return { category: 'manual', subcategory: 'general' };

  const type = taskType.toLowerCase();
  
  // Analysis tasks
  if (type.includes('analysis') || type.includes('analyze')) {
    return {
      category: 'analysis',
      subcategory: type.includes('architecture') ? 'architecture' :
                   type.includes('quality') ? 'code_quality' :
                   type.includes('dependency') ? 'dependencies' :
                   type.includes('structure') ? 'repo_structure' :
                   type.includes('tech') ? 'tech_stack' :
                   type.includes('performance') ? 'performance' :
                   type.includes('security') ? 'security' :
                   type.includes('layer') ? 'layer_violations' : 'general'
    };
  }
  
  // Testing tasks
  if (type.includes('test')) {
    return {
      category: 'testing',
      subcategory: type.includes('unit') ? 'unit' :
                   type.includes('integration') ? 'integration' :
                   type.includes('e2e') ? 'e2e' :
                   type.includes('performance') ? 'performance' :
                   type.includes('security') ? 'security' :
                   type.includes('coverage') ? 'coverage' :
                   type.includes('fix') ? 'fix' :
                   type.includes('refactor') ? 'refactor' :
                   type.includes('status') ? 'status' :
                   type.includes('report') ? 'report' : 'general'
    };
  }
  
  // Refactoring tasks
  if (type.includes('refactor')) {
    return {
      category: 'refactoring',
      subcategory: type.includes('organize') ? 'organize_modules' :
                   type.includes('restructure') ? 'restructure_architecture' :
                   type.includes('split') ? 'split_large_files' :
                   type.includes('clean') ? 'clean_dependencies' :
                   type.includes('node') ? 'node' :
                   type.includes('react') ? 'react' :
                   type.includes('frontend') ? 'frontend' :
                   type.includes('backend') ? 'backend' :
                   type.includes('database') ? 'database' :
                   type.includes('api') ? 'api' : 'general'
    };
  }
  
  // Deployment tasks
  if (type.includes('deploy')) {
    return {
      category: 'deployment',
      subcategory: type.includes('production') ? 'production' :
                   type.includes('staging') ? 'staging' :
                   type.includes('docker') ? 'docker' :
                   type.includes('kubernetes') ? 'kubernetes' :
                   type.includes('infrastructure') ? 'infrastructure' :
                   type.includes('monitoring') ? 'monitoring' :
                   type.includes('rollback') ? 'rollback' :
                   type.includes('ci') || type.includes('cd') ? 'ci_cd' : 'general'
    };
  }
  
  // Generate tasks
  if (type.includes('generate')) {
    return {
      category: 'generate',
      subcategory: type.includes('config') ? 'configs' :
                   type.includes('documentation') ? 'documentation' :
                   type.includes('script') ? 'scripts' :
                   type.includes('test') ? 'tests' :
                   type.includes('api') ? 'api_docs' :
                   type.includes('guide') ? 'user_guides' : 'general'
    };
  }
  
  // Security tasks
  if (type.includes('security')) {
    return {
      category: 'security',
      subcategory: type.includes('audit') ? 'audit' :
                   type.includes('vulnerability') ? 'vulnerabilities' :
                   type.includes('auth') ? 'authentication' :
                   type.includes('encryption') ? 'encryption' :
                   type.includes('compliance') ? 'compliance' :
                   type.includes('scan') ? 'scan' :
                   type.includes('fix') ? 'fix' : 'general'
    };
  }
  
  // Optimization tasks
  if (type.includes('optimization') || type.includes('optimize')) {
    return {
      category: 'optimization',
      subcategory: type.includes('performance') ? 'performance' :
                   type.includes('memory') ? 'memory' :
                   type.includes('database') ? 'database' :
                   type.includes('cache') ? 'caching' :
                   type.includes('bundle') ? 'bundling' :
                   type.includes('startup') ? 'startup' :
                   type.includes('code') ? 'code' :
                   type.includes('resource') ? 'resource' : 'general'
    };
  }
  
  // Documentation tasks
  if (type.includes('documentation') || type.includes('doc')) {
    return {
      category: 'documentation',
      subcategory: type.includes('api') ? 'api' :
                   type.includes('user') ? 'user' :
                   type.includes('technical') ? 'technical' :
                   type.includes('code') ? 'code' :
                   type.includes('guide') ? 'guides' :
                   type.includes('tutorial') ? 'tutorials' :
                   type.includes('structure') ? 'structure' :
                   type.includes('maintenance') ? 'maintenance' : 'general'
    };
  }
  
  // Default to manual
  return { category: 'manual', subcategory: 'general' };
}; 