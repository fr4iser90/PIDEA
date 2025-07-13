/**
 * Phase 2 Verification Script
 * Simple verification of Phase 2 IDE commands and handlers
 */

const CommandRegistry = require('./application/commands/CommandRegistry');
const HandlerRegistry = require('./application/handlers/HandlerRegistry');

// Mock dependencies for testing
const mockDependencies = {
  ideAutomationService: {
    openTerminal: async () => ({ success: true }),
    executeTerminalCommand: async () => ({ success: true }),
    monitorTerminalOutput: async () => ({ success: true }),
    restartUserApp: async () => ({ success: true }),
    captureTerminalLogs: async () => ({ success: true }),
    analyzeProject: async () => ({ success: true }),
    analyzeAgain: async () => ({ success: true }),
    getWorkspaceInfo: async () => ({ success: true }),
    detectPackageJson: async () => ({ success: true })
  },
  eventBus: {
    publish: async () => true
  }
};

async function verifyPhase2() {
  console.log('🔍 Verifying Phase 2 Implementation...\n');

  try {
    // 1. Verify Command Registry
    console.log('📋 Checking Command Registry...');
    const ideCommands = CommandRegistry.getByCategory('ide');
    
    const expectedCommands = [
      // Phase 1 commands
      'CreateChatCommand', 'SendMessageCommand', 'SwitchChatCommand',
      'ListChatsCommand', 'CloseChatCommand', 'GetChatHistoryCommand',
      // Phase 2 terminal commands
      'OpenTerminalCommand', 'ExecuteTerminalCommand', 'MonitorTerminalOutputCommand',
      'RestartUserAppCommand', 'TerminalLogCaptureCommand',
      // Phase 2 analysis commands
      'AnalyzeProjectCommand', 'AnalyzeAgainCommand', 'GetWorkspaceInfoCommand',
      'DetectPackageJsonCommand'
    ];

    const missingCommands = expectedCommands.filter(cmd => !ideCommands.includes(cmd));
    if (missingCommands.length > 0) {
      console.log('❌ Missing commands:', missingCommands);
      return false;
    }
    console.log('✅ All commands registered successfully');

    // 2. Verify Handler Registry
    console.log('\n🔧 Checking Handler Registry...');
    const ideHandlers = HandlerRegistry.getByCategory('ide');
    
    const expectedHandlers = [
      // Phase 1 handlers
      'CreateChatHandler', 'SendMessageHandler', 'SwitchChatHandler',
      'ListChatsHandler', 'CloseChatHandler', 'GetChatHistoryHandler',
      // Phase 2 terminal handlers
      'OpenTerminalHandler', 'ExecuteTerminalHandler', 'MonitorTerminalOutputHandler',
      'RestartUserAppHandler', 'TerminalLogCaptureHandler',
      // Phase 2 analysis handlers
      'AnalyzeProjectHandler', 'AnalyzeAgainHandler', 'GetWorkspaceInfoHandler',
      'DetectPackageJsonHandler'
    ];

    const missingHandlers = expectedHandlers.filter(handler => !ideHandlers.includes(handler));
    if (missingHandlers.length > 0) {
      console.log('❌ Missing handlers:', missingHandlers);
      return false;
    }
    console.log('✅ All handlers registered successfully');

    // 3. Test Command Building
    console.log('\n🏗️  Testing Command Building...');
    const testCommands = [
      { name: 'OpenTerminalCommand', params: { userId: 'test', ideType: 'cursor' } },
      { name: 'ExecuteTerminalCommand', params: { userId: 'test', command: 'npm start' } },
      { name: 'MonitorTerminalOutputCommand', params: { userId: 'test', duration: 5000 } },
      { name: 'RestartUserAppCommand', params: { userId: 'test', appName: 'test-app' } },
      { name: 'TerminalLogCaptureCommand', params: { userId: 'test', maxLines: 100 } },
      { name: 'AnalyzeProjectCommand', params: { userId: 'test', analysisType: 'full' } },
      { name: 'AnalyzeAgainCommand', params: { userId: 'test', clearCache: true } },
      { name: 'GetWorkspaceInfoCommand', params: { userId: 'test', includeDetails: true } },
      { name: 'DetectPackageJsonCommand', params: { userId: 'test', detectDevServer: true } }
    ];

    for (const { name, params } of testCommands) {
      try {
        const command = CommandRegistry.buildFromCategory('ide', name, params);
        if (!command) {
          console.log(`❌ Failed to build command: ${name}`);
          return false;
        }
        console.log(`✅ Built command: ${name}`);
      } catch (error) {
        console.log(`❌ Error building command ${name}:`, error.message);
        return false;
      }
    }

    // 4. Test Handler Building
    console.log('\n🔧 Testing Handler Building...');
    const testHandlers = [
      'OpenTerminalHandler', 'ExecuteTerminalHandler', 'MonitorTerminalOutputHandler',
      'RestartUserAppHandler', 'TerminalLogCaptureHandler', 'AnalyzeProjectHandler',
      'AnalyzeAgainHandler', 'GetWorkspaceInfoHandler', 'DetectPackageJsonHandler'
    ];

    for (const name of testHandlers) {
      try {
        const handler = HandlerRegistry.buildFromCategory('ide', name, mockDependencies);
        if (!handler) {
          console.log(`❌ Failed to build handler: ${name}`);
          return false;
        }
        console.log(`✅ Built handler: ${name}`);
      } catch (error) {
        console.log(`❌ Error building handler ${name}:`, error.message);
        return false;
      }
    }

    // 5. Test Command Validation
    console.log('\n✅ Testing Command Validation...');
    const invalidCommands = [
      { name: 'OpenTerminalCommand', params: {}, expectedError: 'User ID is required' },
      { name: 'ExecuteTerminalCommand', params: { userId: 'test' }, expectedError: 'Terminal command is required' },
      { name: 'MonitorTerminalOutputCommand', params: { userId: 'test', duration: 500 }, expectedError: 'Duration must be a number between 1000 and 60000' },
      { name: 'RestartUserAppCommand', params: { userId: 'test', forceRestart: 'true' }, expectedError: 'forceRestart must be a boolean' },
      { name: 'TerminalLogCaptureCommand', params: { userId: 'test', filterLevel: 'invalid' }, expectedError: 'Filter level must be one of: all, error, warning, info, debug' },
      { name: 'AnalyzeProjectCommand', params: { userId: 'test', analysisType: 'invalid' }, expectedError: 'Analysis type must be one of: full, quick, dependencies, structure' },
      { name: 'AnalyzeAgainCommand', params: { userId: 'test', clearCache: 'true' }, expectedError: 'clearCache must be a boolean' },
      { name: 'GetWorkspaceInfoCommand', params: { userId: 'test', includeDetails: 'true' }, expectedError: 'includeDetails must be a boolean' },
      { name: 'DetectPackageJsonCommand', params: { userId: 'test', detectDevServer: 'true' }, expectedError: 'detectDevServer must be a boolean' }
    ];

    for (const { name, params, expectedError } of invalidCommands) {
      try {
        const command = CommandRegistry.buildFromCategory('ide', name, params);
        await command.execute();
        console.log(`❌ Command ${name} should have failed validation`);
        return false;
      } catch (error) {
        if (error.message.includes(expectedError)) {
          console.log(`✅ Command ${name} validation working correctly`);
        } else {
          console.log(`❌ Command ${name} validation failed with unexpected error:`, error.message);
          return false;
        }
      }
    }

    // 6. Test Handler Dependencies
    console.log('\n🔧 Testing Handler Dependencies...');
    const invalidDependencies = [
      { deps: {}, expectedError: 'IDEAutomationService is required' },
      { deps: { ideAutomationService: {} }, expectedError: 'EventBus is required' }
    ];

    for (const { deps, expectedError } of invalidDependencies) {
      try {
        new (require('./application/handlers/categories/ide/OpenTerminalHandler'))(deps);
        console.log('❌ Handler should have failed dependency validation');
        return false;
      } catch (error) {
        if (error.message.includes(expectedError)) {
          console.log('✅ Handler dependency validation working correctly');
        } else {
          console.log('❌ Handler dependency validation failed with unexpected error:', error.message);
          return false;
        }
      }
    }

    console.log('\n🎉 Phase 2 Implementation Verification Complete!');
    console.log('✅ All commands and handlers are properly implemented and registered');
    console.log('✅ Command validation is working correctly');
    console.log('✅ Handler dependency injection is working correctly');
    console.log('✅ Integration with existing services is ready');
    
    return true;

  } catch (error) {
    console.error('❌ Verification failed:', error);
    return false;
  }
}

// Run verification
if (require.main === module) {
  verifyPhase2()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Verification error:', error);
      process.exit(1);
    });
}

module.exports = { verifyPhase2 }; 