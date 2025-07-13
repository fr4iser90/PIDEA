
/**
 * ArchitectureAnalyzer - Comprehensive architecture analysis
 */
const path = require('path');
const fs = require('fs');
const fsPromises = require('fs').promises;

class ArchitectureAnalyzer {
    constructor() {
        this.patterns = {
            mvc: { name: 'Model-View-Controller', confidence: 0 },
            mvp: { name: 'Model-View-Presenter', confidence: 0 },
            mvvm: { name: 'Model-View-ViewModel', confidence: 0 },
            layered: { name: 'Layered Architecture', confidence: 0 },
            microservices: { name: 'Microservices', confidence: 0 },
            monolith: { name: 'Monolithic', confidence: 0 },
            eventDriven: { name: 'Event-Driven', confidence: 0 },
            cqrs: { name: 'CQRS', confidence: 0 },
            ddd: { name: 'Domain-Driven Design', confidence: 0 }
        };
    }

    /**
     * Analyze architecture for a project
     * @param {string} projectPath - Project directory path
     * @param {Object} options - Analysis options
     * @returns {Promise<Object>} Architecture analysis results
     */
    async analyzeArchitecture(projectPath, options = {}) {
        try {
            const analysis = {
                projectPath,
                timestamp: new Date(),
                detectedPatterns: [],
                structure: {},
                coupling: {},
                cohesion: {},
                dependencies: {},
                violations: [],
                recommendations: [],
                architectureScore: 0
            };

            // Analyze project structure
            analysis.structure = await this.analyzeProjectStructure(projectPath);
            
            // Detect design patterns
            analysis.detectedPatterns = await this.detectDesignPatterns(projectPath);
            
            // Analyze coupling
            analysis.coupling = await this.analyzeCoupling(projectPath);
            
            // Analyze cohesion
            analysis.cohesion = await this.analyzeCohesion(projectPath);
            
            // Generate dependency graph
            analysis.dependencies = await this.generateDependencyGraph(projectPath);
            
            // Detect architecture violations
            analysis.violations = await this.detectArchitectureViolations(projectPath);
            
            // Generate recommendations
            analysis.recommendations = await this.generateArchitectureRecommendations(analysis);
            
            // Calculate architecture score
            analysis.architectureScore = this.calculateArchitectureScore(analysis);

            return analysis;
        } catch (error) {
            throw new Error(`Architecture analysis failed: ${error.message}`);
        }
    }

    /**
     * Analyze architecture for a project (alias for analyzeArchitecture)
     * @param {string} projectPath - Project directory path
     * @param {Object} options - Analysis options
     * @returns {Promise<Object>} Architecture analysis results
     */
    async analyze(projectPath, options = {}) {
        return this.analyzeArchitecture(projectPath, options);
    }

    /**
     * Analyze project structure
     * @param {string} projectPath - Project directory path
     * @returns {Promise<Object>} Project structure analysis
     */
    async analyzeProjectStructure(projectPath) {
        const structure = {
            layers: [],
            modules: [],
            components: [],
            services: [],
            utilities: [],
            configuration: {},
            organization: 'unknown'
        };

        try {
            // Recursively analyze directory structure
            await this.analyzeDirectoryRecursively(projectPath, structure, projectPath);
            
            // Determine organization pattern
            if (structure.layers.length > 0) {
                structure.organization = 'layered';
            } else if (structure.modules.length > 0) {
                structure.organization = 'modular';
            } else if (structure.services.length > 0) {
                structure.organization = 'service-oriented';
            } else {
                structure.organization = 'flat';
            }

        } catch (error) {
            // Ignore errors
        }

        return structure;
    }

    async analyzeDirectoryRecursively(dirPath, structure, projectPath, depth = 0) {
        if (depth > 3) return; // Limit recursion depth
        
        try {
            const items = await fsPromises.readdir(dirPath);
            
            for (const item of items) {
                const itemPath = path.join(dirPath, item);
                const stats = await fsPromises.stat(itemPath);
                
                if (stats.isDirectory()) {
                    const relativePath = path.relative(projectPath, itemPath);
                    
                    // Detect common architectural layers
                    if (item.toLowerCase().includes('controller') || item.toLowerCase().includes('api') || 
                        item.toLowerCase().includes('presentation') || item.toLowerCase().includes('web')) {
                        structure.layers.push({ name: 'presentation', path: relativePath });
                    }
                    if (item.toLowerCase().includes('service') || item.toLowerCase().includes('business') || 
                        item.toLowerCase().includes('application') || item.toLowerCase().includes('domain')) {
                        structure.layers.push({ name: 'business', path: relativePath });
                        structure.services.push(relativePath);
                    }
                    if (item.toLowerCase().includes('model') || item.toLowerCase().includes('entity') || 
                        item.toLowerCase().includes('data') || item.toLowerCase().includes('repository')) {
                        structure.layers.push({ name: 'data', path: relativePath });
                    }
                    if (item.toLowerCase().includes('middleware') || item.toLowerCase().includes('interceptor') || 
                        item.toLowerCase().includes('auth') || item.toLowerCase().includes('infrastructure')) {
                        structure.layers.push({ name: 'cross-cutting', path: relativePath });
                    }
                    if (item.toLowerCase().includes('util') || item.toLowerCase().includes('helper') || 
                        item.toLowerCase().includes('common') || item.toLowerCase().includes('shared')) {
                        structure.utilities.push(relativePath);
                    }
                    if (item.toLowerCase().includes('config') || item.toLowerCase().includes('setting') || 
                        item.toLowerCase().includes('conf')) {
                        structure.configuration[relativePath] = await this.analyzeConfiguration(itemPath);
                    }
                    
                    // Recursively analyze subdirectories
                    await this.analyzeDirectoryRecursively(itemPath, structure, projectPath, depth + 1);
                }
            }
        } catch (error) {
            // Ignore errors
        }
    }

    /**
     * Detect design patterns
     * @param {string} projectPath - Project directory path
     * @returns {Promise<Array>} Detected design patterns
     */
    async detectDesignPatterns(projectPath) {
        const detectedPatterns = [];

        try {
            const files = await this.getCodeFiles(projectPath);
            
            for (const file of files) {
                const content = await fsPromises.readFile(file, 'utf8');
                const filePatterns = this.detectPatternsInFile(content, file);
                detectedPatterns.push(...filePatterns);
            }

            // Aggregate pattern confidence
            const patternConfidence = {};
            for (const pattern of detectedPatterns) {
                if (!patternConfidence[pattern.pattern]) {
                    patternConfidence[pattern.pattern] = 0;
                }
                patternConfidence[pattern.pattern] += pattern.confidence;
            }

            // Return patterns with high confidence
            return Object.entries(patternConfidence)
                .filter(([pattern, confidence]) => confidence > 0.3)
                .map(([pattern, confidence]) => ({
                    pattern,
                    confidence: Math.min(confidence, 1),
                    description: this.patterns[pattern]?.name || pattern
                }));

        } catch (error) {
            // Ignore errors
        }

        return detectedPatterns;
    }

    /**
     * Detect patterns in a single file
     * @param {string} content - File content
     * @param {string} filePath - File path
     * @returns {Array} Patterns found
     */
    detectPatternsInFile(content, filePath) {
        const patterns = [];
        const lines = content.split('\n');

        // MVC Pattern detection
        if (content.includes('class') && content.includes('Controller')) {
            patterns.push({ pattern: 'mvc', confidence: 0.8, file: filePath });
        }
        if (content.includes('class') && content.includes('Model')) {
            patterns.push({ pattern: 'mvc', confidence: 0.6, file: filePath });
        }
        if (content.includes('class') && content.includes('View')) {
            patterns.push({ pattern: 'mvc', confidence: 0.6, file: filePath });
        }
        if (content.includes('Controller') || content.includes('controller')) {
            patterns.push({ pattern: 'mvc', confidence: 0.7, file: filePath });
        }

        // CQRS Pattern detection
        if (content.includes('Command') && content.includes('Query')) {
            patterns.push({ pattern: 'cqrs', confidence: 0.7, file: filePath });
        }
        if (content.includes('CommandHandler') || content.includes('QueryHandler')) {
            patterns.push({ pattern: 'cqrs', confidence: 0.8, file: filePath });
        }
        if (content.includes('Command') || content.includes('Query')) {
            patterns.push({ pattern: 'cqrs', confidence: 0.5, file: filePath });
        }

        // DDD Pattern detection
        if (content.includes('Entity') || content.includes('ValueObject') || content.includes('Aggregate')) {
            patterns.push({ pattern: 'ddd', confidence: 0.7, file: filePath });
        }
        if (content.includes('DomainService') || content.includes('Repository')) {
            patterns.push({ pattern: 'ddd', confidence: 0.6, file: filePath });
        }
        if (content.includes('domain') || content.includes('Domain')) {
            patterns.push({ pattern: 'ddd', confidence: 0.4, file: filePath });
        }

        // Event-Driven Pattern detection
        if (content.includes('EventEmitter') || content.includes('emit(') || content.includes('on(')) {
            patterns.push({ pattern: 'eventDriven', confidence: 0.6, file: filePath });
        }
        if (content.includes('EventBus') || content.includes('EventStore')) {
            patterns.push({ pattern: 'eventDriven', confidence: 0.8, file: filePath });
        }
        if (content.includes('Event') || content.includes('event')) {
            patterns.push({ pattern: 'eventDriven', confidence: 0.4, file: filePath });
        }

        // Layered Architecture detection
        if (content.includes('Service') && content.includes('Repository')) {
            patterns.push({ pattern: 'layered', confidence: 0.5, file: filePath });
        }
        if (content.includes('service') || content.includes('Service')) {
            patterns.push({ pattern: 'layered', confidence: 0.3, file: filePath });
        }

        // Microservices detection
        if (content.includes('microservice') || content.includes('service-discovery')) {
            patterns.push({ pattern: 'microservices', confidence: 0.7, file: filePath });
        }

        // Monolithic detection
        if (content.includes('app.js') || content.includes('server.js') || content.includes('index.js')) {
            patterns.push({ pattern: 'monolith', confidence: 0.4, file: filePath });
        }

        return patterns;
    }

    /**
     * Analyze coupling between modules
     * @param {string} projectPath - Project directory path
     * @returns {Promise<Object>} Coupling analysis
     */
    async analyzeCoupling(projectPath) {
        const coupling = {
            afferentCoupling: {},
            efferentCoupling: {},
            instability: {},
            abstractness: {},
            distanceFromMainSequence: {}
        };

        try {
            const files = await this.getCodeFiles(projectPath);
            const modules = this.groupFilesIntoModules(files);
            
            for (const [moduleName, moduleFiles] of Object.entries(modules)) {
                const afferent = await this.calculateAfferentCoupling(moduleFiles, files);
                const efferent = await this.calculateEfferentCoupling(moduleFiles, files);
                
                coupling.afferentCoupling[moduleName] = afferent;
                coupling.efferentCoupling[moduleName] = efferent;
                coupling.instability[moduleName] = (afferent + efferent) > 0 ? efferent / (afferent + efferent) : 0;
                coupling.abstractness[moduleName] = await this.calculateAbstractness(moduleFiles);
                
                // Distance from main sequence
                const instability = coupling.instability[moduleName];
                const abstractness = coupling.abstractness[moduleName];
                coupling.distanceFromMainSequence[moduleName] = Math.abs(instability + abstractness - 1);
            }

        } catch (error) {
            // Ignore errors
        }

        return coupling;
    }

    /**
     * Calculate afferent coupling (incoming dependencies)
     * @param {Array} moduleFiles - Files in the module
     * @param {Array} allFiles - All project files
     * @returns {number} Afferent coupling count
     */
    async calculateAfferentCoupling(moduleFiles, allFiles) {
        let afferent = 0;
        
        for (const file of allFiles) {
            if (!moduleFiles.includes(file)) {
                try {
                    const content = await fsPromises.readFile(file, 'utf8');
                    for (const moduleFile of moduleFiles) {
                        const moduleName = path.basename(moduleFile, path.extname(moduleFile));
                        if (content.includes(`require('${moduleName}')`) || content.includes(`import ${moduleName}`)) {
                            afferent++;
                            break;
                        }
                    }
                } catch (error) {
                    // Ignore file read errors
                }
            }
        }
        
        return afferent;
    }

    /**
     * Calculate efferent coupling (outgoing dependencies)
     * @param {Array} moduleFiles - Files in the module
     * @param {Array} allFiles - All project files
     * @returns {number} Efferent coupling count
     */
    async calculateEfferentCoupling(moduleFiles, allFiles) {
        let efferent = 0;
        
        for (const file of moduleFiles) {
            try {
                const content = await fsPromises.readFile(file, 'utf8');
                for (const otherFile of allFiles) {
                    if (!moduleFiles.includes(otherFile)) {
                        const otherModuleName = path.basename(otherFile, path.extname(otherFile));
                        if (content.includes(`require('${otherModuleName}')`) || content.includes(`import ${otherModuleName}`)) {
                            efferent++;
                        }
                    }
                }
            } catch (error) {
                // Ignore file read errors
            }
        }
        
        return efferent;
    }

    /**
     * Calculate abstractness of a module
     * @param {Array} moduleFiles - Files in the module
     * @returns {number} Abstractness ratio
     */
    async calculateAbstractness(moduleFiles) {
        let abstractClasses = 0;
        let totalClasses = 0;
        
        for (const file of moduleFiles) {
            try {
                const content = await fsPromises.readFile(file, 'utf8');
                const classMatches = content.match(/class\s+\w+/g) || [];
                const abstractMatches = content.match(/abstract\s+class\s+\w+/g) || [];
                
                totalClasses += classMatches.length;
                abstractClasses += abstractMatches.length;
            } catch (error) {
                // Ignore file read errors
            }
        }
        
        return totalClasses > 0 ? abstractClasses / totalClasses : 0;
    }

    /**
     * Analyze cohesion within modules
     * @param {string} projectPath - Project directory path
     * @returns {Promise<Object>} Cohesion analysis
     */
    async analyzeCohesion(projectPath) {
        const cohesion = {
            moduleCohesion: {},
            functionalCohesion: {},
            temporalCohesion: {},
            logicalCohesion: {}
        };

        try {
            const files = await this.getCodeFiles(projectPath);
            const modules = this.groupFilesIntoModules(files);
            
            for (const [moduleName, moduleFiles] of Object.entries(modules)) {
                cohesion.moduleCohesion[moduleName] = await this.calculateModuleCohesion(moduleFiles);
                cohesion.functionalCohesion[moduleName] = await this.calculateFunctionalCohesion(moduleFiles);
                cohesion.temporalCohesion[moduleName] = await this.calculateTemporalCohesion(moduleFiles);
                cohesion.logicalCohesion[moduleName] = this.calculateLogicalCohesion(moduleFiles);
            }

        } catch (error) {
            // Ignore errors
        }

        return cohesion;
    }

    /**
     * Calculate module cohesion
     * @param {Array} moduleFiles - Files in the module
     * @returns {number} Cohesion score
     */
    async calculateModuleCohesion(moduleFiles) {
        if (moduleFiles.length <= 1) return 1;
        
        let sharedFunctions = 0;
        let totalFunctions = 0;
        
        for (const file of moduleFiles) {
            try {
                const content = await fsPromises.readFile(file, 'utf8');
                const functions = content.match(/function\s+\w+|const\s+\w+\s*=\s*\(/g) || [];
                totalFunctions += functions.length;
                
                // Check for shared function names across files
                for (const otherFile of moduleFiles) {
                    if (file !== otherFile) {
                        try {
                            const otherContent = await fsPromises.readFile(otherFile, 'utf8');
                            for (const func of functions) {
                                const funcName = func.replace(/function\s+|const\s+(\w+)\s*=\s*\(.*/, '$1');
                                if (otherContent.includes(funcName)) {
                                    sharedFunctions++;
                                }
                            }
                        } catch (error) {
                            // Ignore file read errors
                        }
                    }
                }
            } catch (error) {
                // Ignore file read errors
            }
        }
        
        return totalFunctions > 0 ? sharedFunctions / totalFunctions : 0;
    }

    /**
     * Calculate functional cohesion
     * @param {Array} moduleFiles - Files in the module
     * @returns {number} Functional cohesion score
     */
    async calculateFunctionalCohesion(moduleFiles) {
        // Simplified functional cohesion calculation
        const commonFunctions = ['create', 'read', 'update', 'delete', 'validate', 'process'];
        let cohesionScore = 0;
        
        for (const file of moduleFiles) {
            try {
                const content = await fsPromises.readFile(file, 'utf8');
                let functionCount = 0;
                
                for (const func of commonFunctions) {
                    if (content.includes(func)) {
                        functionCount++;
                    }
                }
                
                cohesionScore += functionCount / commonFunctions.length;
            } catch (error) {
                // Ignore file read errors
            }
        }
        
        return moduleFiles.length > 0 ? cohesionScore / moduleFiles.length : 0;
    }

    /**
     * Calculate temporal cohesion
     * @param {Array} moduleFiles - Files in the module
     * @returns {number} Temporal cohesion score
     */
    async calculateTemporalCohesion(moduleFiles) {
        // Simplified temporal cohesion calculation
        const temporalKeywords = ['init', 'start', 'stop', 'shutdown', 'cleanup'];
        let cohesionScore = 0;
        
        for (const file of moduleFiles) {
            try {
                const content = await fsPromises.readFile(file, 'utf8');
                let keywordCount = 0;
                
                for (const keyword of temporalKeywords) {
                    if (content.includes(keyword)) {
                        keywordCount++;
                    }
                }
                
                cohesionScore += keywordCount / temporalKeywords.length;
            } catch (error) {
                // Ignore file read errors
            }
        }
        
        return moduleFiles.length > 0 ? cohesionScore / moduleFiles.length : 0;
    }

    /**
     * Calculate logical cohesion
     * @param {Array} moduleFiles - Files in the module
     * @returns {number} Logical cohesion score
     */
    calculateLogicalCohesion(moduleFiles) {
        // Simplified logical cohesion calculation
        const logicalPatterns = ['util', 'helper', 'common', 'shared'];
        let cohesionScore = 0;
        
        for (const file of moduleFiles) {
            const fileName = path.basename(file);
            let patternCount = 0;
            
            for (const pattern of logicalPatterns) {
                if (fileName.includes(pattern)) {
                    patternCount++;
                }
            }
            
            cohesionScore += patternCount / logicalPatterns.length;
        }
        
        return moduleFiles.length > 0 ? cohesionScore / moduleFiles.length : 0;
    }

    /**
     * Generate dependency graph
     * @param {string} projectPath - Project directory path
     * @returns {Promise<Object>} Dependency graph
     */
    async generateDependencyGraph(projectPath) {
        const dependencies = {
            nodes: [],
            edges: [],
            cycles: [],
            circularDependencies: []
        };

        try {
            const files = await this.getCodeFiles(projectPath);
            
            // Create nodes
            for (const file of files) {
                dependencies.nodes.push({
                    id: file,
                    name: path.basename(file),
                    type: this.getFileType(file)
                });
            }
            
            // Create edges
            for (const file of files) {
                try {
                    const content = await fsPromises.readFile(file, 'utf8');
                    const imports = this.extractImports(content);
                    
                    for (const importPath of imports) {
                        const targetFile = this.resolveImportPath(importPath, file, projectPath);
                        if (targetFile && files.includes(targetFile)) {
                            dependencies.edges.push({
                                from: file,
                                to: targetFile,
                                type: 'import'
                            });
                        }
                    }
                } catch (error) {
                    // Ignore file read errors
                }
            }
            
            // Detect cycles
            dependencies.cycles = this.detectCycles(dependencies.nodes, dependencies.edges);
            dependencies.circularDependencies = this.findCircularDependencies(dependencies.edges);

        } catch (error) {
            // Ignore errors
        }

        return dependencies;
    }

    /**
     * Detect architecture violations
     * @param {string} projectPath - Project directory path
     * @returns {Promise<Array>} Architecture violations
     */
    async detectArchitectureViolations(projectPath) {
        const violations = [];

        try {
            const files = await this.getCodeFiles(projectPath);
            
            for (const file of files) {
                try {
                    const content = await fsPromises.readFile(file, 'utf8');
                    const fileViolations = this.findArchitectureViolations(content, file);
                    violations.push(...fileViolations);
                } catch (error) {
                    // Ignore file read errors
                }
            }

        } catch (error) {
            // Ignore errors
        }

        return violations;
    }

    /**
     * Find architecture violations in file
     * @param {string} content - File content
     * @param {string} filePath - File path
     * @returns {Array} Architecture violations
     */
    findArchitectureViolations(content, filePath) {
        const violations = [];
        const lines = content.split('\n');

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const lineNumber = i + 1;

            // Business logic in presentation layer
            if (filePath.includes('controller') || filePath.includes('view')) {
                if (line.includes('business') || line.includes('domain') || line.includes('repository')) {
                    violations.push({
                        file: filePath,
                        line: lineNumber,
                        type: 'layer-violation',
                        description: 'Business logic in presentation layer',
                        severity: 'high'
                    });
                }
            }

            // Data access in presentation layer
            if (filePath.includes('controller') || filePath.includes('view')) {
                if (line.includes('database') || line.includes('sql') || line.includes('query')) {
                    violations.push({
                        file: filePath,
                        line: lineNumber,
                        type: 'layer-violation',
                        description: 'Data access in presentation layer',
                        severity: 'high'
                    });
                }
            }

            // Direct database access in business layer
            if (filePath.includes('service') || filePath.includes('business')) {
                if (line.includes('SELECT') || line.includes('INSERT') || line.includes('UPDATE')) {
                    violations.push({
                        file: filePath,
                        line: lineNumber,
                        type: 'architecture-violation',
                        description: 'Direct database access in business layer',
                        severity: 'medium'
                    });
                }
            }

            // Cross-layer dependencies
            if (line.includes('require(') || line.includes('import')) {
const Logger = require('@logging/Logger');
const logger = new Logger('Logger');
                const importPath = line.match(/['"]([^'"]+)['"]/)?.[1];
                if (importPath) {
                    if (filePath.includes('model') && importPath.includes('controller')) {
                        violations.push({
                            file: filePath,
                            line: lineNumber,
                            type: 'dependency-violation',
                            description: 'Model depends on controller - violates layered architecture',
                            severity: 'high'
                        });
                    }
                }
            }
        }

        return violations;
    }

    /**
     * Generate architecture recommendations
     * @param {Object} analysis - Complete architecture analysis
     * @returns {Promise<Array>} Architecture recommendations
     */
    async generateArchitectureRecommendations(analysis) {
        const recommendations = [];

        // Pattern recommendations
        if (analysis.detectedPatterns.length === 0) {
            recommendations.push({
                title: 'Implement architectural pattern',
                description: 'No clear architectural pattern detected. Consider implementing MVC, DDD, or CQRS',
                priority: 'high',
                category: 'pattern'
            });
        }

        // Coupling recommendations
        const highInstability = Object.entries(analysis.coupling.instability)
            .filter(([module, instability]) => instability > 0.7);
        
        if (highInstability.length > 0) {
            recommendations.push({
                title: 'Reduce module instability',
                description: `${highInstability.length} modules have high instability`,
                priority: 'medium',
                category: 'coupling'
            });
        }

        // Violation recommendations
        const criticalViolations = analysis.violations.filter(v => v.severity === 'high');
        if (criticalViolations.length > 0) {
            recommendations.push({
                title: 'Fix critical architecture violations',
                description: `${criticalViolations.length} critical violations found`,
                priority: 'critical',
                category: 'violations'
            });
        }

        // Dependency recommendations
        if (analysis.dependencies.circularDependencies.length > 0) {
            recommendations.push({
                title: 'Remove circular dependencies',
                description: `${analysis.dependencies.circularDependencies.length} circular dependencies found`,
                priority: 'high',
                category: 'dependencies'
            });
        }

        return recommendations;
    }

    /**
     * Calculate architecture score
     * @param {Object} analysis - Complete architecture analysis
     * @returns {number} Architecture score (0-100)
     */
    calculateArchitectureScore(analysis) {
        let score = 100;

        // Deduct points for violations
        const criticalViolations = analysis.violations.filter(v => v.severity === 'critical').length;
        const highViolations = analysis.violations.filter(v => v.severity === 'high').length;
        const mediumViolations = analysis.violations.filter(v => v.severity === 'medium').length;
        
        score -= criticalViolations * 20;
        score -= highViolations * 15;
        score -= mediumViolations * 10;

        // Deduct points for circular dependencies
        score -= analysis.dependencies.circularDependencies.length * 10;

        // Deduct points for high instability
        const highInstability = Object.values(analysis.coupling.instability)
            .filter(instability => instability > 0.7).length;
        score -= highInstability * 5;

        // Add points for good patterns
        score += analysis.detectedPatterns.length * 5;

        return Math.max(0, Math.min(100, score));
    }

    /**
     * Helper methods
     */
    async analyzeConfiguration(configPath) {
        try {
            const items = await fsPromises.readdir(configPath);
            return { files: items, type: 'configuration' };
        } catch {
            return { files: [], type: 'unknown' };
        }
    }

    groupFilesIntoModules(files) {
        const modules = {};
        
        for (const file of files) {
            const dir = path.dirname(file);
            const moduleName = path.basename(dir);
            
            if (!modules[moduleName]) {
                modules[moduleName] = [];
            }
            modules[moduleName].push(file);
        }
        
        return modules;
    }

    getFileType(filePath) {
        if (filePath.includes('controller')) return 'controller';
        if (filePath.includes('service')) return 'service';
        if (filePath.includes('model')) return 'model';
        if (filePath.includes('repository')) return 'repository';
        if (filePath.includes('util')) return 'utility';
        return 'component';
    }

    extractImports(content) {
        const imports = [];
        const requireMatches = content.match(/require\(['"]([^'"]+)['"]\)/g) || [];
        const importMatches = content.match(/import\s+.*from\s+['"]([^'"]+)['"]/g) || [];
        
        for (const match of requireMatches) {
            const importPath = match.match(/['"]([^'"]+)['"]/)?.[1];
            if (importPath) imports.push(importPath);
        }
        
        for (const match of importMatches) {
            const importPath = match.match(/['"]([^'"]+)['"]/)?.[1];
            if (importPath) imports.push(importPath);
        }
        
        return imports;
    }

    resolveImportPath(importPath, sourceFile, projectPath) {
        // Simplified import resolution
        if (importPath.startsWith('.')) {
            return path.resolve(path.dirname(sourceFile), importPath);
        }
        return null;
    }

    detectCycles(nodes, edges) {
        // Simplified cycle detection
        return [];
    }

    findCircularDependencies(edges) {
        // Simplified circular dependency detection
        return [];
    }

    async getCodeFiles(projectPath) {
        const files = [];
        
        try {
            const getFiles = async (dir) => {
                const items = await fsPromises.readdir(dir);
                for (const item of items) {
                    const itemPath = path.join(dir, item);
                    const stats = await fsPromises.stat(itemPath);
                    
                    if (stats.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
                        await getFiles(itemPath);
                    } else if (stats.isFile()) {
                        const ext = path.extname(item);
                        if (['.js', '.jsx', '.ts', '.tsx'].includes(ext)) {
                            files.push(itemPath);
                        }
                    }
                }
            };
            
            await getFiles(projectPath);
        } catch (error) {
            logger.error('Error reading code files:', error);
        }

        return files;
    }
}

module.exports = ArchitectureAnalyzer; 