/**
 * IDE Phase 2 Commands Test Suite
 * Tests for terminal and analysis commands and handlers
 */

const { describe, it, beforeEach, afterEach } = require('mocha');
const { expect } = require('chai');

// Import commands
const OpenTerminalCommand = require('../../application/commands/categories/ide/OpenTerminalCommand');
const ExecuteTerminalCommand = require('../../application/commands/categories/ide/ExecuteTerminalCommand');
const MonitorTerminalOutputCommand = require('../../application/commands/categories/ide/MonitorTerminalOutputCommand');
const RestartUserAppCommand = require('../../application/commands/categories/ide/RestartUserAppCommand');
const TerminalLogCaptureCommand = require('../../application/commands/categories/ide/TerminalLogCaptureCommand');
const AnalyzeProjectCommand = require('../../application/commands/categories/ide/AnalyzeProjectCommand');
const AnalyzeAgainCommand = require('../../application/commands/categories/ide/AnalyzeAgainCommand');
const GetWorkspaceInfoCommand = require('../../application/commands/categories/ide/GetWorkspaceInfoCommand');
const DetectPackageJsonCommand = require('../../application/commands/categories/ide/DetectPackageJsonCommand');

// Import handlers
const OpenTerminalHandler = require('../../application/handlers/categories/ide/OpenTerminalHandler');
const ExecuteTerminalHandler = require('../../application/handlers/categories/ide/ExecuteTerminalHandler');
const MonitorTerminalOutputHandler = require('../../application/handlers/categories/ide/MonitorTerminalOutputHandler');
const RestartUserAppHandler = require('../../application/handlers/categories/ide/RestartUserAppHandler');
const TerminalLogCaptureHandler = require('../../application/handlers/categories/ide/TerminalLogCaptureHandler');
const AnalyzeProjectHandler = require('../../application/handlers/categories/ide/AnalyzeProjectHandler');
const AnalyzeAgainHandler = require('../../application/handlers/categories/ide/AnalyzeAgainHandler');
const GetWorkspaceInfoHandler = require('../../application/handlers/categories/ide/GetWorkspaceInfoHandler');
const DetectPackageJsonHandler = require('../../application/handlers/categories/ide/DetectPackageJsonHandler');

// Import registries
const CommandRegistry = require('../../application/commands/CommandRegistry');
const HandlerRegistry = require('../../application/handlers/HandlerRegistry');

describe('IDE Phase 2: Terminal & Analysis Commands', () => {
  let mockDependencies;

  beforeEach(() => {
    // Mock dependencies for handlers
    mockDependencies = {
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
  });

  afterEach(() => {
    // Clean up
  });

  describe('Command Registry Integration', () => {
    it('should include all Phase 2 commands in IDE category', () => {
      const ideCommands = CommandRegistry.getByCategory('ide');
      
      // Phase 1 commands
      expect(ideCommands).to.include('CreateChatCommand');
      expect(ideCommands).to.include('SendMessageCommand');
      expect(ideCommands).to.include('SwitchChatCommand');
      expect(ideCommands).to.include('ListChatsCommand');
      expect(ideCommands).to.include('CloseChatCommand');
      expect(ideCommands).to.include('GetChatHistoryCommand');
      
      // Phase 2 terminal commands
      expect(ideCommands).to.include('OpenTerminalCommand');
      expect(ideCommands).to.include('ExecuteTerminalCommand');
      expect(ideCommands).to.include('MonitorTerminalOutputCommand');
      expect(ideCommands).to.include('RestartUserAppCommand');
      expect(ideCommands).to.include('TerminalLogCaptureCommand');
      
      // Phase 2 analysis commands
      expect(ideCommands).to.include('AnalyzeProjectCommand');
      expect(ideCommands).to.include('AnalyzeAgainCommand');
      expect(ideCommands).to.include('GetWorkspaceInfoCommand');
      expect(ideCommands).to.include('DetectPackageJsonCommand');
      
      expect(ideCommands).to.have.length(15);
    });

    it('should build all Phase 2 commands successfully', () => {
      const commands = [
        { name: 'OpenTerminalCommand', params: { userId: 'test-user', ideType: 'cursor' } },
        { name: 'ExecuteTerminalCommand', params: { userId: 'test-user', command: 'npm start' } },
        { name: 'MonitorTerminalOutputCommand', params: { userId: 'test-user', duration: 5000 } },
        { name: 'RestartUserAppCommand', params: { userId: 'test-user', appName: 'test-app' } },
        { name: 'TerminalLogCaptureCommand', params: { userId: 'test-user', maxLines: 100 } },
        { name: 'AnalyzeProjectCommand', params: { userId: 'test-user', analysisType: 'full' } },
        { name: 'AnalyzeAgainCommand', params: { userId: 'test-user', clearCache: true } },
        { name: 'GetWorkspaceInfoCommand', params: { userId: 'test-user', includeDetails: true } },
        { name: 'DetectPackageJsonCommand', params: { userId: 'test-user', detectDevServer: true } }
      ];

      commands.forEach(({ name, params }) => {
        const command = CommandRegistry.buildFromCategory('ide', name, params);
        expect(command).to.not.be.null;
        expect(command).to.have.property('commandId');
        expect(command).to.have.property('type', name);
        expect(command).to.have.property('userId', 'test-user');
      });
    });
  });

  describe('Handler Registry Integration', () => {
    it('should include all Phase 2 handlers in IDE category', () => {
      const ideHandlers = HandlerRegistry.getByCategory('ide');
      
      // Phase 1 handlers
      expect(ideHandlers).to.include('CreateChatHandler');
      expect(ideHandlers).to.include('SendMessageHandler');
      expect(ideHandlers).to.include('SwitchChatHandler');
      expect(ideHandlers).to.include('ListChatsHandler');
      expect(ideHandlers).to.include('CloseChatHandler');
      expect(ideHandlers).to.include('GetChatHistoryHandler');
      
      // Phase 2 terminal handlers
      expect(ideHandlers).to.include('OpenTerminalHandler');
      expect(ideHandlers).to.include('ExecuteTerminalHandler');
      expect(ideHandlers).to.include('MonitorTerminalOutputHandler');
      expect(ideHandlers).to.include('RestartUserAppHandler');
      expect(ideHandlers).to.include('TerminalLogCaptureHandler');
      
      // Phase 2 analysis handlers
      expect(ideHandlers).to.include('AnalyzeProjectHandler');
      expect(ideHandlers).to.include('AnalyzeAgainHandler');
      expect(ideHandlers).to.include('GetWorkspaceInfoHandler');
      expect(ideHandlers).to.include('DetectPackageJsonHandler');
      
      expect(ideHandlers).to.have.length(15);
    });

    it('should build all Phase 2 handlers successfully', () => {
      const handlers = [
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

      handlers.forEach(name => {
        const handler = HandlerRegistry.buildFromCategory('ide', name, mockDependencies);
        expect(handler).to.not.be.null;
        expect(handler).to.have.property('ideAutomationService');
        expect(handler).to.have.property('eventBus');
        expect(handler).to.have.property('logger');
      });
    });
  });

  describe('Terminal Commands', () => {
    describe('OpenTerminalCommand', () => {
      it('should create command with valid parameters', () => {
        const command = new OpenTerminalCommand({
          userId: 'test-user',
          ideType: 'cursor',
          options: { forceOpen: true }
        });

        expect(command.userId).to.equal('test-user');
        expect(command.ideType).to.equal('cursor');
        expect(command.options.forceOpen).to.be.true;
        expect(command.commandId).to.match(/^open_terminal_\d+_/);
        expect(command.type).to.equal('OpenTerminalCommand');
      });

      it('should validate required parameters', () => {
        expect(() => new OpenTerminalCommand({})).to.throw('User ID is required');
        expect(() => new OpenTerminalCommand({ userId: 'test', ideType: 'invalid' })).to.throw('Invalid IDE type');
      });

      it('should execute successfully', async () => {
        const command = new OpenTerminalCommand({
          userId: 'test-user',
          ideType: 'cursor'
        });

        const result = await command.execute();
        expect(result.commandId).to.equal(command.commandId);
        expect(result.type).to.equal('OpenTerminalCommand');
        expect(result.status).to.equal('pending');
      });
    });

    describe('ExecuteTerminalCommand', () => {
      it('should create command with valid parameters', () => {
        const command = new ExecuteTerminalCommand({
          userId: 'test-user',
          command: 'npm start',
          waitTime: 3000
        });

        expect(command.userId).to.equal('test-user');
        expect(command.command).to.equal('npm start');
        expect(command.waitTime).to.equal(3000);
        expect(command.commandId).to.match(/^execute_terminal_\d+_/);
      });

      it('should validate required parameters', () => {
        expect(() => new ExecuteTerminalCommand({ userId: 'test' })).to.throw('Terminal command is required');
        expect(() => new ExecuteTerminalCommand({ userId: 'test', command: '', waitTime: -1 })).to.throw('Wait time must be a number between 0 and 30000');
      });

      it('should execute successfully', async () => {
        const command = new ExecuteTerminalCommand({
          userId: 'test-user',
          command: 'npm start'
        });

        const result = await command.execute();
        expect(result.commandId).to.equal(command.commandId);
        expect(result.type).to.equal('ExecuteTerminalCommand');
        expect(result.status).to.equal('pending');
      });
    });

    describe('MonitorTerminalOutputCommand', () => {
      it('should create command with valid parameters', () => {
        const command = new MonitorTerminalOutputCommand({
          userId: 'test-user',
          duration: 10000,
          interval: 2000
        });

        expect(command.userId).to.equal('test-user');
        expect(command.duration).to.equal(10000);
        expect(command.interval).to.equal(2000);
        expect(command.commandId).to.match(/^monitor_terminal_\d+_/);
      });

      it('should validate parameters', () => {
        expect(() => new MonitorTerminalOutputCommand({ userId: 'test', duration: 500 })).to.throw('Duration must be a number between 1000 and 60000');
        expect(() => new MonitorTerminalOutputCommand({ userId: 'test', interval: 50 })).to.throw('Interval must be a number between 100 and 10000');
      });
    });

    describe('RestartUserAppCommand', () => {
      it('should create command with valid parameters', () => {
        const command = new RestartUserAppCommand({
          userId: 'test-user',
          appName: 'test-app',
          forceRestart: true
        });

        expect(command.userId).to.equal('test-user');
        expect(command.appName).to.equal('test-app');
        expect(command.forceRestart).to.be.true;
        expect(command.commandId).to.match(/^restart_app_\d+_/);
      });

      it('should validate parameters', () => {
        expect(() => new RestartUserAppCommand({ userId: 'test', appName: 123 })).to.throw('App name must be a string');
        expect(() => new RestartUserAppCommand({ userId: 'test', forceRestart: 'true' })).to.throw('forceRestart must be a boolean');
      });
    });

    describe('TerminalLogCaptureCommand', () => {
      it('should create command with valid parameters', () => {
        const command = new TerminalLogCaptureCommand({
          userId: 'test-user',
          maxLines: 500,
          includeTimestamps: false,
          filterLevel: 'error'
        });

        expect(command.userId).to.equal('test-user');
        expect(command.maxLines).to.equal(500);
        expect(command.includeTimestamps).to.be.false;
        expect(command.filterLevel).to.equal('error');
        expect(command.commandId).to.match(/^capture_logs_\d+_/);
      });

      it('should validate parameters', () => {
        expect(() => new TerminalLogCaptureCommand({ userId: 'test', maxLines: 0 })).to.throw('Max lines must be a number between 1 and 10000');
        expect(() => new TerminalLogCaptureCommand({ userId: 'test', filterLevel: 'invalid' })).to.throw('Filter level must be one of: all, error, warning, info, debug');
      });
    });
  });

  describe('Analysis Commands', () => {
    describe('AnalyzeProjectCommand', () => {
      it('should create command with valid parameters', () => {
        const command = new AnalyzeProjectCommand({
          userId: 'test-user',
          workspacePath: '/path/to/project',
          analysisType: 'quick',
          includeCache: false
        });

        expect(command.userId).to.equal('test-user');
        expect(command.workspacePath).to.equal('/path/to/project');
        expect(command.analysisType).to.equal('quick');
        expect(command.includeCache).to.be.false;
        expect(command.commandId).to.match(/^analyze_project_\d+_/);
      });

      it('should validate parameters', () => {
        expect(() => new AnalyzeProjectCommand({ userId: 'test', analysisType: 'invalid' })).to.throw('Analysis type must be one of: full, quick, dependencies, structure');
        expect(() => new AnalyzeProjectCommand({ userId: 'test', includeCache: 'true' })).to.throw('includeCache must be a boolean');
      });
    });

    describe('AnalyzeAgainCommand', () => {
      it('should create command with valid parameters', () => {
        const command = new AnalyzeAgainCommand({
          userId: 'test-user',
          workspacePath: '/path/to/project',
          clearCache: true,
          forceRefresh: true
        });

        expect(command.userId).to.equal('test-user');
        expect(command.workspacePath).to.equal('/path/to/project');
        expect(command.clearCache).to.be.true;
        expect(command.forceRefresh).to.be.true;
        expect(command.commandId).to.match(/^analyze_again_\d+_/);
      });

      it('should validate parameters', () => {
        expect(() => new AnalyzeAgainCommand({ userId: 'test', clearCache: 'true' })).to.throw('clearCache must be a boolean');
        expect(() => new AnalyzeAgainCommand({ userId: 'test', forceRefresh: 'true' })).to.throw('forceRefresh must be a boolean');
      });
    });

    describe('GetWorkspaceInfoCommand', () => {
      it('should create command with valid parameters', () => {
        const command = new GetWorkspaceInfoCommand({
          userId: 'test-user',
          workspacePath: '/path/to/workspace',
          includeDetails: true,
          includeProjects: false
        });

        expect(command.userId).to.equal('test-user');
        expect(command.workspacePath).to.equal('/path/to/workspace');
        expect(command.includeDetails).to.be.true;
        expect(command.includeProjects).to.be.false;
        expect(command.commandId).to.match(/^get_workspace_info_\d+_/);
      });

      it('should validate parameters', () => {
        expect(() => new GetWorkspaceInfoCommand({ userId: 'test', includeDetails: 'true' })).to.throw('includeDetails must be a boolean');
        expect(() => new GetWorkspaceInfoCommand({ userId: 'test', includeProjects: 'true' })).to.throw('includeProjects must be a boolean');
      });
    });

    describe('DetectPackageJsonCommand', () => {
      it('should create command with valid parameters', () => {
        const command = new DetectPackageJsonCommand({
          userId: 'test-user',
          workspacePath: '/path/to/project',
          detectDevServer: true,
          analyzeScripts: false
        });

        expect(command.userId).to.equal('test-user');
        expect(command.workspacePath).to.equal('/path/to/project');
        expect(command.detectDevServer).to.be.true;
        expect(command.analyzeScripts).to.be.false;
        expect(command.commandId).to.match(/^detect_package_json_\d+_/);
      });

      it('should validate parameters', () => {
        expect(() => new DetectPackageJsonCommand({ userId: 'test', detectDevServer: 'true' })).to.throw('detectDevServer must be a boolean');
        expect(() => new DetectPackageJsonCommand({ userId: 'test', analyzeScripts: 'true' })).to.throw('analyzeScripts must be a boolean');
      });
    });
  });

  describe('Terminal Handlers', () => {
    describe('OpenTerminalHandler', () => {
      it('should create handler with valid dependencies', () => {
        const handler = new OpenTerminalHandler(mockDependencies);
        expect(handler.ideAutomationService).to.equal(mockDependencies.ideAutomationService);
        expect(handler.eventBus).to.equal(mockDependencies.eventBus);
      });

      it('should validate dependencies', () => {
        expect(() => new OpenTerminalHandler({})).to.throw('IDEAutomationService is required');
        expect(() => new OpenTerminalHandler({ ideAutomationService: {} })).to.throw('EventBus is required');
      });

      it('should handle command successfully', async () => {
        const handler = new OpenTerminalHandler(mockDependencies);
        const command = new OpenTerminalCommand({
          userId: 'test-user',
          ideType: 'cursor'
        });

        const result = await handler.handle(command);
        expect(result.success).to.be.true;
        expect(result.commandId).to.equal(command.commandId);
      });

      it('should validate command type', async () => {
        const handler = new OpenTerminalHandler(mockDependencies);
        const invalidCommand = { type: 'InvalidCommand', commandId: 'test' };

        try {
          await handler.handle(invalidCommand);
          expect.fail('Should have thrown error');
        } catch (error) {
          expect(error.message).to.include('Invalid command type for OpenTerminalHandler');
        }
      });
    });

    describe('ExecuteTerminalHandler', () => {
      it('should handle command successfully', async () => {
        const handler = new ExecuteTerminalHandler(mockDependencies);
        const command = new ExecuteTerminalCommand({
          userId: 'test-user',
          command: 'npm start'
        });

        const result = await handler.handle(command);
        expect(result.success).to.be.true;
        expect(result.commandId).to.equal(command.commandId);
      });
    });

    describe('MonitorTerminalOutputHandler', () => {
      it('should handle command successfully', async () => {
        const handler = new MonitorTerminalOutputHandler(mockDependencies);
        const command = new MonitorTerminalOutputCommand({
          userId: 'test-user',
          duration: 5000
        });

        const result = await handler.handle(command);
        expect(result.success).to.be.true;
        expect(result.commandId).to.equal(command.commandId);
      });
    });

    describe('RestartUserAppHandler', () => {
      it('should handle command successfully', async () => {
        const handler = new RestartUserAppHandler(mockDependencies);
        const command = new RestartUserAppCommand({
          userId: 'test-user',
          appName: 'test-app'
        });

        const result = await handler.handle(command);
        expect(result.success).to.be.true;
        expect(result.commandId).to.equal(command.commandId);
      });
    });

    describe('TerminalLogCaptureHandler', () => {
      it('should handle command successfully', async () => {
        const handler = new TerminalLogCaptureHandler(mockDependencies);
        const command = new TerminalLogCaptureCommand({
          userId: 'test-user',
          maxLines: 100
        });

        const result = await handler.handle(command);
        expect(result.success).to.be.true;
        expect(result.commandId).to.equal(command.commandId);
      });
    });
  });

  describe('Analysis Handlers', () => {
    describe('AnalyzeProjectHandler', () => {
      it('should handle command successfully', async () => {
        const handler = new AnalyzeProjectHandler(mockDependencies);
        const command = new AnalyzeProjectCommand({
          userId: 'test-user',
          analysisType: 'full'
        });

        const result = await handler.handle(command);
        expect(result.success).to.be.true;
        expect(result.commandId).to.equal(command.commandId);
      });
    });

    describe('AnalyzeAgainHandler', () => {
      it('should handle command successfully', async () => {
        const handler = new AnalyzeAgainHandler(mockDependencies);
        const command = new AnalyzeAgainCommand({
          userId: 'test-user',
          clearCache: true
        });

        const result = await handler.handle(command);
        expect(result.success).to.be.true;
        expect(result.commandId).to.equal(command.commandId);
      });
    });

    describe('GetWorkspaceInfoHandler', () => {
      it('should handle command successfully', async () => {
        const handler = new GetWorkspaceInfoHandler(mockDependencies);
        const command = new GetWorkspaceInfoCommand({
          userId: 'test-user',
          includeDetails: true
        });

        const result = await handler.handle(command);
        expect(result.success).to.be.true;
        expect(result.commandId).to.equal(command.commandId);
      });
    });

    describe('DetectPackageJsonHandler', () => {
      it('should handle command successfully', async () => {
        const handler = new DetectPackageJsonHandler(mockDependencies);
        const command = new DetectPackageJsonCommand({
          userId: 'test-user',
          detectDevServer: true
        });

        const result = await handler.handle(command);
        expect(result.success).to.be.true;
        expect(result.commandId).to.equal(command.commandId);
      });
    });
  });

  describe('Handler Information', () => {
    it('should provide handler information', () => {
      const handlers = [
        new OpenTerminalHandler(mockDependencies),
        new ExecuteTerminalHandler(mockDependencies),
        new MonitorTerminalOutputHandler(mockDependencies),
        new RestartUserAppHandler(mockDependencies),
        new TerminalLogCaptureHandler(mockDependencies),
        new AnalyzeProjectHandler(mockDependencies),
        new AnalyzeAgainHandler(mockDependencies),
        new GetWorkspaceInfoHandler(mockDependencies),
        new DetectPackageJsonHandler(mockDependencies)
      ];

      handlers.forEach(handler => {
        const info = handler.getInfo();
        expect(info).to.have.property('name');
        expect(info).to.have.property('version');
        expect(info).to.have.property('description');
        expect(info).to.have.property('supportedCommands');
        expect(info.supportedCommands).to.be.an('array');
        expect(info.supportedCommands).to.have.length(1);
      });
    });
  });
}); 