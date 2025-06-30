const SendMessageHandler = require('../../src/application/handlers/SendMessageHandler');
const SendMessageCommand = require('../../src/application/commands/SendMessageCommand');

describe('SendMessageHandler', () => {
  it('should send the entire markdown text as a single string to CursorIDEService', async () => {
    const mockChatRepository = { findSessionById: jest.fn(), saveSession: jest.fn() };
    const mockCursorIDEService = { sendMessage: jest.fn().mockResolvedValue(undefined) };
    const mockEventBus = { publish: jest.fn() };
    const handler = new SendMessageHandler(mockChatRepository, mockCursorIDEService, mockEventBus);

    const markdownText = `# Development Setup\n\n## Quick Start\n\n\`\`\`bash\n./start-dev.sh\n\`\`\`\n\n- **WebSocket server** on port 3001 for live reloading\n- **chokidar** watches \`web/\` directory for file changes\n- Automatically reloads browser when frontend files change\n- No page refresh needed for CSS changes`;
    const command = new SendMessageCommand(markdownText);

    await handler.handle(command);

    expect(mockCursorIDEService.sendMessage).toHaveBeenCalledTimes(1);
    expect(mockCursorIDEService.sendMessage).toHaveBeenCalledWith(markdownText);
  });
}); 