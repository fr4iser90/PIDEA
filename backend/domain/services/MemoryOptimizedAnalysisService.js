/**
 * MemoryOptimizedAnalysisService - Memory-efficient analysis with streaming and chunking
 * Addresses OOM issues by implementing memory management, streaming, and resource limits
 */
const path = require('path');
const fs = require('fs').promises;
const { createReadStream } = require('fs');
const { Transform } = require('stream');
const Logger = require('@logging/Logger');
const logger = new Logger('Logger');

class MemoryOptimizedAnalysisService {
    constructor(options = {}) {
        this.logger = options.logger || console;
        
        // Memory management settings
        this.maxMemoryUsage = options.maxMemoryUsage || 512; // MB
        this.maxFileSize = options.maxFileSize || 10 * 1024 * 1024; // 10MB
        this.maxFilesPerBatch = options.maxFilesPerBatch || 100;
        this.maxDirectoryDepth = options.maxDirectoryDepth || 8;
        this.chunkSize = options.chunkSize || 64 * 1024; // 64KB chunks
        this.enableStreaming = options.enableStreaming !== false;
        this.enableGarbageCollection = options.enableGarbageCollection !== false;
        
        // Resource tracking
        this.currentMemoryUsage = 0;
        this.processedFiles = 0;
        this.processedDirectories = 0;
        this.startTime = Date.now();
        
        // Analysis results (streaming)
        this.analysisResults = {
            projectPath: null,
            timestamp: new Date(),
            overall: true,
            structure: { files: [], directories: [], totalFiles: 0, totalDirectories: 0 },
            violations: [],
            recommendations: [],
            metrics: {
                totalFiles: 0,
                validatedFiles: 0,
                violations: 0,
                memoryUsage: [],
                processingTime: 0
            }
        };
    }

    /**
     * Perform memory-optimized analysis
     * @param {string} projectPath - Project path
     * @param {Object} options - Analysis options
     * @returns {Promise<Object>} Analysis results
     */
    async performAnalysis(projectPath, options = {}) {
        this.logger.info('Starting memory-optimized analysis...');
        
        try {
            // Initialize analysis
            this.analysisResults.projectPath = projectPath;
            this.startTime = Date.now();
            
            // Phase 1: Structure Analysis (streaming)
            await this.analyzeStructureStreaming(projectPath, options);
            
            // Phase 2: Layer Validation (chunked)
            if (options.includeLayerValidation !== false) {
                await this.validateLayersChunked(projectPath, options);
            }
            
            // Phase 3: Logic Validation (streaming)
            if (options.includeLogicValidation !== false) {
                await this.validateLogicStreaming(projectPath, options);
            }
            
            // Phase 4: Generate Recommendations (memory-efficient)
            await this.generateRecommendationsOptimized();
            
            // Calculate final metrics
            this.analysisResults.metrics.processingTime = Date.now() - this.startTime;
            this.analysisResults.metrics.totalFiles = this.processedFiles;
            this.analysisResults.metrics.validatedFiles = this.processedFiles;
            
            this.logger.info('Memory-optimized analysis completed', {
                totalFiles: this.processedFiles,
                totalDirectories: this.processedDirectories,
                processingTime: this.analysisResults.metrics.processingTime,
                peakMemoryUsage: Math.max(...this.analysisResults.metrics.memoryUsage)
            });
            
            return this.analysisResults;
            
        } catch (error) {
            this.logger.error('Memory-optimized analysis failed:', error);
            this.analysisResults.overall = false;
            this.analysisResults.error = error.message;
            return this.analysisResults;
        } finally {
            // Cleanup
            await this.cleanup();
        }
    }

    /**
     * Analyze project structure using streaming
     * @param {string} projectPath - Project path
     * @param {Object} options - Analysis options
     */
    async analyzeStructureStreaming(projectPath, options) {
        this.logger.info('Phase 1: Analyzing structure with streaming...');
        
        const excludePatterns = options.excludePatterns || ['node_modules', '.git', 'dist', 'build', 'coverage'];
        const maxDepth = Math.min(options.maxDepth || 5, this.maxDirectoryDepth);
        
        await this.scanDirectoryStreaming(projectPath, '', 0, maxDepth, excludePatterns);
        
        this.logger.info(`Structure analysis completed: ${this.processedFiles} files, ${this.processedDirectories} directories`);
    }

    /**
     * Scan directory using streaming approach
     * @param {string} currentPath - Current directory path
     * @param {string} relativePath - Relative path from project root
     * @param {number} depth - Current depth
     * @param {number} maxDepth - Maximum depth
     * @param {Array} excludePatterns - Patterns to exclude
     */
    async scanDirectoryStreaming(currentPath, relativePath, depth, maxDepth, excludePatterns) {
        if (depth > maxDepth) return;
        
        try {
            const items = await fs.readdir(currentPath);
            
            for (const item of items) {
                // Check memory usage and trigger cleanup if needed
                await this.checkMemoryUsage();
                
                // Skip excluded patterns
                if (excludePatterns.some(pattern => item.includes(pattern))) continue;
                
                const itemPath = path.join(currentPath, item);
                const relativeItemPath = path.join(relativePath, item);
                
                try {
                    const stats = await fs.stat(itemPath);
                    
                    if (stats.isDirectory()) {
                        this.processedDirectories++;
                        this.analysisResults.structure.directories.push({
                            path: relativeItemPath,
                            depth: depth,
                            size: stats.size
                        });
                        
                        // Recursively scan subdirectory
                        await this.scanDirectoryStreaming(itemPath, relativeItemPath, depth + 1, maxDepth, excludePatterns);
                    } else {
                        this.processedFiles++;
                        
                        // Only process code files
                        if (this.isCodeFile(item)) {
                            this.analysisResults.structure.files.push({
                                path: relativeItemPath,
                                size: stats.size,
                                extension: path.extname(item)
                            });
                        }
                    }
                } catch (error) {
                    // Skip files we can't access
                    continue;
                }
            }
        } catch (error) {
            // Ignore permission errors
        }
    }

    /**
     * Validate layers using chunked processing
     * @param {string} projectPath - Project path
     * @param {Object} options - Validation options
     */
    async validateLayersChunked(projectPath, options) {
        this.logger.info('Phase 2: Validating layers with chunked processing...');
        
        const files = this.analysisResults.structure.files;
        const chunks = this.chunkArray(files, this.maxFilesPerBatch);
        
        for (let i = 0; i < chunks.length; i++) {
            this.logger.info(`Processing layer validation chunk ${i + 1}/${chunks.length}`);
            
            const chunk = chunks[i];
            const chunkViolations = await this.validateLayerChunk(chunk, projectPath, options);
            
            this.analysisResults.violations.push(...chunkViolations);
            
            // Check memory and cleanup after each chunk
            await this.checkMemoryUsage();
            if (this.enableGarbageCollection && global.gc) {
                global.gc();
            }
        }
    }

    /**
     * Validate a chunk of files for layer violations
     * @param {Array} files - Files to validate
     * @param {string} projectPath - Project path
     * @param {Object} options - Validation options
     * @returns {Promise<Array>} Violations found
     */
    async validateLayerChunk(files, projectPath, options) {
        const violations = [];
        
        for (const file of files) {
            try {
                const filePath = path.join(projectPath, file.path);
                const stats = await fs.stat(filePath);
                
                // Skip large files
                if (stats.size > this.maxFileSize) {
                    violations.push({
                        type: 'large-file-skipped',
                        file: file.path,
                        size: stats.size,
                        message: 'File too large for analysis'
                    });
                    continue;
                }
                
                // Read file in chunks if streaming is enabled
                if (this.enableStreaming) {
                    const fileViolations = await this.validateFileStreaming(filePath, file.path);
                    violations.push(...fileViolations);
                } else {
                    const content = await fs.readFile(filePath, 'utf8');
                    const fileViolations = await this.validateFileContent(content, file.path);
                    violations.push(...fileViolations);
                }
                
            } catch (error) {
                violations.push({
                    type: 'file-read-error',
                    file: file.path,
                    message: error.message
                });
            }
        }
        
        return violations;
    }

    /**
     * Validate file using streaming approach
     * @param {string} filePath - File path
     * @param {string} relativePath - Relative file path
     * @returns {Promise<Array>} Violations found
     */
    async validateFileStreaming(filePath, relativePath) {
        return new Promise((resolve) => {
            const violations = [];
            let lineNumber = 0;
            
            const readStream = createReadStream(filePath, { 
                encoding: 'utf8',
                highWaterMark: this.chunkSize 
            });
            
            const self = this;
            const lineTransform = new Transform({
                transform(chunk, encoding, callback) {
                    const lines = chunk.toString().split('\n');
                    
                    for (const line of lines) {
                        lineNumber++;
                        
                        // Check for layer violations
                        if (line.includes('require(') || line.includes('import ')) {
                            const violation = self.checkImportViolation(line, relativePath, lineNumber);
                            if (violation) violations.push(violation);
                        }
                        
                        // Check for business logic in wrong layers
                        if (self.isBusinessLogicLine(line)) {
                            const violation = self.checkBusinessLogicViolation(line, relativePath, lineNumber);
                            if (violation) violations.push(violation);
                        }
                    }
                    
                    callback();
                }
            });
            
            readStream.pipe(lineTransform);
            
            readStream.on('end', () => {
                resolve(violations);
            });
            
            readStream.on('error', () => {
                resolve([{
                    type: 'stream-error',
                    file: relativePath,
                    message: 'Failed to read file'
                }]);
            });
        });
    }

    /**
     * Validate logic using streaming approach
     * @param {string} projectPath - Project path
     * @param {Object} options - Validation options
     */
    async validateLogicStreaming(projectPath, options) {
        this.logger.info('Phase 3: Validating logic with streaming...');
        
        const files = this.analysisResults.structure.files.filter(f => 
            ['.js', '.ts', '.jsx', '.tsx'].includes(f.extension)
        );
        
        const chunks = this.chunkArray(files, this.maxFilesPerBatch);
        
        for (let i = 0; i < chunks.length; i++) {
            this.logger.info(`Processing logic validation chunk ${i + 1}/${chunks.length}`);
            
            const chunk = chunks[i];
            const chunkViolations = await this.validateLogicChunk(chunk, projectPath, options);
            
            this.analysisResults.violations.push(...chunkViolations);
            
            // Check memory and cleanup after each chunk
            await this.checkMemoryUsage();
            if (this.enableGarbageCollection && global.gc) {
                global.gc();
            }
        }
    }

    /**
     * Validate a chunk of files for logic violations
     * @param {Array} files - Files to validate
     * @param {string} projectPath - Project path
     * @param {Object} options - Validation options
     * @returns {Promise<Array>} Violations found
     */
    async validateLogicChunk(files, projectPath, options) {
        const violations = [];
        
        for (const file of files) {
            try {
                const filePath = path.join(projectPath, file.path);
                const stats = await fs.stat(filePath);
                
                // Skip large files
                if (stats.size > this.maxFileSize) {
                    continue;
                }
                
                // Read file in chunks
                const fileViolations = await this.validateLogicFileStreaming(filePath, file.path);
                violations.push(...fileViolations);
                
            } catch (error) {
                violations.push({
                    type: 'logic-validation-error',
                    file: file.path,
                    message: error.message
                });
            }
        }
        
        return violations;
    }

    /**
     * Generate recommendations using memory-efficient approach
     */
    async generateRecommendationsOptimized() {
        this.logger.info('Phase 4: Generating recommendations...');
        
        const recommendations = [];
        
        // Analyze violations for patterns
        const violationTypes = this.analysisResults.violations.reduce((acc, v) => {
            acc[v.type] = (acc[v.type] || 0) + 1;
            return acc;
        }, {});
        
        // Generate recommendations based on violation patterns
        for (const [type, count] of Object.entries(violationTypes)) {
            if (count > 5) {
                recommendations.push({
                    type: 'pattern-violation',
                    title: `Multiple ${type} violations detected`,
                    description: `Found ${count} violations of type ${type}`,
                    priority: 'high',
                    action: `Review and fix ${type} violations`
                });
            }
        }
        
        // Add memory usage recommendations
        const peakMemory = Math.max(...this.analysisResults.metrics.memoryUsage);
        if (peakMemory > this.maxMemoryUsage * 0.8) {
            recommendations.push({
                type: 'memory-optimization',
                title: 'High memory usage detected',
                description: `Peak memory usage was ${peakMemory}MB`,
                priority: 'medium',
                action: 'Consider reducing batch sizes or enabling streaming'
            });
        }
        
        this.analysisResults.recommendations = recommendations;
    }

    /**
     * Check current memory usage and trigger cleanup if needed
     */
    async checkMemoryUsage() {
        const usage = process.memoryUsage();
        const currentUsage = Math.round(usage.heapUsed / 1024 / 1024);
        
        this.currentMemoryUsage = currentUsage;
        this.analysisResults.metrics.memoryUsage.push(currentUsage);
        
        if (currentUsage > this.maxMemoryUsage) {
            this.logger.warn(`Memory usage high: ${currentUsage}MB, triggering cleanup`);
            
            // Force garbage collection if available
            if (this.enableGarbageCollection && global.gc) {
                global.gc();
            }
            
            // Wait a bit for cleanup
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }

    /**
     * Cleanup resources
     */
    async cleanup() {
        this.logger.info('Cleaning up analysis resources...');
        
        // Clear large data structures
        this.analysisResults.structure.files = this.analysisResults.structure.files.slice(0, 1000);
        this.analysisResults.structure.directories = this.analysisResults.structure.directories.slice(0, 500);
        
        // Force garbage collection
        if (this.enableGarbageCollection && global.gc) {
            global.gc();
        }
        
        this.currentMemoryUsage = 0;
    }

    /**
     * Helper methods
     */
    isCodeFile(filename) {
        const codeExtensions = ['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.cs', '.html', '.css', '.scss'];
        return codeExtensions.includes(path.extname(filename));
    }

    chunkArray(array, chunkSize) {
        const chunks = [];
        for (let i = 0; i < array.length; i += chunkSize) {
            chunks.push(array.slice(i, i + chunkSize));
        }
        return chunks;
    }

    checkImportViolation(line, filePath, lineNumber) {
        // Simple import violation check
        if (line.includes('require(') && line.includes('infrastructure')) {
            return {
                type: 'import-violation',
                file: filePath,
                line: lineNumber,
                message: 'Infrastructure import in non-infrastructure layer',
                severity: 'medium'
            };
        }
        return null;
    }

    isBusinessLogicLine(line) {
        const businessLogicPatterns = [
            'business rule', 'validation', 'calculate', 'compute', 'process'
        ];
        return businessLogicPatterns.some(pattern => 
            line.toLowerCase().includes(pattern)
        );
    }

    checkBusinessLogicViolation(line, filePath, lineNumber) {
        if (filePath.includes('presentation') && this.isBusinessLogicLine(line)) {
            return {
                type: 'business-logic-violation',
                file: filePath,
                line: lineNumber,
                message: 'Business logic found in presentation layer',
                severity: 'high'
            };
        }
        return null;
    }

    async validateFileContent(content, filePath) {
        const violations = [];
        const lines = content.split('\n');
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const lineNumber = i + 1;
            
            const importViolation = this.checkImportViolation(line, filePath, lineNumber);
            if (importViolation) violations.push(importViolation);
            
            const businessLogicViolation = this.checkBusinessLogicViolation(line, filePath, lineNumber);
            if (businessLogicViolation) violations.push(businessLogicViolation);
        }
        
        return violations;
    }

    async validateLogicFileStreaming(filePath, relativePath) {
        // Simplified logic validation for streaming
        return this.validateFileStreaming(filePath, relativePath);
    }
}

module.exports = MemoryOptimizedAnalysisService; 