#!/usr/bin/env node

/**
 * CLI Test for IDE Message Sending
 * Tests if prompts are built and sent correctly to the current IDE version
 */

const { chromium } = require('playwright');
const IDETypes = require('../domain/services/ide/IDETypes');
const VersionDetectionService = require('../domain/services/ide/VersionDetectionService');
const VersionDetector = require('../infrastructure/external/ide/VersionDetector');

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
    
    console.log('\n🔍 Detecting IDE version...');
    const versionResult = await versionDetectionService.detectVersion(activePort);
    
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
    const selectors = IDETypes.getSelectorsForVersion(versionResult.ideType, versionResult.currentVersion);
    
    console.log(`✅ Selectors loaded successfully!`);
    console.log(`   Chat Input Selector: ${selectors.chatSelectors.input}`);
    console.log(`   Input Container: ${selectors.chatSelectors.inputContainer}`);
    
    // Connect to IDE via CDP
    console.log(`\n🔗 Connecting to IDE via CDP...`);
    browser = await chromium.connectOverCDP(`http://localhost:${activePort}`);
    const context = browser.contexts()[0];
    const pages = await context.pages();
    const page = pages[0];
    
    console.log(`✅ Connected to IDE!`);
    console.log(`   Page URL: ${page.url()}`);
    
    // Test message
    const testMessage = `🧪 PIDEA Test Message

This message was sent via:
- IDE Type: ${versionResult.ideType}
- IDE Version: ${versionResult.currentVersion}
- Selector: ${selectors.chatSelectors.input}
- Port: ${activePort}

If you can see this message, the automatic version detection and selector system is working correctly! 🎉`;
    
    console.log(`\n📤 Sending test message to IDE...`);
    
    // Try to find the chat input
    const chatInput = await page.$(selectors.chatSelectors.input);
    
    if (!chatInput) {
      console.log(`❌ Chat input not found with selector: ${selectors.chatSelectors.input}`);
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

// Run the test
testIDEMessageSending();
