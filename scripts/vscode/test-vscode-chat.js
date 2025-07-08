const EnhancedDOMCollector = require('../cursor/enhanced-dom-collector');

class VSCodeChatTester {
  constructor() {
    this.collector = new EnhancedDOMCollector();
  }

  async testVSCodeChat() {
    console.log('🚀 Testing VSCode Chat Integration...\n');
    
    try {
      // Initialize collector
      await this.collector.initialize();
      
      // Force switch to VSCode port 9232
      console.log('🔄 Switching to VSCode on port 9232...');
      await this.collector.browserManager.disconnect();
      await this.collector.browserManager.connect(9232);
      
      const currentPort = this.collector.browserManager.getCurrentPort();
      console.log(`📡 Connected to IDE on port ${currentPort}`);
      
      if (currentPort < 9232) {
        console.log('⚠️ Not a VSCode port (should be 9232-9241). Testing anyway...');
      }
      
      // Test 1: Focus chat input
      console.log('\n📝 Test 1: Focusing chat input...');
      await this.collector.focusChatInput();
      await this.collector.wait(1000);
      
      // Test 2: Send a test message
      console.log('\n📝 Test 2: Sending test message...');
      const testMessage = 'Hello from PIDEA VSCode integration test!';
      const sent = await this.collector.sendVSCodeChatMessage(testMessage);
      
      if (sent) {
        console.log('✅ VSCode chat message sent successfully!');
      } else {
        console.log('⚠️ Message sent with fallback method');
      }
      
      // Test 3: Trigger loading state
      console.log('\n📝 Test 3: Triggering chat loading state...');
      await this.collector.triggerChatLoading();
      
      console.log('\n🎉 VSCode Chat Integration Test Complete!');
      
    } catch (error) {
      console.error('❌ Test failed:', error.message);
      console.error(error.stack);
    } finally {
      await this.collector.cleanup();
    }
  }
}

// CLI Usage
if (require.main === module) {
  const tester = new VSCodeChatTester();
  tester.testVSCodeChat();
}

module.exports = VSCodeChatTester; 