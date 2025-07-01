const IDEMirrorService = require('../../domain/services/IDEMirrorService');

class IDEMirrorController {
    constructor() {
        this.ideMirrorService = new IDEMirrorService();
        this.connectedClients = new Set();
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

        switch (type) {
            case 'click-element':
                await this.handleWebSocketClick(ws, payload);
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

    async handleWebSocketClick(ws, payload) {
        const { selector, coordinates } = payload;
        
        if (!this.ideMirrorService.isIDEConnected()) {
            await this.ideMirrorService.connectToIDE();
        }

        await this.ideMirrorService.clickElementInIDE(selector, coordinates);
        await new Promise(resolve => setTimeout(resolve, 500));
        
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
        app.post('/api/ide-mirror/connect', this.connectToIDE.bind(this));
        app.post('/api/ide-mirror/switch', this.switchIDE.bind(this));
    }
}

module.exports = IDEMirrorController; 