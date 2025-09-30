/**
 * Unit Tests for Chat Selector Collection
 */

const SelectorCollectionBot = require('@domain/services/ide/SelectorCollectionBot');
const SelectorCollector = require('@infrastructure/external/ide/SelectorCollector');

describe('Chat Selector Collection', () => {
  let bot;
  let mockSelectorCollector;
  let mockSelectorVersionManager;
  let mockIDETypesUpdater;
  let mockLogger;

  beforeEach(() => {
    // Mock selector collector
    mockSelectorCollector = {
      collectSelectors: jest.fn(),
      collectChatSelectors: jest.fn(),
      detectChatState: jest.fn()
    };

    // Mock selector version manager
    mockSelectorVersionManager = {
      getSelectors: jest.fn(),
      addVersion: jest.fn()
    };

    // Mock IDE types updater
    mockIDETypesUpdater = {
      updateVersion: jest.fn()
    };

    // Mock logger
    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn()
    };

    // Create bot instance
    bot = new SelectorCollectionBot({
      selectorCollector: mockSelectorCollector,
      selectorVersionManager: mockSelectorVersionManager,
      ideTypesUpdater: mockIDETypesUpdater,
      logger: mockLogger
    });
  });

  describe('collectChatSelectors', () => {
    it('should collect comprehensive chat selectors', async () => {
      const mockChatSelectors = {
        newChatButton: '[data-testid="new-chat-button"]',
        sendButton: '[data-testid="send-button"]',
        chatInput: '[contenteditable="true"]',
        chatContainer: '.chat-container',
        userMessages: '.user-message',
        aiMessages: '.ai-message',
        settingsButton: '[aria-label="Settings"]',
        modelSelector: '[data-testid="model-selector"]',
        webSearchToggle: '[data-testid="web-search-toggle"]',
        contextButton: '[data-testid="context-button"]',
        attachFileButton: '[data-testid="attach-file-button"]',
        helpButton: '[data-testid="help-button"]',
        premiumPill: '.premium-pill',
        atSignButton: '[aria-label="@"]',
        _chatState: {
          isActive: true,
          isPremium: true,
          agentMode: 'enabled',
          modelType: 'GPT-4',
          webSearchEnabled: true,
          contextAttached: true
        }
      };

      mockSelectorCollector.collectSelectors.mockResolvedValue(mockChatSelectors);

      const result = await bot.collectChatSelectors('cursor', '1.5.7', 3000);

      expect(mockSelectorCollector.collectSelectors).toHaveBeenCalledWith(3000);
      expect(result).toHaveProperty('newChatButton');
      expect(result).toHaveProperty('sendButton');
      expect(result).toHaveProperty('chatInput');
      expect(result).toHaveProperty('_chatState');
      expect(result._chatState.isActive).toBe(true);
      expect(result._chatState.isPremium).toBe(true);
    });

    it('should handle missing chat selectors gracefully', async () => {
      const mockSelectors = {
        editorTabs: '.tab',
        fileExplorer: '.explorer',
        terminal: '.terminal'
      };

      mockSelectorCollector.collectSelectors.mockResolvedValue(mockSelectors);

      const result = await bot.collectChatSelectors('cursor', '1.5.7', 3000);

      expect(result).toEqual({});
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Missing required chat selectors')
      );
    });

    it('should handle collection errors', async () => {
      mockSelectorCollector.collectSelectors.mockRejectedValue(new Error('Connection failed'));

      await expect(bot.collectChatSelectors('cursor', '1.5.7', 3000))
        .rejects.toThrow('Connection failed');
    });
  });

  describe('validateChatSelectors', () => {
    it('should validate chat selectors correctly', async () => {
      const chatSelectors = {
        newChatButton: '[data-testid="new-chat-button"]',
        sendButton: '[data-testid="send-button"]',
        chatInput: '[contenteditable="true"]',
        chatContainer: '.chat-container',
        userMessages: '.user-message',
        aiMessages: '.ai-message',
        settingsButton: '[aria-label="Settings"]',
        _chatState: { isActive: true }
      };

      const result = await bot.validateChatSelectors(chatSelectors);

      expect(result).toEqual(chatSelectors);
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Validated 8 chat selectors')
      );
    });

    it('should warn about missing required selectors', async () => {
      const chatSelectors = {
        newChatButton: '[data-testid="new-chat-button"]',
        // Missing required selectors
        _chatState: { isActive: true }
      };

      const result = await bot.validateChatSelectors(chatSelectors);

      expect(result).toEqual(chatSelectors);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Missing required chat selectors')
      );
    });

    it('should filter out invalid selectors', async () => {
      const chatSelectors = {
        newChatButton: '[data-testid="new-chat-button"]',
        invalidSelector: '<script>alert("xss")</script>',
        _chatState: { isActive: true }
      };

      const result = await bot.validateChatSelectors(chatSelectors);

      expect(result).toHaveProperty('newChatButton');
      expect(result).toHaveProperty('_chatState');
      expect(result).not.toHaveProperty('invalidSelector');
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Invalid chat selector syntax')
      );
    });
  });

  describe('testChatSelectors', () => {
    it('should test chat selectors and return results', async () => {
      const chatSelectors = {
        newChatButton: '[data-testid="new-chat-button"]',
        sendButton: '[data-testid="send-button"]',
        chatInput: '[contenteditable="true"]',
        _chatState: {
          isActive: true,
          isPremium: true,
          agentMode: 'enabled'
        }
      };

      const result = await bot.testChatSelectors('cursor', '1.5.7', chatSelectors, 3000);

      expect(result).toHaveProperty('ideType', 'cursor');
      expect(result).toHaveProperty('version', '1.5.7');
      expect(result).toHaveProperty('port', 3000);
      expect(result).toHaveProperty('tested', 3);
      expect(result).toHaveProperty('passed', 3);
      expect(result).toHaveProperty('failed', 0);
      expect(result).toHaveProperty('chatState');
      expect(result.chatState.isActive).toBe(true);
      expect(result.chatState.isPremium).toBe(true);
    });

    it('should handle invalid selectors in testing', async () => {
      const chatSelectors = {
        validSelector: '[data-testid="valid"]',
        invalidSelector: '<script>alert("xss")</script>',
        _chatState: { isActive: true }
      };

      const result = await bot.testChatSelectors('cursor', '1.5.7', chatSelectors, 3000);

      expect(result.tested).toBe(2);
      expect(result.passed).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.details.validSelector.status).toBe('passed');
      expect(result.details.invalidSelector.status).toBe('failed');
    });
  });

  describe('categorizeSelectors with chat patterns', () => {
    it('should categorize chat selectors correctly', async () => {
      const selectors = {
        newChatButton: '[data-testid="new-chat-button"]',
        sendButton: '[data-testid="send-button"]',
        chatInput: '[contenteditable="true"]',
        chatContainer: '.chat-container',
        userMessages: '.user-message',
        aiMessages: '.ai-message',
        settingsButton: '[aria-label="Settings"]',
        modelSelector: '[data-testid="model-selector"]',
        webSearchToggle: '[data-testid="web-search-toggle"]',
        contextButton: '[data-testid="context-button"]',
        attachFileButton: '[data-testid="attach-file-button"]',
        helpButton: '[data-testid="help-button"]',
        premiumPill: '.premium-pill',
        atSignButton: '[aria-label="@"]',
        messageTimestamp: '.message-timestamp',
        messageActions: '.message-actions',
        messageCopyButton: '[data-testid="copy-button"]',
        codeBlockRejectButton: '[data-testid="reject-button"]',
        codeBlockCopyButton: '[data-testid="copy-code-button"]',
        codeBlockDownloadButton: '[data-testid="download-button"]',
        chatSettingsModal: '.settings-modal',
        chatHistoryModal: '.history-modal',
        chatExportModal: '.export-modal',
        errorMessage: '.error-message',
        retryButton: '[data-testid="retry-button"]',
        connectionError: '.connection-error',
        userAvatar: '.user-avatar',
        userName: '.user-name',
        themeToggle: '[aria-label="Theme"]',
        agentAutoButton: '[data-testid="agent-auto-button"]',
        contextPercentage: '.context-percentage',
        agentModeSelector: '[data-testid="agent-mode-selector"]',
        agentModeDropdown: '.agent-mode-dropdown',
        askModeButton: '[data-testid="ask-mode-button"]',
        agentModeButton: '[data-testid="agent-mode-button"]',
        modelDropdown: '.model-dropdown',
        autoModelToggle: '[data-testid="auto-model-toggle"]',
        modelOptions: '.model-option',
        editorTabs: '.tab',
        fileExplorer: '.explorer',
        terminal: '.terminal',
        _chatState: { isActive: true }
      };

      const result = await bot.categorizeSelectors(selectors);

      expect(result).toHaveProperty('chatSelectors');
      expect(result).toHaveProperty('chatControls');
      expect(result).toHaveProperty('chatSettings');
      expect(result).toHaveProperty('chatContext');
      expect(result).toHaveProperty('agentControls');
      expect(result).toHaveProperty('editor');
      expect(result).toHaveProperty('explorer');
      expect(result).toHaveProperty('terminal');
      
      // Check that chat selectors are properly categorized into groups
      expect(result.chatControls).toHaveProperty('newChatButton');
      expect(result.chatControls).toHaveProperty('sendButton');
      expect(result.chatSelectors).toHaveProperty('chatInput');
      expect(result.chatSelectors).toHaveProperty('chatContainer');
      expect(result.chatSelectors).toHaveProperty('userMessages');
      expect(result.chatSelectors).toHaveProperty('aiMessages');
      expect(result.chatSettings).toHaveProperty('settingsButton');
      expect(result.chatSettings).toHaveProperty('modelSelector');
      expect(result.chatSettings).toHaveProperty('webSearchToggle');
      expect(result.chatContext).toHaveProperty('contextButton');
      expect(result.chatContext).toHaveProperty('attachFileButton');
      expect(result.chatContext).toHaveProperty('helpButton');
      expect(result.chatContext).toHaveProperty('premiumPill');
      expect(result.chatContext).toHaveProperty('atSignButton');
      expect(result.chatMessages).toHaveProperty('messageTimestamp');
      expect(result.chatMessages).toHaveProperty('messageActions');
      expect(result.chatMessages).toHaveProperty('messageCopyButton');
      expect(result.chatCodeBlocks).toHaveProperty('codeBlockRejectButton');
      expect(result.chatCodeBlocks).toHaveProperty('codeBlockCopyButton');
      expect(result.chatCodeBlocks).toHaveProperty('codeBlockDownloadButton');
      expect(result.chatModals).toHaveProperty('chatSettingsModal');
      expect(result.chatModals).toHaveProperty('chatHistoryModal');
      expect(result.chatModals).toHaveProperty('chatExportModal');
      expect(result.chatErrors).toHaveProperty('errorMessage');
      expect(result.chatErrors).toHaveProperty('retryButton');
      expect(result.chatErrors).toHaveProperty('connectionError');
      expect(result.chatUI).toHaveProperty('userAvatar');
      expect(result.chatUI).toHaveProperty('userName');
      expect(result.chatUI).toHaveProperty('themeToggle');
      expect(result.chatUI).toHaveProperty('agentAutoButton');
      expect(result.chatUI).toHaveProperty('contextPercentage');
      expect(result.agentControls).toHaveProperty('agentModeSelector');
      expect(result.agentControls).toHaveProperty('agentModeDropdown');
      expect(result.agentControls).toHaveProperty('askModeButton');
      expect(result.agentControls).toHaveProperty('agentModeButton');
      expect(result.agentControls).toHaveProperty('modelDropdown');
      expect(result.agentControls).toHaveProperty('autoModelToggle');
      expect(result.agentControls).toHaveProperty('modelOptions');
      
      // Check that non-chat selectors are in other categories
      expect(result.editor).toHaveProperty('editorTabs');
      expect(result.explorer).toHaveProperty('fileExplorer');
      expect(result.terminal).toHaveProperty('terminal');
      
      // Check that _chatState is not included in categories
      expect(result).not.toHaveProperty('_chatState');
    });
  });

  describe('SelectorCollector chat methods', () => {
    let collector;

    beforeEach(() => {
      collector = new SelectorCollector({
        timeout: 5000,
        retries: 2,
        logger: mockLogger
      });
    });

    describe('collectChatSelectors', () => {
      it('should collect comprehensive chat selectors', async () => {
        const mockPage = {
          evaluate: jest.fn().mockResolvedValue({
            newChatButton: '[data-testid="new-chat-button"]',
            sendButton: '[data-testid="send-button"]',
            chatInput: '[contenteditable="true"]',
            chatContainer: '.chat-container',
            userMessages: '.user-message',
            aiMessages: '.ai-message',
            settingsButton: '[aria-label="Settings"]',
            modelSelector: '[data-testid="model-selector"]',
            webSearchToggle: '[data-testid="web-search-toggle"]',
            contextButton: '[data-testid="context-button"]',
            attachFileButton: '[data-testid="attach-file-button"]',
            helpButton: '[data-testid="help-button"]',
            premiumPill: '.premium-pill',
            atSignButton: '[aria-label="@"]',
            messageTimestamp: '.message-timestamp',
            messageActions: '.message-actions',
            messageCopyButton: '[data-testid="copy-button"]',
            codeBlockRejectButton: '[data-testid="reject-button"]',
            codeBlockCopyButton: '[data-testid="copy-code-button"]',
            codeBlockDownloadButton: '[data-testid="download-button"]',
            chatSettingsModal: '.settings-modal',
            chatHistoryModal: '.history-modal',
            chatExportModal: '.export-modal',
            errorMessage: '.error-message',
            retryButton: '[data-testid="retry-button"]',
            connectionError: '.connection-error',
            userAvatar: '.user-avatar',
            userName: '.user-name',
            themeToggle: '[aria-label="Theme"]',
            agentAutoButton: '[data-testid="agent-auto-button"]',
            contextPercentage: '.context-percentage',
            agentModeSelector: '[data-testid="agent-mode-selector"]',
            agentModeDropdown: '.agent-mode-dropdown',
            askModeButton: '[data-testid="ask-mode-button"]',
            agentModeButton: '[data-testid="agent-mode-button"]',
            modelDropdown: '.model-dropdown',
            autoModelToggle: '[data-testid="auto-model-toggle"]',
            modelOptions: '.model-option'
          })
        };

        const result = await collector.collectChatSelectors(mockPage);

        expect(mockPage.evaluate).toHaveBeenCalled();
        expect(result).toHaveProperty('newChatButton');
        expect(result).toHaveProperty('sendButton');
        expect(result).toHaveProperty('chatInput');
        expect(result).toHaveProperty('settingsButton');
        expect(result).toHaveProperty('modelSelector');
        expect(result).toHaveProperty('webSearchToggle');
        expect(result).toHaveProperty('contextButton');
        expect(result).toHaveProperty('attachFileButton');
        expect(result).toHaveProperty('helpButton');
        expect(result).toHaveProperty('premiumPill');
        expect(result).toHaveProperty('atSignButton');
        expect(result).toHaveProperty('messageTimestamp');
        expect(result).toHaveProperty('messageActions');
        expect(result).toHaveProperty('messageCopyButton');
        expect(result).toHaveProperty('codeBlockRejectButton');
        expect(result).toHaveProperty('codeBlockCopyButton');
        expect(result).toHaveProperty('codeBlockDownloadButton');
        expect(result).toHaveProperty('chatSettingsModal');
        expect(result).toHaveProperty('chatHistoryModal');
        expect(result).toHaveProperty('chatExportModal');
        expect(result).toHaveProperty('errorMessage');
        expect(result).toHaveProperty('retryButton');
        expect(result).toHaveProperty('connectionError');
        expect(result).toHaveProperty('userAvatar');
        expect(result).toHaveProperty('userName');
        expect(result).toHaveProperty('themeToggle');
        expect(result).toHaveProperty('agentAutoButton');
        expect(result).toHaveProperty('contextPercentage');
        expect(result).toHaveProperty('agentModeSelector');
        expect(result).toHaveProperty('agentModeDropdown');
        expect(result).toHaveProperty('askModeButton');
        expect(result).toHaveProperty('agentModeButton');
        expect(result).toHaveProperty('modelDropdown');
        expect(result).toHaveProperty('autoModelToggle');
        expect(result).toHaveProperty('modelOptions');
        expect(mockLogger.info).toHaveBeenCalledWith(
          expect.stringContaining('Collected 38 chat selectors')
        );
      });
    });

    describe('detectChatState', () => {
      it('should detect chat state correctly', async () => {
        const mockPage = {
          evaluate: jest.fn().mockResolvedValue({
            isActive: true,
            isPremium: true,
            agentMode: 'enabled',
            modelType: 'GPT-4',
            webSearchEnabled: true,
            contextAttached: true
          })
        };

        const result = await collector.detectChatState(mockPage);

        expect(mockPage.evaluate).toHaveBeenCalled();
        expect(result).toHaveProperty('isActive', true);
        expect(result).toHaveProperty('isPremium', true);
        expect(result).toHaveProperty('agentMode', 'enabled');
        expect(result).toHaveProperty('modelType', 'GPT-4');
        expect(result).toHaveProperty('webSearchEnabled', true);
        expect(result).toHaveProperty('contextAttached', true);
        expect(mockLogger.info).toHaveBeenCalledWith(
          expect.stringContaining('Chat state detected')
        );
      });

      it('should handle detection errors gracefully', async () => {
        const mockPage = {
          evaluate: jest.fn().mockRejectedValue(new Error('Page evaluation failed'))
        };

        const result = await collector.detectChatState(mockPage);

        expect(result).toEqual({
          isActive: false,
          isPremium: false,
          agentMode: null,
          modelType: null,
          webSearchEnabled: false,
          contextAttached: false
        });
        expect(mockLogger.error).toHaveBeenCalledWith(
          'Chat state detection failed:',
          'Page evaluation failed'
        );
      });
    });
  });
});
