# Phase 2B: Advanced Frameworks

## Objective
Add advanced frameworks as separate components within the DDD domain layer.

## Duration: 3 hours

## Concrete Tasks

### 1. Create Deployment Category
- [ ] Create `backend/domain/frameworks/categories/deployment/` directory
- [ ] Create `backend/domain/frameworks/categories/deployment/DockerFramework.js`
- [ ] Create `backend/domain/frameworks/categories/deployment/KubernetesFramework.js`
- [ ] Create `backend/domain/frameworks/categories/deployment/ServerlessFramework.js`

### 2. Implement FrameworkBuilder.js - Haupt-Builder
- [ ] Create `backend/domain/frameworks/FrameworkBuilder.js`
- [ ] Implement `buildFramework()` method
- [ ] Implement `configureFramework()` method
- [ ] Implement `validateFramework()` method
- [ ] Integrate with existing DDD services

### 3. Enhance Framework Integration
- [ ] Update existing frameworks to use FrameworkRegistry
- [ ] Create coordination between frameworks
- [ ] Add advanced capabilities to existing frameworks
- [ ] Validate advanced framework integration

## Concrete Implementation

### 1. DockerFramework.js - Deployment Kategorie
```javascript
/**
 * DockerFramework - Deployment Kategorie
 * Provides Docker deployment capabilities using existing DDD services
 */
const { TaskService } = require('@/domain/services/TaskService');
const { WorkflowOrchestrationService } = require('@/domain/services/WorkflowOrchestrationService');

class DockerFramework {
  constructor(dependencies = {}) {
    this.taskService = dependencies.taskService || new TaskService();
    this.workflowService = dependencies.workflowService || new WorkflowOrchestrationService();
    this.logger = dependencies.logger || console;
  }

  /**
   * 🆕 NEW: Execute Docker deployment
   * @param {Object} context - Deployment context
   * @returns {Promise<Object>} Deployment result
   */
  async deploy(context) {
    this.logger.info('DockerFramework: Starting Docker deployment', {
      projectId: context.projectId,
      deploymentType: context.type
    });

    // Use existing DDD services for core operations
    const task = await this.taskService.createTask({
      projectId: context.projectId,
      title: `Docker Deployment: ${context.type}`,
      description: context.description,
      type: 'deployment',
      priority: context.priority || 'medium'
    });

    // Execute deployment workflow
    const result = await this.workflowService.executeWorkflow(task, {
      framework: 'docker',
      context
    });

    return {
      success: true,
      taskId: task.id,
      result
    };
  }

  /**
   * 🆕 NEW: Get available Docker deployment types
   * @returns {Array} Available deployment types
   */
  getDeploymentTypes() {
    return [
      'docker-compose',
      'docker-swarm',
      'docker-build',
      'docker-push',
      'docker-run'
    ];
  }

  /**
   * 🆕 NEW: Validate deployment context
   * @param {Object} context - Deployment context
   * @returns {boolean} Validation result
   */
  validateDeployment(context) {
    return context.projectId && context.type && this.getDeploymentTypes().includes(context.type);
  }
}

module.exports = DockerFramework;
```

### 2. FrameworkBuilder.js - Haupt-Builder
```javascript
/**
 * FrameworkBuilder - Haupt-Builder für alle Frameworks
 * Erstellt und konfiguriert Frameworks dynamisch
 */
class FrameworkBuilder {
  constructor(dependencies = {}) {
    this.registry = dependencies.registry;
    this.logger = dependencies.logger || console;
  }

  /**
   * 🆕 NEW: Build framework from configuration
   * @param {Object} config - Framework configuration
   * @returns {Object} Built framework
   */
  buildFramework(config) {
    this.logger.info('FrameworkBuilder: Building framework', {
      type: config.type,
      category: config.category
    });

    // Validate configuration
    if (!this.validateFramework(config)) {
      throw new Error('Invalid framework configuration');
    }

    // Create framework instance
    const framework = this.createFrameworkInstance(config);

    // Register framework
    if (this.registry) {
      this.registry.registerFramework(config.key, {
        ...config,
        instance: framework
      });
    }

    return framework;
  }

  /**
   * 🆕 NEW: Configure existing framework
   * @param {string} key - Framework key
   * @param {Object} config - Configuration updates
   * @returns {Object} Updated framework
   */
  configureFramework(key, config) {
    this.logger.info('FrameworkBuilder: Configuring framework', {
      key,
      config
    });

    const framework = this.registry.getFramework(key);
    if (!framework) {
      throw new Error(`Framework not found: ${key}`);
    }

    // Update configuration
    const updatedFramework = {
      ...framework,
      ...config,
      updatedAt: new Date()
    };

    // Re-register framework
    this.registry.registerFramework(key, updatedFramework);

    return updatedFramework;
  }

  /**
   * 🆕 NEW: Validate framework configuration
   * @param {Object} config - Framework configuration
   * @returns {boolean} Validation result
   */
  validateFramework(config) {
    return config.key && config.type && config.category && config.class;
  }

  /**
   * 🆕 NEW: Create framework instance
   * @param {Object} config - Framework configuration
   * @returns {Object} Framework instance
   */
  createFrameworkInstance(config) {
    // This would dynamically create framework instances
    // based on the configuration
    return {
      type: config.type,
      category: config.category,
      key: config.key,
      created: new Date()
    };
  }
}

module.exports = FrameworkBuilder;
```

### 3. Enhanced Framework Integration
```javascript
// Update existing frameworks to use FrameworkRegistry
const FrameworkRegistry = require('./FrameworkRegistry');

class EnhancedAnalysisFramework extends AnalysisFramework {
  constructor(dependencies = {}) {
    super(dependencies);
    this.frameworkRegistry = dependencies.frameworkRegistry || new FrameworkRegistry();
  }

  /**
   * 🆕 ENHANCED: Execute analysis with framework selection
   * @param {Object} context - Analysis context
   * @returns {Promise<Object>} Enhanced analysis result
   */
  async analyzeEnhanced(context) {
    // Get available analysis frameworks
    const analysisFrameworks = this.frameworkRegistry.getFrameworksByType('analysis');
    
    // Select best framework for context
    const selectedFramework = this.selectBestFramework(analysisFrameworks, context);
    
    // Execute with selected framework
    const result = await this.analyze({
      ...context,
      framework: selectedFramework
    });

    return {
      ...result,
      selectedFramework: selectedFramework.key
    };
  }

  /**
   * 🆕 NEW: Select best framework for context
   * @param {Array} frameworks - Available frameworks
   * @param {Object} context - Analysis context
   * @returns {Object} Selected framework
   */
  selectBestFramework(frameworks, context) {
    // Simple selection logic - can be enhanced
    return frameworks.reduce((best, current) => 
      current.priority > best.priority ? current : best
    );
  }
}

module.exports = EnhancedAnalysisFramework;
```

## Success Criteria
- [ ] Deployment category frameworks implemented (Docker, Kubernetes, Serverless)
- [ ] FrameworkBuilder.js implemented as Haupt-Builder
- [ ] Enhanced framework integration working with categories
- [ ] All advanced frameworks integrate with existing DDD services
- [ ] No changes to existing DDD services
- [ ] Advanced features provide framework management and building

## Dependencies
- Requires: Phase 2A completion (Core frameworks)
- Blocks: Phase 3 start

## Next Phase
Phase 3: Core Steps 