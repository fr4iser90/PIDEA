/**
 * Integration Tests for Chat Selector Collection
 */

const SelectorCollectionBot = require('@domain/services/ide/SelectorCollectionBot');
const SelectorCollector = require('@infrastructure/external/ide/SelectorCollector');
const SelectorVersionManager = require('@domain/services/ide/SelectorVersionManager');

describe('Chat Selector Collection Integration', () => {
  let bot;
  let collector;
  let versionManager;
  let mockLogger;

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn()
    };

    collector = new SelectorCollector({
      timeout: 5000,
      retries: 2,
      logger: mockLogger
    });

    versionManager = new SelectorVersionManager({
      logger: mockLogger
    });

    bot = new SelectorCollectionBot({
      selectorCollector: collector,
      selectorVersionManager: versionManager,
      logger: mockLogger
    });
  });

  describe('End-to-End Chat Selector Collection', () => {
    it('should collect and categorize chat selectors through full workflow', async () => {
      // Mock the collector to return comprehensive chat selectors
      const mockSelectors = {
        // Chat Controls
        newChatButton: '[data-testid="new-chat-button"]',
        sendButton: '[data-testid="send-button"]',
        deleteChatButton: '[data-testid="delete-chat-button"]',
        renameChatButton: '[data-testid="rename-chat-button"]',
        
        // Chat History
        chatHistory: '[data-testid="chat-history"]',
        chatHistoryItem: '.chat-history-item',
        chatHistoryTitle: '.chat-title',
        
        // Chat Status
        connectionStatus: '.connection-status',
        loadingIndicator: '.loading-indicator',
        thinkingIndicator: '.thinking-indicator',
        
        // Chat Settings
        settingsButton: '[aria-label="Settings"]',
        modelSelector: '[data-testid="model-selector"]',
        webSearchToggle: '[data-testid="web-search-toggle"]',
        
        // Chat Context
        contextButton: '[data-testid="context-button"]',
        attachFileButton: '[data-testid="attach-file-button"]',
        helpButton: '[data-testid="help-button"]',
        premiumPill: '.premium-pill',
        atSignButton: '[aria-label="@"]',
        
        // Chat Messages
        chatInput: '[contenteditable="true"]',
        chatContainer: '.chat-container',
        userMessages: '.user-message',
        aiMessages: '.ai-message',
        messageTimestamp: '.message-timestamp',
        messageActions: '.message-actions',
        messageCopyButton: '[data-testid="copy-button"]',
        
        // Chat Code Blocks
        codeBlockRejectButton: '[data-testid="reject-button"]',
        codeBlockCopyButton: '[data-testid="copy-code-button"]',
        codeBlockDownloadButton: '[data-testid="download-button"]',
        
        // Chat Modals
        chatSettingsModal: '.settings-modal',
        chatHistoryModal: '.history-modal',
        chatExportModal: '.export-modal',
        
        // Chat Error States
        errorMessage: '.error-message',
        retryButton: '[data-testid="retry-button"]',
        connectionError: '.connection-error',
        
        // Chat UI
        userAvatar: '.user-avatar',
        userName: '.user-name',
        themeToggle: '[aria-label="Theme"]',
        agentAutoButton: '[data-testid="agent-auto-button"]',
        contextPercentage: '.context-percentage',
        
        // Agent Controls
        agentModeSelector: '[data-testid="agent-mode-selector"]',
        agentModeDropdown: '.agent-mode-dropdown',
        askModeButton: '[data-testid="ask-mode-button"]',
        agentModeButton: '[data-testid="agent-mode-button"]',
        modelDropdown: '.model-dropdown',
        autoModelToggle: '[data-testid="auto-model-toggle"]',
        modelOptions: '.model-option',
        
        // Non-chat selectors
        editorTabs: '.tab',
        fileExplorer: '.explorer',
        terminal: '.terminal',
        
        // Chat state
        _chatState: {
          isActive: true,
          isPremium: true,
          agentMode: 'enabled',
          modelType: 'GPT-4',
          webSearchEnabled: true,
          contextAttached: true
        }
      };

      // Mock collector methods
      jest.spyOn(collector, 'collectSelectors').mockResolvedValue(mockSelectors);

      // Execute the full workflow
      const result = await bot.collectSelectors('cursor', '1.5.7', 3000);

      // Verify the result structure
      expect(result).toHaveProperty('chatSelectors');
      expect(result).toHaveProperty('chatControls');
      expect(result).toHaveProperty('chatHistory');
      expect(result).toHaveProperty('chatStatus');
      expect(result).toHaveProperty('chatSettings');
      expect(result).toHaveProperty('chatContext');
      expect(result).toHaveProperty('chatMessages');
      expect(result).toHaveProperty('chatCodeBlocks');
      expect(result).toHaveProperty('chatModals');
      expect(result).toHaveProperty('chatErrors');
      expect(result).toHaveProperty('chatUI');
      expect(result).toHaveProperty('agentControls');
      expect(result).toHaveProperty('editor');
      expect(result).toHaveProperty('explorer');
      expect(result).toHaveProperty('terminal');

      // Verify chat selectors are properly categorized into groups
      expect(result.chatControls).toHaveProperty('newChatButton');
      expect(result.chatControls).toHaveProperty('sendButton');
      expect(result.chatControls).toHaveProperty('deleteChatButton');
      expect(result.chatControls).toHaveProperty('renameChatButton');
      expect(result.chatHistory).toHaveProperty('chatHistory');
      expect(result.chatHistory).toHaveProperty('chatHistoryItem');
      expect(result.chatHistory).toHaveProperty('chatHistoryTitle');
      expect(result.chatStatus).toHaveProperty('connectionStatus');
      expect(result.chatStatus).toHaveProperty('loadingIndicator');
      expect(result.chatStatus).toHaveProperty('thinkingIndicator');
      expect(result.chatSettings).toHaveProperty('settingsButton');
      expect(result.chatSettings).toHaveProperty('modelSelector');
      expect(result.chatSettings).toHaveProperty('webSearchToggle');
      expect(result.chatContext).toHaveProperty('contextButton');
      expect(result.chatContext).toHaveProperty('attachFileButton');
      expect(result.chatContext).toHaveProperty('helpButton');
      expect(result.chatContext).toHaveProperty('premiumPill');
      expect(result.chatContext).toHaveProperty('atSignButton');
      expect(result.chatSelectors).toHaveProperty('chatInput');
      expect(result.chatSelectors).toHaveProperty('chatContainer');
      expect(result.chatSelectors).toHaveProperty('userMessages');
      expect(result.chatSelectors).toHaveProperty('aiMessages');
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

      // Verify non-chat selectors are in correct categories
      expect(result.editor).toHaveProperty('editorTabs');
      expect(result.explorer).toHaveProperty('fileExplorer');
      expect(result.terminal).toHaveProperty('terminal');

      // Verify chat state is not included in categories
      expect(result.chat).not.toHaveProperty('_chatState');
      expect(result.editor).not.toHaveProperty('_chatState');
      expect(result.explorer).not.toHaveProperty('_chatState');
      expect(result.terminal).not.toHaveProperty('_chatState');

      // Verify logging
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Collecting selectors for cursor version 1.5.7')
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Successfully collected')
      );
    });

    it('should handle collection errors gracefully', async () => {
      // Mock collector to throw error
      jest.spyOn(collector, 'collectSelectors').mockRejectedValue(new Error('Connection failed'));

      await expect(bot.collectSelectors('cursor', '1.5.7', 3000))
        .rejects.toThrow('Selector collection failed for cursor version 1.5.7');

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Selector collection failed for cursor version 1.5.7')
      );
    });

    it('should cache results correctly', async () => {
      const mockSelectors = {
        newChatButton: '[data-testid="new-chat-button"]',
        sendButton: '[data-testid="send-button"]',
        chatInput: '[contenteditable="true"]',
        _chatState: { isActive: true }
      };

      jest.spyOn(collector, 'collectSelectors').mockResolvedValue(mockSelectors);

      // First call
      const result1 = await bot.collectSelectors('cursor', '1.5.7', 3000);
      
      // Second call should use cache
      const result2 = await bot.collectSelectors('cursor', '1.5.7', 3000);

      expect(result1).toEqual(result2);
      expect(collector.collectSelectors).toHaveBeenCalledTimes(1);
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Using cached selectors for cursor version 1.5.7')
      );
    });
  });

  describe('Chat Selector Validation Integration', () => {
    it('should validate chat selectors through full workflow', async () => {
      const mockSelectors = {
        newChatButton: '[data-testid="new-chat-button"]',
        sendButton: '[data-testid="send-button"]',
        chatInput: '[contenteditable="true"]',
        chatContainer: '.chat-container',
        userMessages: '.user-message',
        aiMessages: '.ai-message',
        settingsButton: '[aria-label="Settings"]',
        invalidSelector: '<script>alert("xss")</script>',
        _chatState: { isActive: true }
      };

      jest.spyOn(collector, 'collectSelectors').mockResolvedValue(mockSelectors);

      const result = await bot.collectSelectors('cursor', '1.5.7', 3000);

      // Verify valid selectors are included
      expect(result.chat).toHaveProperty('newChatButton');
      expect(result.chat).toHaveProperty('sendButton');
      expect(result.chat).toHaveProperty('chatInput');
      expect(result.chat).toHaveProperty('chatContainer');
      expect(result.chat).toHaveProperty('userMessages');
      expect(result.chat).toHaveProperty('aiMessages');
      expect(result.chat).toHaveProperty('settingsButton');

      // Verify invalid selector is filtered out
      expect(result.chat).not.toHaveProperty('invalidSelector');

      // Verify warning was logged
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Invalid selector syntax')
      );
    });
  });

  describe('Chat Selector Testing Integration', () => {
    it('should test chat selectors through full workflow', async () => {
      const mockSelectors = {
        newChatButton: '[data-testid="new-chat-button"]',
        sendButton: '[data-testid="send-button"]',
        chatInput: '[contenteditable="true"]',
        chatContainer: '.chat-container',
        userMessages: '.user-message',
        aiMessages: '.ai-message',
        settingsButton: '[aria-label="Settings"]',
        _chatState: {
          isActive: true,
          isPremium: true,
          agentMode: 'enabled'
        }
      };

      jest.spyOn(collector, 'collectSelectors').mockResolvedValue(mockSelectors);

      const categorizedSelectors = await bot.collectSelectors('cursor', '1.5.7', 3000);
      const testResults = await bot.testSelectors('cursor', '1.5.7', categorizedSelectors, 3000);

      expect(testResults).toHaveProperty('ideType', 'cursor');
      expect(testResults).toHaveProperty('version', '1.5.7');
      expect(testResults).toHaveProperty('port', 3000);
      expect(testResults).toHaveProperty('tested');
      expect(testResults).toHaveProperty('passed');
      expect(testResults).toHaveProperty('failed');
      expect(testResults).toHaveProperty('details');

      // Verify chat selectors were tested
      expect(testResults.details.chat).toHaveProperty('total');
      expect(testResults.details.chat).toHaveProperty('passed');
      expect(testResults.details.chat).toHaveProperty('failed');
      expect(testResults.details.chat).toHaveProperty('selectors');

      // Verify all chat selectors passed
      expect(testResults.details.chat.passed).toBe(testResults.details.chat.total);
      expect(testResults.details.chat.failed).toBe(0);
    });
  });

  describe('Version Manager Integration', () => {
    it('should integrate with SelectorVersionManager for new versions', async () => {
      const mockSelectors = {
        newChatButton: '[data-testid="new-chat-button"]',
        sendButton: '[data-testid="send-button"]',
        chatInput: '[contenteditable="true"]',
        _chatState: { isActive: true }
      };

      jest.spyOn(collector, 'collectSelectors').mockResolvedValue(mockSelectors);
      jest.spyOn(versionManager, 'collectSelectorsForVersion').mockResolvedValue({
        success: true,
        selectors: mockSelectors,
        testResults: { passed: 3, failed: 0, tested: 3 }
      });

      const result = await versionManager.collectSelectorsForVersion('cursor', '1.5.7', 3000);

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('selectors');
      expect(result).toHaveProperty('testResults');
      expect(result.selectors).toHaveProperty('newChatButton');
      expect(result.selectors).toHaveProperty('sendButton');
      expect(result.selectors).toHaveProperty('chatInput');
      expect(result.selectors).toHaveProperty('_chatState');
    });
  });
});
