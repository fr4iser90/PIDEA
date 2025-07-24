/**
 * IDEMirrorApplicationService - Application layer service for IDE mirror operations
 * 
 * RESPONSIBILITIES:
 * ✅ Coordinate IDE mirror and automation use cases
 * ✅ Handle IDE state capture and management
 * ✅ Manage IDE interaction operations (click, type, focus)
 * ✅ Orchestrate IDE switching and connection management
 * ✅ Handle chat message sending through IDE
 * 
 * LAYER COMPLIANCE:
 * ✅ Application layer - coordinates between Presentation and Domain
 * ✅ Uses Domain services and Infrastructure through interfaces
 * ✅ Handles WebSocket coordination and IDE automation workflows
 */
const IDEMirrorService = require('@domain/services/ide/IDEMirrorService');
const Logger = require('@logging/Logger');

class IDEMirrorApplicationService {
    constructor(dependencies = {}) {
        this.ideMirrorService = dependencies.ideMirrorService || new IDEMirrorService();
        this.logger = dependencies.logger || new Logger('IDEMirrorApplicationService');
        this.eventBus = dependencies.eventBus;
    }

    async getIDEState(userId) {
        try {
            // // // this.logger.info('IDEMirrorApplicationService: Getting IDE state', { userId });
            
            if (!this.ideMirrorService.isIDEConnected()) {
                await this.ideMirrorService.connectToIDE();
            }

            const state = await this.ideMirrorService.captureCompleteIDEState();
            
            return {
                success: true,
                data: state
            };
        } catch (error) {
            this.logger.error('Error getting IDE state:', error);
            throw error;
        }
    }

    async getAvailableIDEs(userId) {
        try {
            // // // this.logger.info('IDEMirrorApplicationService: Getting available IDEs', { userId });
            
            const ides = await this.ideMirrorService.getAvailableIDEs();
            const activeIDE = await this.ideMirrorService.getActiveIDE();
            
            return {
                success: true,
                data: {
                    ides,
                    activeIDE
                }
            };
        } catch (error) {
            this.logger.error('Error getting available IDEs:', error);
            throw error;
        }
    }

    async clickElement(selector, coordinates, userId) {
        try {
            this.logger.info('IDEMirrorApplicationService: Clicking element', { selector, coordinates, userId });
            
            if (!this.ideMirrorService.isIDEConnected()) {
                await this.ideMirrorService.connectToIDE();
            }

            await this.ideMirrorService.clickElementInIDE(selector, coordinates);
            const newState = await this.ideMirrorService.captureCompleteIDEState();
            
            return {
                success: true,
                data: { newState }
            };
        } catch (error) {
            this.logger.error('Error clicking element:', error);
            throw error;
        }
    }

    async switchIDE(port, userId) {
        try {
            this.logger.info('IDEMirrorApplicationService: Switching IDE', { port, userId });
            
            await this.ideMirrorService.switchToIDE(port);
            const newState = await this.ideMirrorService.captureCompleteIDEState();
            
            return {
                success: true,
                data: { newState, port }
            };
        } catch (error) {
            this.logger.error('Error switching IDE:', error);
            throw error;
        }
    }

    async connectToIDE(userId) {
        try {
            this.logger.info('IDEMirrorApplicationService: Connecting to IDE', { userId });
            
            await this.ideMirrorService.connectToIDE();
            const state = await this.ideMirrorService.captureCompleteIDEState();
            
            return {
                success: true,
                data: { state, connected: true }
            };
        } catch (error) {
            this.logger.error('Error connecting to IDE:', error);
            throw error;
        }
    }

    async typeText(text, selector, userId) {
        try {
            this.logger.info('IDEMirrorApplicationService: Typing text', { text: text?.substring(0, 50), selector, userId });
            
            if (!this.ideMirrorService.isIDEConnected()) {
                await this.ideMirrorService.connectToIDE();
            }

            await this.ideMirrorService.typeInIDE(text, selector);
            const newState = await this.ideMirrorService.captureCompleteIDEState();
            
            return {
                success: true,
                data: { newState }
            };
        } catch (error) {
            this.logger.error('Error typing text:', error);
            throw error;
        }
    }

    async focusAndType(selector, text, clearFirst, userId) {
        try {
            this.logger.info('IDEMirrorApplicationService: Focus and type', { selector, text: text?.substring(0, 50), clearFirst, userId });
            
            if (!this.ideMirrorService.isIDEConnected()) {
                await this.ideMirrorService.connectToIDE();
            }

            await this.ideMirrorService.focusAndTypeInIDE(selector, text, clearFirst);
            const newState = await this.ideMirrorService.captureCompleteIDEState();
            
            return {
                success: true,
                data: { newState }
            };
        } catch (error) {
            this.logger.error('Error focus and type:', error);
            throw error;
        }
    }

    async sendChatMessage(message, userId) {
        try {
            this.logger.info('IDEMirrorApplicationService: Sending chat message', { message: message?.substring(0, 50), userId });
            
            if (!this.ideMirrorService.isIDEConnected()) {
                await this.ideMirrorService.connectToIDE();
            }

            await this.ideMirrorService.sendChatMessage(message);
            const newState = await this.ideMirrorService.captureCompleteIDEState();
            
            return {
                success: true,
                data: { newState }
            };
        } catch (error) {
            this.logger.error('Error sending chat message:', error);
            throw error;
        }
    }

    async typeTextAdvanced(text, selector, key, modifiers, userId) {
        try {
            this.logger.info('IDEMirrorApplicationService: Typing text advanced', { text: text?.substring(0, 50), selector, key, userId });
            
            if (!this.ideMirrorService.isIDEConnected()) {
                await this.ideMirrorService.connectToIDE();
            }

            await this.ideMirrorService.typeInIDE(text, selector, key, modifiers);
            const newState = await this.ideMirrorService.captureCompleteIDEState();
            
            return {
                success: true,
                data: { newState }
            };
        } catch (error) {
            this.logger.error('Error typing text advanced:', error);
            throw error;
        }
    }

    async refreshIDEState(userId) {
        try {
            this.logger.info('IDEMirrorApplicationService: Refreshing IDE state', { userId });
            
            if (!this.ideMirrorService.isIDEConnected()) {
                await this.ideMirrorService.connectToIDE();
            }

            const state = await this.ideMirrorService.captureCompleteIDEState();
            
            return {
                success: true,
                data: { state }
            };
        } catch (error) {
            this.logger.error('Error refreshing IDE state:', error);
            throw error;
        }
    }

    async isIDEConnected() {
        try {
            return {
                success: true,
                data: { connected: this.ideMirrorService.isIDEConnected() }
            };
        } catch (error) {
            this.logger.error('Error checking IDE connection:', error);
            throw error;
        }
    }

    // WebSocket-specific operations
    async handleWebSocketInteraction(type, payload, userId) {
        try {
            this.logger.info('IDEMirrorApplicationService: Handling WebSocket interaction', { type, userId });
            
            switch (type) {
                case 'click':
                    return await this.clickElement(payload.selector, payload.coordinates, userId);
                case 'type':
                    return await this.typeTextAdvanced(payload.text, payload.selector, payload.key, payload.modifiers, userId);
                case 'typeBatch':
                    return await this.typeText(payload.text, payload.selector, userId);
                case 'focusAndType':
                    return await this.focusAndType(payload.selector, payload.text, payload.clearFirst, userId);
                case 'chatMessage':
                    return await this.sendChatMessage(payload.message, userId);
                case 'refresh':
                    return await this.refreshIDEState(userId);
                case 'connect':
                    return await this.connectToIDE(userId);
                case 'switch':
                    return await this.switchIDE(payload.port, userId);
                default:
                    throw new Error(`Unknown WebSocket interaction type: ${type}`);
            }
        } catch (error) {
            this.logger.error('Error handling WebSocket interaction:', error);
            throw error;
        }
    }
}

module.exports = IDEMirrorApplicationService; 