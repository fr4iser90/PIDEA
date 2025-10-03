#!/usr/bin/env node

/**
 * CLI Test for IDE Message Sending
 * Tests if prompts are built and sent correctly to the current IDE version
 */

require('module-alias/register');

const { chromium } = require('playwright');
const IDETypes = require('../domain/services/ide/IDETypes');
const VersionDetectionService = require('../domain/services/ide/VersionDetectionService');
const VersionDetector = require('../infrastructure/external/ide/VersionDetector');
const JSONSelectorManager = require('../domain/services/ide/JSONSelectorManager');

// Detect IDE type from User-Agent
function detectIDETypeFromUserAgent(userAgent) {
  if (!userAgent) return 'unknown';
  
  const agent = userAgent.toLowerCase();
  if (agent.includes('cursor')) return 'cursor';
  if (agent.includes('vscode')) return 'vscode';
  if (agent.includes('windsurf')) return 'windsurf';
  
  return 'unknown';
}

// Mock ResponseProcessor for CLI testing
class MockResponseProcessor {
  constructor(selectors) {
    this.selectors = selectors;
  }

  async detectAITyping(page) {
    try {
      if (this.selectors?.loadingIndicator) {
        const elements = await page.$(this.selectors.loadingIndicator);
        if (elements) return true;
      }
      return false;
    } catch (error) { 
      return false; 
    }
  }

  async extractCodeBlocks(page) {
    try {
      if (!this.selectors?.codeBlocks) {
        return [];
      }

      const codeBlocks = await page.$$(this.selectors.codeBlocks);
      const blocks = [];

      for (const block of codeBlocks) {
        try {
          // Extract code content
          let codeText = '';
          if (this.selectors.codeBlockContent) {
            const contentElements = await block.$$(this.selectors.codeBlockContent);
            if (contentElements.length > 0) {
              codeText = await contentElements[0].textContent();
            } else {
              codeText = await block.textContent();
            }
          } else {
            codeText = await block.textContent();
          }

          // Extract language if available
          let language = null;
          if (this.selectors.codeBlockLanguage) {
            try {
              const langElements = await block.$$(this.selectors.codeBlockLanguage);
              if (langElements.length > 0) {
                const langElement = langElements[0];
                const className = await langElement.getAttribute('class');
                language = className ? className.match(/javascript|python|java|typescript|json|html|css|sql|bash|sh/i)?.[0] : null;
              }
            } catch (error) {
              // Skip language detection if it fails
            }
          }

          if (codeText && codeText.trim()) {
            blocks.push({
              status: 'success',
              content: codeText.trim(),
              language: language || 'text',
              type: 'codeBlock'
            });
          }
        } catch (error) {
          // Skip individual block if it fails
          continue;
        }
      }

      return blocks;
    } catch (error) {
      console.log(`⚠️ Error extracting code blocks: ${error.message}`);
      return [];
    }
  }

  async extractInlineCode(page) {
    try {
      const selectors = [
        this.selectors?.inlineCode,
        this.selectors?.codeSpans
      ].filter(Boolean);

      if (selectors.length === 0) {
        return [];
      }

      const inlineCodeBlocks = [];
      
      for (const selector of selectors) {
        try {
          const elements = await page.$$(selector);
          
          for (const element of elements) {
            try {
              const codeText = await element.textContent();
              if (codeText && codeText.trim()) {
                inlineCodeBlocks.push({
                  status: 'success',
                  content: codeText.trim(),
                  type: 'inlineCode'
                });
              }
            } catch (error) {
              // Skip individual element if it fails
              continue;
            }
          }
        } catch (error) {
          // Skip selector if it fails
          continue;
        }
      }

      // Remove duplicates based on content
      const uniqueInlineCode = inlineCodeBlocks.filter((item, index, array) => 
        array.findIndex(other => other.content === item.content) === index
      );

      return uniqueInlineCode;
    } catch (error) {
      console.log(`⚠️ Error extracting inline code: ${error.message}`);
      return [];
    }
  }

  async extractTerminalBlocks(page) {
    try {
      const selectors = [
        this.selectors?.terminalBlocks,
        'pre[class*="bash"]',
        'pre[class*="shell"]',
        'pre[class*="terminal"]'
      ].filter(Boolean);

      const terminalBlocks = [];
      
      for (const selector of selectors) {
        try {
          const elements = await page.$$(selector);
          for (const element of elements) {
            const content = await element.textContent();
            if (content && content.trim()) {
              terminalBlocks.push({
                content: content.trim(),
                type: 'terminal'
              });
            }
          }
        } catch (error) {
          continue;
        }
      }

      return terminalBlocks;
    } catch (error) {
      console.log(`⚠️ Error extracting terminal blocks: ${error.message}`);
      return [];
    }
  }

  async extractFileReferences(page) {
    try {
      const selectors = [
        this.selectors?.fileReferences,
        'span[title*="."]',
        'a[href*="."]'
      ].filter(Boolean);

      const fileRefs = [];
      
      for (const selector of selectors) {
        try {
          const elements = await page.$$(selector);
          for (const element of elements) {
            const content = await element.textContent();
            const title = await element.getAttribute('title');
            const href = await element.getAttribute('href');
            
            if (content && content.includes('.')) {
              fileRefs.push({
                content: content.trim(),
                title: title || '',
                href: href || '',
                type: 'file'
              });
            }
          }
        } catch (error) {
          continue;
        }
      }

      return fileRefs;
    } catch (error) {
      console.log(`⚠️ Error extracting file references: ${error.message}`);
      return [];
    }
  }

  async extractUrls(page) {
    try {
      const selectors = [
        this.selectors?.urls,
        'a[href^="http"]',
        'a[href^="https"]',
        'a[href^="ftp"]'
      ].filter(Boolean);

      const urls = [];
      
      for (const selector of selectors) {
        try {
          const elements = await page.$$(selector);
          for (const element of elements) {
            const href = await element.getAttribute('href');
            const text = await element.textContent();
            
            if (href && (href.startsWith('http') || href.startsWith('ftp'))) {
              urls.push({
                url: href,
                text: text || href,
                type: 'url'
              });
            }
          }
        } catch (error) {
          continue;
        }
      }

      return urls;
    } catch (error) {
      console.log(`⚠️ Error extracting URLs: ${error.message}`);
      return [];
    }
  }

  async extractStructuredData(page) {
    try {
      const dataTypes = {
        json: [],
        css: [],
        sql: [],
        yaml: [],
        dockerfile: [],
        env: []
      };

      const typeSelectors = {
        json: [this.selectors?.jsonBlocks, 'pre[class*="json"]', 'code[class*="json"]'],
        css: [this.selectors?.cssBlocks, 'pre[class*="css"]', 'code[class*="css"]'],
        sql: [this.selectors?.sqlBlocks, 'pre[class*="sql"]', 'code[class*="sql"]'],
        yaml: [this.selectors?.yamlBlocks, 'pre[class*="yaml"]', 'code[class*="yaml"]'],
        dockerfile: [this.selectors?.dockerBlocks, 'pre[class*="dockerfile"]', 'code[class*="dockerfile"]'],
        env: [this.selectors?.envBlocks, 'pre[class*="env"]', 'code[class*="env"]']
      };

      for (const [type, selectors] of Object.entries(typeSelectors)) {
        const filteredSelectors = selectors.filter(Boolean);
        
        for (const selector of filteredSelectors) {
          try {
            const elements = await page.$$(selector);
            for (const element of elements) {
              const content = await element.textContent();
              if (content && content.trim()) {
                dataTypes[type].push({
                  content: content.trim(),
                  type: type
                });
              }
            }
          } catch (error) {
            continue;
          }
        }
      }

      return dataTypes;
    } catch (error) {
      console.log(`⚠️ Error extracting structured data: ${error.message}`);
      return { json: [], css: [], sql: [], yaml: [], dockerfile: [], env: [] };
    }
  }

  async extractListsAndTables(page) {
    try {
      const lists = [];
      const tables = [];

      // Extract lists
      const listSelectors = [
        this.selectors?.lists,
        'ul', 'ol', 'li'
      ].filter(Boolean);

      for (const selector of listSelectors) {
        try {
          const elements = await page.$$(selector);
          for (const element of elements) {
            const content = await element.textContent();
            if (content && content.trim()) {
              lists.push({
                content: content.trim(),
                tagName: await element.evaluate(el => el.tagName),
                type: 'list'
              });
            }
          }
        } catch (error) {
          continue;
        }
      }

      // Extract tables
      const tableSelectors = [
        this.selectors?.tables,
        'table', 'tr', 'td', 'th'
      ].filter(Boolean);

      for (const selector of tableSelectors) {
        try {
          const elements = await page.$$(selector);
          for (const element of elements) {
            const content = await element.textContent();
            if (content && content.trim()) {
              tables.push({
                content: content.trim(),
                tagName: await element.evaluate(el => el.tagName),
                type: 'table'
              });
            }
          }
        } catch (error) {
          continue;
        }
      }

      return { lists, tables };
    } catch (error) {
      console.log(`⚠️ Error extracting lists and tables: ${error.message}`);
      return { lists: [], tables: [] };
    }
  }

  async extractAIResponse(page) {
    try {
      // Versuche mehrere Strategien für vollständige Response-Extraktion
      const strategies = [
        // Strategy 1: Hole die NEUESTE VOLLSTÄNDIGE AI Message
        async () => {
          if (this.selectors?.aiMessages) {
            const messages = await page.$$(this.selectors.aiMessages);
            console.log(`🔍 [MockResponseProcessor] Found ${messages.length} AI messages`);
            if (messages && messages.length > 0) {
              // Suche rückwärts nach der neuesten VOLLSTÄNDIGEN Message
              for (let i = messages.length - 1; i >= 0; i--) {
                const message = messages[i];
                const text = await message.textContent();
                console.log(`🔍 [MockResponseProcessor] Checking message ${i}: "${text.substring(0, 50)}..."`);
                
                if (text && this.isValidAIResponse(text)) {
                  console.log(`✅ [MockResponseProcessor] Valid AI response found in message ${i}`);
                  return text;
                }
              }
              console.log(`🚫 [MockResponseProcessor] No valid AI response found in any message`);
            }
          }
          return null;
        },
        
        // Strategy 2: Hole das gesamte Message Container 
        async () => {
          if (this.selectors?.messagesContainer) {
            const containers = await page.$$(this.selectors.messagesContainer);
            if (containers && containers.length > 0) {
              const lastContainer = containers[containers.length - 1];
              return await lastContainer.textContent();
            }
          }
          return null;
        },
        
        // Strategy 3: Kombiniere Text + Code Blocks separat (nur LATEST)
        async () => {
          let fullText = '';
          
          // Hole nur die LATEST Text-Parts
          if (this.selectors?.aiMessages) {
            const messages = await page.$$(this.selectors.aiMessages);
            if (messages && messages.length > 0) {
              // Nur die NEUESTE Message verwenden
              const lastMessage = messages[messages.length - 1];
              const text = await lastMessage.textContent();
              if (text) fullText += text + ' ';
            }
          }
          
          // Hole Code Blocks separat (nur von der LATEST Message)
          // Wir müssen einen geschickteren Ansatz verwenden - wir schauen welche Code-Blöcke
          // im aktuellen Viewport oder der neuesten Message sind
          if (this.selectors?.codeBlocks) {
            const codeBlocks = await page.$$(this.selectors.codeBlocks);
            // Verwende nur die letzten Code-Blöcke (angenommen, dass neue unten sind)
            const latestCodeBlocks = codeBlocks.slice(-10); // Nehmen nur die letzten 10
            for (const block of latestCodeBlocks) {
              const codeText = await block.textContent();
              if (codeText) fullText += '```\n' + codeText + '\n``` ';
            }
          }
          
          // Hole Inline Code separat (nur von der LATEST Message)
          if (this.selectors?.inlineCode) {
            const inlineCodeElements = await page.$$(this.selectors.inlineCode);
            // Verwende nur die letzten Inline-Code Elemente
            const latestInlineCode = inlineCodeElements.slice(-20); // Nehmen nur die letzten 20
            for (const element of latestInlineCode) {
              const inlineCode = await element.textContent();
              if (inlineCode) fullText += '`' + inlineCode + '` ';
            }
          }
          
          return fullText.trim() || null;
        }
      ];
      
      // Probiere jede Strategy bis eine funktioniert
      for (const strategy of strategies) {
        try {
          const result = await strategy();
          if (result && result.length > 0) {
            console.log(`📋 Strategy erfolgreich: ${result.length} characters extrahiert`);
            return result;
          }
        } catch (error) {
          console.log(`⚠️ Strategy fehlgeschlagen: ${error.message}`);
          continue;
        }
      }
      
      return null;
    } catch (error) { 
      console.log(`❌ Alle Extrakions-Strategien fehlgeschlagen: ${error.message}`);
      return null; 
    }
  }

  async detectResponseComplete(page, currentText, lastLength) {
    try {
      const isTyping = await this.detectAITyping(page);
      if (currentText && currentText.length > 100 && currentText.length === lastLength && !isTyping) {
        return true;
      }
      return false;
    } catch (error) { 
      return false; 
    }
  }

  isValidAIResponse(text) {
    if (!text || text.trim().length === 0) {
      return false;
    }

    const trimmed = text.trim().toLowerCase();
    
    // Filter out common error messages and system messages
    const errorPatterns = [
      'extension host unresponsive',
      'extension host has stopped responding',
      'reload window',
      'failed',
      'timeout',
      'connection error',
      'network error',
      'error occurred',
      'an error',
      'error:',
      'error -'
    ];
    
    // If text contains error patterns, it's not a valid AI response
    for (const pattern of errorPatterns) {
      if (trimmed.includes(pattern)) {
        console.log(`🚫 [MockResponseProcessor] Filtered out error message: ${pattern}`);
        return false;
      }
    }
    
    // Valid AI responses should be longer and contain actual content
    if (trimmed.length < 10) {
      return false;
    }
    
    return true;
  }
}

async function testIDEMessageSending() {
  let browser = null;
  
  try {
    console.log('🔍 Scanning for active IDEs...\n');
    
    // Check for running IDEs on all common ports
    const ports = [
      // Cursor ports
      9222, 9223, 9224, 9225, 9226, 9227, 9228, 9229, 9230, 9231,
      // VSCode ports
      9232, 9233, 9234, 9235, 9236, 9237, 9238, 9239, 9240, 9241,
      // Windsurf ports
      9242, 9243, 9244, 9245, 9246, 9247, 9248, 9249, 9250, 9251
    ];
    
    let activePort = null;
    let versionData = null;
    
    for (const port of ports) {
      try {
        const response = await fetch(`http://localhost:${port}/json/version`);
        if (response.ok) {
          versionData = await response.json();
          activePort = port;
          console.log(`✅ Found active IDE on port: ${port}`);
          break;
        }
      } catch (e) {
        // Port not active, continue
      }
    }
    
    if (!activePort) {
      console.log('❌ No active IDE found!');
      console.log('   Please start Cursor, VSCode, or Windsurf with --remote-debugging-port=9222');
      process.exit(1);
    }
    
    // Detect IDE type and version
    const versionDetector = new VersionDetector({
      timeout: 5000,
      retries: 3,
      retryDelay: 1000
    });
    
    const versionDetectionService = new VersionDetectionService({
      versionDetector: versionDetector,
      logger: console
    });
    
    // Detect IDE type from versionData
    const ideType = detectIDETypeFromUserAgent(versionData['User-Agent']);
    
    console.log('\n🔍 Detecting IDE version...');
    const versionResult = await versionDetectionService.detectVersion(activePort, ideType);
    
    console.log(`✅ IDE Type: ${versionResult.ideType}`);
    console.log(`✅ Version: ${versionResult.currentVersion}`);
    console.log(`   Is New Version: ${versionResult.isNewVersion}`);
    console.log(`   Is Known Version: ${versionResult.isKnownVersion}`);
    
    if (!versionResult.isKnownVersion) {
      console.log(`\n⚠️  WARNING: Version ${versionResult.currentVersion} is not known!`);
      console.log('   Selectors may not be available. Please run selector collection bot first.');
      process.exit(1);
    }
    
    // Get selectors for detected version
    console.log(`\n📋 Loading selectors for ${versionResult.ideType} version ${versionResult.currentVersion}...`);
    const jsonSelectorManager = new JSONSelectorManager();
    const selectors = await jsonSelectorManager.getSelectors(versionResult.ideType, versionResult.currentVersion);
    
    console.log(`✅ Selectors loaded successfully!`);
    console.log(`   Selectors keys: ${Object.keys(selectors).join(', ')}`);
    console.log(`   Chat Input Selector: ${selectors.input}`);
    console.log(`   AI Messages Selector: ${selectors.aiMessages}`);
    
    // Connect to IDE via CDP
    console.log(`\n🔗 Connecting to IDE via CDP...`);
    browser = await chromium.connectOverCDP(`http://localhost:${activePort}`);
    const context = browser.contexts()[0];
    const pages = await context.pages();
    const page = pages[0];
    
    console.log(`✅ Connected to IDE!`);
    console.log(`   Page URL: ${page.url()}`);
    
    // Initialize ResponseProcessor for monitoring
    const responseProcessor = new MockResponseProcessor(selectors);
    
    // Choose test mode
    const testMode = process.argv.includes('--monitor') ? 'monitor' : 
                   process.argv.includes('--fulltest') ? 'fulltest' : 'basic';
    
    if (testMode === 'monitor') {
      // Send eine Test-Nachricht im Monitor-Modus
      await sendTestMessageAndStartMonitoring(page, responseProcessor, versionResult, selectors, activePort);
      return;
    }
    
    // Test message for different modes
    const testMessage = testMode === 'fulltest' ? 
      generateAIResponseTestPrompt(versionResult) :
      `🧪 PIDEA Test Message

This message was sent via:
- IDE Type: ${versionResult.ideType}
- IDE Version: ${versionResult.currentVersion}
- Selector: ${selectors.chatSelectors.input}
- Port: ${activePort}

If you can see this message, the automatic version detection and selector system is working correctly! 🎉`;
    
    console.log(`\n📤 Sending test message to IDE...`);
    
    // Try to find the chat input
    const chatInput = await page.$(selectors.input);
    
    if (!chatInput) {
      console.log(`❌ Chat input not found with selector: ${selectors.input}`);
      console.log(`   This might mean:`);
      console.log(`   1. The chat panel is not open`);
      console.log(`   2. The selectors need updating for this version`);
      console.log(`   3. The IDE version has changed`);
      process.exit(1);
    }
    
    console.log(`✅ Found chat input element!`);
    
    // Click to focus
    await chatInput.click();
    await page.waitForTimeout(500);
    
    // Type the message
    await chatInput.fill(testMessage);
    console.log(`✅ Message typed into chat input!`);
    
    // Send the message (Enter key for all IDEs)
    await chatInput.press('Enter');
    console.log(`✅ Message sent via Enter key!`);
    
    console.log(`\n🎉 SUCCESS! Message sent to ${versionResult.ideType.toUpperCase()} ${versionResult.currentVersion}!`);
    console.log(`\n✅ All systems operational:`);
    console.log(`   ✓ Version detection working`);
    console.log(`   ✓ Selectors loaded correctly`);
    console.log(`   ✓ CDP connection successful`);
    console.log(`   ✓ Message sent successfully`);
    console.log(`\nCheck your IDE chat to see the test message!`);
    
    // If full test mode, monitor the response
    if (testMode === 'fulltest') {
      console.log(`\n👀 Monitoring AI response...`);
      await monitorAndAnalyzeResponse(page, responseProcessor);
    }
    
  } catch (error) {
    console.error(`\n❌ ERROR:`, error.message);
    console.error(`\nStack trace:`);
    console.error(error.stack);
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Monitoring Functions
function generateAIResponseTestPrompt(versionResult) {
  return `🧪 PIDEA AI RESPONSE TEST MODE 🧪

Please respond with ALL of the following elements so the ResponseProcessor can detect and test everything:

1. **First**: Write a simple greeting
2. **Then**: Include a code block with JavaScript:
\`\`\`javascript
function testResponseDetection() {
  console.log("Testing AI response detection");
  return true;
}
\`\`\`

3. **Next**: Add some inline code: \`console.log("inline test")\`

4. **IMPORTANT**: Execute this terminal command in the actual terminal (not just show it as text):
\`\`\`bash
echo "Hello world"
\`\`\`

This comprehensive response will test:
- Text detection (${versionResult.ideType} ${versionResult.currentVersion})
- Code block detection  
- Inline code detection
- Terminal command EXECUTION (not just display)
- Response completion detection

Please respond with ALL elements above AND actually execute the terminal command so we can verify the ResponseProcessor works correctly.`;
}

async function sendTestMessageAndStartMonitoring(page, responseProcessor, versionResult, selectors, activePort) {
  console.log(`\n📤 Sending test message for monitoring...`);
  
  // Use the same test message as fulltest
  const testMessage = generateAIResponseTestPrompt(versionResult);
  
  // Try to find the chat input
  const chatInput = await page.$(selectors.input);
  
  if (!chatInput) {
    console.log(`❌ Chat input not found - continuing with monitoring only`);
    console.log(`   Manually send a message in your IDE to test monitoring`);
  } else {
    console.log(`✅ Found chat input element!`);
    
    // Click to focus
    await chatInput.click();
    await page.waitForTimeout(500);
    
    // Type the message
    await chatInput.fill(testMessage);
    console.log(`✅ Test message typed!`);
    
    // Send the message (Enter key for all IDEs)
    await chatInput.press('Enter');
    console.log(`✅ Test message sent! Now monitoring ALL responses...`);
  }
  
  // Now start continuous monitoring
  await runResponseMonitoring(page, responseProcessor, versionResult);
}

async function runResponseMonitoring(page, responseProcessor, versionResult) {
  console.log('\n📡 Starting Response Monitoring Mode...');
  console.log('🖥️  Open your IDE chat and send ANY message');
  console.log('👀 This tool will monitor AI responses in real-time');
  console.log(`🎯 Target: ${versionResult.ideType} ${versionResult.currentVersion}`);
  console.log('⏹️  Press Ctrl+C to stop monitoring\n');
  
  let lastLogTime = 0;
  let monitorCount = 0;
  let lastResponseLength = 0;
  let lastResponseChangeTime = Date.now();
  
      const monitorInterval = setInterval(async () => {
        monitorCount++;
        
        try {
          const isTyping = await responseProcessor.detectAITyping(page);
          const response = await responseProcessor.extractAIResponse(page);
          
          const now = Date.now();
          const timeSinceLastLog = now - lastLogTime;
          const timeSinceLastChange = now - lastResponseChangeTime;
          
          // Smart Exit: Wenn Response sich seit > 15 Sekunden nicht geändert hat UND wir eine Response haben
          if (response && response.length > 0 && response.length === lastResponseLength && timeSinceLastChange > 15000) {
            console.log(`[${new Date().toLocaleTimeString()}] 🛑 SMART EXIT: Response unchanged for ${Math.round(timeSinceLastChange/1000)}s`);
            console.log(`[${new Date().toLocaleTimeString()}] 📊 Final Response Stats:`);
            console.log(`   ✓ Length: ${response.length} chars`);
            console.log(`   ✓ Stable for: ${Math.round(timeSinceLastChange/1000)} seconds`);
            console.log(`   ✓ Response appears complete`);
            clearInterval(monitorInterval);
            process.exit(0);
          }
          
          // Update change tracking
          if (response && response.length !== lastResponseLength) {
            lastResponseLength = response.length;
            lastResponseChangeTime = now;
          }
          
          if ((isTyping && timeSinceLastLog > 2000) || (!isTyping && response && timeSinceLastLog > 5000)) {
            const timestamp = new Date().toLocaleTimeString();
            
            if (isTyping) {
              console.log(`[${timestamp}] ⌨️  🤖 AI TIPPEN ERKANNT! Generating Response...`);
              lastLogTime = now;
            } else if (response && response.length > 0) {
              console.log(`[${timestamp}] 📝 📨 AI RESPONSE: ${response.length} chars`);
              
              // Vollständige Analyse der Response
              console.log(`[${timestamp}] 📄 FULL Content Analysis:`);
              console.log(`[${timestamp}] 📊 Text content: "${response.substring(0, Math.min(200, response.length))}${response.length > 200 ? '...' : ''}"`);
              
              // Enhanced ALL-Element Detection using ResponseProcessor
              let codeBlocks = [];
              let inlineCode = [];
              let terminalBlocks = [];
              let fileReferences = [];
              let urls = [];
              let structuredData = {};
              let listsAndTables = {};
              
              try {
                codeBlocks = await responseProcessor.extractCodeBlocks(page);
                inlineCode = await responseProcessor.extractInlineCode(page);
                terminalBlocks = await responseProcessor.extractTerminalBlocks(page);
                fileReferences = await responseProcessor.extractFileReferences(page);
                urls = await responseProcessor.extractUrls(page);
                structuredData = await responseProcessor.extractStructuredData(page);
                listsAndTables = await responseProcessor.extractListsAndTables(page);
                
                if (codeBlocks.length > 0) {
                  console.log(`[${timestamp}] 🔷 CODE BLOCKS DETECTED: ${codeBlocks.length} blocks`);
                  codeBlocks.forEach((block, i) => {
                    console.log(`[${timestamp}] 🔷 Block ${i+1}: ${block.language} (${block.content.length} chars)`);
                    console.log(`[${timestamp}] 🔷 Content: "${block.content.substring(0, Math.min(100, block.content.length))}${block.content.length > 100 ? '...' : ''}"`);
                  });
                } else {
                  console.log(`[${timestamp}] ⚪ No code blocks found`);
                }
                
                if (inlineCode.length > 0) {
                  console.log(`[${timestamp}] 📌 INLINE CODE: ${inlineCode.length} snippets`);
                  inlineCode.forEach((snippet, i) => {
                    console.log(`[${timestamp}] 📌 Snippet ${i+1}: "${snippet.content}"`);
                  });
                } else {
                  console.log(`[${timestamp}] ⚪ No inline code found`);
                }

                if (terminalBlocks.length > 0) {
                  console.log(`[${timestamp}] 🖥️ TERMINAL BLOCKS: ${terminalBlocks.length} blocks`);
                  terminalBlocks.forEach((block, i) => {
                    console.log(`[${timestamp}] 💻 Terminal ${i+1}: "${block.content.substring(0, Math.min(100, block.content.length))}${block.content.length > 100 ? '...' : ''}"`);
                  });
                } else {
                  console.log(`[${timestamp}] ⚪ No terminal blocks found`);
                }

                if (fileReferences.length > 0) {
                  console.log(`[${timestamp}] 📁 FILE REFERENCES: ${fileReferences.length} files`);
                  fileReferences.forEach((file, i) => {
                    console.log(`[${timestamp}] 📄 File ${i+1}: "${file.content}"`);
                  });
                } else {
                  console.log(`[${timestamp}] ⚪ No file references found`);
                }

                if (urls.length > 0) {
                  console.log(`[${timestamp}] 🔗 URLs: ${urls.length} links`);
                  urls.forEach((url, i) => {
                    console.log(`[${timestamp}] 🌐 URL ${i+1}: "${url.url}"`);
                  });
                } else {
                  console.log(`[${timestamp}] ⚪ No URLs found`);
                }

                const totalStructured = Object.values(structuredData).flat().length;
                if (totalStructured > 0) {
                  console.log(`[${timestamp}] 📊 STRUCTURED DATA: ${totalStructured} blocks`);
                  Object.entries(structuredData).forEach(([type, blocks]) => {
                    if (blocks.length > 0) {
                      console.log(`[${timestamp}] 📋 ${type.toUpperCase()}: ${blocks.length} blocks`);
                    }
                  });
                } else {
                  console.log(`[${timestamp}] ⚪ No structured data found`);
                }

                const totalLists = listsAndTables.lists.length;
                const totalTables = listsAndTables.tables.length;
                if (totalLists > 0 || totalTables > 0) {
                  console.log(`[${timestamp}] 📋 LISTS & TABLES: ${totalLists} lists, ${totalTables} tables`);
                } else {
                  console.log(`[${timestamp}] ⚪ No lists or tables found`);
                }
              } catch (error) {
                console.log(`[${timestamp}] ⚠️ Error in enhanced code detection: ${error.message}`);
                
                // Fallback to old text-based detection
                const codeBlockMatches = response.match(/```[\s\S]*?```/g);
                if (codeBlockMatches) {
                  console.log(`[${timestamp}] 🔷 CODE BLOCKS (FALLBACK): ${codeBlockMatches.length} blocks`);
                  codeBlockMatches.forEach((block, i) => {
                    const lines = block.split('\n');
                    const lang = lines[0].replace('```', '').trim();
                    console.log(`[${timestamp}] 🔷 Block ${i+1}: ${lang} (${block.length} chars)`);
                  });
                } else {
                  console.log(`[${timestamp}] ⚪ No code blocks found (fallback)`);
                }
                
                const inlineMatches = response.match(/`[^`]+`/g);
                if (inlineMatches) {
                  console.log(`[${timestamp}] 📌 INLINE CODE (FALLBACK): ${inlineMatches.length} snippets`);
                  inlineMatches.forEach((snippet, i) => {
                    console.log(`[${timestamp}] 📌 Snippet ${i+1}: "${snippet}"`);
                  });
                } else {
                  console.log(`[${timestamp}] ⚪ No inline code found (fallback)`);
                }
              }
              
              // Let the Smart Exit system handle completion detection
              // (Removed detectResponseComplete call - using Smart Exit instead)
              
              if (response.includes('✅') || response.includes('completed')) {
                console.log(`[${timestamp}] 🎯 Possible completion signals found`);
              }
              
              lastLogTime = now;
            } else if (monitorCount % 15 === 0) {
              console.log(`[${timestamp}] ⚪ 🔍 Monitoring aktiv - keine AI Activity detected...`);
              lastLogTime = now;
            }
          }
      
    } catch (error) {
      console.log(`⚠️  Monitoring error: ${error.message}`);
    }
  }, 1000);

  process.on('SIGINT', () => {
    console.log('\n\n⏹️  Stopping response monitoring...');
    clearInterval(monitorInterval);
    process.exit(0);
  });

  await new Promise(() => {});
}

async function monitorAndAnalyzeResponse(page, responseProcessor) {
  const startTime = Date.now();
  let responseReceived = false;
  let stableCount = 0;
  let lastLength = 0;
  let lastStableTime = Date.now();
  
  console.log('🔍 Monitoring response for 5 minutes (AI kann lange brauchen!)...');
  
  // Erhöhe Zeitout auf 5 Minuten wie im echten ResponseProcessor
  while (Date.now() - startTime < 300000) {
    try {
      const isTyping = await responseProcessor.detectAITyping(page);
      const response = await responseProcessor.extractAIResponse(page);
      
      if (response && response.length > 0) {
        if (!responseReceived) {
          console.log(`📝 Initial response detected: ${response.length} characters`);
          responseReceived = true;
          lastStableTime = Date.now();
        }
        
        if (response.length !== lastLength) {
          console.log(`📈 Response growing: ${response.length} characters`);
          stableCount = 0;
          lastStableTime = Date.now(); // Neues Wachstum = neue Zeit starten
        } else if (lastLength > 0) {
          stableCount++;
          console.log(`⏸️  Response stable (${stableCount}/3) - seit ${Math.round((Date.now() - lastStableTime)/1000)}s`);
        }
        
        lastLength = response.length;
        
        // Mehr konservative Prüfung: NUR wenn AI nicht mehr tippt UND 
        // Text seit mindestens 10 Sekunden stabil ist
        const stableDuration = (Date.now() - lastStableTime) / 1000;
        const isComplete = await responseProcessor.detectResponseComplete(page, response, lastLength);
        
        if (isComplete || (!isTyping && stableDuration > 10)) {
          console.log('✅ Response vollständig! AI hat aufgehört zu tippen + Text stabil lange genug!');
          console.log(`📊 Final response: "${response}"`);
          return { success: true, response };
        }
      }
      
      await page.waitForTimeout(1000);
    } catch (error) {
      console.log(`⚠️  Error monitoring response: ${error.message}`);
      await page.waitForTimeout(1000);
    }
  }
  
  console.log('⏰ 5 Minuten Timeout erreicht - monitoring stopped');
  return { success: false, error: 'Timeout' };
}

// Command line help
if (process.argv.includes('--help')) {
  console.log('📖 Usage:');
  console.log('  node backend/cli/test-ide-message-sending.js           # Basic test');
  console.log('  node backend/cli/test-ide-message-sending.js --fulltest # Full AI response test');
  console.log('  node backend/cli/test-ide-message-sending.js --monitor   # Response monitoring mode');
  console.log('  node backend/cli/test-ide-message-sending.js --help       # This help');
  process.exit(0);
}

// Run the test
testIDEMessageSending();
