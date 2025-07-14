#!/usr/bin/env node

/**
 * Final Logging Consistency Script
 * Ensures complete uniformity in logging across all services
 */

require('module-alias/register');
const fs = require('fs');
const path = require('path');

// Files that still need consistency fixes
const consistencyFixes = [
  {
    file: 'backend/infrastructure/auto/AutoSecurityManager.js',
    patterns: [
      // Remove double service names
      { from: /\[AutoSecurityManager\] \[AutoSecurityManager\]/g, to: '[AutoSecurityManager]' },
      // Ensure consistent emoji usage
      { from: /\[AutoSecurityManager\] 🔐/g, to: '[AutoSecurityManager] 🔐' },
      { from: /\[AutoSecurityManager\] 🌍/g, to: '[AutoSecurityManager] 🌍' },
      { from: /\[AutoSecurityManager\] ✅/g, to: '[AutoSecurityManager] ✅' }
    ]
  },
  {
    file: 'backend/infrastructure/di/ServiceRegistry.js',
    patterns: [
      // Fix double service names
      { from: /\[Logger\] \[ServiceRegistry\]/g, to: '[ServiceRegistry]' },
      { from: /\[Logger\] \[ServiceContainer\]/g, to: '[ServiceContainer]' },
      // Add emojis for consistency
      { from: /\[ServiceRegistry\] Registering all services\.\.\./g, to: '[ServiceRegistry] 🔧 Registering all services...' },
      { from: /\[ServiceRegistry\] All services registered successfully/g, to: '[ServiceRegistry] ✅ All services registered successfully' },
      { from: /\[ServiceContainer\] Registered service:/g, to: '[ServiceContainer] 📝 Registered service:' },
      { from: /\[ServiceContainer\] Registered singleton:/g, to: '[ServiceContainer] 🔒 Registered singleton:' }
    ]
  },
  {
    file: 'backend/infrastructure/di/ProjectContextService.js',
    patterns: [
      { from: /\[Logger\] \[ProjectContextService\]/g, to: '[ProjectContextService]' },
      { from: /\[Logger\] \[ServiceContainer\]/g, to: '[ServiceContainer]' },
      { from: /\[ProjectContextService\] Detected monorepo/g, to: '[ProjectContextService] 🏗️ Detected monorepo' },
      { from: /\[ServiceContainer\] Project context updated:/g, to: '[ServiceContainer] 🔄 Project context updated:' }
    ]
  },
  {
    file: 'backend/domain/repositories/SQLiteTaskRepository.js',
    patterns: [
      { from: /\[Logger\] ✅ \[SQLiteTaskRepository\]/g, to: '[SQLiteTaskRepository] ✅' },
      { from: /\[Logger\] \[SQLiteTaskSessionRepository\]/g, to: '[SQLiteTaskSessionRepository]' },
      { from: /\[SQLiteTaskSessionRepository\] Initialized successfully/g, to: '[SQLiteTaskSessionRepository] ✅ Initialized successfully' }
    ]
  },
  {
    file: 'backend/domain/services/auto-finish/AutoFinishSystem.js',
    patterns: [
      { from: /\[AutoFinishSystem\] Git service not available/g, to: '[AutoFinishSystem] ⚠️ Git service not available' },
      { from: /\[AutoFinishSystem\] Initializing auto-finish system\.\.\./g, to: '[AutoFinishSystem] 🚀 Initializing auto-finish system...' },
      { from: /\[AutoFinishSystem\] Auto-finish system initialized successfully/g, to: '[AutoFinishSystem] ✅ Auto-finish system initialized successfully' }
    ]
  },
  {
    file: 'backend/domain/services/auto-finish/TodoParser.js',
    patterns: [
      { from: /\[TodoParser\] Initializing TODO parser\.\.\./g, to: '[TodoParser] 📝 Initializing TODO parser...' },
      { from: /\[TodoParser\] Loaded \d+ parsing patterns/g, to: '[TodoParser] ✅ Loaded parsing patterns' }
    ]
  },
  {
    file: 'backend/domain/services/auto-finish/ConfirmationSystem.js',
    patterns: [
      { from: /\[ConfirmationSystem\] Initializing confirmation system\.\.\./g, to: '[ConfirmationSystem] 🤖 Initializing confirmation system...' },
      { from: /\[ConfirmationSystem\] Loaded \d+ languages/g, to: '[ConfirmationSystem] ✅ Loaded languages' }
    ]
  },
  {
    file: 'backend/domain/services/auto-finish/FallbackDetection.js',
    patterns: [
      { from: /\[FallbackDetection\] Initializing fallback detection system\.\.\./g, to: '[FallbackDetection] 🔄 Initializing fallback detection system...' },
      { from: /\[FallbackDetection\] Loaded \d+ languages/g, to: '[FallbackDetection] ✅ Loaded languages' }
    ]
  },
  {
    file: 'backend/domain/services/auto-finish/TaskSequencer.js',
    patterns: [
      { from: /\[TaskSequencer\] Initializing task sequencer\.\.\./g, to: '[TaskSequencer] ⚡ Initializing task sequencer...' },
      { from: /\[TaskSequencer\] Loaded \d+ dependency patterns/g, to: '[TaskSequencer] ✅ Loaded dependency patterns' }
    ]
  },
  {
    file: 'backend/domain/services/auto-test/AutoTestFixSystem.js',
    patterns: [
      { from: /\[AutoTestFixSystem\] Initializing\.\.\./g, to: '[AutoTestFixSystem] 🧪 Initializing...' },
      { from: /\[AutoTestFixSystem\] Initialized successfully/g, to: '[AutoTestFixSystem] ✅ Initialized successfully' }
    ]
  },
  {
    file: 'backend/domain/services/auto-test/TestAnalyzer.js',
    patterns: [
      { from: /\[TestAnalyzer\] Initialized/g, to: '[TestAnalyzer] ✅ Initialized' }
    ]
  },
  {
    file: 'backend/domain/services/auto-test/TestFixer.js',
    patterns: [
      { from: /\[TestFixer\] Initialized/g, to: '[TestFixer] ✅ Initialized' }
    ]
  },
  {
    file: 'backend/domain/services/auto-test/CoverageAnalyzer.js',
    patterns: [
      { from: /\[CoverageAnalyzer\] Initialized/g, to: '[CoverageAnalyzer] ✅ Initialized' }
    ]
  },
  {
    file: 'backend/domain/steps/StepRegistry.js',
    patterns: [
      { from: /\[Logger\] 🚀 Initializing step system\.\.\./g, to: '[StepRegistry] 🚀 Initializing step system...' },
      { from: /\[Logger\] ✅ Step "([^"]+)" registered successfully/g, to: '[StepRegistry] ✅ Step "$1" registered successfully' },
      { from: /\[Logger\] 📦 Loaded \d+ steps from categories/g, to: '[StepRegistry] 📦 Loaded steps from categories' },
      { from: /\[Logger\] ✅ Step system initialized successfully/g, to: '[StepRegistry] ✅ Step system initialized successfully' }
    ]
  },
  {
    file: 'backend/domain/services/ide/IDEManager.js',
    patterns: [
      { from: /\[Logger\] \[IDEManager\]/g, to: '[IDEManager]' },
      { from: /\[Logger\] \[IDEConfigManager\]/g, to: '[IDEConfigManager]' },
      { from: /\[Logger\] \[IDEDetectorFactory\]/g, to: '[IDEDetectorFactory]' },
      { from: /\[Logger\] \[FileBasedWorkspaceDetector\]/g, to: '[FileBasedWorkspaceDetector]' },
      { from: /\[Logger\] \[BrowserManager\]/g, to: '[BrowserManager]' },
      { from: /\[Logger\] \[EventBus\]/g, to: '[EventBus]' },
      { from: /\[Logger\] \[IDEWorkspaceDetectionService\]/g, to: '[IDEWorkspaceDetectionService]' },
      // Add emojis for consistency
      { from: /\[IDEManager\] Initializing\.\.\./g, to: '[IDEManager] 🚀 Initializing...' },
      { from: /\[IDEManager\] Initialization complete/g, to: '[IDEManager] ✅ Initialization complete' },
      { from: /\[IDEConfigManager\] Configuration loaded successfully/g, to: '[IDEConfigManager] ✅ Configuration loaded successfully' },
      { from: /\[IDEDetectorFactory\] Detected \d+ IDEs total/g, to: '[IDEDetectorFactory] 🔍 Detected IDEs total' },
      { from: /\[BrowserManager\] Switching to port/g, to: '[BrowserManager] 🔄 Switching to port' },
      { from: /\[BrowserManager\] Connecting to/g, to: '[BrowserManager] 🔗 Connecting to' },
      { from: /\[BrowserManager\] Successfully connected to/g, to: '[BrowserManager] ✅ Successfully connected to' },
      { from: /\[BrowserManager\] Disconnected from/g, to: '[BrowserManager] ❌ Disconnected from' },
      { from: /\[EventBus\] Publishing event:/g, to: '[EventBus] 📡 Publishing event:' },
      { from: /\[IDEWorkspaceDetectionService\] Starting workspace detection/g, to: '[IDEWorkspaceDetectionService] 🔍 Starting workspace detection' },
      { from: /\[IDEWorkspaceDetectionService\] Workspace detection completed/g, to: '[IDEWorkspaceDetectionService] ✅ Workspace detection completed' }
    ]
  },
  {
    file: 'backend/domain/services/ide/IDEPortManager.js',
    patterns: [
      { from: /\[IDEPortManager\] Initializing\.\.\./g, to: '[IDEPortManager] 🚀 Initializing...' },
      { from: /\[IDEPortManager\] Selecting active port\.\.\./g, to: '[IDEPortManager] 🎯 Selecting active port...' },
      { from: /\[IDEPortManager\] Validating port:/g, to: '[IDEPortManager] ✅ Validating port:' },
      { from: /\[IDEPortManager\] Using first available port:/g, to: '[IDEPortManager] 🎯 Using first available port:' },
      { from: /\[IDEPortManager\] Setting active port:/g, to: '[IDEPortManager] 🔧 Setting active port:' },
      { from: /\[IDEPortManager\] Active port set successfully:/g, to: '[IDEPortManager] ✅ Active port set successfully:' },
      { from: /\[IDEPortManager\] Initialization complete/g, to: '[IDEPortManager] ✅ Initialization complete' }
    ]
  },
  {
    file: 'backend/domain/services/ide/IDEHealthMonitor.js',
    patterns: [
      { from: /\[IDEHealthMonitor\] Registered IDE/g, to: '[IDEHealthMonitor] 📊 Registered IDE' },
      { from: /\[IDEHealthMonitor\] Starting health monitoring/g, to: '[IDEHealthMonitor] 🏥 Starting health monitoring' }
    ]
  },
  {
    file: 'backend/domain/services/ide/detectors/CursorDetector.js',
    patterns: [
      { from: /\[CursorDetector\] Scanning for Cursor IDEs/g, to: '[CursorDetector] 🔍 Scanning for Cursor IDEs' },
      { from: /\[CursorDetector\] Found/g, to: '[CursorDetector] ✅ Found' }
    ]
  },
  {
    file: 'backend/domain/services/ide/detectors/VSCodeDetector.js',
    patterns: [
      { from: /\[VSCodeDetector\] Scanning for VSCode IDEs/g, to: '[VSCodeDetector] 🔍 Scanning for VSCode IDEs' },
      { from: /\[VSCodeDetector\] Found/g, to: '[VSCodeDetector] ✅ Found' }
    ]
  },
  {
    file: 'backend/domain/services/ide/detectors/WindsurfDetector.js',
    patterns: [
      { from: /\[WindsurfDetector\] Scanning for Windsurf IDEs/g, to: '[WindsurfDetector] 🔍 Scanning for Windsurf IDEs' },
      { from: /\[WindsurfDetector\] Found/g, to: '[WindsurfDetector] ✅ Found' }
    ]
  },
  {
    file: 'backend/domain/services/ide/FileBasedWorkspaceDetector.js',
    patterns: [
      { from: /\[FileBasedWorkspaceDetector\] Current project:/g, to: '[FileBasedWorkspaceDetector] 📁 Current project:' },
      { from: /\[FileBasedWorkspaceDetector\] Found existing files/g, to: '[FileBasedWorkspaceDetector] 📄 Found existing files' },
      { from: /\[FileBasedWorkspaceDetector\] Reading workspace files/g, to: '[FileBasedWorkspaceDetector] 📖 Reading workspace files' },
      { from: /\[FileBasedWorkspaceDetector\] Workspace files read/g, to: '[FileBasedWorkspaceDetector] ✅ Workspace files read' },
      { from: /\[FileBasedWorkspaceDetector\] Found existing workspace data/g, to: '[FileBasedWorkspaceDetector] 📊 Found existing workspace data' },
      { from: /\[FileBasedWorkspaceDetector\] Using cached workspace info/g, to: '[FileBasedWorkspaceDetector] 💾 Using cached workspace info' }
    ]
  },
  {
    file: 'backend/domain/services/ide/IDEMirrorController.js',
    patterns: [
      { from: /\[IDEMirrorController\] Setting up routes\.\.\./g, to: '[IDEMirrorController] 🛣️ Setting up routes...' },
      { from: /\[IDEMirrorController\] Streaming controller available:/g, to: '[IDEMirrorController] 🎥 Streaming controller available:' },
      { from: /\[IDEMirrorController\] Streaming controller not available/g, to: '[IDEMirrorController] ⚠️ Streaming controller not available' },
      { from: /\[IDEMirrorController\] Initializing streaming services\.\.\./g, to: '[IDEMirrorController] 🚀 Initializing streaming services...' },
      { from: /\[IDEMirrorController\] Browser manager available:/g, to: '[IDEMirrorController] 🌐 Browser manager available:' },
      { from: /\[IDEMirrorController\] WebSocket manager available:/g, to: '[IDEMirrorController] 📡 WebSocket manager available:' },
      { from: /\[IDEMirrorController\] Event bus available:/g, to: '[IDEMirrorController] 📢 Event bus available:' },
      { from: /\[IDEMirrorController\] Streaming services initialized successfully/g, to: '[IDEMirrorController] ✅ Streaming services initialized successfully' },
      { from: /\[IDEMirrorController\] Registering port-based streaming routes\.\.\./g, to: '[IDEMirrorController] 🔧 Registering port-based streaming routes...' },
      { from: /\[IDEMirrorController\] Port-based streaming routes registered successfully/g, to: '[IDEMirrorController] ✅ Port-based streaming routes registered successfully' }
    ]
  },
  {
    file: 'backend/domain/services/streaming/ScreenshotStreamingService.js',
    patterns: [
      { from: /\[Logger\] \[ScreenshotStreamingService\]/g, to: '[ScreenshotStreamingService]' },
      { from: /\[ScreenshotStreamingService\] Initialized with port-based architecture/g, to: '[ScreenshotStreamingService] 🎥 Initialized with port-based architecture' }
    ]
  },
  {
    file: 'backend/domain/services/workflow/BranchStrategy.js',
    patterns: [
      { from: /\[Logger\] \[BranchStrategy\]/g, to: '[BranchStrategy]' },
      { from: /\[BranchStrategy\] Initialized branch strategies:/g, to: '[BranchStrategy] 🌿 Initialized branch strategies:' }
    ]
  },
  {
    file: 'backend/domain/services/monitoring/ResourceManager.js',
    patterns: [
      { from: /ResourceManager: Resource monitoring started/g, to: '[ResourceManager] 📊 Resource monitoring started' }
    ]
  },
  {
    file: 'backend/domain/services/monitoring/ExecutionCache.js',
    patterns: [
      { from: /ExecutionCache: Cleanup interval started/g, to: '[ExecutionCache] 🧹 Cleanup interval started' }
    ]
  },
  {
    file: 'backend/domain/services/monitoring/ExecutionMetrics.js',
    patterns: [
      { from: /ExecutionMetrics: Metrics collection started/g, to: '[ExecutionMetrics] 📈 Metrics collection started' }
    ]
  },
  {
    file: 'backend/domain/services/monitoring/ExecutionMonitor.js',
    patterns: [
      { from: /ExecutionMonitor: Started monitoring/g, to: '[ExecutionMonitor] 👁️ Started monitoring' }
    ]
  },
  {
    file: 'backend/domain/services/command/CommandBus.js',
    patterns: [
      { from: /\[CommandBus\] Registered handler for command:/g, to: '[CommandBus] 📝 Registered handler for command:' }
    ]
  },
  // NEW: Fix Application logging
  {
    file: 'backend/Application.js',
    patterns: [
      { from: /\[Application\] \[Application\] Starting\.\.\./g, to: '[Application] 🚀 Starting...' },
      { from: /\[Application\] \[Application\] Initializing\.\.\./g, to: '[Application] 🔧 Initializing...' },
      { from: /\[Application\] \[Application\] Initializing database\.\.\./g, to: '[Application] 💾 Initializing database...' },
      { from: /\[Application\] \[Application\] Database connected:/g, to: '[Application] ✅ Database connected:' },
      { from: /\[Application\] \[Application\] Initializing infrastructure\.\.\./g, to: '[Application] 🏗️ Initializing infrastructure...' },
      { from: /\[Application\] \[Application\] Infrastructure initialized with DI/g, to: '[Application] ✅ Infrastructure initialized with DI' },
      { from: /\[Application\] \[Application\] Initializing domain services with DI\.\.\./g, to: '[Application] 🔧 Initializing domain services with DI...' },
      { from: /\[Application\] \[Application\] Setting up project context\.\.\./g, to: '[Application] 📁 Setting up project context...' },
      { from: /\[Application\] \[Application\] Project context validated successfully/g, to: '[Application] ✅ Project context validated successfully' },
      { from: /\[Application\] \[Application\] Step Registry initialized/g, to: '[Application] ✅ Step Registry initialized' },
      { from: /\[Application\] \[Application\] Domain services initialized with DI/g, to: '[Application] ✅ Domain services initialized with DI' },
      { from: /\[Application\] \[Application\] Initializing application handlers with DI\.\.\./g, to: '[Application] 🔧 Initializing application handlers with DI...' },
      { from: /\[Application\] \[Application\] Application handlers initialized \(legacy removed\)/g, to: '[Application] ✅ Application handlers initialized (legacy removed)' },
      { from: /\[Application\] \[Application\] Initializing presentation layer\.\.\./g, to: '[Application] 🎨 Initializing presentation layer...' },
      { from: /\[Application\] \[Application\] Presentation layer initialized/g, to: '[Application] ✅ Presentation layer initialized' },
      { from: /\[Application\] \[Application\] Setting up middleware\.\.\./g, to: '[Application] 🔧 Setting up middleware...' },
      { from: /\[Application\] \[Application\] Setting up routes\.\.\./g, to: '[Application] 🛣️ Setting up routes...' },
      { from: /\[Application\] \[Application\] Routes setup complete/g, to: '[Application] ✅ Routes setup complete' },
      { from: /\[Application\] \[Application\] Setting up event handlers\.\.\./g, to: '[Application] 📡 Setting up event handlers...' },
      { from: /\[Application\] \[Application\] EventBus available, setting up subscriptions\.\.\./g, to: '[Application] 📡 EventBus available, setting up subscriptions...' },
      { from: /\[Application\] \[Application\] Event handlers setup complete/g, to: '[Application] ✅ Event handlers setup complete' },
      { from: /\[Application\] \[Application\] Setting up cleanup tasks\.\.\./g, to: '[Application] 🧹 Setting up cleanup tasks...' },
      { from: /\[Application\] \[Application\] Cleanup tasks setup complete/g, to: '[Application] ✅ Cleanup tasks setup complete' },
      { from: /\[Application\] \[Application\] Initialization complete/g, to: '[Application] ✅ Initialization complete' },
      { from: /\[Application\] \[Application\] Server running on port/g, to: '[Application] 🌐 Server running on port' },
      { from: /\[Application\] \[Application\] Environment:/g, to: '[Application] 🌍 Environment:' },
      { from: /\[Application\] \[Application\] Database:/g, to: '[Application] 💾 Database:' },
      { from: /\[Application\] \[Application\] Auto-security:/g, to: '[Application] 🔐 Auto-security:' },
      { from: /\[Application\] \[Application\] Checking if workspace detection is needed\.\.\./g, to: '[Application] 🔍 Checking if workspace detection is needed...' },
      { from: /\[Application\] \[Application\] No existing detection data found, starting workspace detection\.\.\./g, to: '[Application] 🔍 No existing detection data found, starting workspace detection...' },
      { from: /\[Application\] \[Application\] Workspace detection completed:/g, to: '[Application] ✅ Workspace detection completed:' }
    ]
  },
  // NEW: Fix WebSocketManager logging
  {
    file: 'backend/presentation/websocket/WebSocketManager.js',
    patterns: [
      { from: /\[WebSocketManager\] Initializing WebSocket server\.\.\./g, to: '[WebSocketManager] 📡 Initializing WebSocket server...' },
      { from: /\[WebSocketManager\] ✅ WebSocket server initialized/g, to: '[WebSocketManager] ✅ WebSocket server initialized' }
    ]
  },
  // NEW: Fix double service names in IDE services
  {
    file: 'backend/domain/services/ide/IDEPortManager.js',
    patterns: [
      // Remove double service names
      { from: /\[IDEPortManager\] \[IDEPortManager\]/g, to: '[IDEPortManager]' },
      { from: /\[IDEPortManager\] performHealthCheck:/g, to: '[IDEPortManager] 🏥 performHealthCheck:' },
      { from: /\[IDEPortManager\] Health check result for port/g, to: '[IDEPortManager] 📊 Health check result for port' },
      { from: /\[IDEPortManager\] Port manager selected active IDE/g, to: '[IDEPortManager] 🎯 Port manager selected active IDE' }
    ]
  },
  {
    file: 'backend/domain/services/ide/IDEMirrorController.js',
    patterns: [
      // Remove double service names
      { from: /\[IDEMirrorController\] \[IDEMirrorController\]/g, to: '[IDEMirrorController]' }
    ]
  },
  {
    file: 'backend/domain/services/ide/IDEHealthMonitor.js',
    patterns: [
      // Remove double service names
      { from: /\[IDEHealthMonitor\] \[IDEHealthMonitor\]/g, to: '[IDEHealthMonitor]' }
    ]
  },
  {
    file: 'backend/domain/services/ide/detectors/CursorDetector.js',
    patterns: [
      // Remove double service names
      { from: /\[CursorDetector\] \[CursorDetector\]/g, to: '[CursorDetector]' }
    ]
  },
  {
    file: 'backend/domain/services/ide/detectors/VSCodeDetector.js',
    patterns: [
      // Remove double service names
      { from: /\[VSCodeDetector\] \[VSCodeDetector\]/g, to: '[VSCodeDetector]' }
    ]
  },
  {
    file: 'backend/domain/services/ide/detectors/WindsurfDetector.js',
    patterns: [
      // Remove double service names
      { from: /\[WindsurfDetector\] \[WindsurfDetector\]/g, to: '[WindsurfDetector]' }
    ]
  },
  {
    file: 'backend/domain/services/ide/IDEWorkspaceDetectionService.js',
    patterns: [
      // Remove double service names
      { from: /\[IDEWorkspaceDetectionService\] \[IDEWorkspaceDetectionService\]/g, to: '[IDEWorkspaceDetectionService]' }
    ]
  }
];

function fixConsistency(filePath, patterns) {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  File not found: ${filePath}`);
      return false;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    for (const pattern of patterns) {
      if (pattern.from instanceof RegExp) {
        if (pattern.from.test(content)) {
          content = content.replace(pattern.from, pattern.to);
          modified = true;
        }
      } else {
        if (content.includes(pattern.from)) {
          content = content.replace(pattern.from, pattern.to);
          modified = true;
        }
      }
    }

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Fixed consistency: ${filePath}`);
      return true;
    } else {
      console.log(`ℹ️  No consistency issues: ${filePath}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error fixing consistency in ${filePath}:`, error.message);
    return false;
  }
}

function main() {
  console.log('🎯 Final Logging Consistency Script\n');
  
  let fixedCount = 0;
  let totalFiles = consistencyFixes.length;

  for (const fixConfig of consistencyFixes) {
    if (fixConsistency(fixConfig.file, fixConfig.patterns)) {
      fixedCount++;
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Files processed: ${totalFiles}`);
  console.log(`   Files fixed: ${fixedCount}`);
  console.log(`   Success rate: ${((fixedCount / totalFiles) * 100).toFixed(1)}%`);
  
  if (fixedCount > 0) {
    console.log('\n🎉 Logging consistency improved!');
    console.log('   Restart your application to see the unified logging format.');
  } else {
    console.log('\nℹ️  All files already have consistent logging.');
  }
}

if (require.main === module) {
  main();
}

module.exports = { fixConsistency, consistencyFixes }; 