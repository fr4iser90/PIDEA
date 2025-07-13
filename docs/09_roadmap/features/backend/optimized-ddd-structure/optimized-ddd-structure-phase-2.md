# Optimized DDD Structure – Phase 2: JSON Configuration Service

## Overview
Implement the JSON-based workflow configuration service that leverages existing registry patterns for easy workflow definition and execution. This phase creates the WorkflowConfigService and integrates it with the existing registry system.

## Objectives
- [ ] Create WorkflowConfigService for JSON-based workflow execution
- [ ] Implement JSON parser and validation system
- [ ] Integrate with existing registry patterns (FrameworkRegistry, StepRegistry)
- [ ] Create API endpoint for JSON workflow execution
- [ ] Add comprehensive error handling and logging
- [ ] Implement workflow validation and testing

## Deliverables
- File: `backend/domain/services/WorkflowConfigService.js` - Main JSON workflow service
- File: `backend/domain/services/WorkflowValidator.js` - JSON validation service
- File: `backend/presentation/api/WorkflowConfigController.js` - API controller
- File: `backend/presentation/api/routes/workflow-config.js` - API routes
- File: `tests/unit/domain/services/WorkflowConfigService.test.js` - Service tests
- File: `tests/integration/api/workflow-config.test.js` - API integration tests
- File: `docs/examples/workflow-configs/` - Example JSON configurations

## Dependencies
- Requires: Phase 1 completion (Core Standardization)
- Blocks: Phase 3 start (Advanced Integration)

## Estimated Time
3 hours

## Success Criteria
- [ ] WorkflowConfigService can execute workflows from JSON configuration
- [ ] JSON validation works correctly for all workflow types
- [ ] API endpoints are functional and properly documented
- [ ] Integration with existing registry patterns works seamlessly
- [ ] Error handling covers all failure scenarios
- [ ] Tests pass with 95% coverage
- [ ] Example configurations are provided and working

## Implementation Details

### 1. WorkflowConfigService.js Implementation
```javascript
/**
 * WorkflowConfigService - JSON-basierte Workflow-Ausführung
 * Nutzt deine bestehenden Registry-Patterns für einfache Konfiguration
 */
const FrameworkRegistry = require('../frameworks/FrameworkRegistry');
const WorkflowRegistry = require('../workflows/WorkflowRegistry');
const StepRegistry = require('../steps/StepRegistry');
const { isValidCategory } = require('../constants/Categories');

class WorkflowConfigService {
  constructor(dependencies = {}) {
    this.frameworkRegistry = dependencies.frameworkRegistry || FrameworkRegistry;
    this.workflowRegistry = dependencies.workflowRegistry || WorkflowRegistry;
    this.stepRegistry = dependencies.stepRegistry || StepRegistry;
    this.validator = dependencies.validator || new WorkflowValidator();
    this.logger = dependencies.logger || console;
  }

  /**
   * Führe Workflow aus JSON-Konfiguration aus
   * @param {Object} config - Workflow-Konfiguration
   * @param {Object} context - Ausführungskontext
   * @returns {Promise<Object>} Ausführungsergebnis
   */
  async executeFromConfig(config, context = {}) {
    try {
      this.logger.info('WorkflowConfigService: Starting workflow execution', {
        name: config.name,
        framework: config.framework
      });

      // 1. Validiere Konfiguration
      const validation = this.validator.validateConfig(config);
      if (!validation.isValid) {
        throw new Error(`Workflow validation failed: ${validation.errors.join(', ')}`);
      }

      // 2. Framework aus Registry holen
      const framework = this.frameworkRegistry.getFramework(config.framework);
      
      // 3. Workflow aus Registry holen (falls vorhanden)
      let workflow = null;
      if (config.workflow) {
        workflow = this.workflowRegistry.getWorkflow(config.workflow);
      }
      
      // 4. Steps aus Registry holen
      const steps = config.steps.map(stepConfig => {
        const step = this.stepRegistry.getStep(stepConfig.name);
        if (!step) {
          throw new Error(`Step not found: ${stepConfig.name}`);
        }
        return {
          ...step,
          options: stepConfig.options || {}
        };
      });

      // 5. Ausführungskontext erweitern
      const executionContext = {
        ...context,
        workflowName: config.name,
        workflowVersion: config.version,
        metadata: config.metadata || {},
        config: config
      };

      // 6. Workflow ausführen
      let result;
      if (workflow) {
        // Mit vordefiniertem Workflow
        result = await framework.execute(workflow, executionContext);
      } else {
        // Mit Steps-Konfiguration
        result = await this.executeSteps(steps, executionContext);
      }

      this.logger.info('WorkflowConfigService: Workflow execution completed', {
        name: config.name,
        success: result.success
      });

      return result;
    } catch (error) {
      this.logger.error('WorkflowConfigService: Workflow execution failed', {
        name: config.name,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Führe Steps direkt aus
   * @param {Array} steps - Steps-Konfiguration
   * @param {Object} context - Ausführungskontext
   * @returns {Promise<Object>} Ausführungsergebnis
   */
  async executeSteps(steps, context) {
    const results = [];
    const startTime = Date.now();
    
    for (const step of steps) {
      try {
        this.logger.info(`Executing step: ${step.name}`);
        
        const stepResult = await this.stepRegistry.executeStep(
          step.name, 
          { ...context, stepOptions: step.options }
        );
        
        results.push({
          step: step.name,
          success: true,
          result: stepResult,
          duration: stepResult.duration || 0
        });
        
        this.logger.info(`Step completed: ${step.name}`, { success: true });
      } catch (error) {
        this.logger.error(`Step execution failed: ${step.name}`, error);
        results.push({ 
          step: step.name, 
          success: false, 
          error: error.message 
        });
      }
    }

    const totalDuration = Date.now() - startTime;
    const successfulSteps = results.filter(r => r.success).length;

    return {
      success: results.every(r => r.success),
      results,
      totalSteps: steps.length,
      successfulSteps,
      failedSteps: steps.length - successfulSteps,
      totalDuration,
      workflowName: context.workflowName
    };
  }

  /**
   * Validiere Workflow-Konfiguration
   * @param {Object} config - Workflow-Konfiguration
   * @returns {Object} Validierungsergebnis
   */
  validateConfig(config) {
    return this.validator.validateConfig(config);
  }

  /**
   * Lade Workflow-Konfiguration aus Datei
   * @param {string} filePath - Pfad zur JSON-Datei
   * @returns {Promise<Object>} Workflow-Konfiguration
   */
  async loadConfigFromFile(filePath) {
    try {
      const fs = require('fs').promises;
      const content = await fs.readFile(filePath, 'utf8');
      const config = JSON.parse(content);
      
      // Validiere Konfiguration
      const validation = this.validateConfig(config);
      if (!validation.isValid) {
        throw new Error(`Invalid workflow config: ${validation.errors.join(', ')}`);
      }
      
      return config;
    } catch (error) {
      throw new Error(`Failed to load workflow config from ${filePath}: ${error.message}`);
    }
  }
}

module.exports = WorkflowConfigService;
```

### 2. WorkflowValidator.js Implementation
```javascript
/**
 * WorkflowValidator - JSON Workflow Validation Service
 * Validates workflow configurations against schema and business rules
 */
const { isValidCategory } = require('../constants/Categories');

class WorkflowValidator {
  constructor() {
    this.requiredFields = ['name', 'framework', 'steps'];
    this.optionalFields = ['description', 'version', 'workflow', 'metadata'];
  }

  /**
   * Validiere Workflow-Konfiguration
   * @param {Object} config - Workflow-Konfiguration
   * @returns {Object} Validierungsergebnis
   */
  validateConfig(config) {
    const errors = [];

    // 1. Grundlegende Struktur validieren
    if (!config || typeof config !== 'object') {
      errors.push('Configuration must be a valid object');
      return { isValid: false, errors };
    }

    // 2. Pflichtfelder prüfen
    for (const field of this.requiredFields) {
      if (!config[field]) {
        errors.push(`${field} is required`);
      }
    }

    // 3. Steps-Array validieren
    if (config.steps) {
      if (!Array.isArray(config.steps)) {
        errors.push('Steps must be an array');
      } else {
        config.steps.forEach((step, index) => {
          const stepErrors = this.validateStep(step, index);
          errors.push(...stepErrors);
        });
      }
    }

    // 4. Framework validieren
    if (config.framework && !isValidCategory(config.framework)) {
      errors.push(`Invalid framework category: ${config.framework}`);
    }

    // 5. Version validieren (falls vorhanden)
    if (config.version && !this.isValidVersion(config.version)) {
      errors.push(`Invalid version format: ${config.version}`);
    }

    // 6. Metadata validieren (falls vorhanden)
    if (config.metadata && typeof config.metadata !== 'object') {
      errors.push('Metadata must be an object');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validiere einzelnen Step
   * @param {Object} step - Step-Konfiguration
   * @param {number} index - Step-Index
   * @returns {Array} Validierungsfehler
   */
  validateStep(step, index) {
    const errors = [];

    if (!step.name) {
      errors.push(`Step ${index}: name is required`);
    }

    if (!step.category) {
      errors.push(`Step ${index}: category is required`);
    } else if (!isValidCategory(step.category)) {
      errors.push(`Step ${index}: invalid category '${step.category}'`);
    }

    if (step.options && typeof step.options !== 'object') {
      errors.push(`Step ${index}: options must be an object`);
    }

    return errors;
  }

  /**
   * Validiere Version-Format
   * @param {string} version - Version-String
   * @returns {boolean} True wenn gültig
   */
  isValidVersion(version) {
    const versionRegex = /^\d+\.\d+\.\d+$/;
    return versionRegex.test(version);
  }

  /**
   * Validiere JSON-Schema
   * @param {Object} config - Workflow-Konfiguration
   * @returns {Object} Schema-Validierungsergebnis
   */
  validateSchema(config) {
    // Hier könnte ein JSON-Schema-Validator verwendet werden
    // Für jetzt verwenden wir die einfache Validierung
    return this.validateConfig(config);
  }
}

module.exports = WorkflowValidator;
```

### 3. WorkflowConfigController.js Implementation
```javascript
/**
 * WorkflowConfigController - API Controller für JSON-Workflows
 * RESTful API für Workflow-Konfiguration und -Ausführung
 */
const WorkflowConfigService = require('@domain/services/WorkflowConfigService');

class WorkflowConfigController {
  constructor(dependencies = {}) {
    this.workflowConfigService = dependencies.workflowConfigService || new WorkflowConfigService();
    this.logger = dependencies.logger || console;
  }

  /**
   * Führe Workflow aus JSON-Konfiguration aus
   * POST /api/workflow-config/execute
   */
  async executeWorkflow(req, res) {
    try {
      const { config, context = {} } = req.body;

      if (!config) {
        return res.status(400).json({
          success: false,
          error: 'Workflow configuration is required'
        });
      }

      const result = await this.workflowConfigService.executeFromConfig(config, context);

      res.json({
        success: true,
        result,
        timestamp: new Date()
      });
    } catch (error) {
      this.logger.error('WorkflowConfigController: Execution failed', error);
      
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date()
      });
    }
  }

  /**
   * Validiere Workflow-Konfiguration
   * POST /api/workflow-config/validate
   */
  async validateConfig(req, res) {
    try {
      const { config } = req.body;

      if (!config) {
        return res.status(400).json({
          success: false,
          error: 'Workflow configuration is required'
        });
      }

      const validation = this.workflowConfigService.validateConfig(config);

      res.json({
        success: true,
        validation,
        timestamp: new Date()
      });
    } catch (error) {
      this.logger.error('WorkflowConfigController: Validation failed', error);
      
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date()
      });
    }
  }

  /**
   * Führe Workflow aus Datei aus
   * POST /api/workflow-config/execute-file
   */
  async executeFromFile(req, res) {
    try {
      const { filePath, context = {} } = req.body;

      if (!filePath) {
        return res.status(400).json({
          success: false,
          error: 'File path is required'
        });
      }

      const config = await this.workflowConfigService.loadConfigFromFile(filePath);
      const result = await this.workflowConfigService.executeFromConfig(config, context);

      res.json({
        success: true,
        result,
        config,
        timestamp: new Date()
      });
    } catch (error) {
      this.logger.error('WorkflowConfigController: File execution failed', error);
      
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date()
      });
    }
  }
}

module.exports = WorkflowConfigController;
```

### 4. API Routes Implementation
```javascript
/**
 * Workflow Config API Routes
 * RESTful endpoints für JSON-Workflow-Management
 */
const express = require('express');
const WorkflowConfigController = require('../WorkflowConfigController');

const router = express.Router();
const controller = new WorkflowConfigController();

// Workflow ausführung
router.post('/execute', controller.executeWorkflow.bind(controller));

// Workflow validierung
router.post('/validate', controller.validateConfig.bind(controller));

// Workflow aus Datei ausführen
router.post('/execute-file', controller.executeFromFile.bind(controller));

module.exports = router;
```

## Example JSON Configurations

### docs/examples/workflow-configs/system-health-check.json
```json
{
  "name": "System Health Check",
  "description": "Comprehensive system analysis workflow",
  "framework": "analysis",
  "workflow": "system_health_check",
  "version": "1.0.0",
  "steps": [
    {
      "name": "check_container_status",
      "category": "analysis",
      "options": {
        "container": "pidea-backend",
        "timeout": 30
      }
    },
    {
      "name": "check_gpu_usage",
      "category": "analysis",
      "options": {
        "threshold": 80,
        "warning": 60
      }
    },
    {
      "name": "analyze_code_quality",
      "category": "analysis",
      "options": {
        "comprehensive": true,
        "includeMetrics": true
      }
    }
  ],
  "metadata": {
    "author": "PIDEA System",
    "createdAt": "2024-01-01T00:00:00Z",
    "tags": ["health", "analysis", "monitoring"]
  }
}
```

### docs/examples/workflow-configs/code-generation.json
```json
{
  "name": "Code Generation Workflow",
  "description": "Generate code based on specifications",
  "framework": "generate",
  "version": "1.0.0",
  "steps": [
    {
      "name": "analyze_requirements",
      "category": "analysis",
      "options": {
        "comprehensive": true
      }
    },
    {
      "name": "generate_code",
      "category": "generate",
      "options": {
        "language": "javascript",
        "framework": "express"
      }
    },
    {
      "name": "validate_code",
      "category": "validation",
      "options": {
        "linting": true,
        "testing": true
      }
    }
  ],
  "metadata": {
    "author": "PIDEA System",
    "tags": ["generation", "code", "automation"]
  }
}
```

## Testing Strategy

### Unit Tests
- [ ] WorkflowConfigService execution tests
- [ ] WorkflowValidator validation tests
- [ ] Step execution tests
- [ ] Error handling tests

### Integration Tests
- [ ] API endpoint tests
- [ ] Registry integration tests
- [ ] End-to-end workflow execution tests
- [ ] File loading tests

### Test Coverage Goals
- **Unit Tests**: 95% coverage
- **Integration Tests**: 90% coverage

## Validation Checklist

### Pre-Implementation
- [ ] Verify Phase 1 completion
- [ ] Review existing registry patterns
- [ ] Plan API endpoint structure

### Implementation
- [ ] Create WorkflowConfigService
- [ ] Implement WorkflowValidator
- [ ] Create API controller and routes
- [ ] Add comprehensive error handling
- [ ] Create example configurations

### Post-Implementation
- [ ] Test all API endpoints
- [ ] Validate JSON configurations
- [ ] Test error scenarios
- [ ] Update documentation
- [ ] Create integration tests

## Risk Assessment

### High Risk
- [ ] Registry integration failures - Mitigation: Comprehensive testing with existing registries
- [ ] JSON validation edge cases - Mitigation: Extensive validation testing

### Medium Risk
- [ ] API performance issues - Mitigation: Load testing and optimization
- [ ] Error handling gaps - Mitigation: Comprehensive error scenario testing

### Low Risk
- [ ] Documentation updates - Mitigation: Update docs alongside implementation

## Success Metrics
- WorkflowConfigService executes workflows correctly
- JSON validation catches all invalid configurations
- API endpoints respond correctly to all requests
- Integration with existing registries works seamlessly
- Error handling covers all failure scenarios
- 95% test coverage achieved
- Example configurations work correctly 