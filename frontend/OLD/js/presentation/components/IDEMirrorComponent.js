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

        try {
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

            this.ws.onclose = (event) => {
                console.log('🔌 WebSocket disconnected:', event.code, event.reason);
                this.isConnected = false;
                this.showStatus('Disconnected - Reconnecting...');
                
                // Auto-reconnect only if not a normal closure
                if (event.code !== 1000) {
                    setTimeout(() => this.setupWebSocket(), 3000);
                }
            };

            this.ws.onerror = (error) => {
                console.error('❌ WebSocket error:', error);
                this.showStatus('Connection Error - Trying API fallback...');
                // Try API fallback immediately
                this.connectToIDE();
            };
        } catch (error) {
            console.error('❌ Failed to create WebSocket:', error);
            this.showStatus('WebSocket failed - Using API fallback...');
            // Fallback to API-only mode
            this.connectToIDE();
        }
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
            
            case 'typing-confirmed':
                // Lightweight typing confirmation without full render
                this.handleTypingConfirmation(data);
                break;
            
            case 'error':
                console.error('❌ IDE Error:', message.message || message.error);
                this.showError(message.message || message.error);
                break;
        }
    }

    handleTypingConfirmation(data) {
        // Update typing status in header
        const typingStatus = document.getElementById('typingStatus');
        if (typingStatus) {
            typingStatus.textContent = `⌨️ ${data.key}`;
            typingStatus.style.opacity = '1';
            
            // Fade out after short delay
            setTimeout(() => {
                typingStatus.style.opacity = '0.5';
            }, 500);
        }
        
        // Update predictive indicator with success feedback
        if (this.predictiveIndicator) {
            const originalBg = this.predictiveIndicator.style.background;
            this.predictiveIndicator.style.background = 'linear-gradient(135deg, #28a745, #20c997)';
            this.predictiveIndicator.innerHTML = `✅ <span style="font-weight: 600;">${this.typingBuffer}</span>`;
            
            // Quick success pulse
            this.predictiveIndicator.style.transform = 'scale(1.05)';
            setTimeout(() => {
                if (this.predictiveIndicator) {
                    this.predictiveIndicator.style.transform = 'scale(1)';
                    this.predictiveIndicator.style.background = originalBg;
                    this.predictiveIndicator.innerHTML = `⌨️ <span style="font-weight: 600;">${this.typingBuffer}</span>`;
                }
            }, 200);
        }
        
        console.log(`✅ Typing confirmed: ${data.key} at ${data.selector}`);
    }

    async connectToIDE() {
        console.log('🔌 Connecting to IDE via API...');
        this.showStatus('Connecting to Cursor IDE...');
        
        try {
            // Try WebSocket first if available
            if (this.isConnected && this.ws && this.ws.readyState === WebSocket.OPEN) {
                console.log('📡 Sending connect request via WebSocket...');
                this.ws.send(JSON.stringify({ type: 'connect-ide' }));
            } else {
                console.log('📡 WebSocket not available, using API only...');
            }
            
            // Always try direct API call as fallback
            const response = await fetch('/api/ide-mirror/connect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
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
            
            // Show more helpful error message
            if (error.message.includes('Failed to fetch')) {
                this.showError('Server not running. Please start the development server.');
            }
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

            // Add input overlay for chat zones
            if (zone.elementType === 'chat') {
                const inputOverlay = document.createElement('textarea');
                inputOverlay.className = 'chat-input-overlay';
                inputOverlay.style.cssText = `
                    position: absolute;
                    left: 0;
                    top: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.8);
                    border: 2px solid #4e8cff;
                    outline: none;
                    color: #ffffff;
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    font-size: 14px;
                    line-height: 1.4;
                    padding: 8px;
                    resize: none;
                    z-index: 1001;
                    pointer-events: all;
                    opacity: 1;
                    transition: opacity 0.2s ease;
                `;
                inputOverlay.placeholder = 'Type your message here...';
                inputOverlay.dataset.zoneSelector = zone.selector;
                inputOverlay.dataset.zoneType = zone.elementType;
                
                inputOverlay.addEventListener('keydown', (e) => {
                    e.stopPropagation();
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        const message = inputOverlay.value.trim();
                        if (message) {
                            fetch('/api/chat', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ message })
                            }).catch(error => {
                                console.error('❌ Failed to send chat message via API:', error);
                            });
                        }
                        inputOverlay.value = '';
                        inputOverlay.blur();
                        inputOverlay.remove();
                    } else if (e.key === 'Escape') {
                        e.preventDefault();
                        inputOverlay.value = '';
                        inputOverlay.blur();
                        inputOverlay.remove();
                    }
                });
                inputOverlay.addEventListener('input', (e) => {
                    e.stopPropagation();
                });
                clickZone.appendChild(inputOverlay);
                setTimeout(() => inputOverlay.focus(), 0);
                console.log('💬 Overlay appended', inputOverlay);
            }

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
        
        // Check if image exists and is loaded
        if (!img) {
            console.warn('⚠️ Image not found in viewport, skipping position recalculation');
            return;
        }
        
        const imgRect = img.getBoundingClientRect();
        
        // Check if image has valid dimensions
        if (imgRect.width === 0 || imgRect.height === 0) {
            console.warn('⚠️ Image has zero dimensions, skipping position recalculation');
            return;
        }
        
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

        const { position, isClickable, selector, className, tagName, elementType: backendElementType } = elementData;
        // Chat-Zone immer als clickable behandeln
        if ((className && typeof className === 'string' && className.match(/composer-bar|chat|input|message|msg|send/)) ||
            (selector && typeof selector === 'string' && selector.match(/composer-bar|chat|input|message|msg|send/))) {
            elementData.isClickable = true;
        }
        
        // Only log zones that are actually clickable or have issues
        if (elementData.isClickable || (className && typeof className === 'string' && className.includes('error'))) {
            console.log('ZONE:', { selector, className, tagName, backendElementType });
        }

        // Add clickable elements with valid positions
        if (elementData.isClickable && position && position.width > 0 && position.height > 0) {
            // Use backend elementType if available, otherwise detect locally
            let elementType = backendElementType || 'unknown';
            const classStr = className || '';
            // Only detect locally if backend didn't provide elementType
            if (!backendElementType) {
                if (typeof classStr === 'string' && classStr.match(/monaco-editor|editor/)) {
                    elementType = 'editor';
                } else if (typeof classStr === 'string' && classStr.match(/chat|composer|composer-bar|input|message|msg|send/)) {
                    elementType = 'chat';
                } else if (typeof classStr === 'string' && classStr.match(/terminal/)) {
                    elementType = 'terminal';
                } else if (tagName === 'textarea' || tagName === 'input') {
                    elementType = 'input';
                }
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
            
            // Only activate typing mode for non-chat elements (chat uses overlay input)
            if (['editor', 'terminal', 'input'].includes(zone.elementType)) {
                this.activateTypingMode(zone);
            }
            // Chat zones are handled by the overlay input in renderScreenshotWithOverlay
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
        
        // Only activate for non-chat elements (editor, terminal, input)
        // Chat zones use the overlay input from renderScreenshotWithOverlay
        if (['editor', 'terminal', 'input'].includes(zone.elementType)) {
            this.highlightActiveZone(zone);
            this.startKeyboardListening();
            
            // Update Status
            const status = document.getElementById('typingStatus');
            const typeNames = {
                'editor': 'Editor',
                'terminal': 'Terminal',
                'input': 'Input'
            };
            status.textContent = `⌨️ Typing in ${typeNames[zone.elementType]} - Press ESC to stop`;
            
            console.log(`✅ Typing mode activated for ${zone.elementType}`);
        }
    }

    stopTyping() {
        console.log('🛑 Stopping typing mode');
        
        // Send any pending batch before stopping
        if (this.typingBatch) {
            this.sendTypingBatch();
        }
        
        this.isTypingMode = false;
        this.currentTypingZone = null;
        
        // Update status
        const status = document.getElementById('typingStatus');
        if (status) status.textContent = '';
        
        // Hide predictive indicators
        if (this.predictiveIndicator) {
            this.predictiveIndicator.style.opacity = '0';
        }
        
        // Remove highlights
        this.removeZoneHighlights();
        
        // Stop keyboard listening
        this.stopKeyboardListening();
        
        console.log('✅ Typing mode stopped, pending batches sent');
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
        
        // DON'T send keystrokes if we're in a chat zone (chat uses overlay input)
        if (this.currentTypingZone.elementType === 'chat') {
            console.log('💬 Chat zone detected - skipping keyboard events (using overlay input)');
            return;
        }
        
        const { key, ctrlKey, shiftKey, altKey, metaKey } = event;
        
        // Special keys send immediately
        if (key.length > 1) {
            console.log(`⌨️ Sending special key immediately: ${key}`);
            this.ws.send(JSON.stringify({
                type: 'type-text',
                payload: { 
                    text: '',
                    key: key,
                    modifiers: { ctrlKey, shiftKey, altKey, metaKey },
                    selector: this.currentTypingZone.selector 
                }
            }));
            return;
        }
        
        // Batch regular characters for speed
        if (key.length === 1 || key === ' ') {
            this.showPredictiveText(key);
            this.addToTypingBatch(key);
        }
    }

    addToTypingBatch(char) {
        // Initialize batching if needed
        if (!this.typingBatch) {
            this.typingBatch = '';
            this.batchStartTime = Date.now();
        }
        
        // Add character to batch
        this.typingBatch += char;
        
        // Clear existing timeout
        if (this.batchTimeout) {
            clearTimeout(this.batchTimeout);
        }
        
        // Send batch after delay OR when it gets too long
        const shouldSendNow = (
            this.typingBatch.length >= 10 || // Max batch size
            Date.now() - this.batchStartTime > 300 // Max wait time
        );
        
        if (shouldSendNow) {
            this.sendTypingBatch();
        } else {
            // Wait for more characters (debounce)
            this.batchTimeout = setTimeout(() => {
                this.sendTypingBatch();
            }, 150); // 150ms batch window
        }
    }
    
    sendTypingBatch() {
        if (!this.typingBatch || !this.currentTypingZone) return;
        
        const batchText = this.typingBatch;
        console.log(`⚡ Sending batch: "${batchText}" (${batchText.length} chars)`);
        
        // Send entire batch as one request
        this.ws.send(JSON.stringify({
            type: 'type-batch',
            payload: { 
                text: batchText,
                selector: this.currentTypingZone.selector 
            }
        }));
        
        // Reset batch
        this.typingBatch = '';
        this.batchStartTime = null;
        if (this.batchTimeout) {
            clearTimeout(this.batchTimeout);
            this.batchTimeout = null;
        }
    }

    showPredictiveText(text) {
        // Create/update predictive text indicator
        if (!this.predictiveIndicator) {
            this.predictiveIndicator = document.createElement('div');
            this.predictiveIndicator.style.cssText = `
                position: absolute;
                background: linear-gradient(135deg, #4e8cff, #00d4ff);
                color: white;
                padding: 4px 8px;
                border-radius: 12px;
                font-size: 11px;
                font-family: 'Consolas', 'Monaco', monospace;
                pointer-events: none;
                z-index: 100000;
                box-shadow: 0 2px 12px rgba(0,0,0,0.4);
                transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                opacity: 0;
                transform: translateY(-5px);
                white-space: nowrap;
                max-width: 200px;
                overflow: hidden;
                text-overflow: ellipsis;
            `;
            document.body.appendChild(this.predictiveIndicator);
        }
        
        // Position near active typing zone
        if (this.currentTypingZone) {
            const activeZone = document.querySelector('.active-typing-zone');
            if (activeZone) {
                const rect = activeZone.getBoundingClientRect();
                this.predictiveIndicator.style.left = `${rect.left + rect.width + 8}px`;
                this.predictiveIndicator.style.top = `${rect.top + (rect.height / 2) - 12}px`;
            }
        }
        
        // Accumulate typing buffer
        this.typingBuffer = (this.typingBuffer || '') + text;
        
        // Limit buffer length for performance
        if (this.typingBuffer.length > 50) {
            this.typingBuffer = '...' + this.typingBuffer.slice(-47);
        }
        
        // Update display
        this.predictiveIndicator.innerHTML = `⌨️ <span style="font-weight: 600;">${this.typingBuffer}</span>`;
        this.predictiveIndicator.style.opacity = '1';
        this.predictiveIndicator.style.transform = 'translateY(0)';
        
        // Auto-fade after delay
        clearTimeout(this.predictiveTimeout);
        this.predictiveTimeout = setTimeout(() => {
            if (this.predictiveIndicator) {
                this.predictiveIndicator.style.opacity = '0';
                this.predictiveIndicator.style.transform = 'translateY(-5px)';
            }
            // Clear buffer after fade
            setTimeout(() => {
                this.typingBuffer = '';
            }, 200);
        }, 1500);
    }

    handleChatSubmit(message, selector) {
        console.log(`📤 Sending chat message: "${message}" to ${selector}`);
        
        if (!message.trim()) return;
        
        // First send the text as batch to the IDE (so it appears in the chat input)
        if (this.isConnected) {
            this.ws.send(JSON.stringify({
                type: 'type-batch',
                payload: { text: message.trim(), selector }
            }));
        }
        
        // Then send the message via WebSocket (to actually send it)
        if (this.isConnected) {
            this.ws.send(JSON.stringify({
                type: 'send-chat-message',
                payload: { message: message.trim() }
            }));
        }
        
        // Also try API
        fetch('/api/ide-mirror/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: message.trim() })
        }).catch(error => {
            console.error('❌ Failed to send chat message via API:', error);
        });
        
        // Update typing status
        const typingStatus = document.getElementById('typingStatus');
        if (typingStatus) {
            typingStatus.textContent = `📤 Message sent`;
            typingStatus.style.opacity = '1';
            setTimeout(() => {
                typingStatus.style.opacity = '0.5';
            }, 2000);
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