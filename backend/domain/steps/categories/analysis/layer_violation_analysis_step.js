/**
 * Layer Violation Analysis Step - Core Analysis Step
 * Analyzes and fixes layer boundary violations in the codebase
 */

const StepBuilder = require('@steps/StepBuilder');
const Logger = require('@logging/Logger');
const fs = require('fs').promises;
const path = require('path');

const logger = new Logger('layer_violation_analysis_step');

// Step configuration
const config = {
  name: 'LayerViolationAnalysisStep',
  type: 'analysis',
  description: 'Analyzes and fixes layer boundary violations in the codebase',
  category: 'analysis',
  version: '1.0.0',
  dependencies: [],
  settings: {
    timeout: 60000,
    includeViolations: true,
    includeFixes: true,
    includeFixPlans: true,
    generateTasks: true,
    createDocs: true
  },
  validation: {
    requiredFiles: ['package.json'],
    supportedProjects: ['nodejs', 'react', 'vue', 'angular', 'express', 'nest']
  }
};

// Export config for StepRegistry
module.exports.config = config;

class LayerViolationAnalysisStep {
  constructor() {
    this.name = config.name;
    this.config = config;
  }

  /**
   * Execute the layer violation analysis step
   * @param {Object} context - Execution context
   * @returns {Promise<Object>} Analysis result
   */
  async execute(context = {}) {
    const step = StepBuilder.build(config, context);
    
    try {
      logger.info(`🔍 Executing ${this.name}...`);
      
      // Validate context
      this.validateContext(context);
      
      const projectPath = context.projectPath || process.cwd();
      const startTime = Date.now();
      
      logger.debug(`📊 Starting layer violation analysis for: ${projectPath}`);

      // 1. Run layer violation analysis
      const violations = await this.analyzeLayerViolations(projectPath, context);
      
      // 2. Generate fix recommendations
      const fixes = await this.generateFixRecommendations(violations, context);
      
      // 3. Create fix plans
      const fixPlans = await this.createFixPlans(fixes, projectPath, context);
      
      // 4. Generate tasks if requested
      let tasks = [];
      if (context.generateTasks !== false) {
        tasks = await this.generateTasksFromViolations(violations, fixes, context);
      }
      
      // 5. Create documentation if requested
      let docs = [];
      if (context.createDocs !== false) {
        docs = await this.createDocumentation(violations, fixes, projectPath, context);
      }
      
      // 6. Build result
      const result = {
        violations: violations,
        fixes: fixes,
        fixPlans: fixPlans,
        tasks: tasks,
        documentation: docs,
        analysisTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        summary: {
          totalViolations: violations.length,
          criticalViolations: violations.filter(v => v.severity === 'critical').length,
          highViolations: violations.filter(v => v.severity === 'high').length,
          mediumViolations: violations.filter(v => v.severity === 'medium').length,
          totalFixes: fixes.length,
          totalTasks: tasks.length,
          totalDocs: docs.length
        }
      };

      logger.info(`✅ ${this.name} completed successfully in ${result.analysisTime}ms`);
      logger.info(`📊 Found ${result.summary.totalViolations} violations (${result.summary.criticalViolations} critical)`);
      
      return {
        success: true,
        data: result,
        message: `Layer violation analysis completed: ${result.summary.totalViolations} violations found`
      };
      
    } catch (error) {
      logger.error(`❌ ${this.name} failed:`, error);
      
      return {
        success: false,
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  /**
   * Validate execution context
   * @param {Object} context - Execution context
   */
  validateContext(context) {
    if (!context.projectPath && !process.cwd()) {
      throw new Error('Project path is required for layer violation analysis');
    }
  }

  /**
   * Analyze layer violations using the existing script
   * @param {string} projectPath - Project path
   * @param {Object} context - Execution context
   * @returns {Promise<Array>} Violations
   */
  async analyzeLayerViolations(projectPath, context) {
    try {
      logger.info('🔍 Running layer violation analysis...');
      
      // Import and use the existing LayerViolationFixer
      const LayerViolationFixer = require('@scripts/fix-layer-violations');
      const fixer = new LayerViolationFixer();
      
      // Override the output directory to use project-specific path
      const outputDir = path.join(projectPath, 'output/fix-plans');
      fixer.outputDir = outputDir;
      
      // Run analysis without generating files (we'll do that separately)
      await fixer.scanControllers();
      await fixer.scanHandlers();
      await fixer.scanServices();
      
      logger.info(`✅ Found ${fixer.violations.length} violations`);
      return fixer.violations;
      
    } catch (error) {
      logger.error('❌ Layer violation analysis failed:', error);
      throw error;
    }
  }

  /**
   * Generate fix recommendations
   * @param {Array} violations - Violations found
   * @param {Object} context - Execution context
   * @returns {Promise<Array>} Fix recommendations
   */
  async generateFixRecommendations(violations, context) {
    try {
      logger.info('🔧 Generating fix recommendations...');
      
      // Group violations by file
      const violationsByFile = {};
      violations.forEach(v => {
        if (!violationsByFile[v.file]) {
          violationsByFile[v.file] = [];
        }
        violationsByFile[v.file].push(v);
      });

      // Generate fixes for each file
      const fixes = [];
      Object.entries(violationsByFile).forEach(([file, fileViolations]) => {
        const fix = this.generateFileFix(file, fileViolations);
        if (fix) {
          fixes.push(fix);
        }
      });
      
      logger.info(`✅ Generated ${fixes.length} fix recommendations`);
      return fixes;
      
    } catch (error) {
      logger.error('❌ Fix recommendation generation failed:', error);
      throw error;
    }
  }

  /**
   * Generate fix for a specific file
   * @param {string} file - File path
   * @param {Array} violations - Violations in the file
   * @returns {Object|null} Fix recommendation
   */
  generateFileFix(file, violations) {
    const fileName = path.basename(file, '.js');
    const isController = file.includes('presentation/api');
    const isHandler = file.includes('application/handlers');
    const isService = file.includes('application/services');

    if (isController) {
      return {
        file,
        type: 'controller-refactor',
        priority: 'critical',
        steps: [
          `1. Create ${fileName.replace('Controller', 'ApplicationService')} if not exists`,
          `2. Move business logic from ${fileName} to Application Service`,
          `3. Update ${fileName} constructor to inject Application Service only`,
          `4. Remove direct domain/infrastructure imports from ${fileName}`,
          `5. Ensure ${fileName} only handles HTTP concerns`
        ],
        example: this.generateControllerExample(fileName)
      };
    }

    if (isHandler) {
      return {
        file,
        type: 'handler-refactor',
        priority: 'high',
        steps: [
          `1. Use dependency injection for infrastructure services`,
          `2. Remove direct infrastructure imports from ${fileName}`,
          `3. Ensure ${fileName} only orchestrates domain services`
        ]
      };
    }

    if (isService) {
      return {
        file,
        type: 'service-refactor',
        priority: 'medium',
        steps: [
          `1. Remove presentation layer dependencies from ${fileName}`,
          `2. Ensure ${fileName} only depends on domain and infrastructure layers`
        ]
      };
    }

    return null;
  }

  /**
   * Generate controller refactor example
   * @param {string} controllerName - Controller name
   * @returns {string} Example code
   */
  generateControllerExample(controllerName) {
    const serviceName = controllerName.replace('Controller', 'ApplicationService');
    
    return `// ❌ BEFORE (Violation):
class ${controllerName} {
  constructor(taskRepository, taskService, domainEntity) {
    this.taskRepository = taskRepository; // ❌ Direct repository
    this.taskService = taskService;       // ❌ Direct domain service
    this.domainEntity = domainEntity;     // ❌ Direct domain entity
  }
}

// ✅ AFTER (Correct):
class ${controllerName} {
  constructor(${serviceName.toLowerCase()}) {
    this.${serviceName.toLowerCase()} = ${serviceName.toLowerCase()}; // ✅ Only Application Service
  }
  
  async createTask(req, res) {
    try {
      const result = await this.${serviceName.toLowerCase()}.createTask(req.body);
      res.status(201).json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
}`;
  }

  /**
   * Create fix plans
   * @param {Array} fixes - Fix recommendations
   * @param {string} projectPath - Project path
   * @param {Object} context - Execution context
   * @returns {Promise<Array>} Fix plans
   */
  async createFixPlans(fixes, projectPath, context) {
    try {
      logger.info('📝 Creating fix plans...');
      
      const fixPlans = [];
      const outputDir = path.join(projectPath, 'output/fix-plans');
      
      // Ensure output directory exists
      await fs.mkdir(outputDir, { recursive: true });
      
      // Generate individual fix plans
      for (const fix of fixes) {
        const plan = await this.generateIndividualFixPlan(fix, outputDir);
        fixPlans.push(plan);
      }
      
      // Generate master plan
      const masterPlan = await this.generateMasterPlan(fixes, outputDir);
      fixPlans.push(masterPlan);
      
      logger.info(`✅ Created ${fixPlans.length} fix plans`);
      return fixPlans;
      
    } catch (error) {
      logger.error('❌ Fix plan creation failed:', error);
      throw error;
    }
  }

  /**
   * Generate individual fix plan
   * @param {Object} fix - Fix recommendation
   * @param {string} outputDir - Output directory
   * @returns {Promise<Object>} Fix plan
   */
  async generateIndividualFixPlan(fix, outputDir) {
    const fileName = path.basename(fix.file, '.js');
    const planFileName = `${fileName}-fix-plan.md`;
    const planPath = path.join(outputDir, planFileName);
    
    let planContent = `# Fix Plan: ${fileName}\n\n`;
    planContent += `**File:** \`${fix.file}\`\n`;
    planContent += `**Type:** ${fix.type}\n`;
    planContent += `**Priority:** ${fix.priority.toUpperCase()}\n\n`;
    
    planContent += `## Steps to Fix:\n\n`;
    fix.steps.forEach((step, index) => {
      planContent += `${index + 1}. ${step}\n`;
    });
    
    if (fix.example) {
      planContent += `\n## Code Example:\n\n`;
      planContent += `\`\`\`javascript\n`;
      planContent += fix.example;
      planContent += `\n\`\`\`\n`;
    }
    
    planContent += `\n## Status:\n\n`;
    planContent += `- [ ] Not started\n`;
    planContent += `- [ ] In progress\n`;
    planContent += `- [ ] Completed\n`;
    planContent += `- [ ] Validated\n`;
    
    await fs.writeFile(planPath, planContent);
    
    return {
      type: 'individual-plan',
      file: planPath,
      fileName: planFileName,
      fix: fix
    };
  }

  /**
   * Generate master fix plan
   * @param {Array} fixes - Fix recommendations
   * @param {string} outputDir - Output directory
   * @returns {Promise<Object>} Master plan
   */
  async generateMasterPlan(fixes, outputDir) {
    const masterPlanPath = path.join(outputDir, 'MASTER-FIX-PLAN.md');
    
    let content = `# Master Fix Plan - PIDEA Layer Violations\n\n`;
    content += `**Generated:** ${new Date().toISOString()}\n`;
    content += `**Total Fixes:** ${fixes.length}\n\n`;
    
    // Critical Fixes
    const criticalFixes = fixes.filter(f => f.priority === 'critical');
    if (criticalFixes.length > 0) {
      content += `## 🚨 Critical Fixes (Start Here):\n\n`;
      criticalFixes.forEach((fix, index) => {
        const fileName = path.basename(fix.file, '.js');
        content += `### ${index + 1}. ${fileName}\n`;
        content += `- **File:** \`${fix.file}\`\n`;
        content += `- **Plan:** [${fileName}-fix-plan.md](./${fileName}-fix-plan.md)\n`;
        content += `- **Status:** ⏳ Pending\n\n`;
      });
    }
    
    // High Priority Fixes
    const highFixes = fixes.filter(f => f.priority === 'high');
    if (highFixes.length > 0) {
      content += `## ⚠️ High Priority Fixes:\n\n`;
      highFixes.forEach((fix, index) => {
        const fileName = path.basename(fix.file, '.js');
        content += `### ${index + 1}. ${fileName}\n`;
        content += `- **File:** \`${fix.file}\`\n`;
        content += `- **Plan:** [${fileName}-fix-plan.md](./${fileName}-fix-plan.md)\n`;
        content += `- **Status:** ⏳ Pending\n\n`;
      });
    }
    
    await fs.writeFile(masterPlanPath, content);
    
    return {
      type: 'master-plan',
      file: masterPlanPath,
      fileName: 'MASTER-FIX-PLAN.md',
      totalFixes: fixes.length
    };
  }

  /**
   * Generate tasks from violations
   * @param {Array} violations - Violations found
   * @param {Array} fixes - Fix recommendations
   * @param {Object} context - Execution context
   * @returns {Promise<Array>} Generated tasks
   */
  async generateTasksFromViolations(violations, fixes, context) {
    try {
      logger.info('📋 Generating tasks from violations...');
      
      const tasks = [];
      const projectId = context.projectId || 'default-project';
      
      // Group fixes by priority
      const criticalFixes = fixes.filter(f => f.priority === 'critical');
      const highFixes = fixes.filter(f => f.priority === 'high');
      const mediumFixes = fixes.filter(f => f.priority === 'medium');
      
      // Create main layer violation task
      const mainTask = {
        id: `layer-violation-fix-${Date.now()}`,
        title: 'Fix Layer Boundary Violations',
        description: `Fix ${violations.length} layer boundary violations found in the codebase`,
        type: 'refactor',
        category: 'backend',
        priority: 'high',
        status: 'pending',
        projectId: projectId,
        metadata: {
          violations: violations.length,
          criticalViolations: violations.filter(v => v.severity === 'critical').length,
          highViolations: violations.filter(v => v.severity === 'high').length,
          mediumViolations: violations.filter(v => v.severity === 'medium').length,
          fixes: fixes.length,
          source: 'LayerViolationAnalysisStep'
        },
        estimatedHours: this.calculateEstimatedHours(fixes),
        phase: 'layer-violation-fix',
        stage: 'planning'
      };
      
      tasks.push(mainTask);
      
      // Create subtasks for each priority level
      if (criticalFixes.length > 0) {
        const criticalTask = {
          id: `critical-layer-fixes-${Date.now()}`,
          title: 'Fix Critical Layer Violations',
          description: `Fix ${criticalFixes.length} critical layer boundary violations`,
          type: 'refactor',
          category: 'backend',
          priority: 'critical',
          status: 'pending',
          projectId: projectId,
          parentTaskId: mainTask.id,
          metadata: {
            fixes: criticalFixes,
            source: 'LayerViolationAnalysisStep'
          },
          estimatedHours: this.calculateEstimatedHours(criticalFixes),
          phase: 'layer-violation-fix',
          stage: 'critical-fixes'
        };
        tasks.push(criticalTask);
      }
      
      if (highFixes.length > 0) {
        const highTask = {
          id: `high-layer-fixes-${Date.now()}`,
          title: 'Fix High Priority Layer Violations',
          description: `Fix ${highFixes.length} high priority layer boundary violations`,
          type: 'refactor',
          category: 'backend',
          priority: 'high',
          status: 'pending',
          projectId: projectId,
          parentTaskId: mainTask.id,
          metadata: {
            fixes: highFixes,
            source: 'LayerViolationAnalysisStep'
          },
          estimatedHours: this.calculateEstimatedHours(highFixes),
          phase: 'layer-violation-fix',
          stage: 'high-fixes'
        };
        tasks.push(highTask);
      }
      
      logger.info(`✅ Generated ${tasks.length} tasks from violations`);
      return tasks;
      
    } catch (error) {
      logger.error('❌ Task generation failed:', error);
      throw error;
    }
  }

  /**
   * Calculate estimated hours for fixes
   * @param {Array} fixes - Fix recommendations
   * @returns {number} Estimated hours
   */
  calculateEstimatedHours(fixes) {
    let totalHours = 0;
    
    fixes.forEach(fix => {
      switch (fix.priority) {
        case 'critical':
          totalHours += 2; // 2 hours per critical fix
          break;
        case 'high':
          totalHours += 1.5; // 1.5 hours per high priority fix
          break;
        case 'medium':
          totalHours += 1; // 1 hour per medium priority fix
          break;
        default:
          totalHours += 1;
      }
    });
    
    return Math.max(1, Math.round(totalHours * 10) / 10); // Round to 1 decimal place, minimum 1 hour
  }

  /**
   * Create documentation
   * @param {Array} violations - Violations found
   * @param {Array} fixes - Fix recommendations
   * @param {string} projectPath - Project path
   * @param {Object} context - Execution context
   * @returns {Promise<Array>} Created documentation
   */
  async createDocumentation(violations, fixes, projectPath, context) {
    try {
      logger.info('📚 Creating documentation...');
      
      const docs = [];
      const docsDir = path.join(projectPath, 'docs/09_roadmap/tasks/backend/layer-violation-fix');
      
      // Ensure docs directory exists
      await fs.mkdir(docsDir, { recursive: true });
      
      // Create implementation file
      const implementationDoc = await this.createImplementationDoc(violations, fixes, docsDir);
      docs.push(implementationDoc);
      
      // Create phase files
      const phaseDocs = await this.createPhaseDocs(fixes, docsDir);
      docs.push(...phaseDocs);
      
      logger.info(`✅ Created ${docs.length} documentation files`);
      return docs;
      
    } catch (error) {
      logger.error('❌ Documentation creation failed:', error);
      throw error;
    }
  }

  /**
   * Create implementation documentation
   * @param {Array} violations - Violations found
   * @param {Array} fixes - Fix recommendations
   * @param {string} docsDir - Documentation directory
   * @returns {Promise<Object>} Implementation doc
   */
  async createImplementationDoc(violations, fixes, docsDir) {
    const implementationPath = path.join(docsDir, 'layer-violation-fix-implementation.md');
    
    let content = `# Layer Violation Fix Implementation

## 1. Project Overview
- **Feature/Component Name**: Layer Violation Fix
- **Priority**: High
- **Category**: backend
- **Estimated Time**: ${this.calculateEstimatedHours(fixes)} hours
- **Dependencies**: None
- **Related Issues**: Layer boundary violations in codebase

## 2. Technical Requirements
- **Tech Stack**: Node.js, DDD Architecture
- **Architecture Pattern**: Domain-Driven Design (DDD)
- **Database Changes**: None
- **API Changes**: None
- **Backend Changes**: Refactor controllers, handlers, and services
- **Frontend Changes**: None
- **Infrastructure Changes**: None

## 3. File Impact Analysis
#### Files to Modify:
${fixes.map(fix => `- [ ] \`${fix.file}\` - ${fix.type} (${fix.priority} priority)`).join('\n')}

## 4. Implementation Phases

#### Phase 1: Critical Fixes (${this.calculateEstimatedHours(fixes.filter(f => f.priority === 'critical'))} hours)
- [ ] Fix critical controller violations
- [ ] Create missing Application Services
- [ ] Update controller constructors
- [ ] Remove direct domain imports

#### Phase 2: High Priority Fixes (${this.calculateEstimatedHours(fixes.filter(f => f.priority === 'high'))} hours)
- [ ] Fix high priority handler violations
- [ ] Implement dependency injection
- [ ] Remove infrastructure imports

#### Phase 3: Medium Priority Fixes (${this.calculateEstimatedHours(fixes.filter(f => f.priority === 'medium'))} hours)
- [ ] Fix medium priority service violations
- [ ] Remove presentation dependencies
- [ ] Validate layer boundaries

## 5. Success Criteria
- [ ] All critical violations fixed
- [ ] All high priority violations fixed
- [ ] Layer validation passes
- [ ] Tests continue to pass
- [ ] Architecture integrity maintained

## 6. Risk Assessment
- **Low Risk**: Well-defined fixes with clear examples
- **Mitigation**: Phase-by-phase implementation with validation

## 7. Validation
- Run layer validation after each phase
- Execute test suite
- Verify architecture compliance
`;
    
    await fs.writeFile(implementationPath, content);
    
    return {
      type: 'implementation',
      file: implementationPath,
      fileName: 'layer-violation-fix-implementation.md'
    };
  }

  /**
   * Create phase documentation
   * @param {Array} fixes - Fix recommendations
   * @param {string} docsDir - Documentation directory
   * @returns {Promise<Array>} Phase docs
   */
  async createPhaseDocs(fixes, docsDir) {
    const phaseDocs = [];
    
    // Phase 1: Critical Fixes
    const criticalFixes = fixes.filter(f => f.priority === 'critical');
    if (criticalFixes.length > 0) {
      const phase1Path = path.join(docsDir, 'layer-violation-fix-phase-1.md');
      let content = `# Phase 1: Critical Layer Violation Fixes

## 📋 Phase Overview
- **Phase**: 1 of 3
- **Duration**: ${this.calculateEstimatedHours(criticalFixes)} hours
- **Priority**: Critical
- **Status**: Ready
- **Dependencies**: None

## 🎯 **GOAL: Fix Critical Layer Violations**

### **Objective:**
- 🔧 **FIX**: All critical controller violations
- 🏗️ **CREATE**: Missing Application Services
- 🔄 **UPDATE**: Controller constructors
- 🗑️ **REMOVE**: Direct domain imports

## 📋 **Files to Fix:**

${criticalFixes.map(fix => `### ${path.basename(fix.file, '.js')}
- **File:** \`${fix.file}\`
- **Type:** ${fix.type}
- **Steps:**
${fix.steps.map((step, index) => `${index + 1}. ${step}`).join('\n')}
`).join('\n\n')}

## ✅ **Success Criteria:**
- [ ] All critical violations resolved
- [ ] Controllers only use Application Services
- [ ] No direct domain imports in controllers
- [ ] Layer validation passes
`;
      
      await fs.writeFile(phase1Path, content);
      phaseDocs.push({
        type: 'phase',
        file: phase1Path,
        fileName: 'layer-violation-fix-phase-1.md',
        phase: 1
      });
    }
    
    // Phase 2: High Priority Fixes
    const highFixes = fixes.filter(f => f.priority === 'high');
    if (highFixes.length > 0) {
      const phase2Path = path.join(docsDir, 'layer-violation-fix-phase-2.md');
      let content = `# Phase 2: High Priority Layer Violation Fixes

## 📋 Phase Overview
- **Phase**: 2 of 3
- **Duration**: ${this.calculateEstimatedHours(highFixes)} hours
- **Priority**: High
- **Status**: Ready
- **Dependencies**: Phase 1 completion

## 🎯 **GOAL: Fix High Priority Layer Violations**

### **Objective:**
- 🔧 **FIX**: All high priority handler violations
- 💉 **IMPLEMENT**: Dependency injection
- 🗑️ **REMOVE**: Infrastructure imports

## 📋 **Files to Fix:**

${highFixes.map(fix => `### ${path.basename(fix.file, '.js')}
- **File:** \`${fix.file}\`
- **Type:** ${fix.type}
- **Steps:**
${fix.steps.map((step, index) => `${index + 1}. ${step}`).join('\n')}
`).join('\n\n')}

## ✅ **Success Criteria:**
- [ ] All high priority violations resolved
- [ ] Handlers use dependency injection
- [ ] No direct infrastructure imports
- [ ] Layer validation passes
`;
      
      await fs.writeFile(phase2Path, content);
      phaseDocs.push({
        type: 'phase',
        file: phase2Path,
        fileName: 'layer-violation-fix-phase-2.md',
        phase: 2
      });
    }
    
    return phaseDocs;
  }
}

// Export the step class
module.exports = LayerViolationAnalysisStep; 