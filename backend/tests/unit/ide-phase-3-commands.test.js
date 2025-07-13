/**
 * IDE Phase 3 Commands & Handlers Tests
 * Tests for browser/IDE commands and handlers implementation
 */

const { expect } = require('chai');
const sinon = require('sinon');

// Import commands
const SwitchIDEPortCommand = require('@categories/ide/SwitchIDEPortCommand');
const OpenFileExplorerCommand = require('@categories/ide/OpenFileExplorerCommand');
const OpenCommandPaletteCommand = require('@categories/ide/OpenCommandPaletteCommand');
const ExecuteIDEActionCommand = require('@categories/ide/ExecuteIDEActionCommand');
const GetIDESelectorsCommand = require('@categories/ide/GetIDESelectorsCommand');

// Import handlers
const SwitchIDEPortHandler = require('@categories/ide/SwitchIDEPortHandler');
const OpenFileExplorerHandler = require('@categories/ide/OpenFileExplorerHandler');
const OpenCommandPaletteHandler = require('@categories/ide/OpenCommandPaletteHandler');
const ExecuteIDEActionHandler = require('@categories/ide/ExecuteIDEActionHandler');
const GetIDESelectorsHandler = require('@categories/ide/GetIDESelectorsHandler');

// Import registries
const CommandRegistry = require('@application/commands/CommandRegistry');
const HandlerRegistry = require('@application/handlers/HandlerRegistry');
const { STANDARD_CATEGORIES } = require('@domain/constants/Categories');

describe('IDE Phase 3: Browser/IDE Commands & Handlers', () => {
  let mockDependencies;
  let mockEventBus;

  beforeEach(() => {
    // Mock dependencies
    mockEventBus = {
      publish: sinon.stub().resolves()
    };

    mockDependencies = {
      ideAutomationService: {
        switchIDEPort: sinon.stub().resolves({ success: true }),
        openFileExplorer: sinon.stub().resolves({ success: true }),
        openCommandPalette: sinon.stub().resolves({ success: true }),
        executeIDEAction: sinon.stub().resolves({ success: true }),
        getIDESelectors: sinon.stub().resolves({ success: true })
      },
      browserManager: {
        switchToPort: sinon.stub().resolves({ success: true }),
        openFileExplorer: sinon.stub().resolves({ success: true }),
        openCommandPalette: sinon.stub().resolves({ success: true }),
        executeIDEAction: sinon.stub().resolves({ success: true }),
        getIDESelectors: sinon.stub().resolves({ success: true })
      },
      ideManager: {
        setActivePort: sinon.stub().resolves(),
        getActiveIDEType: sinon.stub().resolves('cursor'),
        getActivePort: sinon.stub().returns(9222)
      },
      eventBus: mockEventBus,
      logger: {
        info: sinon.stub(),
        error: sinon.stub(),
        log: sinon.stub()
      }
    };
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('Command Registry Integration', () => {
    it('should include all Phase 3 commands in IDE category', () => {
      const ideCommands = CommandRegistry.getByCategory('ide');
      
      // Phase 1 & 2 commands
      expect(ideCommands).to.include('CreateChatCommand');
      expect(ideCommands).to.include('SendMessageCommand');
      expect(ideCommands).to.include('SwitchChatCommand');
      expect(ideCommands).to.include('ListChatsCommand');
      expect(ideCommands).to.include('CloseChatCommand');
      expect(ideCommands).to.include('GetChatHistoryCommand');
      expect(ideCommands).to.include('OpenTerminalCommand');
      expect(ideCommands).to.include('ExecuteTerminalCommand');
      expect(ideCommands).to.include('MonitorTerminalOutputCommand');
      expect(ideCommands).to.include('RestartUserAppCommand');
      expect(ideCommands).to.include('TerminalLogCaptureCommand');
      expect(ideCommands).to.include('AnalyzeProjectCommand');
      expect(ideCommands).to.include('AnalyzeAgainCommand');
      expect(ideCommands).to.include('GetWorkspaceInfoCommand');
      expect(ideCommands).to.include('DetectPackageJsonCommand');
      
      // Phase 3 browser/IDE commands
      expect(ideCommands).to.include('SwitchIDEPortCommand');
      expect(ideCommands).to.include('OpenFileExplorerCommand');
      expect(ideCommands).to.include('OpenCommandPaletteCommand');
      expect(ideCommands).to.include('ExecuteIDEActionCommand');
      expect(ideCommands).to.include('GetIDESelectorsCommand');
      
      expect(ideCommands).to.have.length(20);
    });

    it('should build all Phase 3 commands from registry', () => {
      const commands = [
        'SwitchIDEPortCommand',
        'OpenFileExplorerCommand',
        'OpenCommandPaletteCommand',
        'ExecuteIDEActionCommand',
        'GetIDESelectorsCommand'
      ];

      commands.forEach(commandName => {
        const command = CommandRegistry.buildFromCategory('ide', commandName, {
          userId: 'test-user',
          port: 9222,
          ideType: 'cursor'
        });
        expect(command).to.be.instanceOf(Function);
      });
    });
  });

  describe('Handler Registry Integration', () => {
    it('should include all Phase 3 handlers in IDE category', () => {
      const ideHandlers = HandlerRegistry.getByCategory('ide');
      
      // Phase 1 & 2 handlers
      expect(ideHandlers).to.include('CreateChatHandler');
      expect(ideHandlers).to.include('SendMessageHandler');
      expect(ideHandlers).to.include('SwitchChatHandler');
      expect(ideHandlers).to.include('ListChatsHandler');
      expect(ideHandlers).to.include('CloseChatHandler');
      expect(ideHandlers).to.include('GetChatHistoryHandler');
      expect(ideHandlers).to.include('OpenTerminalHandler');
      expect(ideHandlers).to.include('ExecuteTerminalHandler');
      expect(ideHandlers).to.include('MonitorTerminalOutputHandler');
      expect(ideHandlers).to.include('RestartUserAppHandler');
      expect(ideHandlers).to.include('TerminalLogCaptureHandler');
      expect(ideHandlers).to.include('AnalyzeProjectHandler');
      expect(ideHandlers).to.include('AnalyzeAgainHandler');
      expect(ideHandlers).to.include('GetWorkspaceInfoHandler');
      expect(ideHandlers).to.include('DetectPackageJsonHandler');
      
      // Phase 3 browser/IDE handlers
      expect(ideHandlers).to.include('SwitchIDEPortHandler');
      expect(ideHandlers).to.include('OpenFileExplorerHandler');
      expect(ideHandlers).to.include('OpenCommandPaletteHandler');
      expect(ideHandlers).to.include('ExecuteIDEActionHandler');
      expect(ideHandlers).to.include('GetIDESelectorsHandler');
      
      expect(ideHandlers).to.have.length(20);
    });

    it('should build all Phase 3 handlers from registry', () => {
      const handlers = [
        'SwitchIDEPortHandler',
        'OpenFileExplorerHandler',
        'OpenCommandPaletteHandler',
        'ExecuteIDEActionHandler',
        'GetIDESelectorsHandler'
      ];

      handlers.forEach(handlerName => {
        const handler = HandlerRegistry.buildFromCategory('ide', handlerName, mockDependencies);
        expect(handler).to.be.instanceOf(Function);
      });
    });
  });

  describe('SwitchIDEPortCommand', () => {
    it('should create command with valid parameters', () => {
      const command = new SwitchIDEPortCommand({
        userId: 'test-user',
        port: 9222,
        ideType: 'cursor'
      });

      expect(command.commandId).to.be.a('string');
      expect(command.type).to.equal('SwitchIDEPortCommand');
      expect(command.port).to.equal(9222);
      expect(command.ideType).to.equal('cursor');
      expect(command.userId).to.equal('test-user');
    });

    it('should validate command parameters', async () => {
      const command = new SwitchIDEPortCommand({
        userId: 'test-user',
        port: 9222,
        ideType: 'cursor'
      });

      const validation = await command.validate();
      expect(validation.isValid).to.be.true;
    });

    it('should reject invalid port numbers', async () => {
      const command = new SwitchIDEPortCommand({
        userId: 'test-user',
        port: 9999, // Invalid port
        ideType: 'cursor'
      });

      const validation = await command.validate();
      expect(validation.isValid).to.be.false;
      expect(validation.errors).to.include('Port must be in IDE range (9222-9251)');
    });

    it('should execute command successfully', async () => {
      const command = new SwitchIDEPortCommand({
        userId: 'test-user',
        port: 9222,
        ideType: 'cursor'
      });

      const context = { eventBus: mockEventBus };
      const result = await command.execute(context);

      expect(result.success).to.be.true;
      expect(result.port).to.equal(9222);
      expect(result.ideType).to.equal('cursor');
      expect(mockEventBus.publish.called).to.be.true;
    });
  });

  describe('OpenFileExplorerCommand', () => {
    it('should create command with valid parameters', () => {
      const command = new OpenFileExplorerCommand({
        userId: 'test-user',
        ideType: 'cursor',
        path: '/path/to/project'
      });

      expect(command.commandId).to.be.a('string');
      expect(command.type).to.equal('OpenFileExplorerCommand');
      expect(command.ideType).to.equal('cursor');
      expect(command.path).to.equal('/path/to/project');
      expect(command.userId).to.equal('test-user');
    });

    it('should validate command parameters', async () => {
      const command = new OpenFileExplorerCommand({
        userId: 'test-user',
        ideType: 'cursor',
        path: '/path/to/project'
      });

      const validation = await command.validate();
      expect(validation.isValid).to.be.true;
    });

    it('should execute command successfully', async () => {
      const command = new OpenFileExplorerCommand({
        userId: 'test-user',
        ideType: 'cursor',
        path: '/path/to/project'
      });

      const context = { eventBus: mockEventBus };
      const result = await command.execute(context);

      expect(result.success).to.be.true;
      expect(result.ideType).to.equal('cursor');
      expect(result.path).to.equal('/path/to/project');
      expect(mockEventBus.publish.called).to.be.true;
    });
  });

  describe('OpenCommandPaletteCommand', () => {
    it('should create command with valid parameters', () => {
      const command = new OpenCommandPaletteCommand({
        userId: 'test-user',
        ideType: 'cursor',
        searchTerm: 'test search'
      });

      expect(command.commandId).to.be.a('string');
      expect(command.type).to.equal('OpenCommandPaletteCommand');
      expect(command.ideType).to.equal('cursor');
      expect(command.searchTerm).to.equal('test search');
      expect(command.userId).to.equal('test-user');
    });

    it('should validate command parameters', async () => {
      const command = new OpenCommandPaletteCommand({
        userId: 'test-user',
        ideType: 'cursor',
        searchTerm: 'test search'
      });

      const validation = await command.validate();
      expect(validation.isValid).to.be.true;
    });

    it('should execute command successfully', async () => {
      const command = new OpenCommandPaletteCommand({
        userId: 'test-user',
        ideType: 'cursor',
        searchTerm: 'test search'
      });

      const context = { eventBus: mockEventBus };
      const result = await command.execute(context);

      expect(result.success).to.be.true;
      expect(result.ideType).to.equal('cursor');
      expect(result.searchTerm).to.equal('test search');
      expect(mockEventBus.publish.called).to.be.true;
    });
  });

  describe('ExecuteIDEActionCommand', () => {
    it('should create command with valid parameters', () => {
      const command = new ExecuteIDEActionCommand({
        userId: 'test-user',
        ideType: 'cursor',
        action: 'save',
        actionType: 'keyboard',
        parameters: { file: 'test.js' }
      });

      expect(command.commandId).to.be.a('string');
      expect(command.type).to.equal('ExecuteIDEActionCommand');
      expect(command.ideType).to.equal('cursor');
      expect(command.action).to.equal('save');
      expect(command.actionType).to.equal('keyboard');
      expect(command.parameters).to.deep.equal({ file: 'test.js' });
    });

    it('should validate command parameters', async () => {
      const command = new ExecuteIDEActionCommand({
        userId: 'test-user',
        ideType: 'cursor',
        action: 'save',
        actionType: 'keyboard'
      });

      const validation = await command.validate();
      expect(validation.isValid).to.be.true;
    });

    it('should reject invalid actions', async () => {
      const command = new ExecuteIDEActionCommand({
        userId: 'test-user',
        ideType: 'cursor',
        action: 'invalid-action',
        actionType: 'keyboard'
      });

      const validation = await command.validate();
      expect(validation.isValid).to.be.false;
      expect(validation.errors[0]).to.include('invalid-action');
    });

    it('should execute command successfully', async () => {
      const command = new ExecuteIDEActionCommand({
        userId: 'test-user',
        ideType: 'cursor',
        action: 'save',
        actionType: 'keyboard'
      });

      const context = { eventBus: mockEventBus };
      const result = await command.execute(context);

      expect(result.success).to.be.true;
      expect(result.action).to.equal('save');
      expect(result.actionType).to.equal('keyboard');
      expect(mockEventBus.publish.called).to.be.true;
    });
  });

  describe('GetIDESelectorsCommand', () => {
    it('should create command with valid parameters', () => {
      const command = new GetIDESelectorsCommand({
        userId: 'test-user',
        ideType: 'cursor',
        selectorType: 'chat'
      });

      expect(command.commandId).to.be.a('string');
      expect(command.type).to.equal('GetIDESelectorsCommand');
      expect(command.ideType).to.equal('cursor');
      expect(command.selectorType).to.equal('chat');
      expect(command.userId).to.equal('test-user');
    });

    it('should validate command parameters', async () => {
      const command = new GetIDESelectorsCommand({
        userId: 'test-user',
        ideType: 'cursor',
        selectorType: 'chat'
      });

      const validation = await command.validate();
      expect(validation.isValid).to.be.true;
    });

    it('should get selectors for specific type', () => {
      const command = new GetIDESelectorsCommand({
        userId: 'test-user',
        ideType: 'cursor',
        selectorType: 'chat'
      });

      const selectors = command.getSelectors();
      expect(selectors).to.have.property('chat');
      expect(selectors.chat).to.have.property('input');
      expect(selectors.chat).to.have.property('sendButton');
    });

    it('should get all selectors when type is "all"', () => {
      const command = new GetIDESelectorsCommand({
        userId: 'test-user',
        ideType: 'cursor',
        selectorType: 'all'
      });

      const selectors = command.getSelectors();
      expect(selectors).to.have.property('chat');
      expect(selectors).to.have.property('terminal');
      expect(selectors).to.have.property('file-explorer');
      expect(selectors).to.have.property('command-palette');
    });

    it('should execute command successfully', async () => {
      const command = new GetIDESelectorsCommand({
        userId: 'test-user',
        ideType: 'cursor',
        selectorType: 'chat'
      });

      const context = { eventBus: mockEventBus };
      const result = await command.execute(context);

      expect(result.success).to.be.true;
      expect(result.ideType).to.equal('cursor');
      expect(result.selectorType).to.equal('chat');
      expect(result.selectors).to.have.property('chat');
      expect(mockEventBus.publish.called).to.be.true;
    });
  });

  describe('SwitchIDEPortHandler', () => {
    let handler;

    beforeEach(() => {
      handler = new SwitchIDEPortHandler(mockDependencies);
    });

    it('should create handler with dependencies', () => {
      expect(handler.handlerId).to.be.a('string');
      expect(handler.ideAutomationService).to.equal(mockDependencies.ideAutomationService);
      expect(handler.browserManager).to.equal(mockDependencies.browserManager);
      expect(handler.ideManager).to.equal(mockDependencies.ideManager);
    });

    it('should handle command successfully', async () => {
      const command = new SwitchIDEPortCommand({
        userId: 'test-user',
        port: 9222,
        ideType: 'cursor'
      });

      const result = await handler.handle(command);

      expect(result.success).to.be.true;
      expect(result.port).to.equal(9222);
      expect(result.ideType).to.equal('cursor');
      expect(mockDependencies.browserManager.switchToPort.called).to.be.true;
      expect(mockDependencies.ideManager.setActivePort.called).to.be.true;
      expect(mockDependencies.ideAutomationService.switchIDEPort.called).to.be.true;
    });
  });

  describe('OpenFileExplorerHandler', () => {
    let handler;

    beforeEach(() => {
      handler = new OpenFileExplorerHandler(mockDependencies);
    });

    it('should create handler with dependencies', () => {
      expect(handler.handlerId).to.be.a('string');
      expect(handler.ideAutomationService).to.equal(mockDependencies.ideAutomationService);
      expect(handler.browserManager).to.equal(mockDependencies.browserManager);
      expect(handler.ideManager).to.equal(mockDependencies.ideManager);
    });

    it('should handle command successfully', async () => {
      const command = new OpenFileExplorerCommand({
        userId: 'test-user',
        ideType: 'cursor',
        path: '/path/to/project'
      });

      const result = await handler.handle(command);

      expect(result.success).to.be.true;
      expect(result.ideType).to.equal('cursor');
      expect(result.path).to.equal('/path/to/project');
      expect(mockDependencies.browserManager.openFileExplorer.called).to.be.true;
      expect(mockDependencies.ideAutomationService.openFileExplorer.called).to.be.true;
    });
  });

  describe('OpenCommandPaletteHandler', () => {
    let handler;

    beforeEach(() => {
      handler = new OpenCommandPaletteHandler(mockDependencies);
    });

    it('should create handler with dependencies', () => {
      expect(handler.handlerId).to.be.a('string');
      expect(handler.ideAutomationService).to.equal(mockDependencies.ideAutomationService);
      expect(handler.browserManager).to.equal(mockDependencies.browserManager);
      expect(handler.ideManager).to.equal(mockDependencies.ideManager);
    });

    it('should handle command successfully', async () => {
      const command = new OpenCommandPaletteCommand({
        userId: 'test-user',
        ideType: 'cursor',
        searchTerm: 'test search'
      });

      const result = await handler.handle(command);

      expect(result.success).to.be.true;
      expect(result.ideType).to.equal('cursor');
      expect(result.searchTerm).to.equal('test search');
      expect(mockDependencies.browserManager.openCommandPalette.called).to.be.true;
      expect(mockDependencies.ideAutomationService.openCommandPalette.called).to.be.true;
    });
  });

  describe('ExecuteIDEActionHandler', () => {
    let handler;

    beforeEach(() => {
      handler = new ExecuteIDEActionHandler(mockDependencies);
    });

    it('should create handler with dependencies', () => {
      expect(handler.handlerId).to.be.a('string');
      expect(handler.ideAutomationService).to.equal(mockDependencies.ideAutomationService);
      expect(handler.browserManager).to.equal(mockDependencies.browserManager);
      expect(handler.ideManager).to.equal(mockDependencies.ideManager);
    });

    it('should handle command successfully', async () => {
      const command = new ExecuteIDEActionCommand({
        userId: 'test-user',
        ideType: 'cursor',
        action: 'save',
        actionType: 'keyboard'
      });

      const result = await handler.handle(command);

      expect(result.success).to.be.true;
      expect(result.action).to.equal('save');
      expect(result.actionType).to.equal('keyboard');
      expect(mockDependencies.browserManager.executeIDEAction.called).to.be.true;
      expect(mockDependencies.ideAutomationService.executeIDEAction.called).to.be.true;
    });
  });

  describe('GetIDESelectorsHandler', () => {
    let handler;

    beforeEach(() => {
      handler = new GetIDESelectorsHandler(mockDependencies);
    });

    it('should create handler with dependencies', () => {
      expect(handler.handlerId).to.be.a('string');
      expect(handler.ideAutomationService).to.equal(mockDependencies.ideAutomationService);
      expect(handler.browserManager).to.equal(mockDependencies.browserManager);
      expect(handler.ideManager).to.equal(mockDependencies.ideManager);
    });

    it('should handle command successfully', async () => {
      const command = new GetIDESelectorsCommand({
        userId: 'test-user',
        ideType: 'cursor',
        selectorType: 'chat'
      });

      const result = await handler.handle(command);

      expect(result.success).to.be.true;
      expect(result.ideType).to.equal('cursor');
      expect(result.selectorType).to.equal('chat');
      expect(result.selectors).to.have.property('chat');
      expect(mockDependencies.browserManager.getIDESelectors.called).to.be.true;
      expect(mockDependencies.ideAutomationService.getIDESelectors.called).to.be.true;
    });
  });

  describe('Error Handling', () => {
    it('should handle command validation errors', async () => {
      const command = new SwitchIDEPortCommand({
        userId: 'test-user',
        port: 9999, // Invalid port
        ideType: 'cursor'
      });

      const handler = new SwitchIDEPortHandler(mockDependencies);

      try {
        await handler.handle(command);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Command validation failed');
      }
    });

    it('should handle service errors gracefully', async () => {
      const command = new SwitchIDEPortCommand({
        userId: 'test-user',
        port: 9222,
        ideType: 'cursor'
      });

      mockDependencies.browserManager.switchToPort.rejects(new Error('Browser error'));
      const handler = new SwitchIDEPortHandler(mockDependencies);

      try {
        await handler.handle(command);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Browser error');
      }
    });
  });

  describe('Event Publishing', () => {
    it('should publish events for successful operations', async () => {
      const command = new SwitchIDEPortCommand({
        userId: 'test-user',
        port: 9222,
        ideType: 'cursor'
      });

      const handler = new SwitchIDEPortHandler(mockDependencies);
      await handler.handle(command);

      expect(mockEventBus.publish.called).to.be.true;
      const calls = mockEventBus.publish.getCalls();
      expect(calls.some(call => call.args[0] === 'ide.port.switching')).to.be.true;
      expect(calls.some(call => call.args[0] === 'ide.port.switched')).to.be.true;
    });

    it('should publish events for failed operations', async () => {
      const command = new SwitchIDEPortCommand({
        userId: 'test-user',
        port: 9222,
        ideType: 'cursor'
      });

      mockDependencies.browserManager.switchToPort.rejects(new Error('Browser error'));
      const handler = new SwitchIDEPortHandler(mockDependencies);

      try {
        await handler.handle(command);
      } catch (error) {
        // Expected to fail
      }

      expect(mockEventBus.publish.called).to.be.true;
      const calls = mockEventBus.publish.getCalls();
      expect(calls.some(call => call.args[0] === 'ide.port.switching')).to.be.true;
      expect(calls.some(call => call.args[0] === 'ide.port.switch.failed')).to.be.true;
    });
  });
}); 