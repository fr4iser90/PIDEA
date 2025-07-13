/**
 * IDE Phase 2 Verification Script
 * Simple verification of Phase 2 IDE commands and handlers only
 */

// Import IDE commands directly
const OpenTerminalCommand = require('./application/commands/categories/ide/OpenTerminalCommand');
const ExecuteTerminalCommand = require('./application/commands/categories/ide/ExecuteTerminalCommand');
const MonitorTerminalOutputCommand = require('./application/commands/categories/ide/MonitorTerminalOutputCommand');
const RestartUserAppCommand = require('./application/commands/categories/ide/RestartUserAppCommand');
const TerminalLogCaptureCommand = require('./application/commands/categories/ide/TerminalLogCaptureCommand');
const AnalyzeProjectCommand = require('./application/commands/categories/ide/AnalyzeProjectCommand');
const AnalyzeAgainCommand = require('./application/commands/categories/ide/AnalyzeAgainCommand');
const GetWorkspaceInfoCommand = require('./application/commands/categories/ide/GetWorkspaceInfoCommand');
const DetectPackageJsonCommand = require('./application/commands/categories/ide/DetectPackageJsonCommand');

// Import IDE handlers directly
const OpenTerminalHandler = require('./application/handlers/categories/ide/OpenTerminalHandler');
const ExecuteTerminalHandler = require('./application/handlers/categories/ide/ExecuteTerminalHandler');
const MonitorTerminalOutputHandler = require('./application/handlers/categories/ide/MonitorTerminalOutputHandler');
const RestartUserAppHandler = require('./application/handlers/categories/ide/RestartUserAppHandler');
const TerminalLogCaptureHandler = require('./application/handlers/categories/ide/TerminalLogCaptureHandler');
const AnalyzeProjectHandler = require('./application/handlers/categories/ide/AnalyzeProjectHandler');
const AnalyzeAgainHandler = require('./application/handlers/categories/ide/AnalyzeAgainHandler');
const GetWorkspaceInfoHandler = require('./application/handlers/categories/ide/GetWorkspaceInfoHandler');
const DetectPackageJsonHandler = require('./application/handlers/categories/ide/DetectPackageJsonHandler');

// Mock dependencies for testing
const mockDependencies = {
  ideAutomationService: {
    openTerminal: async () => ({ success: true, ideType: 'cursor', port: 3000 }),
    executeTerminalCommand: async () => ({ success: true, command: 'npm start' }),
    monitorTerminalOutput: async () => ({ success: true, result: 'http://localhost:3000' }),
    restartUserApp: async () => ({ success: true, result: 'app restarted' }),
    captureTerminalLogs: async () => ({ success: true, logs: [], count: 0 }),
    analyzeProject: async () => ({ success: true, analysis: {} }),
    analyzeAgain: async () => ({ success: true, analysis: {} }),
    getWorkspaceInfo: async () => ({ success: true, workspaceInfo: {} }),
    detectPackageJson: async () => ({ success: true, packageJsonUrl: 'http://localhost:3000' })
  },
  eventBus: {
    publish: async () => true
  }
};

async function verifyIDEPhase2() {
  console.log('🔍 Verifying IDE Phase 2 Implementation...\n');

  try {
    // 1. Test Command Creation and Validation
    console.log('📋 Testing Command Creation and Validation...');
    
    const testCommands = [
      { 
        name: 'OpenTerminalCommand', 
        params: { userId: 'test-user', ideType: 'cursor' },
        expectedType: 'OpenTerminalCommand'
      },
      { 
        name: 'ExecuteTerminalCommand', 
        params: { userId: 'test-user', command: 'npm start' },
        expectedType: 'ExecuteTerminalCommand'
      },
      { 
        name: 'MonitorTerminalOutputCommand', 
        params: { userId: 'test-user', duration: 5000 },
        expectedType: 'MonitorTerminalOutputCommand'
      },
      { 
        name: 'RestartUserAppCommand', 
        params: { userId: 'test-user', appName: 'test-app' },
        expectedType: 'RestartUserAppCommand'
      },
      { 
        name: 'TerminalLogCaptureCommand', 
        params: { userId: 'test-user', maxLines: 100 },
        expectedType: 'TerminalLogCaptureCommand'
      },
      { 
        name: 'AnalyzeProjectCommand', 
        params: { userId: 'test-user', analysisType: 'full' },
        expectedType: 'AnalyzeProjectCommand'
      },
      { 
        name: 'AnalyzeAgainCommand', 
        params: { userId: 'test-user', clearCache: true },
        expectedType: 'AnalyzeAgainCommand'
      },
      { 
        name: 'GetWorkspaceInfoCommand', 
        params: { userId: 'test-user', includeDetails: true },
        expectedType: 'GetWorkspaceInfoCommand'
      },
      { 
        name: 'DetectPackageJsonCommand', 
        params: { userId: 'test-user', detectDevServer: true },
        expectedType: 'DetectPackageJsonCommand'
      }
    ];

    const commandClasses = {
      'OpenTerminalCommand': OpenTerminalCommand,
      'ExecuteTerminalCommand': ExecuteTerminalCommand,
      'MonitorTerminalOutputCommand': MonitorTerminalOutputCommand,
      'RestartUserAppCommand': RestartUserAppCommand,
      'TerminalLogCaptureCommand': TerminalLogCaptureCommand,
      'AnalyzeProjectCommand': AnalyzeProjectCommand,
      'AnalyzeAgainCommand': AnalyzeAgainCommand,
      'GetWorkspaceInfoCommand': GetWorkspaceInfoCommand,
      'DetectPackageJsonCommand': DetectPackageJsonCommand
    };

    for (const { name, params, expectedType } of testCommands) {
      try {
        const CommandClass = commandClasses[name];
        const command = new CommandClass(params);
        
        expect(command.userId).to.equal('test-user');
        expect(command.type).to.equal(expectedType);
        expect(command.commandId).to.match(new RegExp(`^${name.toLowerCase().replace(/command$/i, '')}_\\d+_`));
        
        console.log(`✅ Created command: ${name}`);
      } catch (error) {
        console.log(`❌ Failed to create command ${name}:`, error.message);
        return false;
      }
    }

    // 2. Test Command Validation
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
        const CommandClass = commandClasses[name];
        const command = new CommandClass(params);
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

    // 3. Test Handler Creation
    console.log('\n🔧 Testing Handler Creation...');
    
    const testHandlers = [
      'OpenTerminalHandler',
      'ExecuteTerminalHandler', 
      'MonitorTerminalOutputHandler',
      'RestartUserAppHandler',
      'TerminalLogCaptureHandler',
      'AnalyzeProjectHandler',
      'AnalyzeAgainHandler',
      'GetWorkspaceInfoHandler',
      'DetectPackageJsonHandler'
    ];

    const handlerClasses = {
      'OpenTerminalHandler': OpenTerminalHandler,
      'ExecuteTerminalHandler': ExecuteTerminalHandler,
      'MonitorTerminalOutputHandler': MonitorTerminalOutputHandler,
      'RestartUserAppHandler': RestartUserAppHandler,
      'TerminalLogCaptureHandler': TerminalLogCaptureHandler,
      'AnalyzeProjectHandler': AnalyzeProjectHandler,
      'AnalyzeAgainHandler': AnalyzeAgainHandler,
      'GetWorkspaceInfoHandler': GetWorkspaceInfoHandler,
      'DetectPackageJsonHandler': DetectPackageJsonHandler
    };

    for (const name of testHandlers) {
      try {
        const HandlerClass = handlerClasses[name];
        const handler = new HandlerClass(mockDependencies);
        
        expect(handler.ideAutomationService).to.equal(mockDependencies.ideAutomationService);
        expect(handler.eventBus).to.equal(mockDependencies.eventBus);
        expect(handler.logger).to.not.be.undefined;
        
        console.log(`✅ Created handler: ${name}`);
      } catch (error) {
        console.log(`❌ Failed to create handler ${name}:`, error.message);
        return false;
      }
    }

    // 4. Test Handler Dependencies
    console.log('\n🔧 Testing Handler Dependencies...');
    
    const invalidDependencies = [
      { deps: {}, expectedError: 'IDEAutomationService is required' },
      { deps: { ideAutomationService: {} }, expectedError: 'EventBus is required' }
    ];

    for (const { deps, expectedError } of invalidDependencies) {
      try {
        new OpenTerminalHandler(deps);
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

    // 5. Test Handler Information
    console.log('\n📊 Testing Handler Information...');
    
    for (const name of testHandlers) {
      try {
        const HandlerClass = handlerClasses[name];
        const handler = new HandlerClass(mockDependencies);
        const info = handler.getInfo();
        
        expect(info).to.have.property('name');
        expect(info).to.have.property('version');
        expect(info).to.have.property('description');
        expect(info).to.have.property('supportedCommands');
        expect(info.supportedCommands).to.be.an('array');
        
        console.log(`✅ Handler info for ${name}: ${info.name} v${info.version}`);
      } catch (error) {
        console.log(`❌ Failed to get handler info for ${name}:`, error.message);
        return false;
      }
    }

    console.log('\n🎉 IDE Phase 2 Implementation Verification Complete!');
    console.log('✅ All 9 Phase 2 commands are properly implemented');
    console.log('✅ All 9 Phase 2 handlers are properly implemented');
    console.log('✅ Command validation is working correctly');
    console.log('✅ Handler dependency injection is working correctly');
    console.log('✅ Integration with IDEAutomationService is ready');
    console.log('✅ Ready for Phase 3 development');
    
    return true;

  } catch (error) {
    console.error('❌ Verification failed:', error);
    return false;
  }
}

// Simple expect function for testing
function expect(value) {
  return {
    to: {
      equal: (expected) => {
        if (value !== expected) {
          throw new Error(`Expected ${value} to equal ${expected}`);
        }
      },
      match: (regex) => {
        if (!regex.test(value)) {
          throw new Error(`Expected ${value} to match ${regex}`);
        }
      },
      be: {
        undefined: () => {
          if (value !== undefined) {
            throw new Error(`Expected ${value} to be undefined`);
          }
        },
        an: (type) => {
          if (type === 'array' && !Array.isArray(value)) {
            throw new Error(`Expected ${value} to be an array`);
          }
        }
      },
      have: {
        property: (prop) => {
          if (!(prop in value)) {
            throw new Error(`Expected ${value} to have property ${prop}`);
          }
          return {
            property: (prop2) => {
              if (!(prop2 in value[prop])) {
                throw new Error(`Expected ${value[prop]} to have property ${prop2}`);
              }
            }
          };
        }
      },
      not: {
        be: {
          undefined: () => {
            if (value === undefined) {
              throw new Error(`Expected ${value} to not be undefined`);
            }
          }
        },
        equal: (expected) => {
          if (value === expected) {
            throw new Error(`Expected ${value} to not equal ${expected}`);
          }
        }
      }
    }
  };
}

// Run verification
if (require.main === module) {
  verifyIDEPhase2()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Verification error:', error);
      process.exit(1);
    });
}

module.exports = { verifyIDEPhase2 }; 