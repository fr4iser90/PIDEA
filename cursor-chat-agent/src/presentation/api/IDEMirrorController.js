const IDEMirrorService = require('../../domain/services/IDEMirrorService');

class IDEMirrorController {
    constructor() {
        this.ideMirrorService = new IDEMirrorService();
        this.connectedClients = new Set();
        
        // Message queue for sequential processing
        this.messageQueue = [];
        this.isProcessingQueue = false;
    }

    // HTTP Endpoints
    async getIDEState(req, res) {
        try {
            if (!this.ideMirrorService.isIDEConnected()) {
                await this.ideMirrorService.connectToIDE();
            }

            const state = await this.ideMirrorService.captureCompleteIDEState();
            
            res.json({
                success: true,
                data: state,
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('❌ Failed to get IDE state:', error.message);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    async getAvailableIDEs(req, res) {
        try {
            const ides = await this.ideMirrorService.getAvailableIDEs();
            const activeIDE = await this.ideMirrorService.getActiveIDE();
            
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
            console.error('❌ Failed to get available IDEs:', error.message);
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

            if (!this.ideMirrorService.isIDEConnected()) {
                await this.ideMirrorService.connectToIDE();
            }

            await this.ideMirrorService.clickElementInIDE(selector, coordinates);
            
            // Wait a bit for the IDE to update
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Get new state
            const newState = await this.ideMirrorService.captureCompleteIDEState();
            
            // Notify all connected WebSocket clients
            this.broadcastToClients('ide-state-updated', newState);

            res.json({
                success: true,
                data: newState,
                action: 'click',
                target: selector || `${coordinates.x},${coordinates.y}`
            });
        } catch (error) {
            console.error('❌ Failed to click element:', error.message);
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

            await this.ideMirrorService.switchToIDE(port);
            
            // Get new state
            const newState = await this.ideMirrorService.captureCompleteIDEState();
            this.broadcastToClients('ide-state-updated', newState);

            res.json({
                success: true,
                message: `Switched to IDE on port ${port}`,
                data: newState
            });
        } catch (error) {
            console.error('❌ Failed to switch IDE:', error.message);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    async connectToIDE(req, res) {
        try {
            await this.ideMirrorService.connectToIDE();
            const state = await this.ideMirrorService.captureCompleteIDEState();
            
            res.json({
                success: true,
                message: 'Connected to IDE',
                data: state
            });
        } catch (error) {
            console.error('❌ Failed to connect to IDE:', error.message);
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

            if (!this.ideMirrorService.isIDEConnected()) {
                await this.ideMirrorService.connectToIDE();
            }

            await this.ideMirrorService.typeInIDE(text, selector);
            
            // Wait for IDE to update
            await new Promise(resolve => setTimeout(resolve, 300));
            
            // Get new state
            const newState = await this.ideMirrorService.captureCompleteIDEState();
            this.broadcastToClients('ide-state-updated', newState);

            res.json({
                success: true,
                data: newState,
                action: 'type',
                text: text.substring(0, 50)
            });
        } catch (error) {
            console.error('❌ Failed to type text:', error.message);
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

            if (!this.ideMirrorService.isIDEConnected()) {
                await this.ideMirrorService.connectToIDE();
            }

            await this.ideMirrorService.focusAndTypeInIDE(selector, text, clearFirst);
            
            // Wait for IDE to update
            await new Promise(resolve => setTimeout(resolve, 300));
            
            // Get new state
            const newState = await this.ideMirrorService.captureCompleteIDEState();
            this.broadcastToClients('ide-state-updated', newState);

            res.json({
                success: true,
                data: newState,
                action: 'focus-and-type',
                target: selector,
                text: text.substring(0, 50)
            });
        } catch (error) {
            console.error('❌ Failed to focus and type:', error.message);
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

            if (!this.ideMirrorService.isIDEConnected()) {
                await this.ideMirrorService.connectToIDE();
            }

            await this.ideMirrorService.sendChatMessage(message);
            
            // Wait for response
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Get new state
            const newState = await this.ideMirrorService.captureCompleteIDEState();
            this.broadcastToClients('ide-state-updated', newState);

            res.json({
                success: true,
                data: newState,
                action: 'chat-message',
                message: message.substring(0, 50)
            });
        } catch (error) {
            console.error('❌ Failed to send chat message:', error.message);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    // WebSocket Event Handlers
    handleWebSocketConnection(ws) {
        console.log('🔌 IDE Mirror client connected');
        this.connectedClients.add(ws);

        ws.on('message', async (message) => {
            try {
                const data = JSON.parse(message);
                await this.handleWebSocketMessage(ws, data);
            } catch (error) {
                console.error('❌ WebSocket message error:', error.message);
                ws.send(JSON.stringify({
                    type: 'error',
                    message: error.message
                }));
            }
        });

        ws.on('close', () => {
            console.log('🔌 IDE Mirror client disconnected');
            this.connectedClients.delete(ws);
        });

        // Send initial IDE state if connected
        if (this.ideMirrorService.isIDEConnected()) {
            this.ideMirrorService.captureCompleteIDEState()
                .then(state => {
                    ws.send(JSON.stringify({
                        type: 'ide-state-updated',
                        data: state
                    }));
                })
                .catch(error => {
                    ws.send(JSON.stringify({
                        type: 'error',
                        message: 'Failed to get initial IDE state'
                    }));
                });
        }
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
            while (this.messageQueue.length > 0) {
                const { ws, data } = this.messageQueue.shift();
                
                try {
                    await this.handleWebSocketType(ws, data.payload);
                    
                    // Small delay between characters for stability
                    await new Promise(resolve => setTimeout(resolve, 30));
                } catch (error) {
                    console.error('❌ Queue processing error:', error.message);
                    
                    // If it's a connection error, clear the queue and stop
                    if (error.message.includes('closed') || error.message.includes('disconnected')) {
                        console.log('🧹 Clearing message queue due to connection error');
                        this.messageQueue = [];
                        break;
                    }
                    
                    // For other errors, continue with next message
                    continue;
                }
            }
        } finally {
            this.isProcessingQueue = false;
        }
    }

    async handleWebSocketClick(ws, payload) {
        const { selector, coordinates } = payload;
        
        if (!this.ideMirrorService.isIDEConnected()) {
            await this.ideMirrorService.connectToIDE();
        }

        console.log(`🖱️ Processing click: ${selector}`);
        await this.ideMirrorService.clickElementInIDE(selector, coordinates);
        
        // Wait for UI changes
        await new Promise(resolve => setTimeout(resolve, 300));
        
        const newState = await this.ideMirrorService.captureCompleteIDEState();
        this.broadcastToClients('ide-state-updated', newState);
        console.log(`📸 Screenshot updated after click: ${selector}`);
    }

    async handleWebSocketType(ws, payload) {
        const { text, selector, key, modifiers } = payload;
        
        if (!this.ideMirrorService.isIDEConnected()) {
            await this.ideMirrorService.connectToIDE();
        }

        console.log(`⌨️ Processing keystroke: ${key || text} for ${selector}`);
        await this.ideMirrorService.typeInIDE(text, selector, key, modifiers);
        
        // Only capture screenshots for significant events to reduce load
        const shouldUpdateScreenshot = (
            key === 'Enter' || 
            key === 'Tab' || 
            key === 'Escape' ||
            (key && key.includes('Arrow')) ||
            (modifiers && (modifiers.ctrlKey || modifiers.metaKey))
        );
        
        if (shouldUpdateScreenshot) {
            // Small delay for IDE to update
            await new Promise(resolve => setTimeout(resolve, 200));
            
            const newState = await this.ideMirrorService.captureCompleteIDEState();
            this.broadcastToClients('ide-state-updated', newState);
            console.log(`📸 Screenshot updated for key: ${key}`);
        } else {
            console.log(`⏩ Skipping screenshot for: ${key || text}`);
        }
    }

    async handleWebSocketFocusAndType(ws, payload) {
        const { selector, text, clearFirst = false } = payload;
        
        if (!this.ideMirrorService.isIDEConnected()) {
            await this.ideMirrorService.connectToIDE();
        }

        await this.ideMirrorService.focusAndTypeInIDE(selector, text, clearFirst);
        await new Promise(resolve => setTimeout(resolve, 300));
        
        const newState = await this.ideMirrorService.captureCompleteIDEState();
        this.broadcastToClients('ide-state-updated', newState);
    }

    async handleWebSocketChatMessage(ws, payload) {
        const { message } = payload;
        
        if (!this.ideMirrorService.isIDEConnected()) {
            await this.ideMirrorService.connectToIDE();
        }

        await this.ideMirrorService.sendChatMessage(message);
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const newState = await this.ideMirrorService.captureCompleteIDEState();
        this.broadcastToClients('ide-state-updated', newState);
    }

    async handleWebSocketRefresh(ws) {
        if (!this.ideMirrorService.isIDEConnected()) {
            await this.ideMirrorService.connectToIDE();
        }

        const state = await this.ideMirrorService.captureCompleteIDEState();
        this.broadcastToClients('ide-state-updated', state);
    }

    async handleWebSocketConnect(ws) {
        await this.ideMirrorService.connectToIDE();
        const state = await this.ideMirrorService.captureCompleteIDEState();
        
        ws.send(JSON.stringify({
            type: 'ide-connected',
            data: state
        }));
    }

    async handleWebSocketSwitch(ws, payload) {
        const { port } = payload;
        
        await this.ideMirrorService.switchToIDE(port);
        const state = await this.ideMirrorService.captureCompleteIDEState();
        
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
        // HTTP API Routes
        app.get('/api/ide-mirror/state', this.getIDEState.bind(this));
        app.get('/api/ide-mirror/ides', this.getAvailableIDEs.bind(this));
        app.post('/api/ide-mirror/click', this.clickElement.bind(this));
        app.post('/api/ide-mirror/type', this.typeText.bind(this));
        app.post('/api/ide-mirror/focus-and-type', this.focusAndType.bind(this));
        app.post('/api/ide-mirror/chat', this.sendChatMessage.bind(this));
        app.post('/api/ide-mirror/connect', this.connectToIDE.bind(this));
        app.post('/api/ide-mirror/switch', this.switchIDE.bind(this));
    }
}

module.exports = IDEMirrorController; 