# Modular IDE Commands – Phase 1: Foundation & Chat Commands

## Overview
This phase establishes the foundation for the modular IDE commands system by adding the IDE category to the system and implementing the core chat command functionality with browser-tab-like session management.

## Objectives
- [ ] Add IDE category to Categories.js
- [ ] Update CommandRegistry and HandlerRegistry with IDE category
- [ ] Create chat commands (CreateChat, SendMessage, SwitchChat, ListChats, CloseChat, GetChatHistory)
- [ ] Create corresponding handlers with selector integration
- [ ] Create ChatSessionService for browser-tab-like management

## Deliverables

### Core Infrastructure
- **File**: `backend/domain/constants/Categories.js` - Add IDE category
- **File**: `backend/application/commands/CommandRegistry.js` - Add IDE category mapping
- **File**: `backend/application/handlers/HandlerRegistry.js` - Add IDE category mapping

### Chat Commands
- **File**: `backend/application/commands/categories/ide/CreateChatCommand.js` - Create new chat session
- **File**: `backend/application/commands/categories/ide/SendMessageCommand.js` - Send message to chat
- **File**: `backend/application/commands/categories/ide/SwitchChatCommand.js` - Switch between chats
- **File**: `backend/application/commands/categories/ide/ListChatsCommand.js` - List available chats
- **File**: `backend/application/commands/categories/ide/CloseChatCommand.js` - Close chat session
- **File**: `backend/application/commands/categories/ide/GetChatHistoryCommand.js` - Get chat history

### Chat Handlers
- **File**: `backend/application/handlers/categories/ide/CreateChatHandler.js` - Handle new chat creation
- **File**: `backend/application/handlers/categories/ide/SendMessageHandler.js` - Handle message sending
- **File**: `backend/application/handlers/categories/ide/SwitchChatHandler.js` - Handle chat switching
- **File**: `backend/application/handlers/categories/ide/ListChatsHandler.js` - Handle chat listing
- **File**: `backend/application/handlers/categories/ide/CloseChatHandler.js` - Handle chat closing
- **File**: `backend/application/handlers/categories/ide/GetChatHistoryHandler.js` - Handle history retrieval

### Domain Services
- **File**: `backend/domain/services/ChatSessionService.js` - Chat session management

## Dependencies
- Requires: Existing Command/Handler architecture
- Requires: BrowserManager, IDETypes, existing IDE services
- Blocks: Phase 2 start (terminal and analysis commands)

## Estimated Time
2 hours

## Implementation Details

### 1. Add IDE Category
Update `Categories.js` to include IDE category:
```javascript
const STANDARD_CATEGORIES = {
  // ... existing categories
  IDE: 'ide', // Add this line
  // ... rest of categories
};
```

### 2. Update Registries
Add IDE category mappings to both CommandRegistry and HandlerRegistry:
```javascript
// In CommandRegistry.buildFromCategory()
ide: {
  CreateChatCommand: require('./categories/ide/CreateChatCommand'),
  SendMessageCommand: require('./categories/ide/SendMessageCommand'),
  // ... other commands
}

// In HandlerRegistry.buildFromCategory()
ide: {
  CreateChatHandler: require('./categories/ide/CreateChatHandler'),
  SendMessageHandler: require('./categories/ide/SendMessageHandler'),
  // ... other handlers
}
```

### 3. Chat Commands Implementation
All chat commands should:
- Use IDETypes for selector resolution
- Integrate with BrowserManager for IDE automation
- Support multiple IDE types (Cursor, VSCode, Windsurf)
- Include proper error handling and logging
- Follow existing Command pattern structure

### 4. Chat Handlers Implementation
All chat handlers should:
- Use ChatSessionService for session management
- Integrate with existing IDE services
- Support selector-based automation
- Include proper validation and error handling
- Follow existing Handler pattern structure

### 5. ChatSessionService
Implement browser-tab-like session management:
- Session creation and management
- Chat switching functionality
- Session persistence
- IDE port integration
- Event publishing for session changes

## Success Criteria
- [ ] IDE category successfully added to Categories.js
- [ ] CommandRegistry and HandlerRegistry updated with IDE category
- [ ] All 6 chat commands created and functional
- [ ] All 6 chat handlers created and functional
- [ ] ChatSessionService implemented with browser-tab-like management
- [ ] All commands use IDETypes for selector integration
- [ ] All commands support multiple IDE types
- [ ] Basic tests passing
- [ ] No build errors

## Testing Requirements
- [ ] Unit tests for all chat commands
- [ ] Unit tests for all chat handlers
- [ ] Unit tests for ChatSessionService
- [ ] Integration tests for chat session management
- [ ] Tests for multiple IDE type support

## Risk Mitigation
- **IDE Selector Changes**: Use IDETypes system with fallback selectors
- **Session Conflicts**: Implement proper session isolation
- **Browser Automation Failures**: Use existing proven BrowserManager patterns
- **Integration Issues**: Follow established Command/Handler patterns

## Next Phase Dependencies
This phase must be completed before Phase 2 can begin, as Phase 2 will build upon the IDE category infrastructure and may reference the ChatSessionService for integrated workflows. 