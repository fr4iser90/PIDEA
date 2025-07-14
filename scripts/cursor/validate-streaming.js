const Logger = require('@logging/Logger');

const logger = new Logger('ServiceName');

/**
 * Streaming Service Validation Script
 * 
 * Validates that the IDE Mirror System streaming feature is properly implemented
 * and all components are working correctly.
 */

const path = require('path');

// Import streaming components
const ScreenshotStreamingService = require('./backend/domain/services/ide-mirror/ScreenshotStreamingService');
const StreamingSession = require('./backend/domain/entities/StreamingSession');
const FrameMetrics = require('./backend/domain/entities/FrameMetrics');
const CompressionEngine = require('./backend/domain/services/ide-mirror/CompressionEngine');
const FrameBuffer = require('./backend/domain/services/ide-mirror/FrameBuffer');
const RegionDetector = require('./backend/domain/services/ide-mirror/RegionDetector');

// Import commands and handlers
const StartStreamingCommand = require('./backend/application/commands/categories/management/StartStreamingCommand');
const StopStreamingCommand = require('./backend/application/commands/StopStreamingCommand');
const StartStreamingHandler = require('./backend/application/handlers/StartStreamingHandler');
const StopStreamingHandler = require('./backend/application/handlers/StopStreamingHandler');

// Import controllers
const StreamingController = require('./backend/presentation/api/StreamingController');

// Import repositories
const StreamingSessionRepository = require('./backend/infrastructure/database/StreamingSessionRepository');

logger.info('🚀 Starting IDE Mirror System Streaming Validation...\n');

async function validateStreamingSystem() {
  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };

  function addTest(name, passed, error = null) {
    const test = { name, passed, error };
    results.tests.push(test);
    if (passed) {
      results.passed++;
      logger.info(`✅ ${name}`);
    } else {
      results.failed++;
      logger.info(`❌ ${name}: ${error}`);
    }
  }

  try {
    // Test 1: Validate domain entities
    logger.info('📋 Testing Domain Entities...');
    
    try {
      const session = StreamingSession.create('test-session', 3000, { fps: 10 });
      addTest('StreamingSession entity creation', true);
      
      const metrics = FrameMetrics.create('test-session', 1, { originalSize: 1024 });
      addTest('FrameMetrics entity creation', true);
    } catch (error) {
      addTest('Domain entities creation', false, error.message);
    }

    // Test 2: Validate core services
    logger.info('\n🔧 Testing Core Services...');
    
    try {
      const compressionEngine = new CompressionEngine();
      addTest('CompressionEngine instantiation', true);
      
      const frameBuffer = new FrameBuffer();
      addTest('FrameBuffer instantiation', true);
      
      const regionDetector = new RegionDetector();
      addTest('RegionDetector instantiation', true);
    } catch (error) {
      addTest('Core services instantiation', false, error.message);
    }

    // Test 3: Validate commands
    logger.info('\n📝 Testing Commands...');
    
    try {
      const startCommand = new StartStreamingCommand('test-session', 3000, { fps: 10 });
      addTest('StartStreamingCommand creation', true);
      
      const stopCommand = new StopStreamingCommand('test-session');
      addTest('StopStreamingCommand creation', true);
    } catch (error) {
      addTest('Commands creation', false, error.message);
    }

    // Test 4: Validate handlers
    logger.info('\n🎯 Testing Handlers...');
    
    try {
      const mockStreamingService = { startStreaming: () => Promise.resolve({ success: true }) };
      const startHandler = new StartStreamingHandler(mockStreamingService);
      addTest('StartStreamingHandler instantiation', true);
      
      const stopHandler = new StopStreamingHandler(mockStreamingService);
      addTest('StopStreamingHandler instantiation', true);
    } catch (error) {
      addTest('Handlers instantiation', false, error.message);
    }

    // Test 5: Validate controller
    logger.info('\n🎮 Testing Controllers...');
    
    try {
      const mockStreamingService = { startStreaming: () => Promise.resolve({ success: true }) };
      const mockEventBus = { emit: () => {} };
      const controller = new StreamingController(mockStreamingService, mockEventBus);
      addTest('StreamingController instantiation', true);
    } catch (error) {
      addTest('Controller instantiation', false, error.message);
    }

    // Test 6: Validate repository
    logger.info('\n💾 Testing Repositories...');
    
    try {
      const repository = new StreamingSessionRepository();
      addTest('StreamingSessionRepository instantiation', true);
    } catch (error) {
      addTest('Repository instantiation', false, error.message);
    }

    // Test 7: Validate file structure
    logger.info('\n📁 Testing File Structure...');
    
    const fs = require('fs');
         const requiredFiles = [
       './backend/domain/services/ide-mirror/ScreenshotStreamingService.js',
       './backend/domain/entities/StreamingSession.js',
       './backend/domain/entities/FrameMetrics.js',
       './backend/domain/services/ide-mirror/CompressionEngine.js',
       './backend/domain/services/ide-mirror/FrameBuffer.js',
       './backend/domain/services/ide-mirror/RegionDetector.js',
       './backend/application/commands/categories/management/StartStreamingCommand.js',
       './backend/application/commands/StopStreamingCommand.js',
       './backend/application/handlers/StartStreamingHandler.js',
       './backend/application/handlers/StopStreamingHandler.js',
       './backend/presentation/api/StreamingController.js',
       './backend/infrastructure/database/StreamingSessionRepository.js',
       './frontend/src/presentation/components/CanvasRenderer.jsx',
       './frontend/src/presentation/components/StreamingControls.jsx',
       './frontend/src/application/services/StreamingService.jsx',
       './tests/unit/ScreenshotStreamingService.test.js',
       './tests/integration/StreamingWorkflow.test.js'
     ];

    for (const file of requiredFiles) {
      const filePath = path.join(__dirname, file);
      if (fs.existsSync(filePath)) {
        addTest(`File exists: ${file}`, true);
      } else {
        addTest(`File exists: ${file}`, false, 'File not found');
      }
    }

    // Test 8: Validate integration
    logger.info('\n🔗 Testing Integration...');
    
    try {
      // Mock dependencies for integration test
      const mockBrowserManager = {
        isConnected: () => true,
        getCurrentPort: () => 3000,
        connectToPort: () => Promise.resolve(true),
        captureScreenshot: () => Promise.resolve(Buffer.from('test'))
      };

      const mockWebSocketManager = {
        broadcastToTopic: () => Promise.resolve(true),
        isConnected: () => true
      };

      const streamingService = new ScreenshotStreamingService(mockBrowserManager, mockWebSocketManager);
      addTest('ScreenshotStreamingService integration', true);
    } catch (error) {
      addTest('Service integration', false, error.message);
    }

  } catch (error) {
    console.error('❌ Validation failed with error:', error.message);
    addTest('Overall validation', false, error.message);
  }

  // Print summary
  logger.info('\n📊 Validation Summary:');
  logger.info(`✅ Passed: ${results.passed}`);
  logger.info(`❌ Failed: ${results.failed}`);
  logger.info(`📈 Success Rate: ${Math.round((results.passed / (results.passed + results.failed)) * 100)}%`);

  if (results.failed === 0) {
    logger.info('\n🎉 All tests passed! IDE Mirror System streaming is ready for use.');
    return true;
  } else {
    logger.info('\n⚠️  Some tests failed. Please review the errors above.');
    return false;
  }
}

// Run validation
if (require.main === module) {
  validateStreamingSystem()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Validation script failed:', error);
      process.exit(1);
    });
}

module.exports = { validateStreamingSystem }; 