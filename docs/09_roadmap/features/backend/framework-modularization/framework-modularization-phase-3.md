# Phase 3: Framework System Implementation

## 📋 Phase Overview
- **Phase**: 3 of 5
- **Duration**: 10 hours
- **Status**: Planning
- **Progress**: 0%

## 🎯 Phase Objectives
1. Implement FrameworkLoader with dynamic loading
2. Create FrameworkRegistry for framework management
3. Implement FrameworkManager for activation/deactivation
4. Add framework configuration system
5. Create framework validation and dependency checking

## 🔧 Task 1: FrameworkLoader Implementation

### 1.1 FrameworkLoader Core Implementation

```javascript
// backend/infrastructure/framework/FrameworkLoader.js
const fs = require('fs').promises;
const path = require('path');
const FrameworkValidator = require('./FrameworkValidator');
const FrameworkRegistry = require('./FrameworkRegistry');

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
            await this.registry.registerFramework(frameworkName, framework);
            
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
            const framework = this.frameworks.get(frameworkName);
            if (!framework) {
                throw new Error(`Framework '${frameworkName}' not found`);
            }
            
            // 1. Deactivate framework
            await this.deactivateFramework(frameworkName, framework);
            
            // 2. Unregister from registry
            await this.registry.unregisterFramework(frameworkName);
            
            // 3. Remove from active frameworks
            this.activeFrameworks.delete(frameworkName);
            
            console.log(`✅ Framework '${frameworkName}' unloaded successfully`);
            
        } catch (error) {
            console.error(`❌ Failed to unload framework '${frameworkName}':`, error.message);
            throw error;
        }
    }
    
    async deactivateFramework(frameworkName, framework) {
        // Unregister steps from StepRegistry
        for (const [stepName] of framework.steps) {
            global.application.stepRegistry.unregisterStep(stepName);
        }
        
        // Cleanup services
        for (const [serviceName, service] of framework.services) {
            if (service.cleanup) {
                await service.cleanup();
            }
        }
    }
    
    async checkDependencies(dependencies) {
        if (!dependencies) return;
        
        // Check core dependencies
        if (dependencies.core) {
            for (const coreDep of dependencies.core) {
                if (!global.application[coreDep]) {
                    throw new Error(`Core dependency '${coreDep}' not available`);
                }
            }
        }
        
        // Check framework dependencies
        if (dependencies.frameworks) {
            for (const frameworkDep of dependencies.frameworks) {
                if (!this.activeFrameworks.has(frameworkDep)) {
                    throw new Error(`Framework dependency '${frameworkDep}' not loaded`);
                }
            }
        }
    }
    
    async getActiveFrameworks() {
        return Array.from(this.activeFrameworks);
    }
    
    async getAvailableFrameworks() {
        const frameworks = [];
        const entries = await fs.readdir(this.frameworkPath, { withFileTypes: true });
        
        for (const entry of entries) {
            if (entry.isDirectory()) {
                const configPath = path.join(this.frameworkPath, entry.name, 'config.json');
                try {
                    await fs.access(configPath);
                    frameworks.push(entry.name);
                } catch (error) {
                    // Framework without config.json - skip
                }
            }
        }
        
        return frameworks;
    }
}

module.exports = FrameworkLoader;
```

### 1.2 FrameworkLoader Tests

```javascript
// tests/unit/FrameworkLoader.test.js
const FrameworkLoader = require('../../infrastructure/framework/FrameworkLoader');
const path = require('path');

describe('FrameworkLoader', () => {
    let loader;
    
    beforeEach(() => {
        loader = new FrameworkLoader();
    });
    
    describe('loadFramework', () => {
        test('should load valid framework successfully', async () => {
            const framework = await loader.loadFramework('task_management');
            expect(framework).toBeDefined();
            expect(framework.name).toBe('task_management');
            expect(framework.steps).toBeInstanceOf(Map);
            expect(framework.services).toBeInstanceOf(Map);
        });
        
        test('should throw error for non-existent framework', async () => {
            await expect(loader.loadFramework('non_existent'))
                .rejects.toThrow('Framework not found');
        });
        
        test('should throw error for invalid config', async () => {
            // Test with invalid config.json
            await expect(loader.loadFramework('invalid_config'))
                .rejects.toThrow('Invalid framework configuration');
        });
    });
    
    describe('unloadFramework', () => {
        test('should unload framework successfully', async () => {
            await loader.loadFramework('task_management');
            await loader.unloadFramework('task_management');
            
            const activeFrameworks = await loader.getActiveFrameworks();
            expect(activeFrameworks).not.toContain('task_management');
        });
    });
    
    describe('getAvailableFrameworks', () => {
        test('should return list of available frameworks', async () => {
            const frameworks = await loader.getAvailableFrameworks();
            expect(Array.isArray(frameworks)).toBe(true);
            expect(frameworks).toContain('task_management');
            expect(frameworks).toContain('refactoring_management');
        });
    });
});
```

## 🔧 Task 2: FrameworkRegistry Implementation

### 2.1 FrameworkRegistry Core Implementation

```javascript
// backend/infrastructure/framework/FrameworkRegistry.js
class FrameworkRegistry {
    constructor() {
        this.frameworks = new Map();
        this.steps = new Map();
        this.services = new Map();
        this.dependencies = new Map();
        this.metadata = new Map();
    }
    
    registerFramework(frameworkName, framework) {
        // Register framework metadata
        this.metadata.set(frameworkName, {
            name: framework.name,
            version: framework.version,
            loadedAt: new Date(),
            status: 'active'
        });
        
        // Register framework instance
        this.frameworks.set(frameworkName, framework);
        
        // Register steps
        for (const [stepName, stepClass] of framework.steps) {
            this.steps.set(`${frameworkName}.${stepName}`, {
                framework: frameworkName,
                step: stepName,
                class: stepClass
            });
        }
        
        // Register services
        for (const [serviceName, serviceClass] of framework.services) {
            this.services.set(`${frameworkName}.${serviceName}`, {
                framework: frameworkName,
                service: serviceName,
                class: serviceClass
            });
        }
        
        // Register dependencies
        if (framework.config.dependencies) {
            this.dependencies.set(frameworkName, framework.config.dependencies);
        }
        
        console.log(`📝 Framework '${frameworkName}' registered in registry`);
    }
    
    unregisterFramework(frameworkName) {
        // Remove framework metadata
        this.metadata.delete(frameworkName);
        
        // Remove framework instance
        this.frameworks.delete(frameworkName);
        
        // Remove steps
        for (const [key, value] of this.steps) {
            if (value.framework === frameworkName) {
                this.steps.delete(key);
            }
        }
        
        // Remove services
        for (const [key, value] of this.services) {
            if (value.framework === frameworkName) {
                this.services.delete(key);
            }
        }
        
        // Remove dependencies
        this.dependencies.delete(frameworkName);
        
        console.log(`🗑️ Framework '${frameworkName}' unregistered from registry`);
    }
    
    getFramework(frameworkName) {
        return this.frameworks.get(frameworkName);
    }
    
    getFrameworkMetadata(frameworkName) {
        return this.metadata.get(frameworkName);
    }
    
    getFrameworkSteps(frameworkName) {
        const steps = [];
        for (const [key, value] of this.steps) {
            if (value.framework === frameworkName) {
                steps.push({
                    name: value.step,
                    class: value.class
                });
            }
        }
        return steps;
    }
    
    getFrameworkServices(frameworkName) {
        const services = [];
        for (const [key, value] of this.services) {
            if (value.framework === frameworkName) {
                services.push({
                    name: value.service,
                    class: value.class
                });
            }
        }
        return services;
    }
    
    getFrameworkDependencies(frameworkName) {
        return this.dependencies.get(frameworkName) || {};
    }
    
    getAllFrameworks() {
        return Array.from(this.frameworks.keys());
    }
    
    getAllSteps() {
        return Array.from(this.steps.keys());
    }
    
    getAllServices() {
        return Array.from(this.services.keys());
    }
    
    getStep(stepName) {
        return this.steps.get(stepName);
    }
    
    getService(serviceName) {
        return this.services.get(serviceName);
    }
    
    hasFramework(frameworkName) {
        return this.frameworks.has(frameworkName);
    }
    
    hasStep(stepName) {
        return this.steps.has(stepName);
    }
    
    hasService(serviceName) {
        return this.services.has(serviceName);
    }
    
    getRegistryStatus() {
        return {
            totalFrameworks: this.frameworks.size,
            totalSteps: this.steps.size,
            totalServices: this.services.size,
            frameworks: Array.from(this.metadata.values()),
            steps: Array.from(this.steps.keys()),
            services: Array.from(this.services.keys())
        };
    }
}

module.exports = FrameworkRegistry;
```

### 2.2 FrameworkRegistry Tests

```javascript
// tests/unit/FrameworkRegistry.test.js
const FrameworkRegistry = require('../../infrastructure/framework/FrameworkRegistry');

describe('FrameworkRegistry', () => {
    let registry;
    
    beforeEach(() => {
        registry = new FrameworkRegistry();
    });
    
    describe('registerFramework', () => {
        test('should register framework with steps and services', () => {
            const mockFramework = {
                name: 'test_framework',
                version: '1.0.0',
                config: {
                    dependencies: {
                        core: ['GitService']
                    }
                },
                steps: new Map([
                    ['test_step', class TestStep {}]
                ]),
                services: new Map([
                    ['test_service', class TestService {}]
                ])
            };
            
            registry.registerFramework('test_framework', mockFramework);
            
            expect(registry.hasFramework('test_framework')).toBe(true);
            expect(registry.hasStep('test_framework.test_step')).toBe(true);
            expect(registry.hasService('test_framework.test_service')).toBe(true);
        });
    });
    
    describe('unregisterFramework', () => {
        test('should unregister framework and all its components', () => {
            // Register framework first
            const mockFramework = {
                name: 'test_framework',
                version: '1.0.0',
                config: {},
                steps: new Map([['test_step', class TestStep {}]]),
                services: new Map([['test_service', class TestService {}]])
            };
            
            registry.registerFramework('test_framework', mockFramework);
            registry.unregisterFramework('test_framework');
            
            expect(registry.hasFramework('test_framework')).toBe(false);
            expect(registry.hasStep('test_framework.test_step')).toBe(false);
            expect(registry.hasService('test_framework.test_service')).toBe(false);
        });
    });
    
    describe('getRegistryStatus', () => {
        test('should return correct registry status', () => {
            const status = registry.getRegistryStatus();
            
            expect(status).toHaveProperty('totalFrameworks');
            expect(status).toHaveProperty('totalSteps');
            expect(status).toHaveProperty('totalServices');
            expect(status).toHaveProperty('frameworks');
            expect(status).toHaveProperty('steps');
            expect(status).toHaveProperty('services');
        });
    });
});
```

## 🔧 Task 3: FrameworkManager Implementation

### 3.1 FrameworkManager Core Implementation

```javascript
// backend/infrastructure/framework/FrameworkManager.js
const FrameworkLoader = require('./FrameworkLoader');
const FrameworkRegistry = require('./FrameworkRegistry');
const FrameworkConfig = require('./FrameworkConfig');

class FrameworkManager {
    constructor() {
        this.loader = new FrameworkLoader();
        this.registry = new FrameworkRegistry();
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
                console.error(`❌ Failed to auto-load required framework '${frameworkName}':`, error.message);
            }
        }
        
        this.initialized = true;
        console.log('✅ FrameworkManager initialized');
    }
    
    async activateFramework(frameworkName) {
        try {
            // Check if already active
            if (this.registry.hasFramework(frameworkName)) {
                console.log(`ℹ️ Framework '${frameworkName}' already active`);
                return;
            }
            
            // Load framework
            const framework = await this.loader.loadFramework(frameworkName);
            
            // Update configuration
            this.config.addActiveFramework(frameworkName);
            await this.config.save();
            
            console.log(`✅ Framework '${frameworkName}' activated successfully`);
            return framework;
            
        } catch (error) {
            console.error(`❌ Failed to activate framework '${frameworkName}':`, error.message);
            throw error;
        }
    }
    
    async deactivateFramework(frameworkName) {
        try {
            // Check if framework is active
            if (!this.registry.hasFramework(frameworkName)) {
                console.log(`ℹ️ Framework '${frameworkName}' not active`);
                return;
            }
            
            // Unload framework
            await this.loader.unloadFramework(frameworkName);
            
            // Update configuration
            this.config.removeActiveFramework(frameworkName);
            await this.config.save();
            
            console.log(`✅ Framework '${frameworkName}' deactivated successfully`);
            
        } catch (error) {
            console.error(`❌ Failed to deactivate framework '${frameworkName}':`, error.message);
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
            console.log(`✅ Framework '${frameworkName}' reloaded successfully`);
        } catch (error) {
            console.error(`❌ Failed to reload framework '${frameworkName}':`, error.message);
            throw error;
        }
    }
    
    async reloadAllFrameworks() {
        const activeFrameworks = await this.getActiveFrameworks();
        
        for (const frameworkName of activeFrameworks) {
            try {
                await this.reloadFramework(frameworkName);
            } catch (error) {
                console.error(`❌ Failed to reload framework '${frameworkName}':`, error.message);
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

### 3.2 FrameworkManager Tests

```javascript
// tests/unit/FrameworkManager.test.js
const FrameworkManager = require('../../infrastructure/framework/FrameworkManager');

describe('FrameworkManager', () => {
    let manager;
    
    beforeEach(async () => {
        manager = new FrameworkManager();
        await manager.initialize();
    });
    
    describe('activateFramework', () => {
        test('should activate framework successfully', async () => {
            const framework = await manager.activateFramework('task_management');
            expect(framework).toBeDefined();
            
            const activeFrameworks = await manager.getActiveFrameworks();
            expect(activeFrameworks).toContain('task_management');
        });
        
        test('should not activate already active framework', async () => {
            await manager.activateFramework('task_management');
            await manager.activateFramework('task_management'); // Should not throw
            
            const activeFrameworks = await manager.getActiveFrameworks();
            expect(activeFrameworks.filter(f => f === 'task_management')).toHaveLength(1);
        });
    });
    
    describe('deactivateFramework', () => {
        test('should deactivate framework successfully', async () => {
            await manager.activateFramework('task_management');
            await manager.deactivateFramework('task_management');
            
            const activeFrameworks = await manager.getActiveFrameworks();
            expect(activeFrameworks).not.toContain('task_management');
        });
    });
    
    describe('getFrameworkInfo', () => {
        test('should return framework information', async () => {
            await manager.activateFramework('task_management');
            const info = await manager.getFrameworkInfo('task_management');
            
            expect(info).toHaveProperty('metadata');
            expect(info).toHaveProperty('steps');
            expect(info).toHaveProperty('services');
            expect(info).toHaveProperty('dependencies');
        });
    });
    
    describe('validateFramework', () => {
        test('should validate existing framework', async () => {
            const result = await manager.validateFramework('task_management');
            expect(result.valid).toBe(true);
            expect(result.framework).toBe('task_management');
        });
        
        test('should reject non-existent framework', async () => {
            const result = await manager.validateFramework('non_existent');
            expect(result.valid).toBe(false);
            expect(result.error).toContain('not found');
        });
    });
});
```

## 🔧 Task 4: Framework Configuration System

### 4.1 FrameworkConfig Implementation

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
            autoLoad: true
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
    
    setAutoLoad(enabled) {
        this.config.autoLoad = enabled;
    }
    
    getConfig() {
        return this.config;
    }
}

module.exports = FrameworkConfig;
```

### 4.2 Framework Configuration File

```json
// config/framework-config.json
{
    "activeFrameworks": [
        "task_management",
        "refactoring_management"
    ],
    "requiredFrameworks": [
        "task_management"
    ],
    "frameworkSettings": {
        "task_management": {
            "autoExecute": true,
            "maxConcurrentTasks": 5
        },
        "refactoring_management": {
            "autoBackup": true,
            "backupLocation": "./backups"
        }
    },
    "autoLoad": true
}
```

## 🔧 Task 5: Framework Validation System

### 5.1 FrameworkValidator Implementation

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

### 5.2 FrameworkValidator Tests

```javascript
// tests/unit/FrameworkValidator.test.js
const FrameworkValidator = require('../../infrastructure/framework/FrameworkValidator');
const path = require('path');

describe('FrameworkValidator', () => {
    let validator;
    
    beforeEach(() => {
        validator = new FrameworkValidator();
    });
    
    describe('validateFrameworkConfig', () => {
        test('should validate correct config', () => {
            const config = {
                name: 'test_framework',
                version: '1.0.0',
                description: 'Test framework',
                dependencies: {},
                steps: {},
                services: {}
            };
            
            expect(() => validator.validateFrameworkConfig(config)).not.toThrow();
        });
        
        test('should reject config with missing fields', () => {
            const config = {
                name: 'test_framework',
                version: '1.0.0'
                // Missing required fields
            };
            
            expect(() => validator.validateFrameworkConfig(config))
                .toThrow('Missing required config fields');
        });
        
        test('should reject invalid framework name', () => {
            const config = {
                name: 'Test-Framework', // Invalid format
                version: '1.0.0',
                description: 'Test framework',
                dependencies: {},
                steps: {},
                services: {}
            };
            
            expect(() => validator.validateFrameworkConfig(config))
                .toThrow('Framework name must contain only lowercase letters and underscores');
        });
        
        test('should reject invalid version format', () => {
            const config = {
                name: 'test_framework',
                version: '1.0', // Invalid format
                description: 'Test framework',
                dependencies: {},
                steps: {},
                services: {}
            };
            
            expect(() => validator.validateFrameworkConfig(config))
                .toThrow('Framework version must be in semantic versioning format');
        });
    });
    
    describe('validateStepClass', () => {
        test('should validate correct step class', () => {
            class ValidStep {
                constructor() {
                    this.category = 'test';
                    this.dependencies = [];
                }
                
                async execute() {}
                async validate() {}
            }
            
            expect(() => validator.validateStepClass(ValidStep, 'test_step')).not.toThrow();
        });
        
        test('should reject step without required methods', () => {
            class InvalidStep {
                constructor() {
                    this.category = 'test';
                    this.dependencies = [];
                }
                
                async execute() {}
                // Missing validate method
            }
            
            expect(() => validator.validateStepClass(InvalidStep, 'test_step'))
                .toThrow("Step must have 'validate' method");
        });
    });
    
    describe('validateServiceClass', () => {
        test('should validate correct service class', () => {
            class ValidService {
                constructor() {
                    this.dependencies = [];
                }
                
                async initialize() {}
                async cleanup() {}
            }
            
            expect(() => validator.validateServiceClass(ValidService, 'test_service')).not.toThrow();
        });
        
        test('should reject service without required methods', () => {
            class InvalidService {
                constructor() {
                    this.dependencies = [];
                }
                
                async initialize() {}
                // Missing cleanup method
            }
            
            expect(() => validator.validateServiceClass(InvalidService, 'test_service'))
                .toThrow("Service must have 'cleanup' method");
        });
    });
});
```

## 📊 Phase 3 Deliverables

### **✅ FrameworkLoader Implementation:**
- [ ] Dynamic framework loading system
- [ ] Framework validation and dependency checking
- [ ] Framework activation/deactivation
- [ ] Error handling and logging

### **✅ FrameworkRegistry Implementation:**
- [ ] Framework metadata management
- [ ] Step and service registration
- [ ] Dependency tracking
- [ ] Registry status reporting

### **✅ FrameworkManager Implementation:**
- [ ] High-level framework management
- [ ] Configuration integration
- [ ] Framework lifecycle management
- [ ] Validation and error handling

### **✅ Framework Configuration System:**
- [ ] Configuration file management
- [ ] Active framework tracking
- [ ] Framework settings management
- [ ] Auto-load configuration

### **✅ Framework Validation System:**
- [ ] Framework structure validation
- [ ] Configuration validation
- [ ] Step and service validation
- [ ] Comprehensive error reporting

## 🚀 Success Criteria

### **Phase 3 Success Indicators:**
- [ ] FrameworkLoader loads frameworks dynamically
- [ ] FrameworkRegistry manages framework metadata
- [ ] FrameworkManager provides high-level control
- [ ] Configuration system works correctly
- [ ] Validation system catches all errors
- [ ] All tests pass
- [ ] Performance requirements met
- [ ] Documentation complete

## 🔄 Next Steps

### **After Phase 3 Completion:**
1. **Phase 4**: Framework Migration
   - Migrate TaskService to framework
   - Migrate WorkflowExecutionService to framework
   - Migrate other business logic services

2. **Phase 5**: Integration & Testing
   - Integrate framework system
   - Test framework activation/deactivation
   - Performance testing

## 📝 Notes & Updates

### **2024-12-19 - Phase 3 Planning:**
- Designed comprehensive framework loading system
- Created robust validation and error handling
- Planned configuration management system
- Designed registry for framework metadata

### **Key Technical Decisions:**
- FrameworkLoader handles dynamic loading and validation
- FrameworkRegistry manages all framework metadata
- FrameworkManager provides high-level control interface
- Configuration system supports auto-load and settings
- Validation system ensures framework integrity 