const IDEDetector = require('./infrastructure/external/IDEDetector');
const IDEManager = require('./infrastructure/external/IDEManager');
const BrowserManager = require('./infrastructure/external/BrowserManager');

async function testPortDetection() {
  console.log('🔍 Testing Port Detection...\n');

  try {
    // 1. Test IDEDetector
    console.log('1️⃣ Testing IDEDetector...');
    const detector = new IDEDetector();
    const availableIDEs = await detector.scanForIDEs();
    console.log('Available IDEs found:', availableIDEs);
    console.log('');

    // 2. Test IDEManager
    console.log('2️⃣ Testing IDEManager...');
    const manager = new IDEManager();
    const managerIDEs = await manager.getAvailableIDEs();
    console.log('IDEManager available IDEs:', managerIDEs);
    console.log('IDEManager active port:', manager.getActivePort());
    console.log('');

    // 3. Test BrowserManager
    console.log('3️⃣ Testing BrowserManager...');
    const browserManager = new BrowserManager();
    console.log('BrowserManager current port:', browserManager.getCurrentPort());
    console.log('');

    // 4. Test switching between available IDEs
    if (availableIDEs.length > 1) {
      console.log('4️⃣ Testing IDE switching...');
      for (const ide of availableIDEs) {
        console.log(`Switching to IDE on port ${ide.port}...`);
        try {
          await manager.switchToIDE(ide.port);
          console.log(`✅ Successfully switched to port ${ide.port}`);
          console.log(`Active port is now: ${manager.getActivePort()}`);
        } catch (error) {
          console.log(`❌ Failed to switch to port ${ide.port}: ${error.message}`);
        }
        console.log('');
      }
    }

    // 5. Test BrowserManager connection
    console.log('5️⃣ Testing BrowserManager connection...');
    if (availableIDEs.length > 0) {
      const firstIDE = availableIDEs[0];
      console.log(`Attempting to connect to port ${firstIDE.port}...`);
      try {
        await browserManager.connect(firstIDE.port);
        console.log(`✅ Successfully connected to port ${firstIDE.port}`);
        console.log(`BrowserManager current port: ${browserManager.getCurrentPort()}`);
      } catch (error) {
        console.log(`❌ Failed to connect to port ${firstIDE.port}: ${error.message}`);
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testPortDetection().then(() => {
  console.log('✅ Port detection test completed');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Test failed:', error);
  process.exit(1);
}); 