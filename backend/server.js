
require('module-alias/register');
const Application = require('./Application');
const Logger = require('@logging/Logger');
const logger = new Logger('Logger');

async function main() {
  const app = new Application({
    port: process.env.PORT || 3000
  });

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    logger.log('\n[SIGINT] Received, shutting down gracefully...');
    await app.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    logger.log('\n[SIGTERM] Received, shutting down gracefully...');
    await app.stop();
    process.exit(0);
  });

  try {
    await app.start();
  } catch (error) {
    logger.error('[Main] Failed to start application:', error);
    process.exit(1);
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  main();
}

module.exports = { Application, main }; 