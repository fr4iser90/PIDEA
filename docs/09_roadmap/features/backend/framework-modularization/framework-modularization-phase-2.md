# Phase 2: Infrastructure Framework System Implementation

## 📋 Phase Overview
- **Phase**: 2 of 5
- **Duration**: 8 hours
- **Status**: 🔄 In Progress
- **Progress**: 0%

## 🎯 Phase Objectives
1. Create `backend/infrastructure/framework/FrameworkLoader.js`
2. Create `backend/infrastructure/framework/FrameworkManager.js`
3. Create `backend/infrastructure/framework/FrameworkValidator.js`
4. Create `backend/infrastructure/framework/FrameworkConfig.js`
5. Test infrastructure components

## 🔧 Task 1: FrameworkLoader Implementation

### 1.1 FrameworkLoader Core Implementation

```javascript
// backend/infrastructure/framework/FrameworkLoader.js
const fs = require('fs').promises;
const path = require('path');
const FrameworkValidator = require('./FrameworkValidator');
const FrameworkRegistry = require('@domain/frameworks/FrameworkRegistry');

class FrameworkLoader {
    constructor() {
        this.frameworks = new Map();
        this.activeFrameworks = new Set();
        this.registry = new FrameworkRegistry();
        this.validator = new FrameworkValidator();
        this.frameworkPath = path.join(__dirname, '../../../framework');
    }
    
    async loadFramework(frameworkName) {
        try {
            // 1. Validate framework exists
            const frameworkPath = path.join(this.frameworkPath, frameworkName);
            await this.validator.validateFrameworkExists(frameworkPath);
            
            // 2. Load and validate configuration
            const config = await this.loadFrameworkConfig(frameworkPath);
            await this.validator.validateFrameworkConfig(config);
            
            // 3. Check dependencies
            await this.checkDependencies(config.dependencies);
            
            // 4. Load framework modules
            const framework = await this.loadFrameworkModules(frameworkPath, config);
            
            // 5. Register with registry
            await this.registry.registerFramework(frameworkName, framework.config, framework.config.category);
            
            // 6. Activate framework
            await this.activateFramework(frameworkName, framework);
            
            console.log(`✅ Framework '${frameworkName}' loaded successfully`);
            return framework;
            
        } catch (error) {
            console.error(`❌ Failed to load framework '${frameworkName}':`, error.message);
            throw error;
        }
    }
    
    async loadFrameworkConfig(frameworkPath) {
        const configPath = path.join(frameworkPath, 'config.json');
        const configData = await fs.readFile(configPath, 'utf8');
        return JSON.parse(configData);
    }
    
    async loadFrameworkModules(frameworkPath, config) {
        const framework = {
            name: config.name,
            version: config.version,
            config: config,
            steps: new Map(),
            services: new Map()
        };
        
        // Load steps
        if (config.steps) {
            for (const [stepName, stepConfig] of Object.entries(config.steps)) {
                const stepPath = path.join(frameworkPath, stepConfig.file);
                const StepClass = require(stepPath);
                framework.steps.set(stepName, StepClass);
            }
        }
        
        // Load services
        if (config.services) {
            for (const [serviceName, serviceConfig] of Object.entries(config.services)) {
                const servicePath = path.join(frameworkPath, serviceConfig.file);
                const ServiceClass = require(servicePath);
                framework.services.set(serviceName, ServiceClass);
            }
        }
        
        return framework;
    }
    
    async activateFramework(frameworkName, framework) {
        // Initialize services
        for (const [serviceName, ServiceClass] of framework.services) {
            const service = new ServiceClass();
            await service.initialize();
            framework.services.set(serviceName, service);
        }
        
        // Register steps with StepRegistry
        for (const [stepName, StepClass] of framework.steps) {
            const step = new StepClass();
            global.application.stepRegistry.registerStep(stepName, step);
        }
        
        this.activeFrameworks.add(frameworkName);
    }
    
    async unloadFramework(frameworkName) {
        try {
            // Deactivate framework
            await this.deactivateFramework(frameworkName);
            
            // Remove from registry
            this.registry.removeFramework(frameworkName);
            
            // Remove from active frameworks
            this.activeFrameworks.delete(frameworkName);
            
            console.log(`✅ Framework '${frameworkName}' unloaded successfully`);
            
        } catch (error) {
            console.error(`❌ Failed to unload framework '${frameworkName}':`, error.message);
            throw error;
        }
    }
    
    async deactivateFramework(frameworkName) {
        // Unregister steps from StepRegistry
        const framework = this.frameworks.get(frameworkName);
        if (framework) {
            for (const [stepName, stepClass] of framework.steps) {
                global.application.stepRegistry.unregisterStep(stepName);
            }
        }
    }
    
    async checkDependencies(dependencies) {
        if (!dependencies) return;
        
        for (const dependency of dependencies) {
            if (dependency === 'core') continue; // Core is always available
            
            if (!this.activeFrameworks.has(dependency)) {
                throw new Error(`Dependency '${dependency}' not loaded`);
            }
        }
    }
    
    getActiveFrameworks() {
        return Array.from(this.activeFrameworks);
    }
    
    hasFramework(frameworkName) {
        return this.activeFrameworks.has(frameworkName);
    }
}

module.exports = FrameworkLoader;
```

## 🔧 Task 2: FrameworkManager Implementation

### 2.1 FrameworkManager Core Implementation

```javascript
// backend/infrastructure/framework/FrameworkManager.js
const FrameworkLoader = require('./FrameworkLoader');
const FrameworkConfig = require('./FrameworkConfig');
const Logger = require('@logging/Logger');
const logger = new Logger('FrameworkManager');

class FrameworkManager {
    constructor() {
        this.loader = new FrameworkLoader();
        this.config = new FrameworkConfig();
        this.initialized = false;
    }
    
    async initialize() {
        if (this.initialized) return;
        
        // Load framework configuration
        await this.config.load();
        
        // Auto-load required frameworks
        const requiredFrameworks = this.config.getRequiredFrameworks();
        for (const frameworkName of requiredFrameworks) {
            try {
                await this.activateFramework(frameworkName);
            } catch (error) {
                logger.error(`❌ Failed to auto-load required framework '${frameworkName}':`, error.message);
            }
        }
        
        this.initialized = true;
        logger.info('✅ FrameworkManager initialized');
    }
    
    async activateFramework(frameworkName) {
        try {
            // Check if already active
            if (this.loader.hasFramework(frameworkName)) {
                logger.info(`ℹ️ Framework '${frameworkName}' already active`);
                return;
            }
            
            // Load framework
            const framework = await this.loader.loadFramework(frameworkName);
            
            // Update configuration
            this.config.addActiveFramework(frameworkName);
            await this.config.save();
            
            logger.info(`✅ Framework '${frameworkName}' activated successfully`);
            return framework;
            
        } catch (error) {
            logger.error(`❌ Failed to activate framework '${frameworkName}':`, error.message);
            throw error;
        }
    }
    
    async deactivateFramework(frameworkName) {
        try {
            // Unload framework
            await this.loader.unloadFramework(frameworkName);
            
            // Update configuration
            this.config.removeActiveFramework(frameworkName);
            await this.config.save();
            
            logger.info(`✅ Framework '${frameworkName}' deactivated successfully`);
            
        } catch (error) {
            logger.error(`❌ Failed to deactivate framework '${frameworkName}':`, error.message);
            throw error;
        }
    }
    
    async getAvailableFrameworks() {
        return this.config.getAvailableFrameworks();
    }
    
    async getActiveFrameworks() {
        return this.loader.getActiveFrameworks();
    }
    
    async getFrameworkStatus(frameworkName) {
        return {
            name: frameworkName,
            active: this.loader.hasFramework(frameworkName),
            config: this.config.getFrameworkConfig(frameworkName)
        };
    }
    
    async reloadFramework(frameworkName) {
        try {
            await this.deactivateFramework(frameworkName);
            await this.activateFramework(frameworkName);
            logger.info(`✅ Framework '${frameworkName}' reloaded successfully`);
        } catch (error) {
            logger.error(`❌ Failed to reload framework '${frameworkName}':`, error.message);
            throw error;
        }
    }
}

module.exports = FrameworkManager;
```

## 🔧 Task 3: FrameworkValidator Implementation

### 3.1 FrameworkValidator Core Implementation

```javascript
// backend/infrastructure/framework/FrameworkValidator.js
const fs = require('fs').promises;
const path = require('path');
const Logger = require('@logging/Logger');
const logger = new Logger('FrameworkValidator');

class FrameworkValidator {
    constructor() {
        this.validationRules = {
            requiredFiles: [
                'config.json',
                'README.md'
            ],
            requiredConfigFields: [
                'name',
                'version',
                'description',
                'category'
            ],
            optionalConfigFields: [
                'dependencies',
                'steps',
                'services',
                'workflows',
                'activation'
            ]
        };
    }
    
    async validateFrameworkExists(frameworkPath) {
        try {
            await fs.access(frameworkPath);
            logger.info(`✅ Framework path exists: ${frameworkPath}`);
        } catch (error) {
            throw new Error(`Framework path does not exist: ${frameworkPath}`);
        }
    }
    
    async validateFrameworkConfig(config) {
        // Validate required fields
        for (const field of this.validationRules.requiredConfigFields) {
            if (!config[field]) {
                throw new Error(`Missing required config field: ${field}`);
            }
        }
        
        // Validate field types
        if (typeof config.name !== 'string') {
            throw new Error('Config field "name" must be a string');
        }
        
        if (typeof config.version !== 'string') {
            throw new Error('Config field "version" must be a string');
        }
        
        if (typeof config.description !== 'string') {
            throw new Error('Config field "description" must be a string');
        }
        
        if (typeof config.category !== 'string') {
            throw new Error('Config field "category" must be a string');
        }
        
        // Validate dependencies
        if (config.dependencies && !Array.isArray(config.dependencies)) {
            throw new Error('Config field "dependencies" must be an array');
        }
        
        // Validate steps
        if (config.steps && typeof config.steps !== 'object') {
            throw new Error('Config field "steps" must be an object');
        }
        
        // Validate services
        if (config.services && typeof config.services !== 'object') {
            throw new Error('Config field "services" must be an object');
        }
        
        logger.info(`✅ Framework config validation passed for: ${config.name}`);
    }
    
    async validateFrameworkStructure(frameworkPath) {
        const requiredFiles = this.validationRules.requiredFiles;
        
        for (const file of requiredFiles) {
            const filePath = path.join(frameworkPath, file);
            try {
                await fs.access(filePath);
            } catch (error) {
                throw new Error(`Missing required file: ${file}`);
            }
        }
        
        logger.info(`✅ Framework structure validation passed: ${frameworkPath}`);
    }
    
    validateStepClass(StepClass, stepName) {
        if (typeof StepClass !== 'function') {
            throw new Error(`Step "${stepName}" must be a class`);
        }
        
        const step = new StepClass();
        
        if (typeof step.execute !== 'function') {
            throw new Error(`Step "${stepName}" must have an "execute" method`);
        }
        
        if (typeof step.validate !== 'function') {
            throw new Error(`Step "${stepName}" must have a "validate" method`);
        }
        
        logger.info(`✅ Step class validation passed: ${stepName}`);
    }
    
    validateServiceClass(ServiceClass, serviceName) {
        if (typeof ServiceClass !== 'function') {
            throw new Error(`Service "${serviceName}" must be a class`);
        }
        
        const service = new ServiceClass();
        
        if (typeof service.initialize !== 'function') {
            throw new Error(`Service "${serviceName}" must have an "initialize" method`);
        }
        
        if (typeof service.cleanup !== 'function') {
            throw new Error(`Service "${serviceName}" must have a "cleanup" method`);
        }
        
        logger.info(`✅ Service class validation passed: ${serviceName}`);
    }
}

module.exports = FrameworkValidator;
```

## 🔧 Task 4: FrameworkConfig Implementation

### 4.1 FrameworkConfig Core Implementation

```javascript
// backend/infrastructure/framework/FrameworkConfig.js
const fs = require('fs').promises;
const path = require('path');
const Logger = require('@logging/Logger');
const logger = new Logger('FrameworkConfig');

class FrameworkConfig {
    constructor() {
        this.configPath = path.join(__dirname, '../../../config/framework-config.json');
        this.config = {
            activeFrameworks: [],
            requiredFrameworks: [],
            autoLoad: true,
            fallbackEnabled: true,
            frameworkSettings: {}
        };
    }
    
    async load() {
        try {
            const configData = await fs.readFile(this.configPath, 'utf8');
            this.config = { ...this.config, ...JSON.parse(configData) };
            logger.info('✅ Framework configuration loaded');
        } catch (error) {
            logger.warn('⚠️ No framework configuration found, using defaults');
            await this.save();
        }
    }
    
    async save() {
        try {
            await fs.writeFile(this.configPath, JSON.stringify(this.config, null, 2));
            logger.info('✅ Framework configuration saved');
        } catch (error) {
            logger.error('❌ Failed to save framework configuration:', error.message);
            throw error;
        }
    }
    
    getRequiredFrameworks() {
        return this.config.requiredFrameworks || [];
    }
    
    getActiveFrameworks() {
        return this.config.activeFrameworks || [];
    }
    
    addActiveFramework(frameworkName) {
        if (!this.config.activeFrameworks.includes(frameworkName)) {
            this.config.activeFrameworks.push(frameworkName);
        }
    }
    
    removeActiveFramework(frameworkName) {
        this.config.activeFrameworks = this.config.activeFrameworks.filter(
            name => name !== frameworkName
        );
    }
    
    getAvailableFrameworks() {
        return this.config.frameworkSettings || {};
    }
    
    getFrameworkConfig(frameworkName) {
        return this.config.frameworkSettings[frameworkName] || null;
    }
    
    setFrameworkConfig(frameworkName, config) {
        this.config.frameworkSettings[frameworkName] = config;
    }
    
    isAutoLoadEnabled() {
        return this.config.autoLoad;
    }
    
    isFallbackEnabled() {
        return this.config.fallbackEnabled;
    }
    
    setAutoLoad(enabled) {
        this.config.autoLoad = enabled;
    }
    
    setFallbackEnabled(enabled) {
        this.config.fallbackEnabled = enabled;
    }
}

module.exports = FrameworkConfig;
```

## 📊 Phase 2 Deliverables

### **✅ Infrastructure Components:**
- [ ] FrameworkLoader with dynamic loading
- [ ] FrameworkManager with activation/deactivation
- [ ] FrameworkValidator with comprehensive validation
- [ ] FrameworkConfig with configuration management

### **✅ Framework Loading System:**
- [ ] Dynamic framework loading from backend/framework/
- [ ] Framework validation and dependency checking
- [ ] Framework activation/deactivation
- [ ] Error handling and logging

### **✅ Configuration System:**
- [ ] Framework configuration loading
- [ ] Active framework tracking
- [ ] Framework settings management
- [ ] Auto-load configuration

## 🚀 Success Criteria

### **Phase 2 Success Indicators:**
- [ ] FrameworkLoader loads frameworks dynamically
- [ ] FrameworkManager provides high-level control
- [ ] FrameworkValidator catches all validation errors
- [ ] FrameworkConfig manages configuration correctly
- [ ] All infrastructure components work together
- [ ] Error handling is robust
- [ ] Performance requirements met
- [ ] Documentation complete

## 🔄 Next Steps

### **After Phase 2 Completion:**
1. **Phase 3**: Framework Directory Structure
   - Create all framework directories
   - Set up proper framework structure
   - Create framework configurations

2. **Phase 4**: Step Migration
   - Migrate refactoring steps to framework
   - Migrate testing steps to framework
   - Test step migration and functionality

3. **Phase 5**: Core Integration
   - Integrate with StepRegistry and Application.js
   - Test framework activation/deactivation
   - Performance testing

## 📝 Notes & Updates

### **2024-12-19 - Phase 2 Planning:**
- Designed comprehensive infrastructure framework system
- Created robust validation and error handling
- Planned configuration management system
- Designed framework loading and management interfaces

### **Key Technical Decisions:**
- FrameworkLoader handles dynamic loading and validation
- FrameworkManager provides high-level control interface
- FrameworkValidator ensures framework integrity
- Configuration system supports auto-load and settings 