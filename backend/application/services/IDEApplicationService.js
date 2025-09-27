/**
 * IDEApplicationService - Application layer service for IDE management operations
 * 
 * RESPONSIBILITIES:
 * ✅ Coordinate IDE lifecycle management (start, stop, switch, status)
 * ✅ Handle workspace detection and management  
 * ✅ Manage terminal command execution and log operations
 * ✅ Coordinate documentation task management
 * ✅ Handle VSCode-specific operations
 * ✅ Publish IDE-related events through event bus
 * ✅ Cache IDE switching results and deduplicate requests
 * 
 * LAYER COMPLIANCE:
 * ✅ Application layer - coordinates between Presentation and Domain
 * ✅ Uses Domain services through interfaces
 * ✅ Encapsulates complex IDE workflow orchestration
 */
const ManualTasksHandler = require('@handlers/categories/workflow/ManualTasksHandler');
const TerminalLogCaptureService = require('@domain/services/terminal/TerminalLogCaptureService');
const TerminalLogReader = require('@domain/services/terminal/TerminalLogReader');
const IDESwitchCache = require('@infrastructure/cache/IDESwitchCache');
const Logger = require('@logging/Logger');

class IDEApplicationService {
    constructor(dependencies = {}) {
        this.ideManager = dependencies.ideManager;
        this.ideWorkspaceDetectionService = dependencies.ideWorkspaceDetectionService;
        this.eventBus = dependencies.eventBus;
        this.cursorIDEService = dependencies.cursorIDEService;
        this.taskRepository = dependencies.taskRepository;
        this.logger = dependencies.logger || new Logger('IDEApplicationService');
        
        // Initialize terminal services
        this.terminalLogCaptureService = dependencies.terminalLogCaptureService || new TerminalLogCaptureService();
        this.terminalLogReader = dependencies.terminalLogReader || new TerminalLogReader();
        
        // Initialize caching and request deduplication
        this.cache = new IDESwitchCache({
            ttl: 30 * 60 * 1000, // 30 minutes - much longer for better performance
            maxSize: 20, // Smaller size for faster lookups
            cleanupInterval: 600000 // 10 minutes - less frequent cleanup
        });
        this.pendingRequests = new Map(); // Request deduplication
        
        // RequestQueuingService removed - using direct execution for better performance
        
        // Initialize manual tasks handler if we have required dependencies
        if (this.ideManager && this.taskRepository) {
            this.manualTasksHandler = new ManualTasksHandler(() => {
                const activePath = this.ideManager.getActiveWorkspacePath();
                this.logger.info('Active workspace path:', activePath);
                this.logger.info('Active port:', this.ideManager.getActivePort());
                this.logger.info('Available workspaces:', Array.from(this.ideManager.ideWorkspaces.entries()));
                
                if (!activePath) {
                    throw new Error('No active workspace path available - IDE workspace detection failed');
                }
                return activePath;
            }, this.taskRepository);
        }
    }

    // ========== IDE MANAGEMENT ==========

    async getAvailableIDEs(userId) {
        try {
            // // // this.logger.info('IDEApplicationService: Getting available IDEs', { userId });
            
            // Simple cache check - return cached data if less than 5 seconds old
            if (this._cachedIDEs && this._cacheTime && (Date.now() - this._cacheTime) < 5000) {
                // // // this.logger.info('Returning cached IDE data');
                return {
                    success: true,
                    data: this._cachedIDEs
                };
            }
            
            const availableIDEs = await this.ideManager.getAvailableIDEs();
            
            // Cache the result
            this._cachedIDEs = availableIDEs;
            this._cacheTime = Date.now();
            
            return {
                success: true,
                data: availableIDEs
            };
        } catch (error) {
            this.logger.error('Error getting available IDEs:', error);
            throw error;
        }
    }

    // Method to invalidate cache when IDE state changes
    invalidateIDECache() {
        this._cachedIDEs = null;
        this._cacheTime = null;
        this.logger.info('IDE cache invalidated');
    }

    // Cache management methods
    async invalidateSwitchCache(port = null) {
        this.cache.invalidateCache(port);
        this.logger.info(`Switch cache invalidated for ${port || 'all ports'}`);
    }

    getSwitchCacheStats() {
        return this.cache.getStats();
    }

    async startIDE(workspacePath, ideType = 'cursor', userId) {
        try {
            this.logger.info('IDEApplicationService: Starting IDE', { workspacePath, ideType, userId });
            
            const ideInfo = await this.ideManager.startNewIDE(workspacePath, ideType);
            
            // Publish event
            if (this.eventBus) {
                await this.eventBus.publish('ideAdded', {
                    port: ideInfo.port,
                    status: ideInfo.status,
                    ideType: ideInfo.ideType
                });
            }
            
            return {
                success: true,
                data: ideInfo
            };
        } catch (error) {
            this.logger.error('Error starting IDE:', error);
            throw error;
        }
    }

    async switchIDE(portParam, userId) {
        try {
            this.logger.info('IDEApplicationService: Switching IDE', { portParam, userId });
            
            // Handle string port properly
            const port = typeof portParam === 'string' ? parseInt(portParam) : portParam;
            
            if (isNaN(port)) {
                throw new Error(`Invalid port: ${portParam}`);
            }
            
            // Check cache first - return immediately for cache hits
            const cached = await this.cache.getCachedSwitch(port);
            if (cached) {
                this.logger.info(`Cache hit for IDE switch to port ${port} - returning in <1ms`);
                return cached;
            }
            
            // For non-cached requests, use direct execution instead of queuing
            // This prevents the 5+ second delays after cache fills up
            this.logger.info(`Cache miss for IDE switch to port ${port} - executing directly`);
            const result = await this.performSwitch(port, userId);
            
            // Cache successful result
            this.cache.setCachedSwitch(port, result);
            
            return result;
            
            // Note: RequestQueuingService removed for IDE switches to prevent 5+ second delays
            // Direct execution is used instead for better performance
        } catch (error) {
            this.logger.error('Error switching IDE:', error);
            throw error;
        }
    }

    async performSwitch(port, userId) {
        const start = process.hrtime.bigint();
        
        try {
            // Check connection pool health before switching
            if (this.ideManager && this.ideManager.browserManager && this.ideManager.browserManager.connectionPool) {
                const poolHealth = this.ideManager.browserManager.connectionPool.getHealth();
                this.logger.debug(`Connection pool health before switch: ${JSON.stringify(poolHealth)}`);
            }
            
            const result = await this.ideManager.switchToIDE(port);
            
            const duration = Number(process.hrtime.bigint() - start) / 1000;
            this.logger.info(`IDE switch to port ${port} completed in ${duration.toFixed(2)}ms`);
            
            // Check connection pool health after switching
            if (this.ideManager && this.ideManager.browserManager && this.ideManager.browserManager.connectionPool) {
                const poolHealth = this.ideManager.browserManager.connectionPool.getHealth();
                this.logger.debug(`Connection pool health after switch: ${JSON.stringify(poolHealth)}`);
            }
            
            // Publish event
            if (this.eventBus) {
                await this.eventBus.publish('ideSwitched', {
                    port: port,
                    result: result
                });
            }
            
            return {
                success: true,
                data: { port, result },
                switchTime: duration,
                timestamp: Date.now()
            };
        } catch (error) {
            const duration = Number(process.hrtime.bigint() - start) / 1000;
            this.logger.error(`IDE switch to port ${port} failed after ${duration.toFixed(2)}ms:`, error.message);
            throw error;
        }
    }

    async stopIDE(port, userId) {
        try {
            this.logger.info('IDEApplicationService: Stopping IDE', { port, userId });
            
            const result = await this.ideManager.stopIDE(port);
            
            // Publish event
            if (this.eventBus) {
                await this.eventBus.publish('ideRemoved', {
                    port: port,
                    result: result
                });
            }
            
            return {
                success: true,
                data: { port, result }
            };
        } catch (error) {
            this.logger.error('Error stopping IDE:', error);
            throw error;
        }
    }

    async getIDEStatus(userId) {
        try {
            // // // this.logger.info('IDEApplicationService: Getting IDE status', { userId });
            
            const status = await this.ideManager.getStatus();
            
            return {
                success: true,
                data: status
            };
        } catch (error) {
            this.logger.error('Error getting IDE status:', error);
            throw error;
        }
    }

    // ========== WORKSPACE MANAGEMENT ==========

    async setWorkspacePath(port, workspacePath, userId) {
        try {
            this.logger.info('IDEApplicationService: Setting workspace path', { port, workspacePath, userId });
            
            const result = await this.ideManager.setWorkspacePath(port, workspacePath);
            
            return {
                success: true,
                data: { port, workspacePath, result }
            };
        } catch (error) {
            this.logger.error('Error setting workspace path:', error);
            throw error;
        }
    }

    async getWorkspaceInfo(userId) {
        try {
            // // // this.logger.info('IDEApplicationService: Getting workspace info for all IDEs', { userId });
            
            const availableIDEs = await this.ideManager.getAvailableIDEs();
            const workspaceInfo = availableIDEs.map(ide => ({
                port: ide.port,
                status: ide.status,
                workspacePath: this.ideManager.getWorkspacePath(ide.port),
                hasWorkspace: !!this.ideManager.getWorkspacePath(ide.port)
            }));
            
            return {
                success: true,
                data: workspaceInfo
            };
        } catch (error) {
            this.logger.error('Error getting workspace info:', error);
            throw error;
        }
    }

    async detectWorkspacePaths(userId) {
        try {
            this.logger.info('IDEApplicationService: Detecting workspace paths', { userId });
            
            const detectedPaths = await this.ideManager.detectWorkspacePaths();
            
            return {
                success: true,
                data: detectedPaths
            };
        } catch (error) {
            this.logger.error('Error detecting workspace paths:', error);
            throw error;
        }
    }

    async detectAllWorkspaces(userId) {
        try {
            this.logger.info('IDEApplicationService: Detecting all workspaces', { userId });
            
            // Use the existing IDEWorkspaceDetectionService instead of ideManager
            const workspaces = await this.ideWorkspaceDetectionService.detectAllWorkspaces();
            
            return {
                success: true,
                data: workspaces
            };
        } catch (error) {
            this.logger.error('Error detecting all workspaces:', error);
            throw error;
        }
    }

    async detectWorkspaceForIDE(port, userId) {
        try {
            this.logger.info('IDEApplicationService: Detecting workspace for IDE', { port, userId });
            
            const workspace = await this.ideManager.detectWorkspaceForIDE(port);
            
            return {
                success: true,
                data: { port, workspace }
            };
        } catch (error) {
            this.logger.error('Error detecting workspace for IDE:', error);
            throw error;
        }
    }

    async forceDetectWorkspaceForIDE(port, userId) {
        try {
            this.logger.info('IDEApplicationService: Force detecting workspace for IDE', { port, userId });
            
            const workspace = await this.ideManager.forceDetectWorkspacePath(port);
            
            return {
                success: true,
                data: { port, workspace }
            };
        } catch (error) {
            this.logger.error('Error force detecting workspace for IDE:', error);
            throw error;
        }
    }

    // ========== TERMINAL OPERATIONS ==========

    async executeTerminalCommand(port, command, userId) {
        try {
            this.logger.info('IDEApplicationService: Executing terminal command', { port, command: command?.substring(0, 50), userId });
            
            const result = await this.ideManager.executeTerminalCommand(port, command);
            
            return {
                success: true,
                data: { port, command, result }
            };
        } catch (error) {
            this.logger.error('Error executing terminal command:', error);
            throw error;
        }
    }

    async executeTerminalCommandWithCapture(port, command, userId) {
        try {
            this.logger.info('IDEApplicationService: Executing terminal command with capture', { port, command: command?.substring(0, 50), userId });
            
            // Initialize capture if not already done
            await this.terminalLogCaptureService.initialize();
            await this.terminalLogCaptureService.initializeCapture(parseInt(port));

            // Execute command with capture
            const result = await this.terminalLogCaptureService.executeCommandWithCapture(parseInt(port), command);
            
            return {
                success: true,
                data: { port: parseInt(port), command, result }
            };
        } catch (error) {
            this.logger.error('Error executing terminal command with capture:', error);
            throw error;
        }
    }

    async getTerminalLogs(port, lines = 50, userId) {
        try {
            this.logger.info('IDEApplicationService: Getting terminal logs', { port, lines, userId });
            
            const logs = await this.terminalLogReader.getRecentLogs(parseInt(port), parseInt(lines));
            
            return {
                success: true,
                data: { 
                    port: parseInt(port), 
                    lines: parseInt(lines), 
                    logs, 
                    count: logs.length 
                }
            };
        } catch (error) {
            this.logger.error('Error getting terminal logs:', error);
            throw error;
        }
    }

    async searchTerminalLogs(port, searchText, options = {}, userId) {
        try {
            this.logger.info('IDEApplicationService: Searching terminal logs', { port, searchText, userId });
            
            const results = await this.terminalLogReader.searchLogs(parseInt(port), searchText, options);
            
            return {
                success: true,
                data: { port: parseInt(port), searchText, results, count: results.length }
            };
        } catch (error) {
            this.logger.error('Error searching terminal logs:', error);
            throw error;
        }
    }

    async exportTerminalLogs(port, format = 'json', options = {}, userId) {
        try {
            this.logger.info('IDEApplicationService: Exporting terminal logs', { port, format, userId });
            
            const exportedData = await this.terminalLogReader.exportLogs(parseInt(port), format, options);
            
            return {
                success: true,
                data: { port: parseInt(port), format, exportedData }
            };
        } catch (error) {
            this.logger.error('Error exporting terminal logs:', error);
            throw error;
        }
    }

    async deleteTerminalLogs(port, userId) {
        try {
            this.logger.info('IDEApplicationService: Deleting terminal logs', { port, userId });
            
            await this.terminalLogCaptureService.stopCapture(parseInt(port));
            this.terminalLogReader.clearCache(parseInt(port));
            
            return {
                success: true,
                data: { port: parseInt(port), message: 'Terminal logs deleted and capture stopped' }
            };
        } catch (error) {
            this.logger.error('Error deleting terminal logs:', error);
            throw error;
        }
    }

    async getTerminalLogCaptureStatus(port, userId) {
        try {
            this.logger.info('IDEApplicationService: Getting terminal log capture status', { port, userId });
            
            const status = await this.terminalLogCaptureService.getCaptureStatus(parseInt(port));
            const statistics = await this.terminalLogReader.getLogStatistics(parseInt(port));
            
            return {
                success: true,
                data: { 
                    port: parseInt(port), 
                    captureStatus: status, 
                    statistics 
                }
            };
        } catch (error) {
            this.logger.error('Error getting terminal log capture status:', error);
            throw error;
        }
    }

    async initializeTerminalLogCapture(port, userId) {
        try {
            this.logger.info('IDEApplicationService: Initializing terminal log capture', { port, userId });
            
            await this.terminalLogCaptureService.initialize();
            const result = await this.terminalLogCaptureService.initializeCapture(parseInt(port));
            
            return {
                success: true,
                data: { port: parseInt(port), result }
            };
        } catch (error) {
            this.logger.error('Error initializing terminal log capture:', error);
            throw error;
        }
    }

    // REMOVED: Documentation tasks methods - MIGRATED TO TASKAPPLICATIONSERVICE

    // ========== USER APP OPERATIONS ==========

    async restartUserApp(port, userId) {
        try {
            this.logger.info('IDEApplicationService: Restarting user app', { port, userId });
            
            const result = await this.ideManager.restartUserApp(port);
            
            return {
                success: true,
                data: { port, result }
            };
        } catch (error) {
            this.logger.error('Error restarting user app:', error);
            throw error;
        }
    }

    async getUserAppUrl(port, userId) {
        try {
            this.logger.info('IDEApplicationService: Getting user app URL', { port, userId });
            
            const url = await this.ideManager.getUserAppUrl(port);
            
            return {
                success: true,
                data: { port, url }
            };
        } catch (error) {
            this.logger.error('Error getting user app URL:', error);
            throw error;
        }
    }

    async getUserAppUrlForPort(port, userId) {
        try {
            this.logger.info('IDEApplicationService: Getting user app URL for port', { port, userId });
            
            if (!this.cursorIDEService) {
                throw new Error('CursorIDEService not available');
            }
            
            const url = await this.cursorIDEService.getUserAppUrlForPort(port);
            const workspacePath = this.ideManager.getWorkspacePath(port);
            
            return {
                success: true,
                data: { 
                    url: url,
                    port: port,
                    workspacePath: workspacePath
                }
            };
        } catch (error) {
            this.logger.error('Error getting user app URL for port:', error);
            throw error;
        }
    }

    async monitorTerminal(userId) {
        try {
            this.logger.info('IDEApplicationService: Monitoring terminal', { userId });
            
            if (!this.cursorIDEService) {
                throw new Error('CursorIDEService not available');
            }
            
            const url = await this.cursorIDEService.monitorTerminalOutput();
            
            return {
                success: true,
                data: { url: url }
            };
        } catch (error) {
            this.logger.error('Error monitoring terminal:', error);
            throw error;
        }
    }

    // ========== VSCODE OPERATIONS ==========

    async startVSCode(workspacePath, userId) {
        try {
            this.logger.info('IDEApplicationService: Starting VSCode', { workspacePath, userId });
            
            if (!this.cursorIDEService) {
                throw new Error('VSCode service not available');
            }
            
            const result = await this.cursorIDEService.startVSCode(workspacePath);
            
            return {
                success: true,
                data: result
            };
        } catch (error) {
            this.logger.error('Error starting VSCode:', error);
            throw error;
        }
    }

    async getVSCodeExtensions(port, userId) {
        try {
            this.logger.info('IDEApplicationService: Getting VSCode extensions', { port, userId });
            
            if (!this.cursorIDEService) {
                throw new Error('VSCode service not available');
            }
            
            const extensions = await this.cursorIDEService.getExtensions(port);
            
            return {
                success: true,
                data: extensions
            };
        } catch (error) {
            this.logger.error('Error getting VSCode extensions:', error);
            throw error;
        }
    }

    async getVSCodeWorkspaceInfo(port, userId) {
        try {
            this.logger.info('IDEApplicationService: Getting VSCode workspace info', { port, userId });
            
            if (!this.cursorIDEService) {
                throw new Error('VSCode service not available');
            }
            
            const workspaceInfo = await this.ideManager.getWorkspaceInfo(port);
            
            return {
                success: true,
                data: workspaceInfo
            };
        } catch (error) {
            this.logger.error('Error getting VSCode workspace info:', error);
            throw error;
        }
    }

    async sendMessageToVSCode(message, extensionType = 'githubCopilot', port, userId) {
        try {
            this.logger.info('IDEApplicationService: Sending message to VSCode', { message: message?.substring(0, 50), extensionType, port, userId });
            
            if (!this.cursorIDEService) {
                throw new Error('VSCode service not available');
            }
            
            // Switch to specified port if provided
            if (port) {
                await this.cursorIDEService.switchToPort(port);
            }
            
            const result = await this.cursorIDEService.sendMessage(message, { extensionType });
            
            return {
                success: true,
                data: result
            };
        } catch (error) {
            this.logger.error('Error sending message to VSCode:', error);
            throw error;
        }
    }

    async getVSCodeStatus(port, userId) {
        try {
            this.logger.info('IDEApplicationService: Getting VSCode status', { port, userId });
            
            if (!this.cursorIDEService) {
                throw new Error('VSCode service not available');
            }
            
            const status = await this.cursorIDEService.getConnectionStatus('vscode-user');
            
            return {
                success: true,
                data: status
            };
        } catch (error) {
            this.logger.error('Error getting VSCode status:', error);
            throw error;
        }
    }

    // ========== DEBUGGING OPERATIONS ==========

    async debugDOM(userId) {
        try {
            this.logger.info('IDEApplicationService: Debug DOM operation', { userId });
            
            const debugInfo = await this.ideManager.debugDOM();
            
            return {
                success: true,
                data: debugInfo
            };
        } catch (error) {
            this.logger.error('Error debugging DOM:', error);
            throw error;
        }
    }

    async getDetectionStats(userId) {
        try {
            this.logger.info('IDEApplicationService: Getting detection stats', { userId });
            
            const stats = await this.ideManager.getDetectionStats();
            
            return {
                success: true,
                data: stats
            };
        } catch (error) {
            this.logger.error('Error getting detection stats:', error);
            throw error;
        }
    }

    async clearDetectionResults(userId) {
        try {
            this.logger.info('IDEApplicationService: Clearing detection results', { userId });
            
            const result = await this.ideManager.clearDetectionResults();
            
            return {
                success: true,
                data: result
            };
        } catch (error) {
            this.logger.error('Error clearing detection results:', error);
            throw error;
        }
    }

    // ========== SPECIAL OPERATIONS ==========

    async clickNewChat(userId) {
        try {
            this.logger.info('IDEApplicationService: Click new chat operation', { userId });
            
            const result = await this.ideManager.clickNewChat();
            
            return {
                success: true,
                data: result
            };
        } catch (error) {
            this.logger.error('Error clicking new chat:', error);
            throw error;
        }
    }
}

module.exports = IDEApplicationService; 