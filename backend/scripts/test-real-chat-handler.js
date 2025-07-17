const { chromium } = require('playwright');
const ChatMessageHandler = require('../domain/services/chat/ChatMessageHandler');
const IDETypes = require('../domain/services/ide/IDETypes');

async function testRealChatHandler() {
  console.log('🚀 Testing REAL ChatMessageHandler.detectCodeBlocks...');
  
  let browser;
  let browserManager;
  let chatHandler;
  
  try {
    // Connect to existing browser on port 9222
    browser = await chromium.connectOverCDP('http://localhost:9222');
    console.log('✅ Connected to browser on port 9222');
    
    // Create browser manager
    browserManager = {
      getPage: async () => {
        const contexts = browser.contexts();
        for (const context of contexts) {
          const pages = context.pages();
          if (pages.length > 0) {
            return pages[0]; // Use first available page
          }
        }
        return null;
      }
    };
    
    // Create ChatMessageHandler instance
    chatHandler = new ChatMessageHandler(browserManager, IDETypes.CURSOR);
    console.log('✅ Created ChatMessageHandler instance');
    
    // Get the page
    const page = await browserManager.getPage();
    if (!page) {
      console.log('❌ No page found!');
      return;
    }
    
    console.log('✅ Got page for testing');
    
    // Test the REAL detectCodeBlocks method
    console.log('\n🔍 Testing REAL detectCodeBlocks method...');
    
    try {
      const codeBlocks = await chatHandler.detectCodeBlocks(page);
      console.log(`✅ detectCodeBlocks returned ${codeBlocks.length} code blocks:`);
      
      codeBlocks.forEach((block, index) => {
        console.log(`\n🔧 Code Block ${index + 1}:`);
        console.log(`   Type: ${block.type}`);
        console.log(`   Language: ${block.language}`);
        console.log(`   Filename: ${block.filename || 'N/A'}`);
        console.log(`   Lines: ${block.lineCount}`);
        console.log(`   Characters: ${block.characterCount}`);
        console.log(`   Confidence: ${block.confidence}`);
        console.log(`   Has Apply Button: ${block.hasApplyButton}`);
        console.log(`   Content Preview: ${block.content.substring(0, 100)}...`);
        
        // Show FULL content for verification
        console.log(`\n   📄 FULL CONTENT:`);
        console.log(`   ${'─'.repeat(50)}`);
        console.log(block.content);
        console.log(`   ${'─'.repeat(50)}`);
        
        if (block.syntax) {
          console.log(`   Syntax Valid: ${block.syntax.isValid}`);
          console.log(`   Has Errors: ${block.syntax.hasErrors}`);
          console.log(`   Has Language Features: ${block.syntax.hasLanguageFeatures}`);
        }
      });
    } catch (error) {
      console.error(`❌ Error in detectCodeBlocks: ${error.message}`);
      console.error(error.stack);
    }
    
    // Test the REAL extractLatestAIResponse method
    console.log('\n🔍 Testing REAL extractLatestAIResponse method...');
    
    try {
      const aiResponse = await chatHandler.extractLatestAIResponse(page);
      console.log(`✅ extractLatestAIResponse returned:`);
      console.log(`   Length: ${aiResponse.length}`);
      console.log(`   Preview: ${aiResponse.substring(0, 200)}...`);
    } catch (error) {
      console.error(`❌ Error in extractLatestAIResponse: ${error.message}`);
      console.error(error.stack);
    }
    
    // Test the REAL extractInlineCode method
    console.log('\n🔍 Testing REAL extractInlineCode method...');
    
    try {
      const testContent = "Here is some `inline code` and more `code` examples.";
      const inlineCode = chatHandler.extractInlineCode(testContent);
      console.log(`✅ extractInlineCode returned ${inlineCode.length} inline code blocks:`);
      inlineCode.forEach((code, index) => {
        console.log(`\n   📄 Inline Code ${index + 1}:`);
        console.log(`   Type: ${code.type}`);
        console.log(`   Content: "${code.content}"`);
        console.log(`   Start Index: ${code.startIndex}`);
        console.log(`   End Index: ${code.endIndex}`);
        console.log(`   Pattern: ${code.pattern}`);
      });
    } catch (error) {
      console.error(`❌ Error in extractInlineCode: ${error.message}`);
      console.error(error.stack);
    }
    
    // Test the REAL isChatActive method
    console.log('\n🔍 Testing REAL isChatActive method...');
    
    try {
      const isActive = await chatHandler.isChatActive();
      console.log(`✅ isChatActive returned: ${isActive}`);
    } catch (error) {
      console.error(`❌ Error in isChatActive: ${error.message}`);
      console.error(error.stack);
    }
    
  } catch (error) {
    console.error('❌ Error during testing:', error);
    console.error(error.stack);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Run the test
testRealChatHandler().catch(console.error); 