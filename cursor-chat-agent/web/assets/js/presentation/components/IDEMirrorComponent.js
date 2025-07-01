class IDEMirrorComponent {
    constructor(containerId, eventBus) {
        this.container = document.getElementById(containerId);
        this.eventBus = eventBus;
        this.ws = null;
        this.currentState = null;
        this.isConnected = false;
        
        this.init();
    }

    init() {
        console.log('🔄 IDEMirrorComponent initializing...');
        this.setupWebSocket();
        this.setupEventListeners();
        
        // Auto-connect after short delay
        setTimeout(() => {
            this.connectToIDE();
        }, 1000);
    }

    setupWebSocket() {
        const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${location.host}`;
        
        console.log('🔌 IDEMirrorComponent: Connecting to WebSocket:', wsUrl);
        console.log('🔍 IDEMirrorComponent: Container element:', this.container);
        this.showStatus('Connecting to WebSocket...');

        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
            console.log('✅ WebSocket connected');
            this.isConnected = true;
            this.showStatus('Connected - Loading IDE...');
            this.connectToIDE();
        };

        this.ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                this.handleWebSocketMessage(message);
            } catch (error) {
                console.error('❌ Failed to parse WebSocket message:', error);
            }
        };

        this.ws.onclose = () => {
            console.log('🔌 WebSocket disconnected');
            this.isConnected = false;
            this.showStatus('Disconnected - Reconnecting...');
            
            // Auto-reconnect
            setTimeout(() => this.setupWebSocket(), 3000);
        };

        this.ws.onerror = (error) => {
            console.error('❌ WebSocket error:', error);
            this.showStatus('Connection Error');
        };
    }

    handleWebSocketMessage(message) {
        console.log('📥 WebSocket message:', message.type);
        const { type, data } = message;

        switch (type) {
            case 'ide-state-updated':
            case 'ide-connected':
                console.log('🖥️ IDE state received, rendering...');
                this.renderIDEState(data);
                break;
            
            case 'error':
                console.error('❌ IDE Error:', message.message || message.error);
                this.showError(message.message || message.error);
                break;
        }
    }

    async connectToIDE() {
        console.log('🔌 Connecting to IDE via API...');
        this.showStatus('Connecting to Cursor IDE...');
        
        try {
            // First try via WebSocket
            if (this.isConnected) {
                this.ws.send(JSON.stringify({ type: 'connect-ide' }));
            }
            
            // Also try direct API call
            const response = await fetch('/api/ide-mirror/connect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            
            const result = await response.json();
            if (result.success && result.data) {
                console.log('✅ IDE connected via API');
                this.renderIDEState(result.data);
            } else {
                throw new Error(result.error || 'Failed to connect to IDE');
            }
        } catch (error) {
            console.error('❌ Failed to connect to IDE:', error);
            this.showError(`Failed to connect: ${error.message}`);
        }
    }

    renderIDEState(ideState) {
        if (!ideState || !ideState.body) {
            console.error('❌ Invalid IDE state received:', ideState);
            this.showError('Invalid IDE state received');
            return;
        }

        console.log('🎨 Rendering IDE state...', ideState);
        this.currentState = ideState;
        
        const mirrorHTML = this.generateMirrorHTML(ideState.body);
        
        this.container.innerHTML = `
            <div class="ide-mirror-header">
                <span>🖥️ ${ideState.title || 'Cursor IDE'}</span>
                <span>Port: ${ideState.idePort || 'unknown'}</span>
                <button onclick="this.refreshIDE()" class="refresh-btn">🔄</button>
            </div>
            <div class="ide-mirror-viewport">
                ${mirrorHTML}
            </div>
        `;
        
        // Add click handlers
        this.attachClickHandlers();
        
        console.log('✅ IDE rendered successfully');
    }

    generateMirrorHTML(elementData) {
        if (!elementData) return '';

        const { tagName, id, className, textContent, style, position, isClickable, isVisible, children } = elementData;

        // Skip invisible elements
        if (!isVisible) return '';

        // Create styles
        const styleStr = Object.entries(style || {})
            .map(([key, value]) => `${key.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${value}`)
            .join('; ');

        // Create attributes
        let attrs = '';
        if (id) attrs += ` id="mirror-${id}"`;
        attrs += ` class="mirror-element ${className || ''} ${isClickable ? 'clickable' : ''}"`;
        attrs += ` style="${styleStr}"`;
        
        if (isClickable) {
            attrs += ` data-selector="${elementData.selector || ''}"`;
            attrs += ` data-position='${JSON.stringify(position || {})}'`;
        }

        // Render children
        const childrenHTML = children ? children.map(child => this.generateMirrorHTML(child)).join('') : '';
        
        // Safe text
        const safeText = textContent ? textContent.replace(/</g, '&lt;').replace(/>/g, '&gt;').substring(0, 100) : '';

        // Self-closing tags
        if (['img', 'br', 'hr', 'input', 'meta', 'link'].includes(tagName)) {
            return `<${tagName}${attrs} />`;
        }

        // Container or leaf elements
        if (children && children.length > 0) {
            return `<${tagName}${attrs}>${childrenHTML}</${tagName}>`;
        } else {
            return `<${tagName}${attrs}>${safeText}</${tagName}>`;
        }
    }

    attachClickHandlers() {
        const clickableElements = this.container.querySelectorAll('.mirror-element.clickable');
        
        clickableElements.forEach(element => {
            element.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const selector = element.getAttribute('data-selector');
                const position = JSON.parse(element.getAttribute('data-position') || '{}');
                
                this.handleElementClick(selector, position);
            });
        });
    }

    async handleElementClick(selector, position) {
        console.log(`🖱️ Clicking element: ${selector}`, position);
        
        try {
            // Visual feedback
            this.showClickFeedback();
            
            // Send click via WebSocket
            if (this.isConnected) {
                this.ws.send(JSON.stringify({
                    type: 'click-element',
                    payload: { selector, coordinates: position }
                }));
            }
            
            // Also try API
            const response = await fetch('/api/ide-mirror/click', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ selector, coordinates: position })
            });
            
            const result = await response.json();
            if (result.success && result.data) {
                this.renderIDEState(result.data);
            }
        } catch (error) {
            console.error('❌ Click failed:', error);
        }
    }

    setupEventListeners() {
        // Refresh button
        this.refreshIDE = async () => {
            console.log('🔄 Refreshing IDE...');
            await this.connectToIDE();
        };
    }

    showStatus(message) {
        this.container.innerHTML = `
            <div class="loading-message">
                <div class="loading-spinner"></div>
                <p>${message}</p>
            </div>
        `;
    }

    showError(message) {
        this.container.innerHTML = `
            <div class="error-message">
                <p>❌ ${message}</p>
                <button onclick="this.refreshIDE()" class="retry-btn">Retry</button>
            </div>
        `;
    }

    showClickFeedback() {
        // Visual click feedback could be added here
        console.log('👆 Click registered');
    }
}

export default IDEMirrorComponent; 