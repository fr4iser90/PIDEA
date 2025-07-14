
require('module-alias/register');

const IDEDetector = require('@external/IDEDetector');
const IDEManager = require('@external/IDEManager');
const BrowserManager = require('@external/BrowserManager');
const Logger = require('@logging/Logger');
const logger = new Logger('Logger');

async function testPortDetection() {
  logger.debug('🔍 Testing Port Detection...\n');

  try {
    // 1. Test IDEDetector
    logger.debug('1️⃣ Testing IDEDetector...');
    const detector = new IDEDetector();
    const availableIDEs = await detector.scanForIDEs();
    logger.info('Available IDEs found:', availableIDEs);
    logger.info('');

    // 2. Test IDEManager
    logger.debug('2️⃣ Testing IDEManager...');
    const manager = new IDEManager();
    const managerIDEs = await manager.getAvailableIDEs();
    logger.info('IDEManager available IDEs:', managerIDEs);
    logger.info('IDEManager active port:', manager.getActivePort());
    logger.info('');

    // 3. Test BrowserManager
    logger.debug('3️⃣ Testing BrowserManager...');
    const browserManager = new BrowserManager();
    logger.info('BrowserManager current port:', browserManager.getCurrentPort());
    logger.info('');

    // 4. Test switching between available IDEs
    if (availableIDEs.length > 1) {
      logger.debug('4️⃣ Testing IDE switching...');
      for (const ide of availableIDEs) {
        logger.info(`Switching to IDE on port ${ide.port}...`);
        try {
          await manager.switchToIDE(ide.port);
          logger.info(`✅ Successfully switched to port ${ide.port}`);
          logger.info(`Active port is now: ${manager.getActivePort()}`);
        } catch (error) {
          logger.info(`❌ Failed to switch to port ${ide.port}: ${error.message}`);
        }
        logger.info('');
      }
    }

    // 5. Test BrowserManager connection
    logger.debug('5️⃣ Testing BrowserManager connection...');
    if (availableIDEs.length > 0) {
      const firstIDE = availableIDEs[0];
      logger.debug(`Attempting to connect to port ${firstIDE.port}...`);
      try {
        await browserManager.connect(firstIDE.port);
        logger.info(`✅ Successfully connected to port ${firstIDE.port}`);
        logger.info(`BrowserManager current port: ${browserManager.getCurrentPort()}`);
      } catch (error) {
        logger.info(`❌ Failed to connect to port ${firstIDE.port}: ${error.message}`);
      }
    }

  } catch (error) {
    logger.error('❌ Test failed:', error);
  }
}

// Run the test
testPortDetection().then(() => {
  logger.debug('✅ Port detection test completed');
  process.exit(0);
}).catch((error) => {
  logger.error('❌ Test failed:', error);
  process.exit(1);
}); 