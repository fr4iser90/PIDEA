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

        this.currentState = ideState;

        // Check if we have a screenshot
        if (ideState.screenshot) {
            console.log('📸 Rendering IDE with screenshot + overlay approach');
            this.renderScreenshotWithOverlay(ideState);
        } else {
            console.log('🎨 Fallback to DOM rendering');
            this.renderDOMElements(ideState);
        }
    }

    renderScreenshotWithOverlay(ideState) {
        // Count elements for info
        function countElements(element) {
            if (!element) return 0;
            let count = 1;
            if (element.children) {
                element.children.forEach(child => {
                    count += countElements(child);
                });
            }
            return count;
        }
        
        const totalElements = countElements(ideState.body);
        
        // Clear container and set up
        this.container.innerHTML = '';
        this.container.style.cssText = `
            position: relative;
            width: 100%;
            height: 100vh;
            overflow: hidden;
            background: #1e1e1e;
        `;

        // Create header
        const header = document.createElement('div');
        header.style.cssText = `
            background: #2a2e35;
            padding: 8px;
            font-size: 12px;
            color: #e6e6e6;
            display: flex;
            justify-content: space-between;
            align-items: center;
            z-index: 2000;
            position: relative;
        `;
        header.innerHTML = `
            <div style="display: flex; align-items: center; gap: 15px;">
                <span>📸 ${ideState.title || 'Cursor IDE Screenshot'}</span>
                <span>Port: ${ideState.idePort || 'unknown'}</span>
                <span>Elements: ${totalElements}</span>
                <span id="typingStatus" style="color: #28a745; font-weight: bold;"></span>
            </div>
            <div style="display: flex; gap: 10px;">
                <button onclick="location.reload()" style="padding: 4px 8px; background: #4e8cff; color: white; border: none; border-radius: 3px; cursor: pointer;">🔄 Refresh</button>
                <button onclick="window.ideComponent.stopTyping()" style="padding: 4px 8px; background: #dc3545; color: white; border: none; border-radius: 3px; cursor: pointer;">⏹️ Stop Typing</button>
            </div>
        `;
        
        // Set global reference and typing state
        window.ideComponent = this;
        this.isTypingMode = false;
        this.currentTypingZone = null;

        // Create viewport container
        const viewport = document.createElement('div');
        viewport.style.cssText = `
            position: relative;
            flex: 1;
            width: 100%;
            height: calc(100vh - 40px);
            overflow: hidden;
        `;

        // Create screenshot image
        const screenshotImg = document.createElement('img');
        screenshotImg.src = ideState.screenshot;
        screenshotImg.style.cssText = `
            width: 100%;
            height: 100%;
            object-fit: fill;
            display: block;
            user-select: none;
            pointer-events: none;
        `;
        
        // Wait for image to load before calculating coordinates
        screenshotImg.onload = () => {
            this.recalculateOverlayPositions(viewport, overlay, ideState);
        };

        // Create overlay for clickable areas
        const overlay = document.createElement('div');
        overlay.className = 'click-overlay';
        overlay.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
        `;

        // Extract and cache clickable zones
        this.cachedClickableZones = this.extractClickableZones(ideState.body);
        console.log(`🎯 Creating ${this.cachedClickableZones.length} clickable zones`);

        this.cachedClickableZones.forEach(zone => {
            const clickZone = document.createElement('div');
            clickZone.className = 'clickable-zone';
            clickZone.style.cssText = `
                position: absolute;
                left: ${zone.x}px;
                top: ${zone.y}px;
                width: ${zone.width}px;
                height: ${zone.height}px;
                background: rgba(78, 140, 255, 0.1);
                border: 1px solid rgba(78, 140, 255, 0.3);
                cursor: pointer;
                pointer-events: all;
                transition: all 0.2s ease;
                z-index: 1000;
            `;

            // Hover effects
            clickZone.addEventListener('mouseenter', () => {
                clickZone.style.background = 'rgba(78, 140, 255, 0.25)';
                clickZone.style.border = '2px solid rgba(78, 140, 255, 0.7)';
                clickZone.style.boxShadow = '0 0 10px rgba(78, 140, 255, 0.5)';
            });
            clickZone.addEventListener('mouseleave', () => {
                clickZone.style.background = 'rgba(78, 140, 255, 0.1)';
                clickZone.style.border = '1px solid rgba(78, 140, 255, 0.3)';
                clickZone.style.boxShadow = 'none';
            });

            // Click handler with typing mode
            clickZone.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.handleSmartClick(zone);
            });

            // Tooltip with element type
            const typeEmoji = {
                'editor': '📝',
                'chat': '💬', 
                'terminal': '💻',
                'input': '📝'
            };
            clickZone.title = `${typeEmoji[zone.elementType] || '🖱️'} ${zone.elementType}: ${zone.selector}`;
            overlay.appendChild(clickZone);
        });

        // Assemble everything
        viewport.appendChild(screenshotImg);
        viewport.appendChild(overlay);
        this.container.appendChild(header);
        this.container.appendChild(viewport);

        console.log(`📸✅ Screenshot IDE rendered with ${this.cachedClickableZones.length} clickable overlays`);
    }

    recalculateOverlayPositions(viewport, overlay, ideState) {
        console.log('🎯 Recalculating overlay positions...');
        
        // Get actual viewport and screenshot dimensions
        const viewportRect = viewport.getBoundingClientRect();
        const img = viewport.querySelector('img');
        const imgRect = img.getBoundingClientRect();
        
        // Calculate scaling factors
        const scaleX = imgRect.width / (ideState.viewport?.width || imgRect.width);
        const scaleY = imgRect.height / (ideState.viewport?.height || imgRect.height);
        
        console.log(`📐 Scaling: ${scaleX.toFixed(2)}x, ${scaleY.toFixed(2)}y`);
        console.log(`📐 Viewport: ${viewportRect.width}x${viewportRect.height}`);
        console.log(`📐 Image: ${imgRect.width}x${imgRect.height}`);
        console.log(`📐 Original: ${ideState.viewport?.width}x${ideState.viewport?.height}`);
        
        // Update all clickable zones with corrected positions
        const zones = overlay.querySelectorAll('.clickable-zone');
        zones.forEach((zone, index) => {
            const originalData = this.cachedClickableZones[index];
            if (originalData) {
                const newX = originalData.x * scaleX;
                const newY = originalData.y * scaleY;
                const newWidth = originalData.width * scaleX;
                const newHeight = originalData.height * scaleY;
                
                zone.style.left = `${newX}px`;
                zone.style.top = `${newY}px`;
                zone.style.width = `${newWidth}px`;
                zone.style.height = `${newHeight}px`;
                
                console.log(`🎯 Zone ${index}: ${originalData.x},${originalData.y} → ${newX.toFixed(0)},${newY.toFixed(0)}`);
            }
        });
        
        console.log('✅ Overlay positions recalculated');
    }

    extractClickableZones(elementData, zones = []) {
        if (!elementData) return zones;

        const { position, isClickable, selector, className, tagName } = elementData;

        // Add clickable elements with valid positions
        if (isClickable && position && position.width > 0 && position.height > 0) {
            // Detect element type for smart typing
            let elementType = 'unknown';
            const classStr = className || '';
            
            if (classStr.includes('monaco-editor') || classStr.includes('editor')) {
                elementType = 'editor';
            } else if (classStr.includes('chat') || classStr.includes('composer')) {
                elementType = 'chat';
            } else if (classStr.includes('terminal')) {
                elementType = 'terminal';
            } else if (tagName === 'textarea' || tagName === 'input') {
                elementType = 'input';
            }

            zones.push({
                x: position.x,
                y: position.y,
                width: position.width,
                height: position.height,
                selector: selector || 'unknown',
                elementType: elementType,
                className: classStr
            });
        }

        // Recursively extract from children
        if (elementData.children) {
            elementData.children.forEach(child => {
                this.extractClickableZones(child, zones);
            });
        }

        return zones;
    }

    renderDOMElements(ideState) {
        // Fallback to original DOM rendering
        function countElements(element) {
            if (!element) return 0;
            let count = 1;
            if (element.children) {
                element.children.forEach(child => {
                    count += countElements(child);
                });
            }
            return count;
        }
        
        const totalElements = countElements(ideState.body);
        console.log(`🎨 Rendering IDE state with ${totalElements} elements...`);
        
        const mirrorHTML = this.generateMirrorHTML(ideState.body);
        
        // Inject CSS first
        this.injectIDECSS(ideState.css);
        
        this.container.innerHTML = `
            <div class="ide-mirror-header" style="background: #2a2e35; padding: 8px; font-size: 12px; color: #e6e6e6; display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <span>🎨 ${ideState.title || 'Cursor IDE'}</span>
                    <span style="margin-left: 15px;">Port: ${ideState.idePort || 'unknown'}</span>
                    <span style="margin-left: 15px;">Elements: ${totalElements}</span>
                    <span style="margin-left: 15px;">CSS: ${ideState.css?.inline?.length || 0} inline, ${ideState.css?.external?.length || 0} external</span>
                </div>
                <button onclick="location.reload()" style="padding: 4px 8px; background: #4e8cff; color: white; border: none; border-radius: 3px; cursor: pointer;">🔄 Refresh</button>
            </div>
            <div class="ide-mirror-viewport" style="flex: 1; overflow: auto; background: #1e1e1e;">
                ${mirrorHTML}
            </div>
        `;
        
        // Add click handlers
        this.attachClickHandlers();
        
        console.log('✅ DOM IDE rendered successfully');
    }

    generateMirrorHTML(elementData) {
        if (!elementData) return '';

        const { tagName, id, className, textContent, style, position, isClickable, isVisible, children } = elementData;

        // Force important IDE elements to be visible!
        let overrideStyles = '';
        
        // Only fix the main container
        if (tagName === 'body') {
            overrideStyles += 'background-color: #1e1e1e !important; color: #cccccc !important; min-height: 100vh !important; ';
        }
        
        // Preserve original visibility for proper IDE layout

        // Create styles - preserve ALL original styles + overrides
        const originalStyles = Object.entries(style || {})
            .map(([key, value]) => `${key.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${value}`)
            .join('; ');
        const styleStr = originalStyles + (overrideStyles ? '; ' + overrideStyles : '');

        // Create attributes
        let attrs = '';
        if (id) attrs += ` id="mirror-${id}"`;
        attrs += ` class="mirror-element ${className || ''} ${isClickable ? 'clickable' : ''}"`;
        attrs += ` style="${styleStr}"`;
        
        if (isClickable) {
            attrs += ` data-selector="${elementData.selector || ''}"`;
            attrs += ` data-position='${JSON.stringify(position || {})}'`;
            attrs += ` title="Click: ${elementData.selector || 'No selector'}"`;
        }

        // Render children recursively
        const childrenHTML = children ? children.map(child => this.generateMirrorHTML(child)).join('') : '';
        
        // Safe text content - preserve more text
        const safeText = textContent ? textContent.replace(/</g, '&lt;').replace(/>/g, '&gt;').substring(0, 500) : '';

        // Self-closing tags
        if (['img', 'br', 'hr', 'input', 'meta', 'link'].includes(tagName)) {
            return `<${tagName}${attrs} />`;
        }

        // Container or leaf elements
        if (children && children.length > 0) {
            return `<${tagName}${attrs}>${childrenHTML}</${tagName}>`;
        } else if (safeText.trim()) {
            return `<${tagName}${attrs}>${safeText}</${tagName}>`;
        } else {
            return `<${tagName}${attrs}></${tagName}>`;
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

    async handleSmartClick(zone) {
        console.log(`🎯 Smart click on ${zone.elementType}: ${zone.selector}`);
        
        try {
            // First click the element
            await this.handleElementClick(zone.selector, zone);
            
            // If it's a typeable element, activate typing mode
            if (['editor', 'chat', 'terminal', 'input'].includes(zone.elementType)) {
                this.activateTypingMode(zone);
            }
        } catch (error) {
            console.error('❌ Smart click failed:', error);
        }
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

    activateTypingMode(zone) {
        this.isTypingMode = true;
        this.currentTypingZone = zone;
        
        // Update status
        const status = document.getElementById('typingStatus');
        const typeNames = {
            'editor': 'Editor',
            'chat': 'Chat', 
            'terminal': 'Terminal',
            'input': 'Input'
        };
        status.textContent = `⌨️ Typing in ${typeNames[zone.elementType]} - Press ESC to stop`;
        
        // Visual feedback - highlight the active zone
        this.highlightActiveZone(zone);
        
        // Start keyboard listening
        this.startKeyboardListening();
        
        console.log(`✅ Typing mode activated for ${zone.elementType}`);
    }

    stopTyping() {
        this.isTypingMode = false;
        this.currentTypingZone = null;
        
        // Update status
        const status = document.getElementById('typingStatus');
        status.textContent = '';
        
        // Remove highlights
        this.removeZoneHighlights();
        
        // Stop keyboard listening
        this.stopKeyboardListening();
        
        console.log('⏹️ Typing mode stopped');
    }

    highlightActiveZone(zone) {
        // Remove existing highlights
        this.removeZoneHighlights();
        
        // Find and highlight the corresponding zone
        const zones = document.querySelectorAll('.clickable-zone');
        zones.forEach(zoneEl => {
            if (zoneEl.title.includes(zone.selector)) {
                zoneEl.style.background = 'rgba(40, 167, 69, 0.4)';
                zoneEl.style.border = '3px solid rgba(40, 167, 69, 0.8)';
                zoneEl.style.boxShadow = '0 0 15px rgba(40, 167, 69, 0.6)';
                zoneEl.classList.add('active-typing-zone');
            }
        });
    }

    removeZoneHighlights() {
        const activeZones = document.querySelectorAll('.active-typing-zone');
        activeZones.forEach(zone => {
            zone.style.background = 'rgba(78, 140, 255, 0.1)';
            zone.style.border = '1px solid rgba(78, 140, 255, 0.3)';
            zone.style.boxShadow = 'none';
            zone.classList.remove('active-typing-zone');
        });
    }

    startKeyboardListening() {
        if (this.keyboardListener) {
            this.stopKeyboardListening();
        }
        
        this.keyboardListener = (e) => {
            if (!this.isTypingMode || !this.currentTypingZone) return;
            
            // Stop typing on ESC
            if (e.key === 'Escape') {
                this.stopTyping();
                e.preventDefault();
                return;
            }
            
            // Ignore certain keys
            if (['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12'].includes(e.key)) {
                return;
            }
            
            // Send keystroke to IDE
            this.sendKeystrokeToIDE(e);
            e.preventDefault();
        };
        
        document.addEventListener('keydown', this.keyboardListener);
        console.log('⌨️ Keyboard listening started');
    }

    stopKeyboardListening() {
        if (this.keyboardListener) {
            document.removeEventListener('keydown', this.keyboardListener);
            this.keyboardListener = null;
            console.log('⌨️ Keyboard listening stopped');
        }
    }

    sendKeystrokeToIDE(event) {
        if (!this.currentTypingZone || !this.isConnected) return;
        
        const { key, ctrlKey, shiftKey, altKey, metaKey } = event;
        
        console.log(`⌨️ Sending keystroke: ${key} to ${this.currentTypingZone.elementType}`);
        
        // Send keystroke to IDE
        this.ws.send(JSON.stringify({
            type: 'type-text',
            payload: { 
                text: key.length === 1 ? key : '', // Only send printable characters as text
                key: key,
                modifiers: { ctrlKey, shiftKey, altKey, metaKey },
                selector: this.currentTypingZone.selector 
            }
        }));
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

    // Clean up on component destroy
    destroy() {
        this.stopKeyboardListening();
        this.removeZoneHighlights();
    }
    
    injectIDECSS(cssData) {
        if (!cssData) return;
        
        console.log('💄 Injecting IDE CSS...', cssData);
        
        // Remove existing IDE CSS
        const existingCSS = document.querySelectorAll('.ide-mirror-css');
        existingCSS.forEach(el => el.remove());
        
        // 1. Inject external stylesheets
        if (cssData.external) {
            cssData.external.forEach((href, index) => {
                // Skip Electron-specific URLs that browser can't load
                if (href.includes('vscode-file://') || href.includes('electron://') || href.includes('app://')) {
                    console.log(`⚠️ Skipping Electron URL: ${href}`);
                    return;
                }
                
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                
                // Handle relative URLs by adding IDE base URL
                if (href.startsWith('http')) {
                    link.href = href;
                } else {
                    // Assume relative URL from IDE - prepend localhost port
                    const idePort = this.currentState?.idePort || '9222';
                    link.href = `http://localhost:${idePort}${href.startsWith('/') ? '' : '/'}${href}`;
                }
                
                link.className = 'ide-mirror-css';
                link.onload = () => console.log(`✅ Loaded external CSS: ${link.href}`);
                link.onerror = () => console.log(`❌ Failed to load CSS: ${link.href}`);
                document.head.appendChild(link);
            });
        }
        
        // 2. Inject inline CSS with scope fixes
        if (cssData.inline) {
            cssData.inline.forEach((css, index) => {
                const style = document.createElement('style');
                style.className = 'ide-mirror-css';
                
                // Only fix critical CSS issues for browser compatibility
                let fixedCSS = css
                    // Remove vscode-file URLs that can't load in browser
                    .replace(/url\(['"]?vscode-file:\/\/[^'"]*['"]?\)/g, 'none');
                
                style.textContent = fixedCSS;
                document.head.appendChild(style);
            });
        }
        
        // 3. Force basic IDE layout and visibility
        const forceVisibleCSS = document.createElement('style');
        forceVisibleCSS.className = 'ide-mirror-css';
        forceVisibleCSS.textContent = `
                         /* RESTORE ORIGINAL IDE LAYOUT */
             #ideMirrorContainer {
                 width: 100% !important;
                 height: 100vh !important;
                 background: #1e1e1e !important;
                 overflow: hidden !important;
                 position: relative !important;
             }
             
             /* Preserve original element types but force visibility */
             #ideMirrorContainer .mirror-element[style*="display: none"] {
                 display: block !important;
             }
             #ideMirrorContainer .mirror-element[style*="visibility: hidden"] {
                 visibility: visible !important;
             }
             
             /* ONLY highlight clickable elements, preserve original layout */
             #ideMirrorContainer .mirror-element.clickable:hover {
                 outline: 2px solid rgba(78, 140, 255, 0.8) !important;
                 outline-offset: -1px !important;
             }
        `;
        document.head.appendChild(forceVisibleCSS);
        
        const inlineCount = cssData.inline?.length || 0;
        const externalCount = cssData.external?.length || 0;
        const skippedElectron = cssData.external?.filter(href => 
            href.includes('vscode-file://') || href.includes('electron://') || href.includes('app://')
        ).length || 0;
        
        console.log(`✅ CSS Injection Complete:
        - ${inlineCount} inline stylesheets ✅
        - ${externalCount - skippedElectron} external URLs ✅  
        - ${skippedElectron} Electron URLs skipped ⚠️`);
    }
}

export default IDEMirrorComponent; 