const { chromium } = require('playwright');

async function testChatDetection() {
  console.log('🚀 Starting Cursor Chat Detection Test with Playwright...');
  
  let browser;
  try {
    // Connect to existing browser on port 9222
    browser = await chromium.connectOverCDP('http://localhost:9222');
    
    console.log('✅ Connected to browser on port 9222');
    
    // Get all contexts and pages
    const contexts = browser.contexts();
    console.log(`📄 Found ${contexts.length} contexts`);
    
    let cursorPage = null;
    
    // Find Cursor page across all contexts
    for (const context of contexts) {
      const pages = context.pages();
      console.log(`📄 Context has ${pages.length} pages`);
      
      for (const page of pages) {
        try {
          const title = await page.title();
          const url = page.url();
          console.log(`📄 Page: "${title}" - ${url}`);
          
          if (title.toLowerCase().includes('cursor') || url.includes('cursor')) {
            cursorPage = page;
            console.log('🎯 Found Cursor page!');
            break;
          }
        } catch (error) {
          console.log(`📄 Page: Error getting title/url - ${error.message}`);
        }
      }
      
      if (cursorPage) break;
    }
    
    // If no Cursor page found, use the first available page
    if (!cursorPage) {
      for (const context of contexts) {
        const pages = context.pages();
        if (pages.length > 0) {
          cursorPage = pages[0];
          console.log('⚠️  No Cursor page found, using first available page');
          break;
        }
      }
    }
    
    if (!cursorPage) {
      console.log('❌ No pages found!');
      return;
    }
    
    console.log(`\n🔍 Testing AI Message Selectors...`);
    
    // Test different AI message selectors
    const aiSelectors = [
      '.ai-message',
      '.assistant-message', 
      '.message-content-animated',
      'span.anysphere-markdown-container-root',
      '.markdown-section',
      '.message-content',
      '.chat-message'
    ];
    
    for (const selector of aiSelectors) {
      try {
        const count = await cursorPage.locator(selector).count();
        console.log(`  ${selector}: ${count} elements found`);
        
        if (count > 0) {
          const firstElement = await cursorPage.locator(selector).first();
          const text = await firstElement.textContent();
          console.log(`    Preview: "${text?.substring(0, 100)}..."`);
        }
      } catch (error) {
        console.log(`  ${selector}: ERROR - ${error.message}`);
      }
    }
    
    console.log(`\n🔍 Testing Code Block Selectors...`);
    
    // Test different code block selectors
    const codeSelectors = [
      '.composer-code-block-container',
      '.code-block',
      'pre code',
      '.monaco-editor',
      '.code-editor',
      '.syntax-highlighted',
      'pre',
      'code'
    ];
    
    for (const selector of codeSelectors) {
      try {
        const count = await cursorPage.locator(selector).count();
        console.log(`  ${selector}: ${count} elements found`);
        
        if (count > 0) {
          const firstElement = await cursorPage.locator(selector).first();
          const text = await firstElement.textContent();
          console.log(`    Preview: "${text?.substring(0, 100)}..."`);
        }
      } catch (error) {
        console.log(`  ${selector}: ERROR - ${error.message}`);
      }
    }
    
    console.log(`\n🔍 Enhanced Code Block Detection Test...`);
    
    // Test the enhanced code block detection
    const codeBlocks = await cursorPage.evaluate(() => {
      const blocks = [];
      
      // Try different selectors
      const selectors = [
        '.composer-code-block-container',
        '.code-block',
        'pre code',
        '.monaco-editor',
        'pre'
      ];
      
      for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);
        console.log(`Found ${elements.length} elements with selector: ${selector}`);
        
        elements.forEach((element, index) => {
          const content = element.textContent || element.innerText || '';
          const language = element.className || '';
          const hasSyntax = element.querySelector('.mtk1, .mtk4, .mtk14, .mtk18');
          
          blocks.push({
            selector,
            index,
            content: content.substring(0, 200),
            language: language.substring(0, 100),
            hasSyntax: !!hasSyntax,
            elementType: element.tagName,
            className: element.className
          });
        });
      }
      
      return blocks;
    });
    
    console.log(`Found ${codeBlocks.length} potential code blocks:`);
    codeBlocks.forEach((block, index) => {
      console.log(`  ${index + 1}. ${block.selector} (${block.elementType})`);
      console.log(`     Language: ${block.language}`);
      console.log(`     Has Syntax: ${block.hasSyntax}`);
      console.log(`     Content: "${block.content}..."`);
    });
    
    console.log(`\n🔍 AI Response Extraction Test...`);
    
    // Test AI response extraction
    const aiResponse = await cursorPage.evaluate(() => {
      const selectors = [
        '.ai-message',
        '.assistant-message',
        '.message-content-animated',
        'span.anysphere-markdown-container-root'
      ];
      
      for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          const lastElement = elements[elements.length - 1];
          const text = lastElement.textContent || lastElement.innerText || '';
          if (text.trim()) {
            return {
              selector,
              count: elements.length,
              text: text.substring(0, 500)
            };
          }
        }
      }
      
      return null;
    });
    
    if (aiResponse) {
      console.log(`✅ Found AI response with selector: ${aiResponse.selector}`);
      console.log(`   Count: ${aiResponse.count} messages`);
      console.log(`   Text: "${aiResponse.text}..."`);
    } else {
      console.log(`❌ No AI response found with any selector`);
    }
    
    console.log(`\n🔍 Markdown Code Block Parsing Test...`);
    
    // Test markdown ``` parsing
    const markdownBlocks = await cursorPage.evaluate(() => {
      const allText = document.body.innerText || document.body.textContent || '';
      const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
      const blocks = [];
      let match;
      
      while ((match = codeBlockRegex.exec(allText)) !== null) {
        blocks.push({
          language: match[1] || 'text',
          content: match[2].substring(0, 200),
          fullMatch: match[0].substring(0, 300)
        });
      }
      
      return blocks;
    });
    
    console.log(`Found ${markdownBlocks.length} markdown code blocks:`);
    markdownBlocks.forEach((block, index) => {
      console.log(`  ${index + 1}. Language: ${block.language}`);
      console.log(`     Content: "${block.content}..."`);
    });
    
  } catch (error) {
    console.error('❌ Error during testing:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Run the test
testChatDetection().catch(console.error); 