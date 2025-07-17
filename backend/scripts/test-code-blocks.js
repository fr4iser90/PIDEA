const { chromium } = require('playwright');

async function testCodeBlockDetection() {
  console.log('🧪 Testing code block detection...');
  
  const browser = await chromium.launch({ 
    headless: false,
    args: ['--remote-debugging-port=9222']
  });
  
  try {
    const page = await browser.newPage();
    
    // Navigate to a test page with code blocks
    await page.goto('data:text/html,<html><body><pre><code>console.log("Hello World");</code></pre></body></html>');
    
    // Wait a moment
    await page.waitForTimeout(2000);
    
    // Test code block detection
    const codeBlocks = await page.evaluate(() => {
      const blocks = [];
      const codeElements = document.querySelectorAll('pre code, code');
      
      codeElements.forEach((element, index) => {
        blocks.push({
          type: 'code_block',
          language: 'javascript',
          content: element.textContent || '',
          confidence: 0.8,
          lineCount: element.textContent.split('\n').length,
          characterCount: element.textContent.length
        });
      });
      
      return blocks;
    });
    
    console.log('✅ Code blocks detected:', codeBlocks.length);
    console.log('📝 Code blocks:', JSON.stringify(codeBlocks, null, 2));
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

testCodeBlockDetection().catch(console.error); 