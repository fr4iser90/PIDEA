/**
 * LayerValidationService - Comprehensive layer validation and logic checking
 * Provides advanced validation for architectural layers and business logic integrity
 */
const path = require('path');
const fs = require('fs').promises;
const Logger = require('@logging/Logger');
const logger = new Logger('Logger');

class LayerValidationService {
    constructor(logger = console) {
        this.logger = logger;
        this.layerRules = {
            presentation: {
                allowedImports: ['domain', 'application'],
                forbiddenImports: ['infrastructure', 'database', 'external'],
                allowedPatterns: ['controller', 'view', 'component', 'api'],
                forbiddenPatterns: ['business', 'domain', 'repository', 'database']
            },
            application: {
                allowedImports: ['domain'],
                forbiddenImports: ['infrastructure', 'database', 'external', 'presentation'],
                allowedPatterns: ['service', 'handler', 'command', 'query', 'application'],
                forbiddenPatterns: ['controller', 'view', 'database', 'external']
            },
            domain: {
                allowedImports: [],
                forbiddenImports: ['infrastructure', 'database', 'external', 'presentation', 'application'],
                allowedPatterns: ['entity', 'value-object', 'domain', 'model', 'aggregate'],
                forbiddenPatterns: ['controller', 'service', 'database', 'external', 'infrastructure']
            },
            infrastructure: {
                allowedImports: ['domain'],
                forbiddenImports: ['presentation', 'application'],
                allowedPatterns: ['repository', 'database', 'external', 'infrastructure', 'config'],
                forbiddenPatterns: ['controller', 'view', 'domain']
            }
        };
    }

    /**
     * Perform comprehensive layer validation
     * @param {string} projectPath - Project path
     * @param {Object} options - Validation options
     * @returns {Promise<Object>} Validation results
     */
    async validateLayers(projectPath, options = {}) {
        this.logger.info('Starting comprehensive layer validation...');
        
        const validation = {
            projectPath,
            timestamp: new Date(),
            overall: true,
            layers: {},
            violations: [],
            recommendations: [],
            metrics: {
                totalFiles: 0,
                validatedFiles: 0,
                violations: 0,
                layerDistribution: {},
                complexityScores: {}
            }
        };

        try {
            // Detect project layers
            const detectedLayers = await this.detectProjectLayers(projectPath);
            validation.layers = detectedLayers;

            // Validate each layer
            for (const [layerName, layerInfo] of Object.entries(detectedLayers)) {
                const layerValidation = await this.validateLayer(projectPath, layerName, layerInfo, options);
                validation.layers[layerName].validation = layerValidation;
                
                if (!layerValidation.isValid) {
                    validation.overall = false;
                }
                
                validation.violations.push(...layerValidation.violations);
                validation.metrics.violations += layerValidation.violations.length;
            }

            // Generate recommendations
            validation.recommendations = await this.generateLayerRecommendations(validation);

            // Calculate metrics
            validation.metrics = await this.calculateValidationMetrics(validation);

            this.logger.info('Layer validation completed', {
                totalViolations: validation.metrics.violations,
                overallValid: validation.overall
            });

            return validation;

        } catch (error) {
            this.logger.error('Layer validation failed:', error);
            validation.overall = false;
            validation.violations.push({
                type: 'validation-error',
                severity: 'critical',
                message: error.message
            });
            return validation;
        }
    }

    /**
     * Detect project layers based on directory structure
     * @param {string} projectPath - Project path
     * @returns {Promise<Object>} Detected layers
     */
    async detectProjectLayers(projectPath) {
        const layers = {
            presentation: { files: [], directories: [], patterns: [] },
            application: { files: [], directories: [], patterns: [] },
            domain: { files: [], directories: [], patterns: [] },
            infrastructure: { files: [], directories: [], patterns: [] }
        };

        try {
            await this.scanDirectoryForLayers(projectPath, projectPath, layers);
            
            // Calculate layer distribution
            for (const [layerName, layerInfo] of Object.entries(layers)) {
                layerInfo.fileCount = layerInfo.files.length;
                layerInfo.directoryCount = layerInfo.directories.length;
                layerInfo.patternCount = layerInfo.patterns.length;
            }

        } catch (error) {
            this.logger.warn('Error detecting layers:', error);
        }

        return layers;
    }

    /**
     * Scan directory recursively for layer detection
     * @param {string} currentPath - Current directory path
     * @param {string} projectPath - Root project path
     * @param {Object} layers - Layers object to populate
     * @param {number} depth - Current depth
     */
    async scanDirectoryForLayers(currentPath, projectPath, layers, depth = 0) {
        if (depth > 5) return; // Limit recursion depth

        try {
            const items = await fs.readdir(currentPath);
            
            for (const item of items) {
                const itemPath = path.join(currentPath, item);
                const stats = await fs.stat(itemPath);
                const relativePath = path.relative(projectPath, itemPath);
                
                if (stats.isDirectory()) {
                    // Detect layer based on directory name
                    const detectedLayer = this.detectLayerFromName(item);
                    if (detectedLayer) {
                        layers[detectedLayer].directories.push(relativePath);
                    }
                    
                    // Recursively scan subdirectories
                    await this.scanDirectoryForLayers(itemPath, projectPath, layers, depth + 1);
                } else if (stats.isFile() && this.isCodeFile(item)) {
                    // Detect layer based on file content and path
                    const detectedLayer = await this.detectLayerFromFile(itemPath, relativePath);
                    if (detectedLayer) {
                        layers[detectedLayer].files.push(relativePath);
                    }
                }
            }
        } catch (error) {
            // Ignore permission errors and continue
        }
    }

    /**
     * Detect layer from directory name
     * @param {string} dirName - Directory name
     * @returns {string|null} Detected layer
     */
    detectLayerFromName(dirName) {
        const lowerName = dirName.toLowerCase();
        
        if (lowerName.includes('controller') || lowerName.includes('api') || 
            lowerName.includes('presentation') || lowerName.includes('web') ||
            lowerName.includes('view') || lowerName.includes('component')) {
            return 'presentation';
        }
        
        if (lowerName.includes('service') || lowerName.includes('application') ||
            lowerName.includes('handler') || lowerName.includes('command') ||
            lowerName.includes('query')) {
            return 'application';
        }
        
        if (lowerName.includes('domain') || lowerName.includes('entity') ||
            lowerName.includes('model') || lowerName.includes('aggregate') ||
            lowerName.includes('value-object')) {
            return 'domain';
        }
        
        if (lowerName.includes('infrastructure') || lowerName.includes('repository') ||
            lowerName.includes('database') || lowerName.includes('external') ||
            lowerName.includes('config') || lowerName.includes('middleware')) {
            return 'infrastructure';
        }
        
        return null;
    }

    /**
     * Detect layer from file content and path
     * @param {string} filePath - File path
     * @param {string} relativePath - Relative path
     * @returns {Promise<string|null>} Detected layer
     */
    async detectLayerFromFile(filePath, relativePath) {
        try {
            const content = await fs.readFile(filePath, 'utf8');
            const lowerContent = content.toLowerCase();
            const lowerPath = relativePath.toLowerCase();
            
            // Check for presentation layer indicators
            if (lowerPath.includes('controller') || lowerPath.includes('api') ||
                lowerPath.includes('view') || lowerPath.includes('component') ||
                lowerContent.includes('express.router') || lowerContent.includes('app.get') ||
                lowerContent.includes('res.json') || lowerContent.includes('req.body')) {
                return 'presentation';
            }
            
            // Check for application layer indicators
            if (lowerPath.includes('service') || lowerPath.includes('handler') ||
                lowerPath.includes('command') || lowerPath.includes('query') ||
                lowerContent.includes('class.*service') || lowerContent.includes('class.*handler') ||
                lowerContent.includes('business logic') || lowerContent.includes('application service')) {
                return 'application';
            }
            
            // Check for domain layer indicators
            if (lowerPath.includes('domain') || lowerPath.includes('entity') ||
                lowerPath.includes('model') || lowerPath.includes('aggregate') ||
                lowerContent.includes('class.*entity') || lowerContent.includes('class.*model') ||
                lowerContent.includes('domain logic') || lowerContent.includes('business rules')) {
                return 'domain';
            }
            
            // Check for infrastructure layer indicators
            if (lowerPath.includes('repository') || lowerPath.includes('database') ||
                lowerPath.includes('external') || lowerPath.includes('config') ||
                lowerContent.includes('database') || lowerContent.includes('repository') ||
                lowerContent.includes('external api') || lowerContent.includes('config')) {
                return 'infrastructure';
            }
            
        } catch (error) {
            // Ignore file reading errors
        }
        
        return null;
    }

    /**
     * Validate specific layer
     * @param {string} projectPath - Project path
     * @param {string} layerName - Layer name
     * @param {Object} layerInfo - Layer information
     * @param {Object} options - Validation options
     * @returns {Promise<Object>} Layer validation results
     */
    async validateLayer(projectPath, layerName, layerInfo, options) {
        const validation = {
            isValid: true,
            violations: [],
            metrics: {
                fileCount: layerInfo.files.length,
                complexityScore: 0,
                couplingScore: 0,
                cohesionScore: 0
            }
        };

        try {
            // Validate layer boundaries
            const boundaryViolations = await this.validateLayerBoundaries(projectPath, layerName, layerInfo);
            validation.violations.push(...boundaryViolations);

            // Validate import dependencies
            const importViolations = await this.validateImportDependencies(projectPath, layerName, layerInfo);
            validation.violations.push(...importViolations);

            // Validate business logic placement
            const logicViolations = await this.validateBusinessLogicPlacement(projectPath, layerName, layerInfo);
            validation.violations.push(...logicViolations);

            // Calculate layer metrics
            validation.metrics = await this.calculateLayerMetrics(projectPath, layerName, layerInfo);

            // Determine if layer is valid
            validation.isValid = validation.violations.filter(v => v.severity === 'critical').length === 0;

        } catch (error) {
            validation.isValid = false;
            validation.violations.push({
                type: 'validation-error',
                severity: 'critical',
                message: `Layer validation failed: ${error.message}`
            });
        }

        return validation;
    }

    /**
     * Validate layer boundaries
     * @param {string} projectPath - Project path
     * @param {string} layerName - Layer name
     * @param {Object} layerInfo - Layer information
     * @returns {Promise<Array>} Boundary violations
     */
    async validateLayerBoundaries(projectPath, layerName, layerInfo) {
        const violations = [];
        const rules = this.layerRules[layerName];

        if (!rules) return violations;

        for (const filePath of layerInfo.files) {
            try {
                const fullPath = path.join(projectPath, filePath);
                const content = await fs.readFile(fullPath, 'utf8');
                
                // Check for forbidden patterns in layer
                for (const forbiddenPattern of rules.forbiddenPatterns) {
                    if (content.toLowerCase().includes(forbiddenPattern.toLowerCase())) {
                        violations.push({
                            type: 'boundary-violation',
                            severity: 'high',
                            file: filePath,
                            message: `Forbidden pattern '${forbiddenPattern}' found in ${layerName} layer`,
                            suggestion: `Move ${forbiddenPattern} logic to appropriate layer`
                        });
                    }
                }
            } catch (error) {
                // Ignore file reading errors
            }
        }

        return violations;
    }

    /**
     * Validate import dependencies
     * @param {string} projectPath - Project path
     * @param {string} layerName - Layer name
     * @param {Object} layerInfo - Layer information
     * @returns {Promise<Array>} Import violations
     */
    async validateImportDependencies(projectPath, layerName, layerInfo) {
        const violations = [];
        const rules = this.layerRules[layerName];

        if (!rules) return violations;

        for (const filePath of layerInfo.files) {
            try {
                const fullPath = path.join(projectPath, filePath);
                const content = await fs.readFile(fullPath, 'utf8');
                
                // Extract imports
                const imports = this.extractImports(content);
                
                for (const importPath of imports) {
                    // Check for forbidden imports
                    for (const forbiddenImport of rules.forbiddenImports) {
                        if (importPath.toLowerCase().includes(forbiddenImport.toLowerCase())) {
                            violations.push({
                                type: 'import-violation',
                                severity: 'critical',
                                file: filePath,
                                import: importPath,
                                message: `Forbidden import from ${forbiddenImport} layer in ${layerName} layer`,
                                suggestion: `Use dependency injection or interfaces to access ${forbiddenImport} functionality`
                            });
                        }
                    }
                }
            } catch (error) {
                // Ignore file reading errors
            }
        }

        return violations;
    }

    /**
     * Validate business logic placement
     * @param {string} projectPath - Project path
     * @param {string} layerName - Layer name
     * @param {Object} layerInfo - Layer information
     * @returns {Promise<Array>} Logic violations
     */
    async validateBusinessLogicPlacement(projectPath, layerName, layerInfo) {
        const violations = [];

        // Business logic should not be in presentation layer
        if (layerName === 'presentation') {
            for (const filePath of layerInfo.files) {
                try {
                    const fullPath = path.join(projectPath, filePath);
                    const content = await fs.readFile(fullPath, 'utf8');
                    
                    // Check for business logic indicators
                    const businessLogicIndicators = [
                        'business rule', 'domain logic', 'validation logic',
                        'calculation', 'algorithm', 'business process'
                    ];
                    
                    for (const indicator of businessLogicIndicators) {
                        if (content.toLowerCase().includes(indicator.toLowerCase())) {
                            violations.push({
                                type: 'logic-violation',
                                severity: 'high',
                                file: filePath,
                                message: `Business logic found in presentation layer`,
                                suggestion: `Move business logic to application or domain layer`
                            });
                            break;
                        }
                    }
                } catch (error) {
                    // Ignore file reading errors
                }
            }
        }

        return violations;
    }

    /**
     * Calculate layer metrics
     * @param {string} projectPath - Project path
     * @param {string} layerName - Layer name
     * @param {Object} layerInfo - Layer information
     * @returns {Promise<Object>} Layer metrics
     */
    async calculateLayerMetrics(projectPath, layerName, layerInfo) {
        const metrics = {
            fileCount: layerInfo.files.length,
            complexityScore: 0,
            couplingScore: 0,
            cohesionScore: 0,
            averageFileSize: 0,
            totalLines: 0
        };

        let totalLines = 0;
        let totalFileSize = 0;

        for (const filePath of layerInfo.files) {
            try {
                const fullPath = path.join(projectPath, filePath);
                const content = await fs.readFile(fullPath, 'utf8');
                const lines = content.split('\n').length;
                const fileSize = content.length;
                
                totalLines += lines;
                totalFileSize += fileSize;
                
                // Calculate complexity (simple cyclomatic complexity approximation)
                const complexity = this.calculateFileComplexity(content);
                metrics.complexityScore += complexity;
                
            } catch (error) {
                // Ignore file reading errors
            }
        }

        if (layerInfo.files.length > 0) {
            metrics.averageFileSize = totalFileSize / layerInfo.files.length;
            metrics.totalLines = totalLines;
            metrics.complexityScore = metrics.complexityScore / layerInfo.files.length;
        }

        return metrics;
    }

    /**
     * Calculate file complexity
     * @param {string} content - File content
     * @returns {number} Complexity score
     */
    calculateFileComplexity(content) {
        let complexity = 1; // Base complexity
        
        // Count decision points
        const decisionPatterns = [
            /if\s*\(/g,
            /else\s*if\s*\(/g,
            /for\s*\(/g,
            /while\s*\(/g,
            /switch\s*\(/g,
            /case\s+/g,
            /\|\|/g,
            /&&/g
        ];
        
        for (const pattern of decisionPatterns) {
            const matches = content.match(pattern);
            if (matches) {
                complexity += matches.length;
            }
        }
        
        return complexity;
    }

    /**
     * Extract imports from file content
     * @param {string} content - File content
     * @returns {Array} Import paths
     */
    extractImports(content) {
        const imports = [];
        
        // Match various import patterns
        const importPatterns = [
            /import\s+.*\s+from\s+['"]([^'"]+)['"]/g,
            /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
            /import\s+['"]([^'"]+)['"]/g
        ];
        
        for (const pattern of importPatterns) {
            let match;
            while ((match = pattern.exec(content)) !== null) {
                imports.push(match[1]);
            }
        }
        
        return imports;
    }

    /**
     * Generate layer recommendations
     * @param {Object} validation - Validation results
     * @returns {Promise<Array>} Recommendations
     */
    async generateLayerRecommendations(validation) {
        const recommendations = [];

        // Check for missing layers
        const missingLayers = [];
        for (const [layerName, layerInfo] of Object.entries(validation.layers)) {
            if (layerInfo.files.length === 0) {
                missingLayers.push(layerName);
            }
        }

        if (missingLayers.length > 0) {
            recommendations.push({
                type: 'missing-layer',
                severity: 'medium',
                message: `Missing layers detected: ${missingLayers.join(', ')}`,
                suggestion: 'Consider implementing proper layered architecture with all required layers'
            });
        }

        // Check for layer distribution
        const totalFiles = Object.values(validation.layers)
            .reduce((sum, layer) => sum + layer.files.length, 0);

        if (totalFiles > 0) {
            for (const [layerName, layerInfo] of Object.entries(validation.layers)) {
                const percentage = (layerInfo.files.length / totalFiles) * 100;
                
                if (percentage > 50) {
                    recommendations.push({
                        type: 'layer-imbalance',
                        severity: 'low',
                        message: `${layerName} layer contains ${percentage.toFixed(1)}% of all files`,
                        suggestion: 'Consider redistributing responsibilities across layers'
                    });
                }
            }
        }

        // Check for critical violations
        const criticalViolations = validation.violations.filter(v => v.severity === 'critical');
        if (criticalViolations.length > 0) {
            recommendations.push({
                type: 'critical-violations',
                severity: 'high',
                message: `${criticalViolations.length} critical layer violations detected`,
                suggestion: 'Address critical violations to maintain architectural integrity'
            });
        }

        return recommendations;
    }

    /**
     * Calculate validation metrics
     * @param {Object} validation - Validation results
     * @returns {Promise<Object>} Metrics
     */
    async calculateValidationMetrics(validation) {
        const metrics = {
            totalFiles: 0,
            validatedFiles: 0,
            violations: validation.violations.length,
            layerDistribution: {},
            complexityScores: {},
            overallScore: 100
        };

        // Calculate file counts
        for (const [layerName, layerInfo] of Object.entries(validation.layers)) {
            metrics.totalFiles += layerInfo.files.length;
            metrics.layerDistribution[layerName] = layerInfo.files.length;
            
            if (layerInfo.validation && layerInfo.validation.metrics) {
                metrics.complexityScores[layerName] = layerInfo.validation.metrics.complexityScore;
            }
        }

        // Calculate overall score
        const criticalViolations = validation.violations.filter(v => v.severity === 'critical').length;
        const highViolations = validation.violations.filter(v => v.severity === 'high').length;
        const mediumViolations = validation.violations.filter(v => v.severity === 'medium').length;

        metrics.overallScore = Math.max(0, 100 - (criticalViolations * 20) - (highViolations * 10) - (mediumViolations * 5));

        return metrics;
    }

    /**
     * Check if file is a code file
     * @param {string} filename - Filename
     * @returns {boolean} Is code file
     */
    isCodeFile(filename) {
        const codeExtensions = ['.js', '.ts', '.jsx', '.tsx', '.java', '.py', '.cs', '.php', '.rb', '.go'];
        const ext = path.extname(filename).toLowerCase();
        return codeExtensions.includes(ext);
    }
}

module.exports = LayerValidationService; 