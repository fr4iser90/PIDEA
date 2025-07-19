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
const { FrameworkRegistry } = require('@domain/frameworks');

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
            // Check if framework is active
            if (!this.loader.hasFramework(frameworkName)) {
                logger.info(`ℹ️ Framework '${frameworkName}' not active`);
                return;
            }
            
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
        return await this.loader.getAvailableFrameworks();
    }
    
    async getActiveFrameworks() {
        return await this.loader.getActiveFrameworks();
    }
    
    async getFrameworkInfo(frameworkName) {
        const metadata = this.registry.getFrameworkMetadata(frameworkName);
        const steps = this.registry.getFrameworkSteps(frameworkName);
        const services = this.registry.getFrameworkServices(frameworkName);
        const dependencies = this.registry.getFrameworkDependencies(frameworkName);
        
        return {
            metadata,
            steps: steps.length,
            services: services.length,
            dependencies
        };
    }
    
    async getRegistryStatus() {
        return this.registry.getRegistryStatus();
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
    
    async reloadAllFrameworks() {
        const activeFrameworks = await this.getActiveFrameworks();
        
        for (const frameworkName of activeFrameworks) {
            try {
                await this.reloadFramework(frameworkName);
            } catch (error) {
                logger.error(`❌ Failed to reload framework '${frameworkName}':`, error.message);
            }
        }
    }
    
    async validateFramework(frameworkName) {
        try {
            const availableFrameworks = await this.getAvailableFrameworks();
            if (!availableFrameworks.includes(frameworkName)) {
                throw new Error(`Framework '${frameworkName}' not found`);
            }
            
            // Try to load framework temporarily for validation
            const framework = await this.loader.loadFramework(frameworkName);
            await this.loader.unloadFramework(frameworkName);
            
            return {
                valid: true,
                framework: framework.name,
                version: framework.version,
                steps: framework.steps.size,
                services: framework.services.size
            };
            
        } catch (error) {
            return {
                valid: false,
                error: error.message
            };
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

class FrameworkValidator {
    constructor() {
        this.requiredFiles = [
            'config.json',
            'README.md',
            'steps/',
            'services/'
        ];
        
        this.requiredConfigFields = [
            'name',
            'version',
            'description',
            'dependencies',
            'steps',
            'services'
        ];
        
        this.stepValidation = {
            requiredMethods: ['execute', 'validate'],
            requiredProperties: ['category', 'dependencies']
        };
        
        this.serviceValidation = {
            requiredMethods: ['initialize', 'cleanup'],
            requiredProperties: ['dependencies']
        };
    }
    
    async validateFrameworkExists(frameworkPath) {
        try {
            const stats = await fs.stat(frameworkPath);
            if (!stats.isDirectory()) {
                throw new Error(`Framework path '${frameworkPath}' is not a directory`);
            }
        } catch (error) {
            throw new Error(`Framework not found at '${frameworkPath}'`);
        }
    }
    
    async validateFrameworkStructure(frameworkPath) {
        const missingFiles = [];
        
        for (const requiredFile of this.requiredFiles) {
            const filePath = path.join(frameworkPath, requiredFile);
            try {
                await fs.access(filePath);
            } catch (error) {
                missingFiles.push(requiredFile);
            }
        }
        
        if (missingFiles.length > 0) {
            throw new Error(`Missing required files: ${missingFiles.join(', ')}`);
        }
    }
    
    validateFrameworkConfig(config) {
        const missingFields = [];
        
        for (const field of this.requiredConfigFields) {
            if (!(field in config)) {
                missingFields.push(field);
            }
        }
        
        if (missingFields.length > 0) {
            throw new Error(`Missing required config fields: ${missingFields.join(', ')}`);
        }
        
        // Validate name format
        if (!/^[a-z_]+$/.test(config.name)) {
            throw new Error('Framework name must contain only lowercase letters and underscores');
        }
        
        // Validate version format
        if (!/^\d+\.\d+\.\d+$/.test(config.version)) {
            throw new Error('Framework version must be in semantic versioning format (x.y.z)');
        }
    }
    
    async validateFrameworkSteps(frameworkPath, config) {
        if (!config.steps) return;
        
        for (const [stepName, stepConfig] of Object.entries(config.steps)) {
            // Validate step config
            if (!stepConfig.file) {
                throw new Error(`Step '${stepName}' missing file path`);
            }
            
            if (!stepConfig.category) {
                throw new Error(`Step '${stepName}' missing category`);
            }
            
            // Validate step file exists
            const stepPath = path.join(frameworkPath, stepConfig.file);
            try {
                await fs.access(stepPath);
            } catch (error) {
                throw new Error(`Step file not found: ${stepConfig.file}`);
            }
            
            // Validate step class
            try {
                const StepClass = require(stepPath);
                this.validateStepClass(StepClass, stepName);
            } catch (error) {
                throw new Error(`Invalid step class '${stepName}': ${error.message}`);
            }
        }
    }
    
    async validateFrameworkServices(frameworkPath, config) {
        if (!config.services) return;
        
        for (const [serviceName, serviceConfig] of Object.entries(config.services)) {
            // Validate service config
            if (!serviceConfig.file) {
                throw new Error(`Service '${serviceName}' missing file path`);
            }
            
            // Validate service file exists
            const servicePath = path.join(frameworkPath, serviceConfig.file);
            try {
                await fs.access(servicePath);
            } catch (error) {
                throw new Error(`Service file not found: ${serviceConfig.file}`);
            }
            
            // Validate service class
            try {
                const ServiceClass = require(servicePath);
                this.validateServiceClass(ServiceClass, serviceName);
            } catch (error) {
                throw new Error(`Invalid service class '${serviceName}': ${error.message}`);
            }
        }
    }
    
    validateStepClass(StepClass, stepName) {
        // Check if it's a class
        if (typeof StepClass !== 'function') {
            throw new Error('Step must be a class');
        }
        
        // Check required methods
        for (const method of this.stepValidation.requiredMethods) {
            if (typeof StepClass.prototype[method] !== 'function') {
                throw new Error(`Step must have '${method}' method`);
            }
        }
        
        // Check required properties
        const instance = new StepClass();
        for (const property of this.stepValidation.requiredProperties) {
            if (!(property in instance)) {
                throw new Error(`Step must have '${property}' property`);
            }
        }
    }
    
    validateServiceClass(ServiceClass, serviceName) {
        // Check if it's a class
        if (typeof ServiceClass !== 'function') {
            throw new Error('Service must be a class');
        }
        
        // Check required methods
        for (const method of this.serviceValidation.requiredMethods) {
            if (typeof ServiceClass.prototype[method] !== 'function') {
                throw new Error(`Service must have '${method}' method`);
            }
        }
        
        // Check required properties
        const instance = new ServiceClass();
        for (const property of this.serviceValidation.requiredProperties) {
            if (!(property in instance)) {
                throw new Error(`Service must have '${property}' property`);
            }
        }
    }
    
    async validateFramework(frameworkPath) {
        try {
            // Validate framework exists
            await this.validateFrameworkExists(frameworkPath);
            
            // Validate framework structure
            await this.validateFrameworkStructure(frameworkPath);
            
            // Load and validate config
            const configPath = path.join(frameworkPath, 'config.json');
            const configData = await fs.readFile(configPath, 'utf8');
            const config = JSON.parse(configData);
            
            this.validateFrameworkConfig(config);
            
            // Validate steps and services
            await this.validateFrameworkSteps(frameworkPath, config);
            await this.validateFrameworkServices(frameworkPath, config);
            
            return {
                valid: true,
                config: config
            };
            
        } catch (error) {
            return {
                valid: false,
                error: error.message
            };
        }
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

class FrameworkConfig {
    constructor() {
        this.configPath = path.join(__dirname, '../../../config/framework-config.json');
        this.config = {
            activeFrameworks: [],
            requiredFrameworks: [],
            frameworkSettings: {},
            autoLoad: true,
            fallbackEnabled: true
        };
    }
    
    async load() {
        try {
            const configData = await fs.readFile(this.configPath, 'utf8');
            this.config = { ...this.config, ...JSON.parse(configData) };
        } catch (error) {
            // Use default config if file doesn't exist
            console.log('📝 Using default framework configuration');
        }
    }
    
    async save() {
        try {
            await fs.writeFile(this.configPath, JSON.stringify(this.config, null, 2));
        } catch (error) {
            console.error('❌ Failed to save framework configuration:', error.message);
            throw error;
        }
    }
    
    addActiveFramework(frameworkName) {
        if (!this.config.activeFrameworks.includes(frameworkName)) {
            this.config.activeFrameworks.push(frameworkName);
        }
    }
    
    removeActiveFramework(frameworkName) {
        this.config.activeFrameworks = this.config.activeFrameworks.filter(
            f => f !== frameworkName
        );
    }
    
    getActiveFrameworks() {
        return this.config.activeFrameworks;
    }
    
    getRequiredFrameworks() {
        return this.config.requiredFrameworks;
    }
    
    setRequiredFrameworks(frameworks) {
        this.config.requiredFrameworks = frameworks;
    }
    
    getFrameworkSettings(frameworkName) {
        return this.config.frameworkSettings[frameworkName] || {};
    }
    
    setFrameworkSettings(frameworkName, settings) {
        this.config.frameworkSettings[frameworkName] = settings;
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
   - Migrate refactoring and testing steps to frameworks
   - Test step migration and functionality

3. **Phase 5**: Core Integration & Testing
   - Integrate framework system with Application.js
   - Test framework activation/deactivation
   - Performance testing

## 📝 Notes & Updates

### **2024-12-19 - Phase 2 Planning:**
- ✅ **FrameworkRegistry already exists in domain layer** - No need to create duplicate
- ✅ **FrameworkBuilder already exists in domain layer** - No need to create duplicate
- ✅ **StepRegistry already has framework support** - Already implements IStandardRegistry interface
- ⚠️ **Infrastructure framework components missing** - FrameworkLoader, FrameworkManager, FrameworkValidator, FrameworkConfig
- ⚠️ **Framework directories missing** - All planned framework directories need creation

### **Key Technical Decisions:**
- Use existing FrameworkRegistry from domain layer (`@domain/frameworks`)
- Use existing StepRegistry from domain layer (already has framework support)
- Create only missing infrastructure components
- Maintain backward compatibility with existing system
- Follow established DDD patterns and registry interfaces 