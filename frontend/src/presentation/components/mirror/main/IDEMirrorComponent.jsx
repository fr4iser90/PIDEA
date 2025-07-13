import { logger } from "@/infrastructure/logging/Logger";
import React, { useState, useEffect, useRef, useCallback } from 'react';
import webSocketService from '@/infrastructure/services/WebSocketService';
import { StreamingService } from '@/application/services/StreamingService';
import CanvasRenderer from './CanvasRenderer';
import StreamingControls from './StreamingControls';
import '@/css/main/mirror.css';

// Create streaming service instance
const streamingService = new StreamingService(webSocketService);



function IDEMirrorComponent({ eventBus }) {
    const [currentState, setCurrentState] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
    const [isStreaming, setIsStreaming] = useState(false);
    const [currentPort, setCurrentPort] = useState(9222);
    const [streamingStats, setStreamingStats] = useState({
        fps: 0,
        frameCount: 0,
        latency: 0,
        bandwidth: 0
    });
    const [error, setError] = useState(null);

    // Refs
    const containerRef = useRef(null);
    const predictiveIndicator = useRef(null);
    const typingBuffer = useRef('');
    const typingTimeout = useRef(null);

    // Services - use the singleton instance
    // const webSocketService = new WebSocketService();

    // Define handleStreamingFrame first since startStreaming depends on it
    const handleStreamingFrame = useCallback((frameData) => {
        // Update streaming stats
        setStreamingStats(prev => ({
            ...prev,
            frameCount: prev.frameCount + 1,
            fps: frameData.fps || prev.fps,
            latency: frameData.latency || prev.latency,
            bandwidth: frameData.size || prev.bandwidth
        }));

        // Update current state with streaming data
        if (frameData.data) {
            setCurrentState(prev => ({
                ...prev,
                screenshot: frameData.data,
                timestamp: frameData.timestamp,
                frameNumber: frameData.frameNumber
            }));
        }
    }, []);

    // Register frame handler for currentPort
    useEffect(() => {
        if (!currentPort) return;
        
        logger.log(`[IDEMirrorComponent] Registering frame handler for port ${currentPort}`);
        streamingService.registerFrameHandler(currentPort, handleStreamingFrame);
        
        return () => {
            logger.log(`[IDEMirrorComponent] Cleaning up frame handler for port ${currentPort}`);
            streamingService.frameHandlers.delete(currentPort);
        };
    }, [currentPort, handleStreamingFrame]);

    // Define startStreaming function before useEffect
    const startStreaming = useCallback(async (port = 9222) => {
        logger.log('🔍 startStreaming called with:', { port });
        
        try {
            setCurrentPort(port);
            logger.log(`🚀 Starting streaming for port ${port}`);
            logger.log('🔍 Streaming options:', {
                fps: 15,
                quality: 0.8,
                format: 'jpeg',
                maxFrameSize: 50 * 1024
            });
            const result = await streamingService.startStreaming(port, {
                fps: 15,
                quality: 0.8,
                format: 'jpeg',
                maxFrameSize: 50 * 1024
            });
            logger.log('🔍 streamingService.startStreaming result:', result);
            setIsStreaming(true);
            logger.log(`Streaming started on port ${port}`);
            logger.log('✅ Streaming started successfully');
        } catch (error) {
            logger.error('❌ Failed to start streaming:', error);
            logger.error('❌ Error details:', error.stack);
            logger.error('❌ Error name:', error.name);
            logger.error('❌ Error message:', error.message);
            logger.error(`Failed to start streaming: ${error.message}`);
        }
    }, [handleStreamingFrame, currentPort]);

    // WebSocket setup
    useEffect(() => {
        logger.log('🔄 IDEMirrorComponent initializing...');
        
        setupWebSocket();
        
        // Auto-connect after short delay
        const timer = setTimeout(() => {
            connectToIDE();
        }, 1000);

        return () => {
            clearTimeout(timer);
            stopKeyboardListening();
            // Cleanup streaming
            if (currentPort) {
                streamingService.stopStreaming(currentPort);
            }
        };
    }, []);

    useEffect(() => {
        const handleResize = () => {
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                setViewportSize({ width: rect.width, height: rect.height });
            }
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Monitor streaming service availability
    useEffect(() => {
        if (streamingService) {
            logger.log('✅ Streaming service is now available');
        }
    }, [streamingService]);

    // Auto-Start-Streaming, sobald StreamingService bereit ist
    useEffect(() => {
        logger.log('🔍 Auto-start useEffect triggered with:', {
            streamingService: !!streamingService,
            isStreaming,
            currentPort
        });
        
        if (streamingService && !isStreaming && currentPort) {
            logger.log('🚀 Auto-starting streaming in 2 seconds...');
            const timer = setTimeout(() => {
                logger.log('🚀 Starting streaming now...');
                logger.log('🔍 About to call startStreaming with port:', currentPort);
                logger.log('🔍 startStreaming function exists:', typeof startStreaming);
                
                if (typeof startStreaming === 'function') {
                    startStreaming(currentPort);
                } else {
                    logger.error('❌ startStreaming is not a function!');
                }
            }, 2000);
            return () => {
                logger.log('🔍 Clearing auto-start timer');
                clearTimeout(timer);
            };
        } else {
            logger.log('❌ Auto-start conditions not met:', {
                hasStreamingService: !!streamingService,
                isStreaming,
                currentPort
            });
        }
    }, [streamingService, isStreaming, currentPort, startStreaming]);

    const setupWebSocket = () => {
        logger.log('🔌 IDEMirrorComponent: Setting up WebSocket service...');
        showStatus('Connecting to WebSocket...');

        // Connect to WebSocket service
        webSocketService.connect()
            .then(() => {
                logger.log('✅ WebSocket service connected');
                setIsConnected(true);
                showStatus('Connected - Loading IDE...');
                
                // Listen for IDE state changes
                webSocketService.onIDEStateChange((data) => {
                    logger.log('📨 IDE state change received:', data);
                    renderIDEState(data);
                });
                
                // Listen for streaming frames (handled by StreamingService now)
                // webSocketService.on('frame', (frameData) => {
                //     logger.log('📨 Streaming frame received:', frameData.frameNumber);
                //     handleStreamingFrame(frameData);
                // });
                
                // Listen for connection status
                webSocketService.on('connection-established', (data) => {
                    logger.log('✅ WebSocket connection established:', data);
                });
                
                connectToIDE();
            })
            .catch((error) => {
                logger.error('❌ WebSocket service connection failed:', error);
                showStatus('WebSocket failed - Using API fallback...');
                // Fallback to API-only mode
                connectToIDE();
            });
    };

    const stopStreaming = async () => {
        if (!currentPort) return;
        try {
            await streamingService.stopStreaming(currentPort);
            setIsStreaming(false);
            showStatus('Streaming stopped');
            logger.log('✅ Streaming stopped successfully');
        } catch (error) {
            logger.error('❌ Failed to stop streaming:', error);
            showError(`Failed to stop streaming: ${error.message}`);
        }
    };

    const handleWebSocketMessage = (message) => {
        logger.log('📥 WebSocket message:', message.type);
        const { type, data } = message;

        switch (type) {
            case 'ide-state-updated':
            case 'ide-connected':
                logger.log('🖥️ IDE state received, rendering...');
                renderIDEState(data);
                break;
            
            case 'typing-confirmed':
                // Lightweight typing confirmation without full render
                handleTypingConfirmation(data);
                break;
            
            case 'error':
                logger.error('❌ IDE Error:', message.message || message.error);
                showError(message.message || message.error);
                break;
        }
    };

    const handleTypingConfirmation = (data) => {
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
        if (predictiveIndicator.current) {
            const originalBg = predictiveIndicator.current.style.background;
            predictiveIndicator.current.style.background = 'linear-gradient(135deg, #28a745, #20c997)';
            predictiveIndicator.current.innerHTML = `✅ <span style="font-weight: 600;">${typingBuffer.current}</span>`;
            
            // Quick success pulse
            predictiveIndicator.current.style.transform = 'scale(1.05)';
            setTimeout(() => {
                if (predictiveIndicator.current) {
                    predictiveIndicator.current.style.transform = 'scale(1)';
                    predictiveIndicator.current.style.background = originalBg;
                    predictiveIndicator.current.innerHTML = `⌨️ <span style="font-weight: 600;">${typingBuffer.current}</span>`;
                }
            }, 200);
        }
        
        logger.log(`✅ Typing confirmed: ${data.key} at ${data.selector}`);
    };

    const connectToIDE = async () => {
        setIsLoading(true);
        showStatus('Connecting to IDE...');
        try {
            // Try WebSocket first if available
            if (isConnected && webSocketService.getConnectionStatus().isConnected) {
                logger.log('📡 Sending connect request via WebSocket...');
                webSocketService.sendIDEConnect();
            } else {
                logger.log('📡 WebSocket not available, using API only...');
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
                logger.log('✅ IDE connected via API');
                renderIDEState(result.data);
            } else {
                throw new Error(result.error || 'Failed to connect to IDE');
            }
        } catch (error) {
            logger.error('❌ Failed to connect to IDE:', error);
            showError(`Failed to connect: ${error.message}`);
            
            // Show more helpful error message
            if (error.message.includes('Failed to fetch')) {
                showError('Server not running. Please start the development server.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const renderIDEState = (ideState) => {
        if (!ideState || !ideState.body) {
            logger.error('❌ Invalid IDE state received:', ideState);
            showError('Invalid IDE state received');
            return;
        }

        setCurrentState(ideState);
    };

    const renderScreenshotWithOverlay = (ideState) => {
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
        if (containerRef.current) {
            containerRef.current.innerHTML = '';
            // Entferne inline styles - lass CSS-Datei das machen
            containerRef.current.className = 'ide-mirror-container';
            containerRef.current.style.background = '#1e1e1e';

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
            window.ideComponent = { stopTyping: () => stopTyping() };

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
                recalculateOverlayPositions(viewport, overlay, ideState);
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
            const zones = extractClickableZones(ideState.body);
            logger.log(`🎯 Creating ${zones.length} clickable zones`);

            zones.forEach(zone => {
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
                    handleSmartClick(zone);
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
                                    logger.error('❌ Failed to send chat message via API:', error);
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
                    logger.log('💬 Overlay appended', inputOverlay);
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
            containerRef.current.appendChild(header);
            containerRef.current.appendChild(viewport);

            logger.log(`📸✅ Screenshot IDE rendered with ${zones.length} clickable overlays`);
        }
    };

    const recalculateOverlayPositions = (viewport, overlay, ideState) => {
        logger.log('🎯 Recalculating overlay positions...');
        
        // Get actual viewport and screenshot dimensions
        const viewportRect = viewport.getBoundingClientRect();
        const img = viewport.querySelector('img');
        
        // Check if image exists and is loaded
        if (!img) {
            logger.warn('⚠️ Image not found in viewport, skipping position recalculation');
            return;
        }
        
        const imgRect = img.getBoundingClientRect();
        
        // Check if image has valid dimensions
        if (imgRect.width === 0 || imgRect.height === 0) {
            logger.warn('⚠️ Image has zero dimensions, skipping position recalculation');
            return;
        }
        
        // Calculate scaling factors
        const scaleX = imgRect.width / (ideState.viewport?.width || imgRect.width);
        const scaleY = imgRect.height / (ideState.viewport?.height || imgRect.height);
        
        logger.log(`📐 Scaling: ${scaleX.toFixed(2)}x, ${scaleY.toFixed(2)}y`);
        logger.log(`📐 Viewport: ${viewportRect.width}x${viewportRect.height}`);
        logger.log(`📐 Image: ${imgRect.width}x${imgRect.height}`);
        logger.log(`📐 Original: ${ideState.viewport?.width}x${ideState.viewport?.height}`);
        
        // Update all clickable zones with corrected positions
        const zones = overlay.querySelectorAll('.clickable-zone');
        zones.forEach((zone, index) => {
            const originalData = zones[index];
            if (originalData) {
                const newX = originalData.x * scaleX;
                const newY = originalData.y * scaleY;
                const newWidth = originalData.width * scaleX;
                const newHeight = originalData.height * scaleY;
                
                zone.style.left = `${newX}px`;
                zone.style.top = `${newY}px`;
                zone.style.width = `${newWidth}px`;
                zone.style.height = `${newHeight}px`;
                
                logger.log(`🎯 Zone ${index}: ${originalData.x},${originalData.y} → ${newX.toFixed(0)},${newY.toFixed(0)}`);
            }
        });
        
        logger.log('✅ Overlay positions recalculated');
    };

    const extractClickableZones = (elementData, zones = []) => {
        if (!elementData) return zones;

        const { position, isClickable, selector, className, tagName, elementType: backendElementType } = elementData;
        // Chat-Zone immer als clickable behandeln
        if ((className && typeof className === 'string' && className.match(/composer-bar|chat|input|message|msg|send/)) ||
            (selector && typeof selector === 'string' && selector.match(/composer-bar|chat|input|message|msg|send/))) {
            elementData.isClickable = true;
        }
        
        // Only log zones that are actually clickable or have issues
        if (elementData.isClickable || (className && typeof className === 'string' && className.includes('error'))) {
            logger.log('ZONE:', { selector, className, tagName, backendElementType });
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
                extractClickableZones(child, zones);
            });
        }
        return zones;
    };

    const renderDOMElements = (ideState) => {
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
        logger.log(`🎨 Rendering IDE state with ${totalElements} elements...`);
        
        const mirrorHTML = generateMirrorHTML(ideState.body);
        
        // Inject CSS first
        injectIDECSS(ideState.css);
        
        if (containerRef.current) {
            containerRef.current.innerHTML = `
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
            attachClickHandlers();
            
            logger.log('✅ DOM IDE rendered successfully');
        }
    };

    const generateMirrorHTML = (elementData) => {
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
        const childrenHTML = children ? children.map(child => generateMirrorHTML(child)).join('') : '';
        
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
    };

    const attachClickHandlers = () => {
        if (!containerRef.current) return;
        const clickableElements = containerRef.current.querySelectorAll('.mirror-element.clickable');
        
        clickableElements.forEach(element => {
            element.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const selector = element.getAttribute('data-selector');
                const position = JSON.parse(element.getAttribute('data-position') || '{}');
                
                handleElementClick(selector, position);
            });
        });
    };

    const handleSmartClick = async (zone) => {
        logger.log(`🎯 Smart click on ${zone.elementType}: ${zone.selector}`);
        
        try {
            // First click the element
            await handleElementClick(zone.selector, zone);
            
            // Only activate typing mode for non-chat elements (chat uses overlay input)
            if (['editor', 'terminal', 'input'].includes(zone.elementType)) {
                activateTypingMode(zone);
            }
            // Chat zones are handled by the overlay input in renderScreenshotWithOverlay
        } catch (error) {
            logger.error('❌ Smart click failed:', error);
        }
    };

    const handleElementClick = async (selector, position) => {
        logger.log(`🖱️ Clicking element: ${selector}`, position);
        
        try {
            // Visual feedback
            showClickFeedback();
            
            // Send click via WebSocket
            if (isConnected && webSocketService) {
                webSocketService.send(JSON.stringify({
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
                renderIDEState(result.data);
            }
        } catch (error) {
            logger.error('❌ Click failed:', error);
        }
    };

    const activateTypingMode = (zone) => {
        logger.log('🚀 Activating typing mode');
        
        // Remove existing highlights
        removeZoneHighlights();
        
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
        
        // Start typing
        startKeyboardListening();
    };

    const stopTyping = () => {
        logger.log('🛑 Stopping typing mode');
        
        // Send any pending batch before stopping
        if (typingBuffer.current) {
            sendTypingBatch();
        }
        
        // Remove highlights
        removeZoneHighlights();
        
        // Stop keyboard listening
        stopKeyboardListening();
        
        logger.log('✅ Typing mode stopped, pending batches sent');
    };

    const removeZoneHighlights = () => {
        const activeZones = document.querySelectorAll('.active-typing-zone');
        activeZones.forEach(zone => {
            zone.style.background = 'rgba(78, 140, 255, 0.1)';
            zone.style.border = '1px solid rgba(78, 140, 255, 0.3)';
            zone.style.boxShadow = 'none';
            zone.classList.remove('active-typing-zone');
        });
    };

    const startKeyboardListening = () => {
        if (typingTimeout.current) {
            clearTimeout(typingTimeout.current);
        }
        
        const listener = (e) => {
            if (!isStreaming || !currentState) return;
            
            // Stop typing on ESC
            if (e.key === 'Escape') {
                stopTyping();
                e.preventDefault();
                return;
            }
            
            // Ignore certain keys
            if (['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12'].includes(e.key)) {
                return;
            }
            
            // Send keystroke to IDE
            sendKeystrokeToIDE(e);
            e.preventDefault();
        };
        
        document.addEventListener('keydown', listener);
        typingTimeout.current = setTimeout(() => {
            document.removeEventListener('keydown', listener);
            logger.log('⌨️ Keyboard listening stopped');
        }, 1000);
        logger.log('⌨️ Keyboard listening started');
    };

    const stopKeyboardListening = () => {
        if (typingTimeout.current) {
            clearTimeout(typingTimeout.current);
        }
        logger.log('⌨️ Keyboard listening stopped');
    };

    const sendKeystrokeToIDE = (event) => {
        if (!currentState || !isConnected) return;
        
        // DON'T send keystrokes if we're in a chat zone (chat uses overlay input)
        if (currentState.elementType === 'chat') {
            logger.log('💬 Chat zone detected - skipping keyboard events (using overlay input)');
            return;
        }
        
        const { key, ctrlKey, shiftKey, altKey, metaKey } = event;
        
        // Special keys send immediately
        if (key.length > 1) {
            logger.log(`⌨️ Sending special key immediately: ${key}`);
            if (webSocketService) {
                webSocketService.send(JSON.stringify({
                    type: 'type-text',
                    payload: { 
                        text: '',
                        key: key,
                        modifiers: { ctrlKey, shiftKey, altKey, metaKey },
                        selector: currentState.selector 
                    }
                }));
            }
            return;
        }
        
        // Batch regular characters for speed
        if (key.length === 1 || key === ' ') {
            showPredictiveText(key);
            addToTypingBatch(key);
        }
    };

    const addToTypingBatch = (char) => {
        // Initialize batching if needed
        if (!typingBuffer.current) {
            typingBuffer.current = '';
        }
        
        // Add character to batch
        const newBatch = typingBuffer.current + char;
        typingBuffer.current = newBatch;
        
        // Send batch after delay OR when it gets too long
        const shouldSendNow = (
            newBatch.length >= 10 || // Max batch size
            Date.now() - (typingTimeout.current || Date.now()) > 300 // Max wait time
        );
        
        if (shouldSendNow) {
            sendTypingBatch();
        } else {
            // Wait for more characters (debounce)
            const timeout = setTimeout(() => {
                sendTypingBatch();
            }, 150); // 150ms batch window
            typingTimeout.current = timeout;
        }
    };
    
    const sendTypingBatch = () => {
        if (!typingBuffer.current || !currentState) return;
        
        const batchText = typingBuffer.current;
        logger.log(`⚡ Sending batch: "${batchText}" (${batchText.length} chars)`);
        
        // Send entire batch as one request
        if (webSocketService) {
            webSocketService.send(JSON.stringify({
                type: 'type-batch',
                payload: { 
                    text: batchText,
                    selector: currentState.selector 
                }
            }));
        }
        
        // Reset batch
        typingBuffer.current = '';
        typingTimeout.current = null;
        
        logger.log('✅ Batch sent successfully');
    };

    const showPredictiveText = (text) => {
        // Create/update predictive text indicator
        if (!predictiveIndicator.current) {
            const indicator = document.createElement('div');
            indicator.style.cssText = `
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
            document.body.appendChild(indicator);
            predictiveIndicator.current = indicator;
        }
        
        // Position near active typing zone
        if (currentState && predictiveIndicator.current) {
            const activeZone = document.querySelector('.active-typing-zone');
            if (activeZone) {
                const rect = activeZone.getBoundingClientRect();
                predictiveIndicator.current.style.left = `${rect.left + rect.width + 8}px`;
                predictiveIndicator.current.style.top = `${rect.top + (rect.height / 2) - 12}px`;
            }
        }
        
        // Accumulate typing buffer
        const newBuffer = (typingBuffer.current || '') + text;
        typingBuffer.current = newBuffer;
        
        // Limit buffer length for performance
        if (newBuffer.length > 50) {
            typingBuffer.current = '...' + newBuffer.slice(-47);
        }
        
        // Update display
        if (predictiveIndicator.current) {
            predictiveIndicator.current.innerHTML = `⌨️ <span style="font-weight: 600;">${typingBuffer.current}</span>`;
            predictiveIndicator.current.style.opacity = '1';
            predictiveIndicator.current.style.transform = 'translateY(0)';
        }
        
        // Auto-fade after delay
        if (typingTimeout.current) {
            clearTimeout(typingTimeout.current);
        }
        const timeout = setTimeout(() => {
            if (predictiveIndicator.current) {
                predictiveIndicator.current.style.opacity = '0';
                predictiveIndicator.current.style.transform = 'translateY(-5px)';
            }
            // Clear buffer after fade
            setTimeout(() => {
                typingBuffer.current = '';
            }, 200);
        }, 1500);
        typingTimeout.current = timeout;
    };

    const handleChatSubmit = (message, selector) => {
        logger.log(`📤 Sending chat message: "${message}" to ${selector}`);
        
        if (!message.trim()) return;
        
        // First send the text as batch to the IDE (so it appears in the chat input)
        if (isConnected && webSocketService) {
            webSocketService.send(JSON.stringify({
                type: 'type-batch',
                payload: { text: message.trim(), selector }
            }));
        }
        
        // Then send the message via WebSocket (to actually send it)
        if (isConnected && webSocketService) {
            webSocketService.send(JSON.stringify({
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
            logger.error('❌ Failed to send chat message via API:', error);
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
    };

    const showStatus = (message) => {
        logger.log(`📊 Status: ${message}`);
        // You can add UI status display here if needed
    };

    const showError = (message) => {
        logger.error(`❌ Error: ${message}`);
        setError(message);
    };

    const showClickFeedback = () => {
        // Visual click feedback could be added here
        logger.log('👆 Click registered');
    };

    const injectIDECSS = (cssData) => {
        if (!cssData) return;
        
        logger.log('💄 Injecting IDE CSS...', cssData);
        
        // Remove existing IDE CSS
        const existingCSS = document.querySelectorAll('.ide-mirror-css');
        existingCSS.forEach(el => el.remove());
        
        // 1. Inject external stylesheets
        if (cssData.external) {
            cssData.external.forEach((href, index) => {
                // Skip Electron-specific URLs that browser can't load
                if (href.includes('vscode-file://') || href.includes('electron://') || href.includes('app://')) {
                    logger.log(`⚠️ Skipping Electron URL: ${href}`);
                    return;
                }
                
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                
                // Handle relative URLs by adding IDE base URL
                if (href.startsWith('http')) {
                    link.href = href;
                } else {
                    // Assume relative URL from IDE - prepend localhost port
                    const idePort = currentState?.idePort || '9222';
                    link.href = `http://localhost:${idePort}${href.startsWith('/') ? '' : '/'}${href}`;
                }
                
                link.className = 'ide-mirror-css';
                link.onload = () => logger.log(`✅ Loaded external CSS: ${link.href}`);
                link.onerror = () => logger.log(`❌ Failed to load CSS: ${link.href}`);
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
        
        logger.log(`✅ CSS Injection Complete:
        - ${inlineCount} inline stylesheets ✅
        - ${externalCount - skippedElectron} external URLs ✅  
        - ${skippedElectron} Electron URLs skipped ⚠️`);
    };

    return (
        <div ref={containerRef} className="ide-mirror-container">
            {/* Streaming Controls */}
            <div className="streaming-controls-overlay">
                <StreamingControls
                    port={currentPort}
                    onStartStreaming={startStreaming}
                    onStopStreaming={stopStreaming}
                    isStreaming={isStreaming}
                    stats={streamingStats}
                />
            </div>

            {/* Canvas Renderer for Streaming */}
            {isStreaming && currentState?.screenshot && (
                <CanvasRenderer
                    width={viewportSize.width}
                    height={viewportSize.height}
                    screenshot={currentState.screenshot}
                    frameNumber={currentState.frameNumber}
                    timestamp={currentState.timestamp}
                />
            )}

            {/* Screenshot + Overlay als React-Komponente */}
            {!isStreaming && currentState?.screenshot && currentState?.body && (
                <ScreenshotWithOverlay
                    screenshot={currentState.screenshot}
                    zones={extractClickableZones(currentState.body)}
                    onZoneClick={handleSmartClick}
                />
            )}

            {/* Fallback: Nur Screenshot */}
            {!isStreaming && currentState?.screenshot && !currentState?.body && (
                <img
                    src={currentState.screenshot}
                    alt="IDE Screenshot"
                    style={{ width: '100%', height: '100%', objectFit: 'fill', display: 'block', userSelect: 'none', pointerEvents: 'none' }}
                />
            )}

            {/* Fallback: DOM-Rendering */}
            {!isStreaming && !currentState?.screenshot && (
                <div className="fallback-content">
                    <p>Kein Screenshot oder Stream verfügbar.</p>
                </div>
            )}

            {/* Loading/Error States */}
            {isLoading && (
                <div className="loading-overlay">
                    <div className="loading-spinner"></div>
                    <p>Connecting to IDE...</p>
                </div>
            )}

            {error && (
                <div className="error-overlay">
                    <p>❌ {error}</p>
                    <button onClick={() => window.location.reload()} className="retry-btn">
                        Retry
                    </button>
                </div>
            )}
        </div>
    );
}

// ScreenshotWithOverlay-Komponente
function ScreenshotWithOverlay({ screenshot, zones = [], onZoneClick }) {
    return (
        <div className="screenshot-overlay-container" style={{ position: 'relative', width: '100%', height: '100%' }}>
            <img
                src={screenshot}
                alt="IDE Screenshot"
                style={{ width: '100%', height: '100%', objectFit: 'fill', display: 'block', userSelect: 'none', pointerEvents: 'none' }}
            />
            {/* Overlays */}
            {zones.map((zone, idx) => (
                <div
                    key={idx}
                    className="clickable-zone"
                    style={{
                        position: 'absolute',
                        left: zone.x,
                        top: zone.y,
                        width: zone.width,
                        height: zone.height,
                        background: 'rgba(78, 140, 255, 0.1)',
                        border: '1px solid rgba(78, 140, 255, 0.3)',
                        cursor: 'pointer',
                        pointerEvents: 'all',
                        transition: 'all 0.2s ease',
                        zIndex: 1000
                    }}
                    onClick={e => {
                        e.preventDefault();
                        e.stopPropagation();
                        onZoneClick && onZoneClick(zone);
                    }}
                    onMouseEnter={e => {
                        e.currentTarget.style.background = 'rgba(78, 140, 255, 0.25)';
                        e.currentTarget.style.border = '2px solid rgba(78, 140, 255, 0.7)';
                        e.currentTarget.style.boxShadow = '0 0 10px rgba(78, 140, 255, 0.5)';
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.background = 'rgba(78, 140, 255, 0.1)';
                        e.currentTarget.style.border = '1px solid rgba(78, 140, 255, 0.3)';
                        e.currentTarget.style.boxShadow = 'none';
                    }}
                >
                    {/* Optional: Chat-Input-Overlay */}
                    {zone.elementType === 'chat' && (
                        <textarea
                            className="chat-input-overlay"
                            style={{
                                position: 'absolute',
                                left: 0,
                                top: 0,
                                width: '100%',
                                height: '100%',
                                background: 'rgba(0,0,0,0.8)',
                                border: '2px solid #4e8cff',
                                color: '#fff',
                                fontSize: 14,
                                resize: 'none',
                                zIndex: 1100
                            }}
                            placeholder="Type your message here..."
                            onClick={e => e.stopPropagation()}
                        />
                    )}
                </div>
            ))}
        </div>
    );
}

export default IDEMirrorComponent; 