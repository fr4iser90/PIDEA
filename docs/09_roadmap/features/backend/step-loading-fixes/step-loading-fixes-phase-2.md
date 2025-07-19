# Phase 2: Fix Framework Configuration

## Phase Overview
Create missing steps directories for frameworks and update framework configurations to resolve framework loading failures.

## Estimated Time: 3 hours

## Objectives
- Create missing steps directories for all frameworks
- Update framework.json files to properly reference step files
- Create placeholder step files for frameworks without implementations
- Test framework loading for all frameworks

## Detailed Tasks

### 1. Create Missing Steps Directories

#### 1.1 Create Steps Directories (30 minutes)

**Directories to create**:
- `backend/framework/deployment_management/steps/`
- `backend/framework/documentation_management/steps/`
- `backend/framework/documentation_pidea_numeric/steps/`
- `backend/framework/performance_management/steps/`
- `backend/framework/refactor_ddd_pattern/steps/`
- `backend/framework/refactor_mvc_pattern/steps/`
- `backend/framework/security_management/steps/`

**Note**: `refactoring_management` and `testing_management` already have steps directories ✅

**Implementation**:
```bash
mkdir -p backend/framework/deployment_management/steps
mkdir -p backend/framework/documentation_management/steps
mkdir -p backend/framework/documentation_pidea_numeric/steps
mkdir -p backend/framework/performance_management/steps
mkdir -p backend/framework/refactor_ddd_pattern/steps
mkdir -p backend/framework/refactor_mvc_pattern/steps
mkdir -p backend/framework/security_management/steps
```

### 2. Update Framework Configurations

#### 2.1 Update Framework JSON Files (30 minutes)

**Files to update**:
- `backend/framework/deployment_management/framework.json`
- `backend/framework/documentation_management/framework.json`
- `backend/framework/documentation_pidea_numeric/framework.json`
- `backend/framework/performance_management/framework.json`
- `backend/framework/refactor_ddd_pattern/framework.json`
- `backend/framework/refactor_mvc_pattern/framework.json`
- `backend/framework/security_management/framework.json`

**Issue**: Most frameworks are missing the `file` property in step configurations

**Example update for `deployment_management/framework.json`**:
```json
{
  "name": "deployment_management",
  "version": "1.0.0",
  "description": "Advanced deployment operations and infrastructure management framework",
  "category": "deployment",
  "author": "PIDEA Team",
  "dependencies": ["core"],
  "steps": {
    "build_application": {
      "name": "build_application",
      "type": "deployment",
      "category": "build",
      "description": "Build application for deployment",
      "dependencies": ["terminal", "file-system"],
      "file": "steps/build_application.js"
    },
    "run_tests_before_deploy": {
      "name": "run_tests_before_deploy",
      "type": "deployment",
      "category": "testing",
      "description": "Run tests before deployment",
      "dependencies": ["terminal", "testing"],
      "file": "steps/run_tests_before_deploy.js"
    },
    "create_deployment_package": {
      "name": "create_deployment_package",
      "type": "deployment",
      "category": "package",
      "description": "Create deployment package with all dependencies",
      "dependencies": ["file-system", "terminal"],
      "file": "steps/create_deployment_package.js"
    },
    "deploy_to_staging": {
      "name": "deploy_to_staging",
      "type": "deployment",
      "category": "staging",
      "description": "Deploy to staging environment",
      "dependencies": ["terminal", "file-system"],
      "file": "steps/deploy_to_staging.js"
    },
    "deploy_to_production": {
      "name": "deploy_to_production",
      "type": "deployment",
      "category": "production",
      "description": "Deploy to production environment",
      "dependencies": ["terminal", "file-system"],
      "file": "steps/deploy_to_production.js"
    },
    "rollback_deployment": {
      "name": "rollback_deployment",
      "type": "deployment",
      "category": "rollback",
      "description": "Rollback to previous deployment",
      "dependencies": ["terminal", "file-system"],
      "file": "steps/rollback_deployment.js"
    },
    "monitor_deployment": {
      "name": "monitor_deployment",
      "type": "deployment",
      "category": "monitoring",
      "description": "Monitor deployment health and performance",
      "dependencies": ["terminal", "analysis"],
      "file": "steps/monitor_deployment.js"
    },
    "update_environment_config": {
      "name": "update_environment_config",
      "type": "deployment",
      "category": "config",
      "description": "Update environment configuration",
      "dependencies": ["file-system", "terminal"],
      "file": "steps/update_environment_config.js"
    },
    "setup_ci_cd": {
      "name": "setup_ci_cd",
      "type": "deployment",
      "category": "ci_cd",
      "description": "Setup continuous integration and deployment",
      "dependencies": ["file-system", "terminal"],
      "file": "steps/setup_ci_cd.js"
    },
    "validate_deployment": {
      "name": "validate_deployment",
      "type": "deployment",
      "category": "validation",
      "description": "Validate deployment success and functionality",
      "dependencies": ["terminal", "analysis"],
      "file": "steps/validate_deployment.js"
    }
  },
  "workflows": {
    "complete_deployment": {
      "name": "complete_deployment",
      "steps": [
        "build_application",
        "run_tests_before_deploy",
        "create_deployment_package",
        "deploy_to_staging",
        "validate_deployment",
        "deploy_to_production",
        "monitor_deployment"
      ],
      "description": "Complete deployment workflow"
    }
  },
  "activation": {
    "auto_load": false,
    "requires_confirmation": true,
    "fallback_to_core": true
  },
  "settings": {
    "deployment_timeout": 300000,
    "auto_rollback_on_failure": true,
    "health_check_interval": 30000,
    "backup_before_deploy": true
  }
}
```

### 3. Create Placeholder Step Files

#### 3.1 Deployment Management Steps (30 minutes)

**Directory**: `backend/framework/deployment_management/steps/`

**Files to create**:
- `build_application.js`
- `run_tests_before_deploy.js`
- `create_deployment_package.js`
- `deploy_to_staging.js`
- `deploy_to_production.js`
- `rollback_deployment.js`
- `monitor_deployment.js`
- `update_environment_config.js`
- `setup_ci_cd.js`
- `validate_deployment.js`

**Example implementation for `build_application.js`**:
```javascript
/**
 * Build Application Step
 * Builds application for deployment
 */

const { BaseStep } = require('../../../domain/steps/BaseStep');
const Logger = require('@logging/Logger');
const logger = new Logger('BuildApplicationStep');

class BuildApplicationStep extends BaseStep {
  constructor() {
    super({
      name: 'build_application',
      type: 'deployment',
      category: 'build',
      description: 'Build application for deployment',
      version: '1.0.0',
      config: {
        required: ['projectPath'],
        optional: ['buildCommand', 'env']
      }
    });
  }

  async execute(context) {
    try {
      const { projectPath, buildCommand = 'npm run build', env = 'production' } = context;
      
      logger.info('Executing build_application step', {
        projectPath,
        buildCommand,
        env
      });

      // Get TerminalService from DI container
      const { getServiceRegistry } = require('@/infrastructure/di/ServiceRegistry');
      const serviceRegistry = getServiceRegistry();
      const terminalService = serviceRegistry.getContainer().resolve('terminalService');

      if (!terminalService) {
        throw new Error('TerminalService not available');
      }

      // Execute build command
      const result = await terminalService.executeCommand(buildCommand, {
        cwd: projectPath,
        env: {
          ...process.env,
          NODE_ENV: env
        }
      });

      logger.info('build_application step completed', {
        success: result.success,
        output: result.output?.substring(0, 200) + '...'
      });

      return {
        success: result.success,
        command: buildCommand,
        output: result.output,
        error: result.error,
        timestamp: new Date()
      };

    } catch (error) {
      logger.error('build_application step failed', {
        error: error.message,
        context
      });

      return {
        success: false,
        error: error.message,
        timestamp: new Date()
      };
    }
  }
}

module.exports = BuildApplicationStep;
```

#### 3.2 Documentation Management Steps (30 minutes)

**Directory**: `backend/framework/documentation_management/steps/`

**Files to create**:
- `generate_documentation.js`
- `update_documentation.js`
- `validate_documentation.js`
- `publish_documentation.js`

**Example implementation for `generate_documentation.js`**:
```javascript
/**
 * Generate Documentation Step
 * Generates project documentation
 */

const { BaseStep } = require('../../../domain/steps/BaseStep');
const Logger = require('@logging/Logger');
const logger = new Logger('GenerateDocumentationStep');

class GenerateDocumentationStep extends BaseStep {
  constructor() {
    super({
      name: 'generate_documentation',
      type: 'documentation',
      category: 'generate',
      description: 'Generates project documentation',
      version: '1.0.0',
      config: {
        required: ['projectPath'],
        optional: ['outputPath', 'format']
      }
    });
  }

  async execute(context) {
    try {
      const { projectPath, outputPath = 'docs', format = 'markdown' } = context;
      
      logger.info('Executing generate_documentation step', {
        projectPath,
        outputPath,
        format
      });

      // Placeholder implementation
      logger.info('Documentation generation completed successfully');

      return {
        success: true,
        outputPath,
        format,
        timestamp: new Date()
      };

    } catch (error) {
      logger.error('generate_documentation step failed', {
        error: error.message,
        context
      });

      return {
        success: false,
        error: error.message,
        timestamp: new Date()
      };
    }
  }
}

module.exports = GenerateDocumentationStep;
```

#### 3.3 Performance Management Steps (30 minutes)

**Directory**: `backend/framework/performance_management/steps/`

**Files to create**:
- `analyze_performance.js`
- `optimize_performance.js`
- `monitor_performance.js`
- `generate_performance_report.js`

#### 3.4 Security Management Steps (30 minutes)

**Directory**: `backend/framework/security_management/steps/`

**Files to create**:
- `security_audit.js`
- `vulnerability_scan.js`
- `security_testing.js`
- `security_report.js`

#### 3.5 Refactor Pattern Steps (30 minutes)

**Directories**: 
- `backend/framework/refactor_ddd_pattern/steps/`
- `backend/framework/refactor_mvc_pattern/steps/`

**Files to create for each**:
- `apply_pattern.js`
- `validate_pattern.js`
- `generate_pattern_report.js`

### 4. Testing and Validation

#### 4.1 Test Framework Loading (30 minutes)
- [ ] Test deployment_management framework loading
- [ ] Test documentation_management framework loading
- [ ] Test documentation_pidea_numeric framework loading
- [ ] Test performance_management framework loading
- [ ] Test refactor_ddd_pattern framework loading
- [ ] Test refactor_mvc_pattern framework loading
- [ ] Test security_management framework loading
- [ ] Test testing_management framework loading

#### 4.2 Verify Step Registration
- [ ] Verify all framework steps are registered with StepRegistry
- [ ] Verify no framework loading errors in logs
- [ ] Verify framework step counts are correct

#### 4.3 Check Application Startup
- [ ] Restart application and check framework loading logs
- [ ] Verify no framework loading failures
- [ ] Verify all frameworks are discovered and loaded

## Success Criteria
- [ ] All missing steps directories are created
- [ ] All framework step files are implemented
- [ ] All framework.json files are updated with correct file references
- [ ] No framework loading errors on application startup
- [ ] All frameworks are successfully loaded and registered
- [ ] All tests pass

## Risk Mitigation
- **Risk**: Breaking existing framework functionality
  - **Mitigation**: Test each framework individually before proceeding
- **Risk**: Import path issues in step files
  - **Mitigation**: Use relative paths and test imports
- **Risk**: Framework configuration syntax errors
  - **Mitigation**: Validate JSON syntax before deployment

## Dependencies
- Phase 1 completion (step file fixes)

## Deliverables
- Created steps directories for all frameworks
- Implemented placeholder step files for all frameworks
- Updated framework.json configurations
- Verified framework loading for all frameworks
- Updated test results

## Next Phase
Phase 3: Fix Step Registration - Improve FrameworkStepRegistry error handling and validation

## Validation Results - 2024-12-19

### ✅ Already Working
- [x] `refactoring_management` - Has steps directory and working config
- [x] `testing_management` - Has steps directory and working config

### ⚠️ Need Fixing
- [ ] `deployment_management` - Missing steps directory, missing file properties
- [ ] `documentation_management` - Missing steps directory, missing file properties
- [ ] `documentation_pidea_numeric` - Missing steps directory, missing file properties
- [ ] `performance_management` - Missing steps directory, missing file properties
- [ ] `refactor_ddd_pattern` - Missing steps directory, missing file properties
- [ ] `refactor_mvc_pattern` - Missing steps directory, missing file properties
- [ ] `security_management` - Missing steps directory, missing file properties

### 🔧 Key Issues Found
1. **Missing Steps Directories**: 7 out of 9 frameworks missing steps directories
2. **Missing File Properties**: Framework configs don't specify `file` property for steps
3. **Configuration Mismatch**: Framework configs reference non-existent files 