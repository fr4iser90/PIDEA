require('module-alias/register');
const Application = require('./Application');

async function main() {
  const app = new Application({
    port: process.env.PORT || 3000
  });

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n[SIGINT] Received, shutting down gracefully...');
    await app.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\n[SIGTERM] Received, shutting down gracefully...');
    await app.stop();
    process.exit(0);
  });

  try {
    await app.start();
  } catch (error) {
    console.error('[Main] Failed to start application:', error);
    process.exit(1);
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  main();
}

module.exports = { Application, main }; 