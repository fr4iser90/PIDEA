# Phase 3: Framework Configuration Fixes

## 📋 Phase Overview
- **Phase**: 3 of 5
- **Name**: Framework Configuration Fixes
- **Estimated Time**: 2 hours
- **Status**: Planning
- **Progress**: 0%

## 🎯 Objectives
Fix framework configuration issues and create missing directories:
1. Fix task-creation-workflows.json structure issues
2. Create missing steps directories for frameworks
3. Add default step configurations for empty frameworks
4. Validate all framework.json files

## 📝 Tasks

### Task 3.1: Fix task-creation-workflows.json Structure (30 minutes)
- [ ] Investigate the specific error in task-creation-workflows.json
- [ ] Fix any JSON syntax issues
- [ ] Ensure proper workflow structure
- [ ] Validate against workflow schema
- [ ] Test workflow loading process

**Implementation Details:**
```javascript
/**
 * Validate and fix workflow JSON structure
 */
async validateWorkflowFile(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    
    // Parse JSON to check for syntax errors
    let workflowData;
    try {
      workflowData = JSON.parse(content);
    } catch (parseError) {
      this.logger.error(`❌ JSON parse error in ${filePath}:`, parseError.message);
      return false;
    }
    
    // Validate required structure
    if (!workflowData.workflows || typeof workflowData.workflows !== 'object') {
      this.logger.error(`❌ Missing or invalid workflows object in ${filePath}`);
      return false;
    }
    
    // Validate each workflow
    for (const [workflowName, workflow] of Object.entries(workflowData.workflows)) {
      if (!workflow.name || !workflow.steps || !Array.isArray(workflow.steps)) {
        this.logger.error(`❌ Invalid workflow structure for ${workflowName} in ${filePath}`);
        return false;
      }
    }
    
    this.logger.info(`✅ Workflow file ${filePath} validated successfully`);
    return true;
  } catch (error) {
    this.logger.error(`❌ Failed to validate workflow file ${filePath}:`, error.message);
    return false;
  }
}
```

### Task 3.2: Create Missing Steps Directories (45 minutes)
- [ ] Create steps directory for documentation_pidea_numeric framework
- [ ] Create steps directory for refactor_ddd_pattern framework
- [ ] Create steps directory for refactor_mvc_pattern framework
- [ ] Create steps directory for workflows framework
- [ ] Add .gitkeep files to maintain directory structure

**Implementation Details:**
```javascript
/**
 * Create missing steps directories for frameworks
 */
async createMissingStepsDirectories() {
  const frameworksNeedingSteps = [
    'documentation_pidea_numeric',
    'refactor_ddd_pattern',
    'refactor_mvc_pattern',
    'workflows'
  ];
  
  for (const frameworkName of frameworksNeedingSteps) {
    try {
      const stepsPath = path.join(this.frameworkBasePath, frameworkName, 'steps');
      
      // Check if directory exists
      try {
        await fs.access(stepsPath);
        this.logger.info(`✅ Steps directory already exists for ${frameworkName}`);
        continue;
      } catch {
        // Directory doesn't exist, create it
      }
      
      // Create steps directory
      await fs.mkdir(stepsPath, { recursive: true });
      
      // Add .gitkeep file to maintain directory structure
      const gitkeepPath = path.join(stepsPath, '.gitkeep');
      await fs.writeFile(gitkeepPath, '# This file ensures the steps directory is tracked by git\n');
      
      this.logger.info(`✅ Created steps directory for ${frameworkName} at ${stepsPath}`);
    } catch (error) {
      this.logger.error(`❌ Failed to create steps directory for ${frameworkName}:`, error.message);
    }
  }
}
```

### Task 3.3: Add Default Step Configurations (30 minutes)
- [ ] Create default step configurations for empty frameworks
- [ ] Add placeholder step files with proper structure
- [ ] Ensure all frameworks have at least one step
- [ ] Add proper documentation for placeholder steps

**Implementation Details:**
```javascript
/**
 * Create default step configurations for frameworks without steps
 */
async createDefaultStepConfigurations() {
  const defaultSteps = {
    'documentation_pidea_numeric': {
      'generate_documentation': {
        name: 'generate_documentation',
        type: 'documentation',
        category: 'generate',
        description: 'Generate documentation using PIDEA numeric format',
        dependencies: ['ai', 'file-system'],
        file: 'steps/generate_documentation.js'
      }
    },
    'refactor_ddd_pattern': {
      'apply_ddd_pattern': {
        name: 'apply_ddd_pattern',
        type: 'refactoring',
        category: 'pattern',
        description: 'Apply Domain-Driven Design patterns to code',
        dependencies: ['analysis', 'refactoring'],
        file: 'steps/apply_ddd_pattern.js'
      }
    },
    'refactor_mvc_pattern': {
      'apply_mvc_pattern': {
        name: 'apply_mvc_pattern',
        type: 'refactoring',
        category: 'pattern',
        description: 'Apply Model-View-Controller patterns to code',
        dependencies: ['analysis', 'refactoring'],
        file: 'steps/apply_mvc_pattern.js'
      }
    },
    'workflows': {
      'execute_workflow': {
        name: 'execute_workflow',
        type: 'workflow',
        category: 'execution',
        description: 'Execute workflow steps in sequence',
        dependencies: ['workflow', 'execution'],
        file: 'steps/execute_workflow.js'
      }
    }
  };
  
  for (const [frameworkName, steps] of Object.entries(defaultSteps)) {
    try {
      const frameworkPath = path.join(this.frameworkBasePath, frameworkName);
      const configPath = path.join(frameworkPath, 'framework.json');
      
      // Read existing config
      let config;
      try {
        const configContent = await fs.readFile(configPath, 'utf8');
        config = JSON.parse(configContent);
      } catch (error) {
        this.logger.warn(`⚠️ Could not read config for ${frameworkName}, creating default`);
        config = {
          name: frameworkName,
          version: '1.0.0',
          description: `Framework for ${frameworkName}`,
          category: 'general',
          author: 'PIDEA Team',
          dependencies: ['core'],
          steps: {},
          workflows: {},
          activation: {
            auto_load: false,
            requires_confirmation: true,
            fallback_to_core: true
          }
        };
      }
      
      // Add default steps
      config.steps = { ...config.steps, ...steps };
      
      // Write updated config
      await fs.writeFile(configPath, JSON.stringify(config, null, 2));
      
      this.logger.info(`✅ Added default step configurations for ${frameworkName}`);
    } catch (error) {
      this.logger.error(`❌ Failed to add default steps for ${frameworkName}:`, error.message);
    }
  }
}
```

### Task 3.4: Validate All Framework.json Files (15 minutes)
- [ ] Validate all framework.json files for proper structure
- [ ] Check for required fields in each configuration
- [ ] Ensure steps objects are properly formatted
- [ ] Fix any validation errors found
- [ ] Generate validation report

**Implementation Details:**
```javascript
/**
 * Validate all framework.json files
 */
async validateAllFrameworkConfigs() {
  const validationResults = {
    valid: [],
    invalid: [],
    errors: []
  };
  
  try {
    const entries = await fs.readdir(this.frameworkBasePath, { withFileTypes: true });
    
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const frameworkPath = path.join(this.frameworkBasePath, entry.name);
        const configPath = path.join(frameworkPath, 'framework.json');
        
        try {
          await fs.access(configPath);
          
          const configContent = await fs.readFile(configPath, 'utf8');
          const config = JSON.parse(configContent);
          
          // Validate using FrameworkRegistry validation
          try {
            this.frameworkRegistry.validateFrameworkConfig(config);
            validationResults.valid.push(entry.name);
            this.logger.info(`✅ Framework ${entry.name} validation passed`);
          } catch (validationError) {
            validationResults.invalid.push(entry.name);
            validationResults.errors.push({
              framework: entry.name,
              error: validationError.message
            });
            this.logger.error(`❌ Framework ${entry.name} validation failed:`, validationError.message);
          }
        } catch (error) {
          validationResults.invalid.push(entry.name);
          validationResults.errors.push({
            framework: entry.name,
            error: `Config file not found or invalid: ${error.message}`
          });
        }
      }
    }
    
    // Generate validation report
    this.logger.info(`📊 Framework validation complete:`);
    this.logger.info(`✅ Valid frameworks: ${validationResults.valid.length}`);
    this.logger.info(`❌ Invalid frameworks: ${validationResults.invalid.length}`);
    
    if (validationResults.errors.length > 0) {
      this.logger.warn('⚠️ Validation errors found:');
      validationResults.errors.forEach(error => {
        this.logger.warn(`  - ${error.framework}: ${error.error}`);
      });
    }
    
    return validationResults;
  } catch (error) {
    this.logger.error('❌ Failed to validate framework configs:', error.message);
    throw error;
  }
}
```

## 🔍 Success Criteria
- [ ] All framework.json files validate successfully
- [ ] Missing steps directories are created
- [ ] Default step configurations are added for empty frameworks
- [ ] task-creation-workflows.json loads without errors
- [ ] All frameworks have proper directory structure

## 🚨 Risk Mitigation
- **Risk**: Breaking existing framework configurations
- **Mitigation**: Backup existing configs before changes, validate all changes
- **Rollback**: Git revert to previous working state

## 📊 Progress Tracking
- **Start Time**: TBD
- **End Time**: TBD
- **Actual Duration**: TBD
- **Status**: Planning
- **Blockers**: None identified

## 🔗 Dependencies
- **Prerequisites**: Phase 2 (Step Registry Integration)
- **Blocks**: Phase 4 (Testing & Validation)

## 📝 Notes
- This phase ensures all frameworks have proper structure and configuration
- Default configurations maintain backward compatibility
- All changes are validated before implementation
