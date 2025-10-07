# Phase 2: Selector Consolidation

## 📋 Phase Overview
- **Phase**: 2
- **Name**: Selector Consolidation
- **Estimated Time**: 1.5 hours
- **Status**: Planning
- **Progress**: 0%

## 🎯 Objectives
- Consolidate 1.5.7.json from 15+ categories to 7 main categories
- Map all selectors to new structure
- Validate JSON structure integrity
- Preserve all existing functionality

## 📋 Tasks
- [ ] **Backup Current File**
  - [ ] Create backup of 1.5.7.json
  - [ ] Verify backup integrity
  - [ ] Document backup location

- [ ] **Consolidate Categories**
  - [ ] Map chatSelectors (all chat-related)
  - [ ] Map commandPaletteSelectors
  - [ ] Map fileOperationSelectors
  - [ ] Map menuNavigationSelectors
  - [ ] Map projectManagementSelectors
  - [ ] Map welcomeScreenSelectors
  - [ ] Map workspaceSelectors

- [ ] **Validate Structure**
  - [ ] Check JSON syntax validity
  - [ ] Verify all selectors preserved
  - [ ] Test selector accessibility
  - [ ] Validate category organization

- [ ] **Quality Assurance**
  - [ ] Compare before/after selector counts
  - [ ] Verify no data loss
  - [ ] Test JSON parsing
  - [ ] Document changes

## 🔍 Consolidation Mapping
### chatSelectors (Target: All chat-related selectors)
- [ ] input, inputContainer, userMessages, aiMessages
- [ ] messagesContainer, chatContainer, isActive, isInputReady
- [ ] codeBlocks, codeBlockContent, codeBlockHeader, codeBlockFilename
- [ ] codeBlockLanguage, monacoEditor, codeLines, syntaxTokens
- [ ] codeBlockApplyButton, inlineCode, codeSpans, terminalBlocks
- [ ] fileReferences, urls, jsonBlocks, cssBlocks, sqlBlocks
- [ ] yamlBlocks, dockerBlocks, envBlocks, lists, tables
- [ ] syntaxClasses, newChatButton, sendButton, deleteChatButton
- [ ] renameChatButton, chatHistory, chatHistoryItem, chatHistoryTitle
- [ ] connectionStatus, loadingIndicator, thinkingIndicator
- [ ] settingsButton, modelSelector, webSearchToggle, contextButton
- [ ] attachFileButton, helpButton, premiumPill, atSignButton
- [ ] messageTimestamp, messageActions, messageCopyButton
- [ ] codeBlockRejectButton, codeBlockCopyButton, codeBlockDownloadButton
- [ ] chatSettingsModal, chatHistoryModal, chatExportModal
- [ ] errorMessage, retryButton, connectionError, userAvatar
- [ ] userName, themeToggle, agentAutoButton, contextPercentage
- [ ] agentModeSelector, agentModeDropdown, askModeButton, agentModeButton
- [ ] modelDropdown, autoModelToggle, modelOptions
- [ ] All newChatButton variants, sendButton variants, editor selectors

### Other Categories
- [ ] commandPaletteSelectors: Command palette functionality
- [ ] fileOperationSelectors: File operations and tabs
- [ ] menuNavigationSelectors: Menu navigation and modals
- [ ] projectManagementSelectors: Project management and explorer
- [ ] welcomeScreenSelectors: Welcome screen functionality
- [ ] workspaceSelectors: Workspace management

## 📊 Expected Deliverables
- [ ] Consolidated 1.5.7.json file
- [ ] Backup of original file
- [ ] Consolidation report
- [ ] Validation test results

## ⚠️ Risks and Mitigations
- **Risk**: Data loss during consolidation
- **Mitigation**: Systematic mapping and validation

- **Risk**: JSON syntax errors
- **Mitigation**: JSON validation tools and testing

## 🚀 Next Phase
- **Phase 3**: Backend Code Update
- **Prerequisites**: Successful consolidation and validation
- **Estimated Start**: After Phase 2 completion
