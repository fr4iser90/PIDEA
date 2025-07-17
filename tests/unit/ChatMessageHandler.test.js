const ChatMessageHandler = require('../../backend/domain/services/chat/ChatMessageHandler');
const IDETypes = require('../../backend/domain/services/ide/IDETypes');

// Mock browser manager
const mockBrowserManager = {
  getPage: jest.fn()
};

// Mock page object
const mockPage = {
  evaluate: jest.fn(),
  focus: jest.fn(),
  fill: jest.fn(),
  keyboard: {
    press: jest.fn()
  },
  waitForTimeout: jest.fn()
};

describe('ChatMessageHandler', () => {
  let chatMessageHandler;

  beforeEach(() => {
    jest.clearAllMocks();
    chatMessageHandler = new ChatMessageHandler(mockBrowserManager, IDETypes.CURSOR);
    mockBrowserManager.getPage.mockResolvedValue(mockPage);
  });

  describe('Constructor', () => {
    test('should initialize with correct IDE type and selectors', () => {
      expect(chatMessageHandler.ideType).toBe(IDETypes.CURSOR);
      expect(chatMessageHandler.selectors).toBeDefined();
      expect(chatMessageHandler.selectors.input).toBe('.aislash-editor-input[contenteditable="true"]');
    });

    test('should handle missing selectors gracefully', () => {
      const handler = new ChatMessageHandler(mockBrowserManager, 'invalid-ide');
      expect(handler.selectors).toBeNull();
    });
  });

  describe('sendMessage', () => {
    test('should send message successfully', async () => {
      const message = 'Hello, world!';
      
      await chatMessageHandler.sendMessage(message, { waitForResponse: false });
      
      expect(mockPage.focus).toHaveBeenCalledWith(chatMessageHandler.selectors.input);
      expect(mockPage.fill).toHaveBeenCalledWith(chatMessageHandler.selectors.input, message);
      expect(mockPage.keyboard.press).toHaveBeenCalledWith('Enter');
    });

    test('should throw error when no page available', async () => {
      mockBrowserManager.getPage.mockResolvedValue(null);
      
      await expect(chatMessageHandler.sendMessage('test')).rejects.toThrow('No IDE page available');
    });

    test('should throw error when no selectors available', async () => {
      const handler = new ChatMessageHandler(mockBrowserManager, 'invalid-ide');
      
      await expect(handler.sendMessage('test')).rejects.toThrow('No chat selectors available');
    });
  });

  describe('detectCodeBlocks', () => {
    test('should detect code blocks from DOM', async () => {
      const mockCodeBlocks = [
        {
          type: 'code_block',
          language: 'javascript',
          content: 'const x = 1;',
          confidence: 0.95,
          syntax: { isValid: true, hasErrors: false },
          hasApplyButton: true,
          lineCount: 1,
          characterCount: 11
        }
      ];

      mockPage.evaluate.mockResolvedValue(mockCodeBlocks);

      const result = await chatMessageHandler.detectCodeBlocks(mockPage);

      expect(result).toEqual(mockCodeBlocks);
      expect(mockPage.evaluate).toHaveBeenCalledWith(expect.any(Function), chatMessageHandler.selectors);
    });

    test('should handle errors gracefully', async () => {
      mockPage.evaluate.mockRejectedValue(new Error('DOM error'));

      const result = await chatMessageHandler.detectCodeBlocks(mockPage);

      expect(result).toEqual([]);
    });
  });

  describe('detectLanguageFromElement', () => {
    test('should detect JavaScript from language element', () => {
      const languageElement = { className: 'javascript-lang-file-icon' };
      const filenameElement = null;

      const result = chatMessageHandler.detectLanguageFromElement(languageElement, filenameElement);

      expect(result).toBe('javascript');
    });

    test('should detect TypeScript from filename', () => {
      const languageElement = null;
      const filenameElement = { textContent: 'app.ts' };

      const result = chatMessageHandler.detectLanguageFromElement(languageElement, filenameElement);

      expect(result).toBe('typescript');
    });

    test('should return text for unknown language', () => {
      const languageElement = null;
      const filenameElement = null;

      const result = chatMessageHandler.detectLanguageFromElement(languageElement, filenameElement);

      expect(result).toBe('text');
    });
  });

  describe('calculateConfidence', () => {
    test('should calculate high confidence for Monaco editor', () => {
      const container = {
        querySelector: jest.fn((selector) => {
          if (selector === '.monaco-editor') return { className: 'monaco-editor' };
          if (selector === '.mtk1, .mtk4, .mtk14, .mtk18') return { className: 'mtk1' };
          return null;
        })
      };

      const result = chatMessageHandler.calculateConfidence(container, chatMessageHandler.selectors);

      expect(result).toBeGreaterThan(0.8);
    });

    test('should calculate base confidence for minimal elements', () => {
      const container = {
        querySelector: jest.fn(() => null)
      };

      const result = chatMessageHandler.calculateConfidence(container, chatMessageHandler.selectors);

      expect(result).toBe(0.5);
    });
  });

  describe('validateSyntax', () => {
    test('should validate JavaScript syntax', () => {
      const codeText = 'const x = 1; console.log(x);';
      const language = 'javascript';

      const result = chatMessageHandler.validateSyntax(codeText, language);

      expect(result.isValid).toBe(true);
      expect(result.hasErrors).toBe(false);
      expect(result.hasLanguageFeatures).toBe(true);
      expect(result.language).toBe('javascript');
    });

    test('should detect JavaScript errors', () => {
      const codeText = 'const x = 1; SyntaxError;';
      const language = 'javascript';

      const result = chatMessageHandler.validateSyntax(codeText, language);

      expect(result.hasErrors).toBe(true);
    });

    test('should validate TypeScript syntax', () => {
      const codeText = 'interface User { name: string; }';
      const language = 'typescript';

      const result = chatMessageHandler.validateSyntax(codeText, language);

      expect(result.isValid).toBe(true);
      expect(result.hasLanguageFeatures).toBe(true);
    });
  });

  describe('extractInlineCode', () => {
    test('should extract inline code from backticks', () => {
      const content = 'Here is some `code` and more `text`';

      const result = chatMessageHandler.extractInlineCode(content);

      expect(result).toHaveLength(2);
      expect(result[0].content).toBe('code');
      expect(result[1].content).toBe('text');
    });

    test('should extract HTML code tags', () => {
      const content = 'Here is <code>html code</code>';

      const result = chatMessageHandler.extractInlineCode(content);

      expect(result).toHaveLength(1);
      expect(result[0].content).toBe('html code');
    });

    test('should extract template literals', () => {
      const content = 'Here is ${template} literal';

      const result = chatMessageHandler.extractInlineCode(content);

      expect(result).toHaveLength(1);
      expect(result[0].content).toBe('template');
    });
  });

  describe('waitForAIResponse', () => {
    test('should wait for AI response and detect code blocks', async () => {
      const mockResponse = 'Here is the response';
      const mockCodeBlocks = [
        {
          type: 'code_block',
          language: 'javascript',
          content: 'const x = 1;',
          confidence: 0.95
        }
      ];

      // Mock stable message count
      mockPage.evaluate
        .mockResolvedValueOnce(1) // First message count
        .mockResolvedValueOnce(1) // Second message count (stable)
        .mockResolvedValueOnce(mockCodeBlocks); // Code blocks

      // Mock extractLatestAIResponse
      chatMessageHandler.extractLatestAIResponse = jest.fn().mockResolvedValue(mockResponse);

      const result = await chatMessageHandler.waitForAIResponse({ timeout: 1000 });

      expect(result.success).toBe(true);
      expect(result.response).toBe(mockResponse);
      expect(result.codeBlocks).toEqual(mockCodeBlocks);
    });

    test('should handle timeout', async () => {
      // Mock changing message count to simulate ongoing response
      mockPage.evaluate.mockResolvedValue(1);

      const result = await chatMessageHandler.waitForAIResponse({ timeout: 100 });

      expect(result.success).toBe(false);
    });
  });
}); 