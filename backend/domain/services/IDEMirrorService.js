const IDEManager = require('@external/ide/IDEManager');
const BrowserManager = require('@external/BrowserManager');
const Logger = require('@logging/Logger');
const logger = new Logger('Logger');


class IDEMirrorService {
    constructor(dependencies = {}) {
        this.ideManager = dependencies.ideManager;
        this.browserManager = dependencies.browserManager;
        this.isInitialized = false;
        this.lastFocusedElement = null;
        this.lastFocusTime = 0;
        this.typingMutex = false;
    }

    async connectToIDE() {
        if (!this.isInitialized) {
            await this.ideManager.initialize();
            this.isInitialized = true;
        }

        const activePort = this.ideManager.getActivePort();
        if (!activePort) {
            const availableIDEs = await this.ideManager.getAvailableIDEs();
            if (availableIDEs.length === 0) {
                throw new Error('No Cursor IDE instances found. Please start Cursor IDE first.');
            }
            
            // Use first available IDE
            await this.ideManager.switchToIDE(availableIDEs[0].port);
        }

        const activeIDE = await this.ideManager.getActiveIDE();
        logger.log(`🔌 Connecting to IDE on port ${activeIDE.port}...`);
        
        await this.browserManager.connect(activeIDE.port);
        logger.log(`✅ Connected to IDE: Port ${activeIDE.port}`);
    }

    async captureCompleteIDEState() {
        const page = await this.browserManager.getPage();
        if (!page) {
            throw new Error('No IDE connection available');
        }

        logger.log('🔍 Capturing complete IDE state...');

        try {
            // Check if page is still connected before evaluate
            if (page.isClosed()) {
                logger.log('⚠️ Page is closed, reconnecting...');
                await this.browserManager.reconnect();
                const newPage = await this.browserManager.getPage();
                if (!newPage) {
                    throw new Error('Could not reconnect to IDE');
                }
                return await this.captureCompleteIDEState(); // Retry with new page
            }

            // 1. Take screenshot first
            logger.log('📸 Taking IDE screenshot...');
            const screenshotBuffer = await page.screenshot({
                type: 'png',
                fullPage: false // Only visible area
            });
            
            // Convert to base64 for web transfer
            const screenshotBase64 = screenshotBuffer.toString('base64');
            const screenshotDataURL = `data:image/png;base64,${screenshotBase64}`;

            // 2. Get DOM structure for clickable areas
            const domStructure = await page.evaluate(() => {
            // First, capture ALL CSS from the page
            function captureAllCSS() {
                const cssData = {
                    external: [],
                    inline: [],
                    computed: []
                };
                
                // 1. External stylesheets
                Array.from(document.styleSheets).forEach(sheet => {
                    try {
                        if (sheet.href) {
                            // For Electron URLs, try to get the actual CSS content
                            if (sheet.href.includes('vscode-file://') || sheet.href.includes('electron://')) {
                                try {
                                    // Try to get CSS rules directly from the stylesheet
                                    const rules = Array.from(sheet.cssRules).map(rule => rule.cssText).join('\n');
                                    if (rules.trim()) {
                                        cssData.inline.push(rules);
                                        logger.log('✅ Extracted CSS from Electron URL:', sheet.href);
                                    }
                                } catch (e) {
                                    logger.log('⚠️ Could not extract CSS from:', sheet.href);
                                }
                            } else {
                                cssData.external.push(sheet.href);
                            }
                        } else if (sheet.cssRules) {
                            // Inline stylesheets
                            const rules = Array.from(sheet.cssRules).map(rule => rule.cssText).join('\n');
                            if (rules.trim()) {
                                cssData.inline.push(rules);
                            }
                        }
                    } catch (e) {
                        // CORS blocked stylesheets - capture what we can
                        if (sheet.href && !sheet.href.includes('vscode-file://')) {
                            cssData.external.push(sheet.href);
                        }
                    }
                });
                
                // 2. Inline styles from <style> tags
                Array.from(document.querySelectorAll('style')).forEach(styleEl => {
                    if (styleEl.textContent.trim()) {
                        cssData.inline.push(styleEl.textContent);
                    }
                });
                
                return cssData;
            }
            
            function serializeElement(element, depth = 0, maxDepth = 30) {
                if (!element || element.nodeType !== 1 || depth > maxDepth) return null;
                
                const rect = element.getBoundingClientRect();
                const computedStyle = window.getComputedStyle(element);
                
                // Generate unique selector
                let selector = '';
                if (element.id) {
                    selector = `#${element.id}`;
                } else {
                    const classes = element.className.toString().trim().split(/\s+/).filter(c => c).join('.');
                    if (classes) {
                        selector = element.tagName.toLowerCase() + '.' + classes;
                    } else {
                        selector = element.tagName.toLowerCase();
                    }
                }

                // Check if element is clickable
                const isClickable = element.onclick !== null || 
                                  element.tagName === 'BUTTON' || 
                                  element.tagName === 'A' || 
                                  element.role === 'button' ||
                                  element.getAttribute('role') === 'button' ||
                                  element.classList.contains('action-item') ||
                                  element.classList.contains('action-label') ||
                                  element.classList.contains('monaco-button') ||
                                  element.classList.contains('monaco-icon-button') ||
                                  element.classList.contains('codicon') ||
                                  element.classList.contains('tab') ||
                                  computedStyle.cursor === 'pointer' ||
                                  element.tabIndex >= 0;

                const elementData = {
                    tagName: element.tagName.toLowerCase(),
                    id: element.id || '',
                    className: element.className || '',
                    textContent: element.textContent ? element.textContent.trim().substring(0, 200) : '',
                    selector: selector,
                    position: {
                        x: Math.round(rect.left),
                        y: Math.round(rect.top),
                        width: Math.round(rect.width),
                        height: Math.round(rect.height)
                    },
                    style: {
                        display: computedStyle.display,
                        visibility: computedStyle.visibility,
                        opacity: computedStyle.opacity,
                        backgroundColor: computedStyle.backgroundColor,
                        color: computedStyle.color,
                        fontSize: computedStyle.fontSize,
                        fontFamily: computedStyle.fontFamily,
                        border: computedStyle.border,
                        padding: computedStyle.padding,
                        margin: computedStyle.margin,
                        position: computedStyle.position,
                        zIndex: computedStyle.zIndex,
                        cursor: computedStyle.cursor
                    },
                    isClickable: isClickable,
                    isVisible: rect.width >= 0 && rect.height >= 0 && 
                              computedStyle.visibility !== 'hidden' && 
                              computedStyle.display !== 'none',
                    children: []
                };

                // Recursively serialize ALL children
                if (element.children && element.children.length > 0 && depth < maxDepth) {
                    for (const child of element.children) {
                        const childData = serializeElement(child, depth + 1, maxDepth);
                        if (childData) {
                            elementData.children.push(childData);
                        }
                    }
                }

                return elementData;
            }

            const cssData = captureAllCSS();
            
            return {
                timestamp: Date.now(),
                url: window.location.href,
                title: document.title,
                body: serializeElement(document.body),
                viewport: {
                    width: window.innerWidth,
                    height: window.innerHeight
                },
                css: cssData
            };
                    });

            const activeIDE = await this.ideManager.getActiveIDE();
            domStructure.idePort = activeIDE ? activeIDE.port : null;
            
            // Add screenshot to the result
            domStructure.screenshot = screenshotDataURL;
            
            // Count total elements recursively
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
            
            const totalElements = countElements(domStructure.body);
            logger.log(`📸✅ Captured IDE: Screenshot + ${totalElements} clickable elements`);
            return domStructure;
        } catch (error) {
            logger.error('❌ Failed to capture IDE state:', error.message);
            if (error.message.includes('Target page, context or browser has been closed')) {
                logger.debug('🔄 Browser connection lost, attempting reconnect...');
                try {
                    await this.browserManager.reconnect();
                    return await this.captureCompleteIDEState(); // Retry once
                } catch (reconnectError) {
                    logger.error('❌ Reconnect failed:', reconnectError.message);
                    throw new Error('IDE connection lost and reconnect failed');
                }
            }
            throw error;
        }
    }

    async clickElementInIDE(selector, coordinates) {
        const page = await this.browserManager.getPage();
        if (!page) {
            throw new Error('No IDE connection available');
        }

        const activeIDE = await this.ideManager.getActiveIDE();
        logger.log(`🖱️ Clicking element on port ${activeIDE.port}: ${selector}`);

        try {
            // Try clicking by selector first
            const element = await page.$(selector);
            if (element) {
                const isVisible = await element.isVisible();
                if (isVisible) {
                    await element.click();
                    logger.log(`✅ Clicked element by selector: ${selector}`);
                    return true;
                }
            }

            // If selector doesn't work, try coordinates
            if (coordinates && coordinates.x >= 0 && coordinates.y >= 0) {
                await page.mouse.click(coordinates.x, coordinates.y);
                logger.log(`✅ Clicked at coordinates: ${coordinates.x}, ${coordinates.y}`);
                return true;
            }

            throw new Error(`Element not clickable: ${selector}`);
        } catch (error) {
            logger.error(`❌ Failed to click element: ${error.message}`);
            throw error;
        }
    }

    async typeInIDE(text, selector = null, key = null, modifiers = {}) {
        // Simple mutex to prevent overlapping typing operations
        if (this.typingMutex) {
            await new Promise(resolve => setTimeout(resolve, 50));
            return this.typeInIDE(text, selector, key, modifiers);
        }

        this.typingMutex = true;

        try {
            const page = await this.browserManager.getPage();
            if (!page) {
                throw new Error('No IDE connection available');
            }

            // Check if page is still connected
            if (page.isClosed()) {
                logger.debug('🔄 Page closed, attempting reconnect...');
                await this.browserManager.reconnect();
                const newPage = await this.browserManager.getPage();
                if (!newPage || newPage.isClosed()) {
                    throw new Error('Could not reconnect to IDE');
                }
                return await this.typeInIDE(text, selector, key, modifiers); // Retry
            }

            // If it's a special key or key combination
            if (key && key.length > 1) {
                logger.log(`⌨️ Sending special key: ${key} ${JSON.stringify(modifiers)}`);
                
                // Use direct CDP for special keys (more reliable)
                const cdp = await page.context().newCDPSession(page);
                
                await cdp.send('Input.dispatchKeyEvent', {
                    type: 'keyDown',
                    key: key,
                    code: key,
                    modifiers: this.getModifierBitmask(modifiers),
                    windowsVirtualKeyCode: this.getVirtualKeyCode(key)
                });
                
                await page.waitForTimeout(50);
                
                await cdp.send('Input.dispatchKeyEvent', {
                    type: 'keyUp',
                    key: key,
                    code: key,
                    modifiers: this.getModifierBitmask(modifiers),
                    windowsVirtualKeyCode: this.getVirtualKeyCode(key)
                });
                
                logger.log(`✅ Sent special key via CDP: ${key}`);
                return true;
            }
            
            // Regular text input - try direct DOM insertion first
            if (text) {
                logger.log(`⌨️ Typing "${text.substring(0, 50)}..." ${selector ? `in ${selector}` : 'at cursor'}`);
                
                // Always focus for chat elements to ensure proper input target
                const needsFocus = selector && (
                    selector.includes('composer-bar') || 
                    selector !== this.lastFocusedElement ||
                    (Date.now() - this.lastFocusTime) > 1000
                );

                if (needsFocus) {
                    logger.log(`🎯 Focusing before typing in: ${selector}`);
                    await this.focusElement(page, selector);
                    this.lastFocusedElement = selector;
                    this.lastFocusTime = Date.now();
                    await this.safeWaitForTimeout(page, 200);
                }
                
                // Skip DOM insertion - use real keyboard events for Cursor
                logger.log(`⌨️ Using real keyboard events for Cursor compatibility`);
                await page.keyboard.type(text, { delay: 30 });
                
                logger.log(`✅ Typed text: ${text.substring(0, 50)}...`);
                return true;
            }
            
            return true;
        } catch (error) {
            logger.error(`❌ Failed to type: ${error.message}`);
            throw error;
        } finally {
            this.typingMutex = false;
        }
    }

    // DOM injection removed - using real keyboard events for Cursor compatibility

    getModifierBitmask(modifiers) {
        let mask = 0;
        if (modifiers.altKey) mask |= 1;
        if (modifiers.ctrlKey) mask |= 2;
        if (modifiers.metaKey) mask |= 4;
        if (modifiers.shiftKey) mask |= 8;
        return mask;
    }

    getVirtualKeyCode(key) {
        const keyCodes = {
            'Backspace': 8, 'Tab': 9, 'Enter': 13, 'Shift': 16,
            'Control': 17, 'Alt': 18, 'Escape': 27, 'Space': 32,
            'ArrowLeft': 37, 'ArrowUp': 38, 'ArrowRight': 39, 'ArrowDown': 40,
            'Delete': 46
        };
        return keyCodes[key] || key.charCodeAt(0);
    }

    getKeyCode(char) {
        if (char >= 'a' && char <= 'z') return `Key${char.toUpperCase()}`;
        if (char >= 'A' && char <= 'Z') return `Key${char}`;
        if (char >= '0' && char <= '9') return `Digit${char}`;
        if (char === ' ') return 'Space';
        return `Key${char.toUpperCase()}`;
    }

    async safeWaitForTimeout(page, ms) {
        try {
            if (page && !page.isClosed()) {
                await page.waitForTimeout(ms);
            } else {
                // Fallback to regular timeout if page is closed
                await new Promise(resolve => setTimeout(resolve, ms));
            }
        } catch (error) {
            // If page operations fail, use regular timeout
            await new Promise(resolve => setTimeout(resolve, ms));
        }
    }

    async focusElement(page, selector) {
        // Special handling for different types of elements
        if (selector.includes('composer-bar')) {
            // For chat/composer elements, try multiple strategies
            const chatSelectors = [
                `${selector} .monaco-editor .view-lines`,
                `${selector} .monaco-editor [contenteditable="true"]`,
                `${selector} [contenteditable="true"]`,
                `${selector} textarea`,
                `${selector} input[type="text"]`,
                selector
            ];

            for (const chatSelector of chatSelectors) {
                try {
                    // First check if element exists and is the right type
                    const elementInfo = await page.evaluate((sel) => {
                        const el = document.querySelector(sel);
                        if (!el) return null;
                        
                        const isInputElement = (
                            el.contentEditable === 'true' || 
                            el.tagName === 'TEXTAREA' || 
                            el.tagName === 'INPUT'
                        );
                        
                        if (!isInputElement) return null;
                        
                        const rect = el.getBoundingClientRect();
                        return {
                            visible: rect.width > 0 && rect.height > 0,
                            focused: el === document.activeElement || el.contains(document.activeElement),
                            type: el.tagName,
                            contentEditable: el.contentEditable
                        };
                    }, chatSelector);
                    
                    if (elementInfo && elementInfo.visible) {
                        logger.log(`🎯 Targeting input element: ${chatSelector} (${elementInfo.type})`);
                        
                        // Prevent auto-scroll and click properly
                        await page.evaluate((sel) => {
                            const el = document.querySelector(sel);
                            if (el) {
                                // Prevent scrolling during focus
                                const originalScrollBehavior = document.documentElement.style.scrollBehavior;
                                document.documentElement.style.scrollBehavior = 'auto';
                                
                                // Click and focus without scrolling
                                el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
                                el.focus({ preventScroll: true });
                                
                                // Restore scroll behavior
                                setTimeout(() => {
                                    document.documentElement.style.scrollBehavior = originalScrollBehavior;
                                }, 100);
                            }
                        }, chatSelector);
                        
                        await this.safeWaitForTimeout(page, 150);
                        
                        // Verify focus
                        const isFocused = await page.evaluate((sel) => {
                            const el = document.querySelector(sel);
                            return el && (el === document.activeElement || el.contains(document.activeElement));
                        }, chatSelector);
                        
                        if (isFocused) {
                            logger.log(`✅ Successfully focused: ${chatSelector}`);
                            return true;
                        } else {
                            // Try clicking as backup
                            const element = await page.$(chatSelector);
                            if (element) {
                                await element.click({ force: true });
                                await this.safeWaitForTimeout(page, 100);
                            }
                        }
                    }
                } catch (e) {
                    logger.debug(`⚠️ Focus attempt failed for ${chatSelector}: ${e.message}`);
                }
            }
        } else {
            // Standard element focusing
            try {
                await page.evaluate((sel) => {
                    const el = document.querySelector(sel);
                    if (el) {
                        el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
                        el.focus({ preventScroll: true });
                    }
                }, selector);
                await this.safeWaitForTimeout(page, 100);
            } catch (e) {
                logger.log(`⚠️ Standard focus failed for ${selector}, trying click`);
                try {
                    await page.click(selector);
                } catch (clickError) {
                    logger.log(`⚠️ Click also failed: ${clickError.message}`);
                }
            }
        }
    }

    async focusAndTypeInIDE(selector, text, clearFirst = false) {
        const page = await this.browserManager.getPage();
        if (!page) {
            throw new Error('No IDE connection available');
        }

        logger.log(`🎯 Focus and type in ${selector}: "${text.substring(0, 50)}..."`);

        try {
            // Click to focus the element
            await page.click(selector);
            await page.waitForTimeout(300);

            // Clear existing content if requested
            if (clearFirst) {
                await page.keyboard.down('Control');
                await page.keyboard.press('a');
                await page.keyboard.up('Control');
                await page.waitForTimeout(100);
            }

            // Type new content
            await page.keyboard.type(text, { delay: 30 });
            
            logger.log(`✅ Focused and typed in ${selector}`);
            return true;

        } catch (error) {
            logger.error(`❌ Focus and type failed: ${error.message}`);
            throw error;
        }
    }

    async sendChatMessage(message) {
        const page = await this.browserManager.getPage();
        if (!page) {
            throw new Error('No IDE connection available');
        }

        logger.log(`💬 Sending chat message: "${message.substring(0, 50)}..."`);

        try {
            // Common chat input selectors in Cursor
            const chatSelectors = [
                '.chat-input textarea',
                '.composer-bar textarea',
                '[placeholder*="Ask"]',
                '[placeholder*="chat"]',
                '.chat-composer textarea'
            ];

            let chatFound = false;
            for (const selector of chatSelectors) {
                try {
                    await page.waitForSelector(selector, { timeout: 1000 });
                    await page.click(selector);
                    await page.waitForTimeout(200);
                    await page.keyboard.type(message, { delay: 30 });
                    await page.keyboard.press('Enter');
                    logger.log(`✅ Chat message sent via ${selector}`);
                    chatFound = true;
                    break;
                } catch (e) {
                    // Try next selector
                }
            }

            if (!chatFound) {
                throw new Error('Chat input not found');
            }

            return true;

        } catch (error) {
            logger.error(`❌ Failed to send chat message: ${error.message}`);
            throw error;
        }
    }

    async sendKeysToIDE(keys) {
        const page = await this.browserManager.getPage();
        if (!page) {
            throw new Error('No IDE connection available');
        }

        try {
            await page.keyboard.press(keys);
            logger.log(`✅ Sent keys: ${keys}`);
        } catch (error) {
            logger.error(`❌ Failed to send keys: ${error.message}`);
            throw error;
        }
    }

    async switchToIDE(port) {
        logger.log(`🔄 Switching to IDE on port ${port}...`);
        await this.ideManager.switchToIDE(port);
        await this.browserManager.switchToPort(port);
        logger.log(`✅ Switched to IDE on port ${port}`);
    }

    async getAvailableIDEs() {
        if (!this.isInitialized) {
            await this.ideManager.initialize();
            this.isInitialized = true;
        }
        return await this.ideManager.getAvailableIDEs();
    }

    async getActiveIDE() {
        return await this.ideManager.getActiveIDE();
    }

    async disconnect() {
        await this.browserManager.disconnect();
        logger.log('🔌 Disconnected from IDE');
    }

    isIDEConnected() {
        return this.browserManager.isConnected();
    }

    getIDEStatus() {
        return {
            ...this.ideManager.getStatus(),
            browserConnected: this.browserManager.isConnected(),
            currentPort: this.browserManager.getCurrentPort()
        };
    }
}

module.exports = IDEMirrorService; 