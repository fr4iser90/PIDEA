# Phase 3: Fix Step Registration

## Phase Overview
Improve FrameworkStepRegistry error handling, add validation for step module structure, and ensure robust step registration flow.

## Estimated Time: 2 hours

## Objectives
- Fix FrameworkStepRegistry step registration logic
- Add proper error handling for missing step files
- Add validation for step module structure
- Test complete step registration flow
- Update logging for better debugging

## Detailed Tasks

### 1. Fix FrameworkStepRegistry Step Registration Logic

#### 1.1 Improve Error Handling (30 minutes)

**File**: `backend/infrastructure/framework/FrameworkStepRegistry.js`

**Current Issues**:
- Missing error handling for non-existent step files
- No validation for step module structure
- Poor error messages for debugging

**Improvements to implement**:

```javascript
/**
 * Load a specific framework step with improved error handling
 */
async loadFrameworkStep(frameworkName, stepName, stepConfig, stepsPath) {
  try {
    // Validate step configuration
    if (!stepConfig.file) {
      this.logger.warn(`⚠️ [FrameworkStepRegistry] Step ${stepName} in ${frameworkName} has no file specified`);
      return;
    }

    // Fix: Remove 'steps/' prefix if it exists in the file path
    const fileName = stepConfig.file.replace(/^steps\//, '');
    const stepFilePath = path.join(stepsPath, fileName);
    
    // Check if step file exists with better error handling
    let fileExists = false;
    try {
      await fs.access(stepFilePath);
      fileExists = true;
    } catch (error) {
      fileExists = false;
    }
    
    if (!fileExists) {
      this.logger.warn(`⚠️ [FrameworkStepRegistry] Step file not found: ${stepFilePath}`);
      this.logger.debug(`📁 Expected path: ${stepFilePath}`);
      this.logger.debug(`📁 Steps directory: ${stepsPath}`);
      this.logger.debug(`📁 Step config: ${JSON.stringify(stepConfig)}`);
      return;
    }

    // Load the step module with validation
    let stepModule;
    try {
      stepModule = require(stepFilePath);
    } catch (requireError) {
      this.logger.error(`❌ [FrameworkStepRegistry] Failed to require step file ${stepFilePath}:`, requireError.message);
      return;
    }
    
    // Validate step module structure
    if (!stepModule) {
      this.logger.warn(`⚠️ [FrameworkStepRegistry] Step module is null/undefined: ${stepFilePath}`);
      return;
    }

    // Check for proper step class structure
    const hasConfig = stepModule.config || stepModule.prototype?.config;
    const hasExecute = stepModule.execute || stepModule.prototype?.execute;
    const isClass = typeof stepModule === 'function' && stepModule.prototype;
    const isObject = typeof stepModule === 'object' && stepModule !== null;

    if (!hasConfig && !hasExecute) {
      this.logger.warn(`⚠️ [FrameworkStepRegistry] Invalid step module structure: ${stepFilePath}`);
      this.logger.debug(`📋 Module type: ${typeof stepModule}`);
      this.logger.debug(`📋 Has config: ${hasConfig}`);
      this.logger.debug(`📋 Has execute: ${hasExecute}`);
      this.logger.debug(`📋 Is class: ${isClass}`);
      this.logger.debug(`📋 Is object: ${isObject}`);
      return;
    }

    // Create step key
    const stepKey = `${frameworkName}.${stepName}`;
    
    // Store step information
    this.frameworkSteps.set(stepKey, {
      framework: frameworkName,
      name: stepName,
      config: stepConfig,
      module: stepModule,
      filePath: stepFilePath,
      loadedAt: new Date()
    });

    this.logger.debug(`📦 [FrameworkStepRegistry] Loaded step: ${stepKey}`);
  } catch (error) {
    this.logger.error(`❌ [FrameworkStepRegistry] Failed to load step ${stepName} from ${frameworkName}:`, error.message);
    this.logger.debug(`🔍 Error details:`, error.stack);
  }
}
```

#### 1.2 Improve Step Registration Logic (30 minutes)

**Improvements to implement**:

```javascript
/**
 * Register a specific framework step with improved validation
 */
async registerFrameworkStep(stepKey, stepInfo) {
  const { framework, name, config, module } = stepInfo;
  
  try {
    // Validate step registry availability
    if (!this.stepRegistry) {
      this.logger.warn(`⚠️ [FrameworkStepRegistry] Step registry not available for ${stepKey}`);
      return;
    }

    if (typeof this.stepRegistry.register !== 'function') {
      this.logger.warn(`⚠️ [FrameworkStepRegistry] Step registry register method not available for ${stepKey}`);
      return;
    }

    // Create step wrapper that provides framework context
    const stepWrapper = {
      name: name,
      type: config.type || 'framework',
      category: config.category || 'framework',
      description: config.description || `Framework step: ${name}`,
      framework: framework,
      dependencies: config.dependencies || [],
      version: config.version || '1.0.0',
      
      async execute(context, options = {}) {
        try {
          // Add framework context
          const frameworkContext = {
            ...context,
            framework: framework,
            frameworkStep: name,
            stepRegistry: this.stepRegistry
          };
          
          // Execute the step based on module type
          if (typeof module === 'function' && module.prototype) {
            // It's a class, instantiate and execute
            const stepInstance = new module();
            if (typeof stepInstance.execute === 'function') {
              return await stepInstance.execute(frameworkContext, options);
            } else {
              throw new Error(`Step class ${name} has no execute method`);
            }
          } else if (typeof module.execute === 'function') {
            // It's an object with execute method
            return await module.execute(frameworkContext, options);
          } else {
            throw new Error(`Step module ${name} has no execute method`);
          }
        } catch (error) {
          this.logger.error(`❌ [FrameworkStepRegistry] Step execution failed for ${stepKey}:`, error.message);
          throw error;
        }
      }
    };

    // Register with main step registry
    await this.stepRegistry.register(stepKey, stepWrapper);
    this.logger.info(`✅ [FrameworkStepRegistry] Registered step: ${stepKey}`);
    
  } catch (error) {
    this.logger.error(`❌ [FrameworkStepRegistry] Failed to register step ${stepKey}:`, error.message);
    this.logger.debug(`🔍 Registration error details:`, error.stack);
  }
}
```

### 2. Add Validation for Step Module Structure

#### 2.1 Create Step Validation Utility (30 minutes)

**File**: `backend/domain/steps/StepValidator.js`

```javascript
/**
 * Step Validator
 * Validates step module structure and configuration
 */

const Logger = require('@logging/Logger');
const logger = new Logger('StepValidator');

class StepValidator {
  /**
   * Validate step module structure
   * @param {Object} stepModule - The step module to validate
   * @param {string} stepPath - Path to the step file
   * @returns {Object} Validation result
   */
  static validateStepModule(stepModule, stepPath) {
    const result = {
      isValid: false,
      errors: [],
      warnings: [],
      type: null,
      hasConfig: false,
      hasExecute: false
    };

    try {
      // Check if module exists
      if (!stepModule) {
        result.errors.push('Step module is null or undefined');
        return result;
      }

      // Determine module type
      if (typeof stepModule === 'function' && stepModule.prototype) {
        result.type = 'class';
      } else if (typeof stepModule === 'object' && stepModule !== null) {
        result.type = 'object';
      } else {
        result.errors.push(`Invalid module type: ${typeof stepModule}`);
        return result;
      }

      // Check for config
      if (result.type === 'class') {
        result.hasConfig = !!stepModule.prototype.config || !!stepModule.config;
      } else {
        result.hasConfig = !!stepModule.config;
      }

      // Check for execute method
      if (result.type === 'class') {
        result.hasExecute = typeof stepModule.prototype.execute === 'function' || typeof stepModule.execute === 'function';
      } else {
        result.hasExecute = typeof stepModule.execute === 'function';
      }

      // Validate required components
      if (!result.hasConfig) {
        result.warnings.push('Step has no config property');
      }

      if (!result.hasExecute) {
        result.errors.push('Step has no execute method');
      }

      // Check for proper export
      if (result.type === 'class' && !stepModule.name) {
        result.warnings.push('Step class has no name property');
      }

      // Determine if valid
      result.isValid = result.hasExecute && result.errors.length === 0;

      logger.debug(`Step validation for ${stepPath}:`, {
        isValid: result.isValid,
        type: result.type,
        hasConfig: result.hasConfig,
        hasExecute: result.hasExecute,
        errors: result.errors.length,
        warnings: result.warnings.length
      });

    } catch (error) {
      result.errors.push(`Validation error: ${error.message}`);
      logger.error(`Step validation failed for ${stepPath}:`, error.message);
    }

    return result;
  }

  /**
   * Validate step configuration
   * @param {Object} config - Step configuration
   * @returns {Object} Validation result
   */
  static validateStepConfig(config) {
    const result = {
      isValid: false,
      errors: [],
      warnings: []
    };

    try {
      if (!config) {
        result.errors.push('Step configuration is missing');
        return result;
      }

      // Check required fields
      if (!config.name) {
        result.errors.push('Step name is required');
      }

      if (!config.type) {
        result.warnings.push('Step type is recommended');
      }

      if (!config.category) {
        result.warnings.push('Step category is recommended');
      }

      if (!config.description) {
        result.warnings.push('Step description is recommended');
      }

      // Validate dependencies
      if (config.dependencies && !Array.isArray(config.dependencies)) {
        result.errors.push('Dependencies must be an array');
      }

      // Determine if valid
      result.isValid = result.errors.length === 0;

    } catch (error) {
      result.errors.push(`Configuration validation error: ${error.message}`);
    }

    return result;
  }
}

module.exports = StepValidator;
```

#### 2.2 Integrate Step Validator (15 minutes)

**Update FrameworkStepRegistry to use StepValidator**:

```javascript
const StepValidator = require('@/domain/steps/StepValidator');

// In loadFrameworkStep method:
const validation = StepValidator.validateStepModule(stepModule, stepFilePath);
if (!validation.isValid) {
  this.logger.warn(`⚠️ [FrameworkStepRegistry] Step validation failed for ${stepFilePath}:`, validation.errors);
  return;
}

if (validation.warnings.length > 0) {
  this.logger.debug(`⚠️ [FrameworkStepRegistry] Step warnings for ${stepFilePath}:`, validation.warnings);
}
```

### 3. Update Logging for Better Debugging

#### 3.1 Improve Logging Messages (15 minutes)

**Update logging throughout FrameworkStepRegistry**:

```javascript
// Better initialization logging
this.logger.info('🔧 [FrameworkStepRegistry] Initializing framework step registry...');
this.logger.debug(`📁 Framework base path: ${frameworkBasePath}`);

// Better discovery logging
this.logger.info(`🔍 [FrameworkStepRegistry] Discovered ${this.frameworkDirectories.size} framework directories`);

// Better loading logging
this.logger.info(`📦 [FrameworkStepRegistry] Loading steps from ${this.frameworkDirectories.size} frameworks`);

// Better registration logging
this.logger.info(`📝 [FrameworkStepRegistry] Registering ${this.frameworkSteps.size} framework steps`);

// Better completion logging
this.logger.info(`✅ [FrameworkStepRegistry] Initialized with ${this.frameworkSteps.size} framework steps`);
```

### 4. Testing and Validation

#### 4.1 Test Complete Step Registration Flow (30 minutes)
- [ ] Test step loading with valid step files
- [ ] Test step loading with invalid step files
- [ ] Test step loading with missing step files
- [ ] Test step registration with main StepRegistry
- [ ] Test step execution with framework context

#### 4.2 Verify Error Handling
- [ ] Verify graceful handling of missing files
- [ ] Verify graceful handling of invalid modules
- [ ] Verify graceful handling of missing step registry
- [ ] Verify proper error messages for debugging

#### 4.3 Check Application Startup
- [ ] Restart application and check step loading logs
- [ ] Verify no step loading errors
- [ ] Verify all steps are properly registered
- [ ] Verify framework steps are available for execution

## Success Criteria
- [ ] FrameworkStepRegistry has improved error handling
- [ ] Step validation is implemented and working
- [ ] All step loading errors are handled gracefully
- [ ] Better logging for debugging step issues
- [ ] Complete step registration flow works correctly
- [ ] Application starts without step loading failures
- [ ] All tests pass

## Risk Mitigation
- **Risk**: Breaking existing step functionality
  - **Mitigation**: Test each change individually and maintain backward compatibility
- **Risk**: Performance impact from validation
  - **Mitigation**: Keep validation lightweight and cache results
- **Risk**: Over-verbose logging
  - **Mitigation**: Use appropriate log levels and make debug logging optional

## Dependencies
- Phase 1 completion (step file fixes)
- Phase 2 completion (framework configuration fixes)

## Deliverables
- Improved FrameworkStepRegistry with better error handling
- Step validation utility
- Enhanced logging for debugging
- Verified complete step registration flow
- Updated test results

## Next Steps
- Monitor application startup logs for any remaining issues
- Consider implementing step caching for performance
- Add step health monitoring and metrics 