# IDE DOM STRUCTURES DOCUMENTATION

## Overview
This document organizes DOM structure documentation for different IDEs to enable programmatic interaction with their interfaces.

## Documentation Structure

```
docs/
├── DOM-STRUCTURES.md          # This file - master overview
├── ides/
│   ├── cursor/
│   │   ├── chat-dom.md        # Cursor chat interface DOM
│   │   ├── editor-dom.md      # Cursor editor interface DOM  
│   │   ├── sidebar-dom.md     # Cursor sidebar DOM
│   │   └── selectors.js       # Cursor CSS selectors collection
│   ├── vscode/
│   │   ├── chat-dom.md        # VS Code chat interface DOM
│   │   ├── editor-dom.md      # VS Code editor interface DOM
│   │   ├── sidebar-dom.md     # VS Code sidebar DOM  
│   │   └── selectors.js       # VS Code CSS selectors collection
│   ├── windsurf/
│   │   ├── chat-dom.md        # Windsurf chat interface DOM
│   │   ├── editor-dom.md      # Windsurf editor interface DOM
│   │   ├── sidebar-dom.md     # Windsurf sidebar DOM
│   │   └── selectors.js       # Windsurf CSS selectors collection
│   └── common/
│       ├── dom-patterns.md    # Common DOM patterns across IDEs
│       └── interaction-methods.md # Common interaction methods
```

## IDE Categories

### 1. **Cursor IDE**
- **Type:** AI-first code editor
- **Chat Integration:** Native AI chat panel
- **DOM Complexity:** Medium
- **Key Features:** AI chat, code completion, file explorer

### 2. **VS Code**  
- **Type:** Microsoft code editor
- **Chat Integration:** Extensions (GitHub Copilot, etc.)
- **DOM Complexity:** High
- **Key Features:** Extension ecosystem, integrated terminal

### 3. **Windsurf**
- **Type:** AI-powered IDE
- **Chat Integration:** Built-in AI assistant
- **DOM Complexity:** Medium
- **Key Features:** AI workflow integration

## Common DOM Areas to Document

### For Each IDE:

#### **1. Chat Interface (`chat-dom.md`)**
- Chat input fields
- Message containers  
- Send buttons
- Chat history
- AI response areas

#### **2. Editor Interface (`editor-dom.md`)**
- Main editor pane
- Tab system
- File tabs
- Code completion popups
- Error/warning indicators

#### **3. Sidebar Interface (`sidebar-dom.md`)**
- File explorer
- Search panel
- Extensions panel
- Source control
- Navigation elements

#### **4. Selectors Collection (`selectors.js`)**
```javascript
// Example structure
export const CURSOR_SELECTORS = {
  chat: {
    input: '.aislash-editor-input[contenteditable="true"]',
    messages: '.aislash-editor-input-readonly',
    sendButton: '.chat-send-button'
  },
  editor: {
    tabs: '.tab-container .tab',
    activeTab: '.tab-container .tab.active',
    codeArea: '.monaco-editor'
  },
  sidebar: {
    fileExplorer: '.file-explorer',
    files: '.file-item'
  }
};
```

## Documentation Standards

### **Each DOM file should include:**
1. **HTML Structure** - Example DOM hierarchy
2. **CSS Selectors** - Key selectors for automation
3. **Dynamic Elements** - Elements that change/load dynamically  
4. **Interaction Points** - Clickable/input elements
5. **Screenshots** - Visual reference of the DOM areas
6. **Version Notes** - IDE version compatibility

### **Template Structure:**
```markdown
# [IDE Name] [Area] DOM Structure

## Overview
Brief description of this DOM area

## HTML Structure
```html
<div class="main-container">
  <!-- Example DOM structure -->
</div>
```

## Key Selectors
- **Input Field:** `.input-selector`
- **Submit Button:** `.submit-selector`

## Dynamic Behavior
- Elements that load asynchronously
- State changes to watch for

## Interaction Methods
- How to input text
- How to click buttons
- How to wait for responses

## Version Compatibility
- IDE Version: X.X.X
- Last Updated: YYYY-MM-DD
```

## Usage in Code

### **Import selectors:**
```javascript
import { CURSOR_SELECTORS } from './docs/ides/cursor/selectors.js';
import { VSCODE_SELECTORS } from './docs/ides/vscode/selectors.js';

const getSelectorsForIDE = (ideType) => {
  switch(ideType) {
    case 'cursor': return CURSOR_SELECTORS;
    case 'vscode': return VSCODE_SELECTORS;
    case 'windsurf': return WINDSURF_SELECTORS;
  }
};
```

### **Use in automation:**
```javascript
const selectors = getSelectorsForIDE('cursor');
await page.fill(selectors.chat.input, message);
await page.click(selectors.chat.sendButton);
```

## Benefits

1. **Separation of Concerns** - Each IDE has its own documentation
2. **Maintainability** - Easy to update when IDEs change
3. **Reusability** - Selectors can be imported and used in code
4. **Scalability** - Easy to add new IDEs
5. **Team Knowledge** - Clear documentation for all developers

## Next Steps

1. Create folder structure: `docs/ides/{ide-name}/`
2. Start with Cursor (most familiar)
3. Document current working selectors
4. Add screenshots for visual reference
5. Create selector files for programmatic use
6. Expand to other IDEs as needed 