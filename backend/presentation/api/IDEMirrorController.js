const Logger = require('@logging/Logger');
const ServiceLogger = require('@logging/ServiceLogger');
const logger = new ServiceLogger('IDEMirrorController');


class IDEMirrorController {
    constructor(dependencies = {}) {
        this.ideMirrorApplicationService = dependencies.ideMirrorApplicationService;
        this.logger = dependencies.logger || logger;
        
        if (!this.ideMirrorApplicationService) {
            throw new Error('IDEMirrorController requires ideMirrorApplicationService dependency');
        }
        
        this.connectedClients = new Set();
        
        // Message queue for sequential processing
        this.messageQueue = [];
        this.isProcessingQueue = false;
        this.streamingController = null;
        this.screenshotStreamingService = null;
    }

    /**
     * Initialize streaming services
     * @param {Object} registry - Service registry
     */
    initializeStreamingServices(registry) {
        try {
            logger.info('Initializing streaming services...');
            
            // Get required services
            const browserManager = registry.getService('browserManager');
            logger.info('Browser manager available:', !!browserManager);
            
            const webSocketManager = registry.getService('webSocketManager');
            logger.info('WebSocket manager available:', !!webSocketManager);
            
            const eventBus = registry.getService('eventBus');
            logger.info('Event bus available:', !!eventBus);

            if (!browserManager) {
                throw new Error('Browser manager service not found');
            }
            
            if (!webSocketManager) {
                throw new Error('WebSocket manager service not found');
            }
            
            if (!eventBus) {
                throw new Error('Event bus service not found');
            }

            // Create screenshot streaming service
            this.screenshotStreamingService = new ScreenshotStreamingService(
                browserManager,
                webSocketManager,
                {
                    defaultFPS: 10,
                    maxFPS: 30,
                    defaultQuality: 0.8,
                    maxFrameSize: 50 * 1024
                }
            );

            // Create streaming controller
            this.streamingController = new StreamingController(
                this.screenshotStreamingService,
                eventBus
            );

            // Set streaming service in WebSocket manager
            if (webSocketManager) {
                webSocketManager.setScreenshotStreamingService(this.screenshotStreamingService);
            }

            logger.info('Streaming services initialized successfully');

        } catch (error) {
            logger.error('Error initializing streaming services:', error.message);
            logger.error('Error stack:', error.stack);
        }
    }

    // HTTP Endpoints
    async getIDEState(req, res) {
        try {
            const userId = req.user?.id;
            const result = await this.ideMirrorApplicationService.getIDEState(userId);
            const state = result.data;
            
            res.json({
                success: true,
                data: state,
                timestamp: Date.now()
            });
        } catch (error) {
            logger.error('❌ Failed to get IDE state:', error.message);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    async getAvailableIDEs(req, res) {
        try {
            const userId = req.user?.id;
            const result = await this.ideMirrorApplicationService.getAvailableIDEs(userId);
            const { ides, activeIDE } = result.data;
            
            // Mark active IDE
            const idesWithStatus = ides.map(ide => ({
                ...ide,
                status: ide.port === activeIDE?.port ? 'active' : ide.status
            }));
            
            res.json({
                success: true,
                data: idesWithStatus
            });
        } catch (error) {
            logger.error('❌ Failed to get available IDEs:', error.message);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    async clickElement(req, res) {
        try {
            const { selector, coordinates } = req.body;

            if (!selector && !coordinates) {
                return res.status(400).json({
                    success: false,
                    error: 'Either selector or coordinates required'
                });
            }

            const userId = req.user?.id;
            const result = await this.ideMirrorApplicationService.clickElement(selector, coordinates, userId);
            
            // Wait a bit for the IDE to update
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Get new state
            const newState = result.data.newState;
            
            // Notify all connected WebSocket clients
            this.broadcastToClients('ide-state-updated', newState);

            res.json({
                success: true,
                data: newState,
                action: 'click',
                target: selector || `${coordinates.x},${coordinates.y}`
            });
        } catch (error) {
            logger.error('❌ Failed to click element:', error.message);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    async switchIDE(req, res) {
        try {
            const { port } = req.body;
            
            if (!port) {
                return res.status(400).json({
                    success: false,
                    error: 'Port is required'
                });
            }

            const userId = req.user?.id;
            const result = await this.ideMirrorApplicationService.switchIDE(port, userId);
            
            // Get new state
            const newState = result.data.newState;
            this.broadcastToClients('ide-state-updated', newState);

            res.json({
                success: true,
                message: `Switched to IDE on port ${port}`,
                data: newState
            });
        } catch (error) {
            logger.error('❌ Failed to switch IDE:', error.message);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    async connectToIDE(req, res) {
        try {
            const userId = req.user?.id;
            const result = await this.ideMirrorApplicationService.connectToIDE(userId);
            const state = result.data.state;
            
            res.json({
                success: true,
                message: 'Connected to IDE',
                data: state
            });
        } catch (error) {
            logger.error('❌ Failed to connect to IDE:', error.message);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    async typeText(req, res) {
        try {
            const { text, selector } = req.body;

            if (!text) {
                return res.status(400).json({
                    success: false,
                    error: 'Text is required'
                });
            }

            const userId = req.user?.id;
            const result = await this.ideMirrorApplicationService.typeText(text, selector, userId);
            
            // Wait for IDE to update
            await new Promise(resolve => setTimeout(resolve, 300));
            
            // Get new state
            const newState = result.data.newState;
            this.broadcastToClients('ide-state-updated', newState);

            res.json({
                success: true,
                data: newState,
                action: 'type',
                text: text.substring(0, 50)
            });
        } catch (error) {
            logger.error('❌ Failed to type text:', error.message);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    async focusAndType(req, res) {
        try {
            const { selector, text, clearFirst = false } = req.body;

            if (!selector || !text) {
                return res.status(400).json({
                    success: false,
                    error: 'Selector and text are required'
                });
            }

            const userId = req.user?.id;
            const result = await this.ideMirrorApplicationService.focusAndType(selector, text, clearFirst, userId);
            
            // Wait for IDE to update
            await new Promise(resolve => setTimeout(resolve, 300));
            
            // Get new state
            const newState = result.data.newState;
            this.broadcastToClients('ide-state-updated', newState);

            res.json({
                success: true,
                data: newState,
                action: 'focus-and-type',
                target: selector,
                text: text.substring(0, 50)
            });
        } catch (error) {
            logger.error('❌ Failed to focus and type:', error.message);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    async sendChatMessage(req, res) {
        try {
            const { message } = req.body;

            if (!message) {
                return res.status(400).json({
                    success: false,
                    error: 'Message is required'
                });
            }

            const userId = req.user?.id;
            const result = await this.ideMirrorApplicationService.sendChatMessage(message, userId);
            
            // Wait for response
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Get new state
            const newState = result.data.newState;
            this.broadcastToClients('ide-state-updated', newState);

            res.json({
                success: true,
                data: newState,
                action: 'chat-message',
                message: message.substring(0, 50)
            });
        } catch (error) {
            logger.error('❌ Failed to send chat message:', error.message);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    // WebSocket Event Handlers
    handleWebSocketConnection(ws) {
        logger.info('🔌 IDE Mirror client connected');
        this.connectedClients.add(ws);

        ws.on('message', async (message) => {
            try {
                const data = JSON.parse(message);
                await this.handleWebSocketMessage(ws, data);
            } catch (error) {
                logger.error('❌ WebSocket message error:', error.message);
                ws.send(JSON.stringify({
                    type: 'error',
                    message: error.message
                }));
            }
        });

        ws.on('close', () => {
            logger.info('🔌 IDE Mirror client disconnected');
            this.connectedClients.delete(ws);
        });

        // Send initial IDE state if connected
        this.ideMirrorApplicationService.isIDEConnected()
            .then(result => {
                if (result.data.connected) {
                    return this.ideMirrorApplicationService.refreshIDEState(ws.userId);
                }
            })
            .then(result => {
                if (result) {
                    ws.send(JSON.stringify({
                        type: 'ide-state-updated',
                        data: result.data.state
                    }));
                }
            })
            .catch(error => {
                ws.send(JSON.stringify({
                    type: 'error',
                    message: 'Failed to get initial IDE state'
                }));
            });
    }

    async handleWebSocketMessage(ws, data) {
        const { type, payload } = data;

        // For typing messages, use queue to ensure order
        if (type === 'type-text') {
            this.messageQueue.push({ ws, data });
            if (!this.isProcessingQueue) {
                this.processMessageQueue();
            }
            return;
        }

        // Other messages process normally
        switch (type) {
            case 'click-element':
                await this.handleWebSocketClick(ws, payload);
                break;
                
            case 'type-batch':
                await this.handleWebSocketTypeBatch(ws, payload);
                break;
                
            case 'focus-and-type':
                await this.handleWebSocketFocusAndType(ws, payload);
                break;
                
            case 'send-chat-message':
                await this.handleWebSocketChatMessage(ws, payload);
                break;
            
            case 'refresh-ide':
                await this.handleWebSocketRefresh(ws);
                break;
            
            case 'connect-ide':
                await this.handleWebSocketConnect(ws);
                break;

            case 'switch-ide':
                await this.handleWebSocketSwitch(ws, payload);
                break;
            
            default:
                ws.send(JSON.stringify({
                    type: 'error',
                    message: `Unknown message type: ${type}`
                }));
        }
    }

    async processMessageQueue() {
        if (this.isProcessingQueue) return;
        this.isProcessingQueue = true;

        try {
            let processedCount = 0;
            const batchSize = 5; // Process in small batches for responsiveness
            
            while (this.messageQueue.length > 0) {
                const { ws, data } = this.messageQueue.shift();
                
                try {
                    await this.handleWebSocketType(ws, data.payload);
                    processedCount++;
                    
                    // Adaptive delay - faster for rapid typing
                    const isRapidTyping = this.messageQueue.length > 3;
                    const delay = isRapidTyping ? 15 : 30;
                    await new Promise(resolve => setTimeout(resolve, delay));
                    
                    // Take a breather every batch to keep UI responsive
                    if (processedCount % batchSize === 0 && this.messageQueue.length > 0) {
                        await new Promise(resolve => setTimeout(resolve, 5));
                    }
                    
                } catch (error) {
                    logger.error('❌ Queue processing error:', error.message);
                    
                    // If it's a connection error, clear the queue and stop
                    if (error.message.includes('closed') || error.message.includes('disconnected')) {
                        logger.info('🧹 Clearing message queue due to connection error');
                        this.messageQueue = [];
                        break;
                    }
                    
                    // For other errors, continue with next message
                    continue;
                }
            }
            
            logger.info(`⚡ Processed ${processedCount} keystrokes in queue`);
        } finally {
            this.isProcessingQueue = false;
        }
    }

    async handleWebSocketClick(ws, payload) {
        const { selector, coordinates } = payload;
        
        logger.info(`🖱️ Processing click: ${selector}`);
        const result = await this.ideMirrorApplicationService.clickElement(selector, coordinates, ws.userId);
        
        // Wait for UI changes
        await new Promise(resolve => setTimeout(resolve, 300));
        
        const newState = result.data.newState;
        this.broadcastToClients('ide-state-updated', newState);
        logger.info(`📸 Screenshot updated after click: ${selector}`);
    }

    async handleWebSocketType(ws, payload) {
        const { text, selector, key, modifiers } = payload;
        
        logger.info(`⌨️ Processing keystroke: ${key || text} for ${selector}`);
        const result = await this.ideMirrorApplicationService.typeTextAdvanced(text, selector, key, modifiers, ws.userId);
        
        // Smart screenshot timing - only when truly needed
        const shouldUpdateScreenshot = (
            key === 'Enter' ||     // Messages sent, new lines
            key === 'Escape' ||    // Mode changes 
            key === 'Tab' ||       // Autocomplete, navigation
            (key && key.startsWith('Arrow')) || // Cursor movement
            (key && key.startsWith('F')) ||     // Function keys
            (modifiers && (modifiers.ctrlKey || modifiers.metaKey)) || // Shortcuts
            this.isEndOfWord(text) // End of word for autocomplete
        );
        
        if (shouldUpdateScreenshot) {
            // Minimal delay for critical updates
            await new Promise(resolve => setTimeout(resolve, 150));
            
            const newState = result.data.newState;
            this.broadcastToClients('ide-state-updated', newState);
            logger.info(`📸 Screenshot updated for key: ${key}`);
        } else {
            logger.info(`⏩ Skipping screenshot for: ${key || text}`);
            
            // Send lightweight typing confirmation without screenshot
            this.broadcastToClients('typing-confirmed', {
                key: key || text,
                selector: selector,
                timestamp: Date.now()
            });
        }
    }

    async handleWebSocketTypeBatch(ws, payload) {
        const { text, selector } = payload;
        
        logger.info(`⚡ Processing batch: "${text}" (${text.length} chars) for ${selector}`);
        
        // Send entire batch at once - much faster than individual keystrokes
        const result = await this.ideMirrorApplicationService.typeText(text, selector, ws.userId);
        
        // Always update screenshot after batch (user expects to see result)
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const newState = result.data.newState;
        this.broadcastToClients('ide-state-updated', newState);
        logger.info('Screenshot updated after batch', {
            textLength: text.length,
            batchSize: result.data.batchSize
        });
    }

    isEndOfWord(text) {
        return text && (text === ' ' || text === '.' || text === ',' || text === ';');
    }

    async handleWebSocketFocusAndType(ws, payload) {
        const { selector, text, clearFirst = false } = payload;
        
        const result = await this.ideMirrorApplicationService.focusAndType(selector, text, clearFirst, ws.userId);
        await new Promise(resolve => setTimeout(resolve, 300));
        
        const newState = result.data.newState;
        this.broadcastToClients('ide-state-updated', newState);
    }

    async handleWebSocketChatMessage(ws, payload) {
        const { message } = payload;
        
        const result = await this.ideMirrorApplicationService.sendChatMessage(message, ws.userId);
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const newState = result.data.newState;
        this.broadcastToClients('ide-state-updated', newState);
    }

    async handleWebSocketRefresh(ws) {
        const result = await this.ideMirrorApplicationService.handleWebSocketInteraction('refresh', {}, ws.userId);
        const state = result.data.state;
        this.broadcastToClients('ide-state-updated', state);
    }

    async handleWebSocketConnect(ws) {
        const result = await this.ideMirrorApplicationService.handleWebSocketInteraction('connect', {}, ws.userId);
        const state = result.data.state;
        
        ws.send(JSON.stringify({
            type: 'ide-connected',
            data: state
        }));
    }

    async handleWebSocketSwitch(ws, payload) {
        const { port } = payload;
        
        const result = await this.ideMirrorApplicationService.switchIDE(port, ws.userId);
        const state = result.data.newState;
        
        this.broadcastToClients('ide-state-updated', state);
    }

    broadcastToClients(type, data) {
        const message = JSON.stringify({ type, data });
        
        this.connectedClients.forEach(client => {
            if (client.readyState === 1) { // WebSocket.OPEN
                client.send(message);
            }
        });
    }

    // Route setup method
    setupRoutes(app) {
        logger.info('Setting up routes...');
        logger.info('Streaming controller available:', !!this.streamingController);
        
        // HTTP API Routes
        app.get('/api/ide-mirror/state', this.getIDEState.bind(this));
        app.get('/api/ide-mirror/ides', this.getAvailableIDEs.bind(this));
        app.post('/api/ide-mirror/click', this.clickElement.bind(this));
        app.post('/api/ide-mirror/type', this.typeText.bind(this));
        app.post('/api/ide-mirror/focus-and-type', this.focusAndType.bind(this));
        app.post('/api/ide-mirror/chat', this.sendChatMessage.bind(this));
        app.post('/api/ide-mirror/connect', this.connectToIDE.bind(this));
        app.post('/api/ide-mirror/switch', this.switchIDE.bind(this));

        // Streaming endpoints (port-based)
        if (this.streamingController) {
            logger.info('Registering port-based streaming routes...');
            
            // Port-specific streaming routes
            app.post('/api/ide-mirror/:port/stream/start', (req, res) => this.streamingController.startStreaming(req, res));
            app.post('/api/ide-mirror/:port/stream/stop', (req, res) => this.streamingController.stopStreaming(req, res));
            app.get('/api/ide-mirror/:port/stream/status', (req, res) => this.streamingController.getPortStatus(req, res));
            app.put('/api/ide-mirror/:port/stream/config', (req, res) => this.streamingController.updatePortConfig(req, res));
            app.post('/api/ide-mirror/:port/stream/pause', (req, res) => this.streamingController.pauseStreaming(req, res));
            app.post('/api/ide-mirror/:port/stream/resume', (req, res) => this.streamingController.resumeStreaming(req, res));

            // Global streaming routes
            app.get('/api/ide-mirror/stream/ports', (req, res) => this.streamingController.getAllPorts(req, res));
            app.get('/api/ide-mirror/stream/stats', (req, res) => this.streamingController.getStats(req, res));
            app.post('/api/ide-mirror/stream/stop-all', (req, res) => this.streamingController.stopAllStreaming(req, res));
            app.get('/api/ide-mirror/stream/health', (req, res) => this.streamingController.healthCheck(req, res));
            
            logger.info('Port-based streaming routes registered successfully');
        } else {
            logger.info('Streaming controller not available, skipping streaming routes');
        }
    }
}

module.exports = IDEMirrorController; 