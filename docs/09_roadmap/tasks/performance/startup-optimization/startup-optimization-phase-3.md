# Startup Performance Optimization – Phase 3: IDE Detection Optimization

## Overview
Optimize IDE detection by implementing caching, incremental scanning, and removing automatic startup detection to reduce IDE detection time from 10-30 seconds to under 1 second.

## Objectives
- [ ] Cache IDE detection results with 1-hour TTL
- [ ] Implement incremental IDE scanning instead of full port scan
- [ ] Add workspace path caching with 24-hour TTL
- [ ] Optimize terminal operations and file system access
- [ ] Remove automatic IDE detection from startup

## Deliverables
- File: `backend/infrastructure/external/ide/IDEManager.js` - Modified with caching and incremental scanning
- File: `backend/domain/services/IDEWorkspaceDetectionService.js` - Modified with caching
- File: `backend/domain/services/workspace/FileBasedWorkspaceDetector.js` - Modified with persistent caching
- API: `/api/ide/detect` - Manual IDE detection endpoint
- API: `/api/ide/scan` - Incremental scanning endpoint
- Test: `tests/unit/IDEDetectionOptimization.test.js` - Unit tests for optimization

## Dependencies
- Requires: Phase 1 (Startup Cache Infrastructure) and Phase 2 (Lazy Service Loading) completion
- Blocks: Phase 4 (Analysis System Optimization) start

## Estimated Time
2 hours

## Technical Implementation

### 1. Modified IDEManager with Caching
```javascript
class IDEManager {
    constructor(browserManager = null, eventBus = null, gitService = null, startupCache = null) {
        // ... existing constructor code ...
        this.startupCache = startupCache;
        this.detectionCache = new Map();
        this.cacheTimeout = 60 * 60 * 1000; // 1 hour
    }

    async initialize() {
        if (this.initialized) {
            this.logger.info('Already initialized');
            return;
        }

        this.logger.info('Initializing with optimized detection...');
        
        try {
            // Load configuration
            await this.configManager.loadConfig();
            
            // Check cache first for IDE detection results
            const cachedDetection = await this.getCachedIDEDetection();
            if (cachedDetection && this.isCacheValid(cachedDetection.timestamp)) {
                this.logger.info('Using cached IDE detection results');
                this._loadFromCache(cachedDetection);
            } else {
                // Perform incremental scan only if cache is invalid
                await this.performIncrementalScan();
            }

            // Initialize port manager
            if (this.ideStatus.size > 0) {
                await this.portManager.initialize();
                this.activePort = this.portManager.getActivePort();
            }

            // Start health monitoring
            await this.healthMonitor.startMonitoring();

            this.initialized = true;
            this.logger.info(`Initialization complete. Found ${this.ideStatus.size} IDEs`);
        } catch (error) {
            this.logger.error('Initialization failed:', error);
            throw error;
        }
    }

    async performIncrementalScan() {
        this.logger.info('Performing incremental IDE scan...');
        
        // Get last scan results from cache
        const lastScan = await this.getCachedIDEDetection();
        const lastPorts = lastScan ? lastScan.ports : [];
        
        // Scan only changed or new ports
        const portsToScan = this.getPortsToScan(lastPorts);
        
        if (portsToScan.length === 0) {
            this.logger.info('No new ports to scan, using cached results');
            if (lastScan) {
                this._loadFromCache(lastScan);
            }
            return;
        }

        this.logger.info(`Scanning ${portsToScan.length} ports: ${portsToScan.join(', ')}`);
        
        const newIDEs = [];
        for (const port of portsToScan) {
            try {
                const ide = await this.detectorFactory.detectOnPort(port);
                if (ide) {
                    newIDEs.push(ide);
                    this.ideStatus.set(ide.port, ide.status);
                    this.ideTypes.set(ide.port, ide.ideType);
                }
            } catch (error) {
                this.logger.debug(`Port ${port} not available: ${error.message}`);
            }
        }

        // Merge with existing results
        if (lastScan) {
            lastScan.ides.forEach(ide => {
                if (!this.ideStatus.has(ide.port)) {
                    this.ideStatus.set(ide.port, ide.status);
                    this.ideTypes.set(ide.port, ide.ideType);
                }
            });
        }

        // Cache new results
        await this.cacheIDEDetection();
        
        this.logger.info(`Incremental scan complete. Found ${newIDEs.length} new IDEs`);
    }

    async detectWorkspacePath(port) {
        try {
            // Check cache first
            const cacheKey = `workspace_${port}`;
            const cached = await this.getCachedWorkspacePath(port);
            
            if (cached && this.isCacheValid(cached.timestamp, 24 * 60 * 60 * 1000)) { // 24 hours
                this.logger.info(`Using cached workspace path for port ${port}: ${cached.workspace}`);
                this.ideWorkspaces.set(port, cached.workspace);
                return cached.workspace;
            }

            this.logger.info(`Starting workspace detection for port ${port}`);
            
            // File-based method with optimization
            if (this.fileDetector) {
                try {
                    // Switch to target port
                    if (this.browserManager) {
                        await this.browserManager.switchToPort(port);
                    }
                    
                    // Get workspace info with caching
                    const workspaceInfo = await this.fileDetector.getWorkspaceInfo(port);
                    
                    if (workspaceInfo && workspaceInfo.workspace) {
                        this.logger.info(`Detected workspace path for port ${port}: ${workspaceInfo.workspace}`);
                        this.ideWorkspaces.set(port, workspaceInfo.workspace);
                        
                        // Cache workspace path
                        await this.cacheWorkspacePath(port, workspaceInfo.workspace);
                        
                        // Create project in database (lazy)
                        this._scheduleProjectCreation(workspaceInfo.workspace, port);
                        
                        return workspaceInfo.workspace;
                    }
                } catch (error) {
                    this.logger.info('File-based detection failed for port', port, ':', error.message);
                }
            }
            
            this.logger.info('No workspace path detected for port', port);
            return null;
        } catch (error) {
            this.logger.info('Error in workspace detection for port', port, ':', error.message);
        }
        return null;
    }

    async getCachedIDEDetection() {
        if (!this.startupCache) return null;
        return await this.startupCache.get('ide_detection', 'ide_detection');
    }

    async cacheIDEDetection() {
        if (!this.startupCache) return;
        
        const detectionData = {
            ides: Array.from(this.ideStatus.entries()).map(([port, status]) => ({
                port: parseInt(port),
                status,
                ideType: this.ideTypes.get(port)
            })),
            ports: Array.from(this.ideStatus.keys()).map(p => parseInt(p)),
            timestamp: Date.now()
        };
        
        await this.startupCache.set('ide_detection', detectionData, 'ide_detection', 3600); // 1 hour
    }

    async getCachedWorkspacePath(port) {
        if (!this.startupCache) return null;
        return await this.startupCache.get(`workspace_${port}`, 'workspace_path');
    }

    async cacheWorkspacePath(port, workspacePath) {
        if (!this.startupCache) return;
        
        const data = {
            workspace: workspacePath,
            timestamp: Date.now()
        };
        
        await this.startupCache.set(`workspace_${port}`, data, 'workspace_path', 86400); // 24 hours
    }

    isCacheValid(timestamp, ttl = this.cacheTimeout) {
        return Date.now() - timestamp < ttl;
    }

    getPortsToScan(lastPorts) {
        const allPorts = [];
        for (let port = 9222; port <= 9251; port++) {
            allPorts.push(port);
        }
        
        // Return only ports that weren't scanned recently
        return allPorts.filter(port => !lastPorts.includes(port));
    }

    _loadFromCache(cachedData) {
        cachedData.ides.forEach(ide => {
            this.ideStatus.set(ide.port, ide.status);
            this.ideTypes.set(ide.port, ide.ideType);
        });
    }

    _scheduleProjectCreation(workspacePath, port) {
        // Schedule project creation for later to avoid blocking startup
        setImmediate(async () => {
            try {
                await this.createProjectInDatabase(workspacePath, port);
            } catch (error) {
                this.logger.warn('Failed to create project in database:', error.message);
            }
        });
    }
}
```

### 2. Modified IDEWorkspaceDetectionService
```javascript
class IDEWorkspaceDetectionService {
    constructor(ideManager, projectRepository, startupCache = null) {
        this.ideManager = ideManager;
        this.projectRepository = projectRepository;
        this.startupCache = startupCache;
        this.detectionResults = new Map();
        this.logger = new ServiceLogger('IDEWorkspaceDetectionService');
    }

    async detectAllWorkspaces() {
        try {
            this.logger.info('Starting optimized workspace detection...');
            
            // Check cache first
            const cachedResults = await this.getCachedDetectionResults();
            if (cachedResults && this.isCacheValid(cachedResults.timestamp)) {
                this.logger.info('Using cached workspace detection results');
                this._loadFromCache(cachedResults);
                return this.detectionResults;
            }

            const availableIDEs = await this.ideManager.getAvailableIDEs();
            const idesWithoutResults = availableIDEs.filter(ide => 
                !this.detectionResults.has(ide.port)
            );

            if (idesWithoutResults.length === 0) {
                this.logger.info('All IDEs already have detection results');
                return this.detectionResults;
            }

            this.logger.info(`Detecting workspaces for ${idesWithoutResults.length} IDEs...`);
            
            // Process in parallel with concurrency limit
            const concurrencyLimit = 3;
            for (let i = 0; i < idesWithoutResults.length; i += concurrencyLimit) {
                const batch = idesWithoutResults.slice(i, i + concurrencyLimit);
                const promises = batch.map(ide => this.detectWorkspaceForIDE(ide.port));
                await Promise.all(promises);
            }

            // Cache results
            await this.cacheDetectionResults();
            
            this.logger.info('Workspace detection completed');
            return this.detectionResults;
        } catch (error) {
            this.logger.error('Error during workspace detection:', error);
            throw error;
        }
    }

    async detectWorkspaceForIDE(port) {
        try {
            // Check cache first
            const cached = await this.getCachedWorkspaceDetection(port);
            if (cached && this.isCacheValid(cached.timestamp, 24 * 60 * 60 * 1000)) { // 24 hours
                this.logger.info(`Using cached workspace detection for port ${port}`);
                this.detectionResults.set(port, cached);
                return cached;
            }

            this.logger.info(`Detecting workspace for IDE on port ${port}...`);
            
            const workspaceInfo = await this.ideManager.getWorkspaceInfo(port);
            
            if (workspaceInfo && workspaceInfo.workspace) {
                const result = {
                    success: true,
                    workspace: workspaceInfo.workspace,
                    files: workspaceInfo.files.length,
                    gitStatus: workspaceInfo.gitStatus ? 'Available' : 'Not available',
                    session: workspaceInfo.session,
                    timestamp: workspaceInfo.timestamp
                };
                
                this.detectionResults.set(port, result);
                
                // Cache result
                await this.cacheWorkspaceDetection(port, result);
                
                // Schedule project creation
                this._scheduleProjectCreation(workspaceInfo.workspace, port);
                
                return result;
            } else {
                const result = {
                    success: false,
                    error: 'No workspace info found'
                };
                
                this.detectionResults.set(port, result);
                return result;
            }
        } catch (error) {
            const result = {
                success: false,
                error: error.message
            };
            
            this.detectionResults.set(port, result);
            throw error;
        }
    }

    async getCachedDetectionResults() {
        if (!this.startupCache) return null;
        return await this.startupCache.get('workspace_detection_results', 'workspace_detection');
    }

    async cacheDetectionResults() {
        if (!this.startupCache) return;
        
        const results = {};
        this.detectionResults.forEach((result, port) => {
            results[port] = result;
        });
        
        const data = {
            results,
            timestamp: Date.now()
        };
        
        await this.startupCache.set('workspace_detection_results', data, 'workspace_detection', 86400); // 24 hours
    }

    async getCachedWorkspaceDetection(port) {
        if (!this.startupCache) return null;
        return await this.startupCache.get(`workspace_detection_${port}`, 'workspace_detection');
    }

    async cacheWorkspaceDetection(port, result) {
        if (!this.startupCache) return;
        
        const data = {
            ...result,
            timestamp: Date.now()
        };
        
        await this.startupCache.set(`workspace_detection_${port}`, data, 'workspace_detection', 86400); // 24 hours
    }

    isCacheValid(timestamp, ttl = 60 * 60 * 1000) {
        return Date.now() - timestamp < ttl;
    }

    _loadFromCache(cachedData) {
        Object.entries(cachedData.results).forEach(([port, result]) => {
            this.detectionResults.set(parseInt(port), result);
        });
    }

    _scheduleProjectCreation(workspacePath, port) {
        // Schedule for later to avoid blocking
        setImmediate(async () => {
            try {
                await this.createProjectInDatabase(workspacePath, port);
            } catch (error) {
                this.logger.warn('Failed to create project in database:', error.message);
            }
        });
    }
}
```

### 3. Modified FileBasedWorkspaceDetector
```javascript
class FileBasedWorkspaceDetector {
    constructor(browserManager, startupCache = null) {
        this.browserManager = browserManager;
        this.startupCache = startupCache;
        this._detectionCache = new Map();
        this.logger = new ServiceLogger('FileBasedWorkspaceDetector');
    }

    async getWorkspaceInfo(port) {
        const cacheKey = `workspace_info_${port}`;
        
        // Check memory cache first
        if (this._detectionCache.has(cacheKey)) {
            const cached = this._detectionCache.get(cacheKey);
            if (this.isCacheValid(cached.timestamp, 24 * 60 * 60 * 1000)) { // 24 hours
                this.logger.info(`Using memory cached workspace info for port ${port}`);
                return cached;
            }
            this._detectionCache.delete(cacheKey);
        }

        // Check persistent cache
        const cached = await this.getCachedWorkspaceInfo(port);
        if (cached && this.isCacheValid(cached.timestamp, 24 * 60 * 60 * 1000)) {
            this.logger.info(`Using persistent cached workspace info for port ${port}`);
            this._detectionCache.set(cacheKey, cached);
            return cached;
        }

        // Check existing files
        const existingData = await this._checkExistingFiles(port);
        if (existingData && existingData.workspace) {
            this.logger.info(`Found existing workspace data for port ${port}`);
            this._detectionCache.set(cacheKey, existingData);
            await this.cacheWorkspaceInfo(port, existingData);
            return existingData;
        }

        // Perform new detection only if necessary
        this.logger.info(`No cached data found for port ${port}, starting new detection...`);
        
        try {
            const page = await this.browserManager.getPage();
            if (!page) {
                this.logger.error('No page available');
                return null;
            }

            // Optimized detection with reduced operations
            const workspaceInfo = await this._performOptimizedDetection(page, port);
            
            if (workspaceInfo && workspaceInfo.workspace) {
                this.logger.info(`Workspace info found for port ${port}: ${workspaceInfo.workspace}`);
                this._detectionCache.set(cacheKey, workspaceInfo);
                await this.cacheWorkspaceInfo(port, workspaceInfo);
                return workspaceInfo;
            }

            this.logger.error('Failed to get workspace info');
            return null;
        } catch (error) {
            this.logger.error('Error in workspace detection:', error);
            return null;
        }
    }

    async _performOptimizedDetection(page, port) {
        try {
            // Only open terminal if absolutely necessary
            const hasExistingData = await this._checkExistingFiles(port);
            if (!hasExistingData) {
                await this._setupTerminalAndFiles(page, port);
                await this._executeOptimizedTerminalCommands(page, port);
                await this._closeTerminal(page);
            }

            const workspaceInfo = await this._readWorkspaceFiles(port);
            return workspaceInfo;
        } catch (error) {
            this.logger.error('Error in optimized detection:', error);
            return null;
        }
    }

    async _executeOptimizedTerminalCommands(page, port) {
        // Reduced command set for faster execution
        const commands = [
            'pwd > /tmp/IDEWEB/current-workspace.txt',
            'ls -la > /tmp/IDEWEB/files-list.txt',
            'git status > /tmp/IDEWEB/git-status.txt 2>&1'
        ];

        for (const command of commands) {
            await page.keyboard.type(command);
            await page.keyboard.press('Enter');
            await page.waitForTimeout(300); // Reduced wait time
        }
    }

    async getCachedWorkspaceInfo(port) {
        if (!this.startupCache) return null;
        return await this.startupCache.get(`workspace_info_${port}`, 'workspace_info');
    }

    async cacheWorkspaceInfo(port, workspaceInfo) {
        if (!this.startupCache) return;
        
        const data = {
            ...workspaceInfo,
            timestamp: Date.now()
        };
        
        await this.startupCache.set(`workspace_info_${port}`, data, 'workspace_info', 86400); // 24 hours
    }

    isCacheValid(timestamp, ttl = 60 * 60 * 1000) {
        return Date.now() - timestamp < ttl;
    }
}
```

## Success Criteria
- [ ] IDE detection time reduced from 10-30s to <1s
- [ ] Workspace detection time reduced from 5-15s to <500ms
- [ ] Cache hit rate >90% for IDE detection
- [ ] Cache hit rate >85% for workspace detection
- [ ] No automatic IDE detection at startup
- [ ] Incremental scanning working correctly
- [ ] Terminal operations optimized
- [ ] Unit tests passing with >90% coverage

## Testing Strategy
- **Unit Tests**: Cache operations, incremental scanning, workspace detection
- **Integration Tests**: IDE detection flow, cache persistence
- **Performance Tests**: Detection time reduction, cache hit rates
- **Error Handling**: Cache misses, detection failures

## Risk Mitigation
- **Cache Staleness**: Proper TTL management and invalidation
- **Detection Failures**: Fallback mechanisms and error handling
- **Performance Regression**: Continuous monitoring and benchmarks
- **Data Consistency**: Cache synchronization strategies

## Next Phase Dependencies
This phase enables Phase 4 (Analysis System Optimization) by providing the optimized IDE detection infrastructure needed for efficient analysis operations. 