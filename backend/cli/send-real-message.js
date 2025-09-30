#!/usr/bin/env node

/**
 * Send a REAL message to the current IDE
 */

const { chromium } = require('playwright');
const IDETypes = require('../domain/services/ide/IDETypes');

async function sendRealMessage() {
  let browser = null;
  
  try {
    console.log('🔗 Connecting to Cursor on port 9222...');
    
    // Connect to Cursor
    browser = await chromium.connectOverCDP('http://localhost:9222');
    const context = browser.contexts()[0];
    const pages = await context.pages();
    const page = pages[0];
    
    console.log('✅ Connected to Cursor!');
    console.log('   Page URL:', page.url());
    
    // Get the Cursor selector
    const selectors = IDETypes.getSelectorsForVersion('cursor', '1.5.7');
    
    console.log('📋 Using selector:', selectors.chatSelectors.input);
    
    // Test message
    const testMessage = '🎉 PIDEA Test Message - This was sent automatically via the new version detection system! If you can see this, everything is working perfectly!';
    
    console.log('📤 Sending message:', testMessage);
    
    // Find and click the chat input
    const chatInput = await page.$(selectors.chatSelectors.input);
    
    if (!chatInput) {
      console.log('❌ Chat input not found! Make sure the chat panel is open in Cursor.');
      return;
    }
    
    console.log('✅ Found chat input!');
    
    // Click to focus
    await chatInput.click();
    await page.waitForTimeout(500);
    
    // Type the message
    await chatInput.fill(testMessage);
    console.log('✅ Message typed!');
    
    // Send with Enter
    await chatInput.press('Enter');
    console.log('✅ Message sent with Enter key!');
    
    console.log('\n🎉 SUCCESS! Message sent to your Cursor IDE!');
    console.log('   Check your Cursor chat panel to see the message!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

sendRealMessage();
