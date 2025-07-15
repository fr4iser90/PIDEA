/**
 * MemoryOptimizedAnalysisService - Memory-efficient analysis with streaming and chunking
 * Addresses OOM issues by implementing memory management, streaming, and resource limits
 * Enhanced with Phase 3: Resource Management Enhancement features
 */
const path = require('path');
const fs = require('fs').promises;
const { createReadStream } = require('fs');
const { Transform, PassThrough } = require('stream');
const Logger = require('@logging/Logger');
const logger = new Logger('Logger');

class MemoryOptimizedAnalysisService {
    constructor(options = {}) {
        this.logger = options.logger || console;
        
        // Memory management settings
        this.maxMemoryUsage = options.maxMemoryUsage || 512; // MB - Increased for large codebases
        this.maxFileSize = options.maxFileSize || 10 * 1024 * 1024; // 10MB
        this.maxFilesPerBatch = options.maxFilesPerBatch || 50; // Reduced for memory safety
        this.maxDirectoryDepth = options.maxDirectoryDepth || 8;
        this.chunkSize = options.chunkSize || 64 * 1024; // 64KB chunks
        this.enableStreaming = options.enableStreaming !== false;
        this.enableGarbageCollection = options.enableGarbageCollection !== false;
        
        // OOM Prevention settings
        this.memoryThreshold = options.memoryThreshold || 0.8; // 80% of max memory
        this.analysisTimeout = options.analysisTimeout || 5 * 60 * 1000; // 5 minutes
        this.enableCancellation = options.enableCancellation !== false;
        this.enableFallback = options.enableFallback !== false;
        this.maxRetries = options.maxRetries || 2;
        
        // **NEW**: Phase 3 - Enhanced Resource Management
        this.enableEnhancedTimeouts = options.enableEnhancedTimeouts !== false;
        this.enableResultStreaming = options.enableResultStreaming !== false;
        this.enableMemoryLogging = options.enableMemoryLogging !== false;
        this.enableProgressiveDegradation = options.enableProgressiveDegradation !== false;
        this.timeoutPerAnalysisType = options.timeoutPerAnalysisType || {
            'code-quality': 2 * 60 * 1000,    // 2 minutes
            'security': 3 * 60 * 1000,        // 3 minutes
            'performance': 4 * 60 * 1000,     // 4 minutes
            'architecture': 5 * 60 * 1000     // 5 minutes
        };
        this.streamingBatchSize = options.streamingBatchSize || 100; // Files per streaming batch
        this.memoryLoggingInterval = options.memoryLoggingInterval || 30000; // 30 seconds
        
        // Resource tracking
        this.currentMemoryUsage = 0;
        this.processedFiles = 0;
        this.processedDirectories = 0;
        this.startTime = Date.now();
        this.isCancelled = false;
        this.retryCount = 0;
        
        // **NEW**: Enhanced memory tracking for Phase 3
        this.memoryHistory = [];
        this.memoryLoggingTimer = null;
        this.streamingResults = new Map();
        this.fallbackResults = new Map();
        this.analysisProgress = new Map();
        
        // Initialize analysis results structure
        this.analysisResults = {
            projectPath: '',
            structure: { directories: [], files: [], violations: [] },
            layers: { violations: [], suggestions: [] },
            logic: { violations: [], suggestions: [] },
            metrics: {
                totalFiles: 0,
                totalDirectories: 0,
                processedFiles: 0,
                processedDirectories: 0,
                memoryUsage: [],
                processingTime: 0,
                retryAttempts: 0,
                streamingBatches: 0,
                fallbackTriggers: 0
            },
            timestamp: new Date()
        };
        
        // **NEW**: Start enhanced memory logging if enabled
        if (this.enableMemoryLogging) {
            this.startEnhancedMemoryLogging();
        }
    }

    /**
     * Perform memory-optimized analysis with OOM prevention
     * @param {string} projectPath - Project path
     * @param {Object} options - Analysis options
     * @returns {Promise<Object>} Analysis results
     */
    async performAnalysis(projectPath, options = {}) {
        this.logger.info('Starting memory-optimized analysis with OOM prevention...');
        
        return this.runAnalysisWithMemoryProtection(projectPath, options);
    }

    /**
     * Memory-safe analysis execution wrapper
     * @param {string} projectPath - Project path
     * @param {Object} options - Analysis options
     * @returns {Promise<Object>} Analysis results
     */
    async runAnalysisWithMemoryProtection(projectPath, options = {}) {
        const startMemory = process.memoryUsage().heapUsed;
        const maxMemory = this.maxMemoryUsage * 1024 * 1024; // Convert to bytes
        const timeout = options.timeout || this.analysisTimeout;
        
        this.logger.info('Starting memory-safe analysis execution', {
            projectPath,
            maxMemory: `${this.maxMemoryUsage}MB`,
            timeout: `${timeout / 1000}s`
        });
        
        try {
            // Check memory before starting
            if (process.memoryUsage().heapUsed > maxMemory * this.memoryThreshold) {
                this.logger.warn('Memory usage high before analysis, forcing cleanup');
                await this.forceGarbageCollection();
            }
            
            // Run analysis with enhanced timeout if enabled
            if (this.enableEnhancedTimeouts) {
                const analysisType = options.analysisType || 'code-quality';
                return this.runAnalysisWithEnhancedTimeout(analysisType, projectPath, options);
            }

            // Run analysis with timeout and memory monitoring
            const result = await Promise.race([
                this.executeAnalysisWithRetry(projectPath, options),
                this.createTimeout(timeout)
            ]);
            
            return result;
            
        } catch (error) {
            if (error.name === 'TimeoutError') {
                this.logger.warn('Analysis timeout, returning partial results');
                return this.createPartialResults(projectPath, 'timeout');
            } else if (error.name === 'MemoryError') {
                this.logger.warn('Memory limit exceeded, returning partial results');
                return this.createPartialResults(projectPath, 'memory');
            } else if (this.isCancelled) {
                this.logger.info('Analysis cancelled by user');
                return this.createPartialResults(projectPath, 'cancelled');
            } else {
                this.logger.error('Analysis failed with error:', error);
                throw error;
            }
        } finally {
            // Cleanup
            await this.cleanup();
        }
    }

    /**
     * **NEW**: Enhanced timeout management with analysis-type-specific timeouts
     * @param {string} analysisType - Type of analysis
     * @param {string} projectPath - Project path
     * @param {Object} options - Analysis options
     * @returns {Promise<Object>} Analysis results
     */
    async runAnalysisWithEnhancedTimeout(analysisType, projectPath, options = {}) {
        const timeout = options.timeout || this.timeoutPerAnalysisType[analysisType] || this.analysisTimeout;
        const startTime = Date.now();
        
        this.logger.info('Starting enhanced timeout analysis', {
            analysisType,
            projectPath,
            timeout: `${timeout / 1000}s`
        });
        
        try {
            // Check memory before starting
            await this.checkMemoryUsage();
            
            // Run analysis with enhanced timeout
            const result = await Promise.race([
                this.executeAnalysisWithRetry(projectPath, options),
                this.createEnhancedTimeout(timeout, analysisType)
            ]);
            
            const duration = Date.now() - startTime;
            this.logger.info('Enhanced timeout analysis completed', {
                analysisType,
                duration: `${duration / 1000}s`,
                memoryUsage: this.currentMemoryUsage
            });
            
            return result;
            
        } catch (error) {
            if (error.name === 'EnhancedTimeoutError') {
                this.logger.warn('Enhanced timeout exceeded, returning partial results', {
                    analysisType,
                    timeout: `${timeout / 1000}s`
                });
                return this.createPartialResults(projectPath, 'enhanced-timeout', analysisType);
            } else {
                throw error;
            }
        }
    }

    /**
     * **NEW**: Create enhanced timeout with analysis-type context
     * @param {number} timeout - Timeout in milliseconds
     * @param {string} analysisType - Type of analysis
     * @returns {Promise} Timeout promise
     */
    createEnhancedTimeout(timeout, analysisType) {
        return new Promise((_, reject) => {
            setTimeout(() => {
                const error = new Error(`Enhanced timeout exceeded for ${analysisType}: ${timeout / 1000}s`);
                error.name = 'EnhancedTimeoutError';
                error.analysisType = analysisType;
                error.timeout = timeout;
                reject(error);
            }, timeout);
        });
    }

    /**
     * **NEW**: Stream analysis results to prevent memory buildup
     * @param {string} analysisType - Type of analysis
     * @param {string} projectPath - Project path
     * @param {Object} options - Analysis options
     * @returns {Transform} Streaming transform
     */
    streamAnalysisResults(analysisType, projectPath, options = {}) {
        const stream = new Transform({
            objectMode: true,
            transform(chunk, encoding, callback) {
                try {
                    // Process chunk and emit partial results
                    const partialResult = {
                        type: 'partial',
                        analysisType,
                        timestamp: new Date(),
                        data: chunk,
                        progress: this.analysisProgress.get(analysisType) || 0
                    };
                    
                    this.push(partialResult);
                    callback();
                } catch (error) {
                    callback(error);
                }
            }
        });
        
        // Store streaming context
        this.streamingResults.set(analysisType, {
            stream,
            startTime: Date.now(),
            processedItems: 0
        });
        
        return stream;
    }

    /**
     * **NEW**: Enhanced memory logging with detailed metrics
     */
    startEnhancedMemoryLogging() {
        this.memoryLoggingTimer = setInterval(() => {
            const usage = process.memoryUsage();
            const currentUsage = Math.round(usage.heapUsed / 1024 / 1024);
            
            const memoryEntry = {
                timestamp: new Date(),
                heapUsed: currentUsage,
                heapTotal: Math.round(usage.heapTotal / 1024 / 1024),
                external: Math.round(usage.external / 1024 / 1024),
                rss: Math.round(usage.rss / 1024 / 1024),
                processedFiles: this.processedFiles,
                processedDirectories: this.processedDirectories,
                activeStreams: this.streamingResults.size,
                fallbackCount: this.fallbackResults.size
            };
            
            this.memoryHistory.push(memoryEntry);
            this.analysisResults.metrics.memoryUsage.push(currentUsage);
            
            // Log detailed memory information
            this.logger.info('Enhanced memory logging', {
                currentUsage: `${currentUsage}MB`,
                heapTotal: `${memoryEntry.heapTotal}MB`,
                external: `${memoryEntry.external}MB`,
                rss: `${memoryEntry.rss}MB`,
                processedFiles: this.processedFiles,
                activeStreams: this.streamingResults.size,
                fallbackCount: this.fallbackResults.size
            });
            
            // Check for memory threshold and trigger fallback if needed
            if (currentUsage > this.maxMemoryUsage * this.memoryThreshold) {
                this.logger.warn('Memory threshold exceeded, triggering fallback mechanisms', {
                    currentUsage: `${currentUsage}MB`,
                    threshold: `${this.maxMemoryUsage * this.memoryThreshold}MB`
                });
                this.triggerFallbackMechanisms();
            }
            
            // Keep only last 100 memory entries to prevent memory buildup
            if (this.memoryHistory.length > 100) {
                this.memoryHistory = this.memoryHistory.slice(-100);
            }
            
        }, this.memoryLoggingInterval);
    }

    /**
     * **NEW**: Trigger fallback mechanisms for memory-intensive operations
     */
    triggerFallbackMechanisms() {
        this.logger.info('Triggering fallback mechanisms for memory-intensive operations');
        
        // Force garbage collection
        if (global.gc) {
            global.gc();
        }
        
        // Reduce batch sizes for streaming
        this.streamingBatchSize = Math.max(10, this.streamingBatchSize / 2);
        
        // Increase memory threshold temporarily
        this.memoryThreshold = Math.min(0.9, this.memoryThreshold + 0.05);
        
        // Log fallback trigger
        this.analysisResults.metrics.fallbackTriggers++;
        
        this.logger.info('Fallback mechanisms applied', {
            newStreamingBatchSize: this.streamingBatchSize,
            newMemoryThreshold: this.memoryThreshold,
            fallbackTriggers: this.analysisResults.metrics.fallbackTriggers
        });
    }

    /**
     * **NEW**: Progressive degradation for large repositories
     * @param {string} projectPath - Project path
     * @param {Object} options - Analysis options
     * @returns {Object} Degraded analysis options
     */
    applyProgressiveDegradation(projectPath, options = {}) {
        const degradedOptions = { ...options };
        
        // Check repository size
        const repoSize = this.estimateRepositorySize(projectPath);
        
        if (repoSize > 10000) { // Large repository
            this.logger.info('Applying progressive degradation for large repository', {
                projectPath,
                estimatedSize: repoSize
            });
            
            // Reduce analysis depth
            degradedOptions.maxDepth = Math.min(options.maxDepth || 8, 4);
            
            // Skip heavy analysis types
            degradedOptions.skipHeavyAnalysis = true;
            
            // Use lightweight analysis modes
            degradedOptions.lightweightMode = true;
            
            // Reduce batch sizes
            degradedOptions.batchSize = Math.min(options.batchSize || 50, 25);
            
        } else if (repoSize > 5000) { // Medium repository
            this.logger.info('Applying moderate degradation for medium repository', {
                projectPath,
                estimatedSize: repoSize
            });
            
            // Moderate reduction in analysis depth
            degradedOptions.maxDepth = Math.min(options.maxDepth || 8, 6);
            
            // Reduce batch sizes moderately
            degradedOptions.batchSize = Math.min(options.batchSize || 50, 35);
        }
        
        return degradedOptions;
    }

    /**
     * **NEW**: Estimate repository size
     * @param {string} projectPath - Project path
     * @returns {number} Estimated file count
     */
    estimateRepositorySize(projectPath) {
        try {
            // Simple estimation based on directory structure
            const stats = fs.statSync(projectPath);
            if (stats.isDirectory()) {
                // Count files recursively (simplified estimation)
                let count = 0;
                const countFiles = (dir) => {
                    const items = fs.readdirSync(dir);
                    for (const item of items) {
                        const fullPath = path.join(dir, item);
                        const stat = fs.statSync(fullPath);
                        if (stat.isDirectory()) {
                            countFiles(fullPath);
                        } else {
                            count++;
                        }
                    }
                };
                countFiles(projectPath);
                return count;
            }
        } catch (error) {
            this.logger.warn('Could not estimate repository size', { projectPath, error: error.message });
        }
        return 1000; // Default estimation
    }

    /**
     * **NEW**: Enhanced partial results with analysis-type context
     * @param {string} projectPath - Project path
     * @param {string} reason - Reason for partial results
     * @param {string} analysisType - Type of analysis
     * @returns {Object} Partial results
     */
    createPartialResults(projectPath, reason, analysisType = 'unknown') {
        const partialResults = {
            projectPath,
            analysisType,
            status: 'partial',
            reason,
            timestamp: new Date(),
            metrics: {
                ...this.analysisResults.metrics,
                partialReason: reason,
                analysisType
            },
            data: {
                structure: this.analysisResults.structure,
                layers: this.analysisResults.layers,
                logic: this.analysisResults.logic
            },
            warning: `Analysis completed partially due to: ${reason}. Some results may be incomplete.`
        };
        
        // Store fallback result
        this.fallbackResults.set(analysisType, partialResults);
        
        this.logger.warn('Created partial results', {
            projectPath,
            analysisType,
            reason,
            processedFiles: this.processedFiles
        });
        
        return partialResults;
    }

    /**
     * **NEW**: Cleanup enhanced resources
     */
    async cleanupEnhanced() {
        // Stop memory logging
        if (this.memoryLoggingTimer) {
            clearInterval(this.memoryLoggingTimer);
            this.memoryLoggingTimer = null;
        }
        
        // Close streaming results
        for (const [analysisType, streamingData] of this.streamingResults) {
            if (streamingData.stream && !streamingData.stream.destroyed) {
                streamingData.stream.destroy();
            }
        }
        this.streamingResults.clear();
        
        // Clear fallback results
        this.fallbackResults.clear();
        
        // Clear analysis progress
        this.analysisProgress.clear();
        
        // Clear memory history
        this.memoryHistory = [];
        
        // Force garbage collection
        if (global.gc) {
            global.gc();
        }
        
        this.logger.info('Enhanced cleanup completed');
    }

    /**
     * Execute analysis with retry logic
     * @param {string} projectPath - Project path
     * @param {Object} options - Analysis options
     * @returns {Promise<Object>} Analysis results
     */
    async executeAnalysisWithRetry(projectPath, options = {}) {
        let lastError;
        
        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                this.retryCount = attempt - 1;
                this.analysisResults.metrics.retryAttempts = this.retryCount;
                
                this.logger.info(`Analysis attempt ${attempt}/${this.maxRetries}`);
                
                // Initialize analysis
                this.analysisResults.projectPath = projectPath;
                this.startTime = Date.now();
                this.isCancelled = false;
                
                // Phase 1: Structure Analysis (streaming)
                await this.analyzeStructureStreaming(projectPath, options);
                
                // Check for cancellation
                if (this.isCancelled) {
                    throw new Error('Analysis cancelled');
                }
                
                // Phase 2: Layer Validation (chunked)
                if (options.includeLayerValidation !== false) {
                    await this.validateLayersChunked(projectPath, options);
                }
                
                // Check for cancellation
                if (this.isCancelled) {
                    throw new Error('Analysis cancelled');
                }
                
                // Phase 3: Logic Validation (streaming)
                if (options.includeLogicValidation !== false) {
                    await this.validateLogicStreaming(projectPath, options);
                }
                
                // Check for cancellation
                if (this.isCancelled) {
                    throw new Error('Analysis cancelled');
                }
                
                // Phase 4: Generate Recommendations (memory-efficient)
                await this.generateRecommendationsOptimized();
                
                // Calculate final metrics
                this.analysisResults.metrics.processingTime = Date.now() - this.startTime;
                this.analysisResults.metrics.totalFiles = this.processedFiles;
                this.analysisResults.metrics.validatedFiles = this.processedFiles;
                
                this.logger.info('Memory-optimized analysis completed successfully', {
                    totalFiles: this.processedFiles,
                    totalDirectories: this.processedDirectories,
                    processingTime: this.analysisResults.metrics.processingTime,
                    peakMemoryUsage: Math.max(...this.analysisResults.metrics.memoryUsage),
                    retryAttempts: this.retryCount
                });
                
                return this.analysisResults;
                
            } catch (error) {
                lastError = error;
                this.logger.warn(`Analysis attempt ${attempt} failed:`, error.message);
                
                // Check if we should retry
                if (attempt < this.maxRetries && this.shouldRetry(error)) {
                    this.logger.info(`Retrying analysis (attempt ${attempt + 1})`);
                    await this.forceGarbageCollection();
                    await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
                } else {
                    break;
                }
            }
        }
        
        // All retries failed
        this.logger.error('All analysis attempts failed');
        this.analysisResults.overall = false;
        this.analysisResults.error = lastError.message;
        this.analysisResults.partial = true;
        
        return this.analysisResults;
    }

    /**
     * Create timeout promise
     * @param {number} timeout - Timeout in milliseconds
     * @returns {Promise} Timeout promise
     */
    createTimeout(timeout) {
        return new Promise((_, reject) => {
            setTimeout(() => {
                const error = new Error(`Analysis timeout after ${timeout / 1000} seconds`);
                error.name = 'TimeoutError';
                reject(error);
            }, timeout);
        });
    }

    /**
     * Determine if analysis should be retried
     * @param {Error} error - Error that occurred
     * @returns {boolean} Whether to retry
     */
    shouldRetry(error) {
        // Don't retry if cancelled
        if (this.isCancelled) return false;
        
        // Don't retry timeout errors
        if (error.name === 'TimeoutError') return false;
        
        // Don't retry memory errors
        if (error.name === 'MemoryError') return false;
        
        // Retry other errors
        return true;
    }

    /**
     * Cancel ongoing analysis
     */
    cancelAnalysis() {
        this.isCancelled = true;
        this.analysisResults.metrics.cancellationCount++;
        this.logger.info('Analysis cancellation requested');
    }

    /**
     * Force garbage collection
     */
    async forceGarbageCollection() {
        if (this.enableGarbageCollection && global.gc) {
            global.gc();
            this.logger.info('Forced garbage collection');
            
            // Wait for cleanup
            await new Promise(resolve => setTimeout(resolve, 100));
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
        const maxMemory = this.maxMemoryUsage;
        
        this.currentMemoryUsage = currentUsage;
        this.analysisResults.metrics.memoryUsage.push(currentUsage);
        
        // Check if memory usage is approaching the threshold
        if (currentUsage > maxMemory * this.memoryThreshold) {
            this.logger.warn(`Memory usage approaching limit: ${currentUsage}MB/${maxMemory}MB, triggering cleanup`);
            await this.forceGarbageCollection();
        }
        
        // Check if memory usage exceeds the limit
        if (currentUsage > maxMemory) {
            this.logger.error(`Memory usage exceeded limit: ${currentUsage}MB/${maxMemory}MB`);
            
            // If cancellation is enabled, cancel the analysis
            if (this.enableCancellation) {
                this.cancelAnalysis();
                throw new Error('Memory limit exceeded');
            }
            
            // If fallback is enabled, return partial results
            if (this.enableFallback) {
                this.logger.warn('Memory limit exceeded, returning partial results');
                return this.createPartialResults(this.analysisResults.projectPath, 'memory');
            }
            
            // Otherwise, throw memory error
            const error = new Error(`Memory usage exceeded limit: ${currentUsage}MB/${maxMemory}MB`);
            error.name = 'MemoryError';
            throw error;
        }
        
        // Log memory usage periodically
        if (this.processedFiles % 100 === 0) {
            this.logger.info(`Memory usage check: ${currentUsage}MB/${maxMemory}MB, files processed: ${this.processedFiles}`);
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