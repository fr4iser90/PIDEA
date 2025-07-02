# Common DOM Patterns Across IDEs

## Overview
This document identifies common DOM patterns and structures found across different IDEs to help with cross-IDE automation and understanding.

## Common Layout Patterns

### **Three-Panel Layout**
Most modern IDEs follow a similar layout:
```
┌─────────┬─────────────────┬─────────┐
│ Left    │                 │ Right   │
│ Sidebar │   Main Editor   │ Panel   │
│         │                 │ (opt.)  │
├─────────┼─────────────────┼─────────┤
│         │ Terminal/Output │         │
└─────────┴─────────────────┴─────────┘
```

### **Sidebar Components**
- **File Explorer:** Tree view of project files
- **Search:** Global search across files
- **Source Control:** Git/VCS integration
- **Extensions:** Plugin management
- **Debug:** Debugging controls

### **Editor Area**
- **Tab System:** Multiple open files
- **Code Editor:** Main editing surface (often Monaco)
- **Minimap:** Code overview on right
- **Breadcrumbs:** File path navigation

## Common UI Patterns

### **Chat Interface Patterns**

#### **Input Methods**
1. **ContentEditable Div** (Cursor, Claude)
   ```html
   <div contenteditable="true" data-lexical-editor="true">
   ```
   - More flexible formatting
   - Supports rich text/markdown
   - Requires special handling

2. **Textarea/Input** (VS Code extensions)
   ```html
   <textarea class="chat-input"></textarea>
   <input type="text" class="chat-input">
   ```
   - Standard HTML form elements
   - Simpler automation
   - Limited formatting

3. **Custom Input Components** (Windsurf)
   ```html
   <div class="custom-input-component">
     <div class="input-area"></div>
   </div>
   ```
   - Framework-specific (React, Vue, etc.)
   - May require framework-aware automation

#### **Message Display Patterns**
1. **Separate User/AI Containers**
   ```html
   <div class="message user">...</div>
   <div class="message ai">...</div>
   ```

2. **Role-Based Classes**
   ```html
   <div class="message" data-role="user">...</div>
   <div class="message" data-role="assistant">...</div>
   ```

3. **Markdown Containers**
   ```html
   <div class="markdown-content">
     <!-- Rendered markdown -->
   </div>
   ```

### **File Explorer Patterns**

#### **Tree Structure**
```html
<div class="file-explorer">
  <div class="folder" data-expanded="true">
    <div class="folder-header">
      <span class="folder-icon">📁</span>
      <span class="folder-name">src</span>
    </div>
    <div class="folder-children">
      <div class="file">
        <span class="file-icon">📄</span>
        <span class="file-name">index.js</span>
      </div>
    </div>
  </div>
</div>
```

#### **Common Classes**
- `.file-explorer`, `.file-tree`, `.explorer`
- `.folder`, `.directory`, `.folder-item`
- `.file`, `.file-item`
- `.expanded`, `.collapsed`

### **Tab System Patterns**

#### **Tab Container**
```html
<div class="tab-container">
  <div class="tab active" data-file="index.js">
    <span class="tab-label">index.js</span>
    <button class="tab-close">×</button>
  </div>
  <div class="tab" data-file="styles.css">
    <span class="tab-label">styles.css</span>
    <button class="tab-close">×</button>
  </div>
</div>
```

#### **Common Patterns**
- Active tab has `.active` class
- Close buttons within tabs
- File path in `data-*` attributes
- Unsaved files marked with `*` or dot

## Common Selectors

### **Universal Patterns**
```javascript
// Chat areas
'.chat', '.ai-chat', '.assistant', '.conversation'

// File explorer
'.file-explorer', '.file-tree', '.sidebar .files'

// Editor
'.monaco-editor', '.code-editor', '.editor-container'

// Tabs
'.tab', '.editor-tab', '.file-tab'

// Buttons
'.button', '.btn', '[role="button"]'

// Input fields
'input', 'textarea', '[contenteditable="true"]'

// Loading states
'.loading', '.spinner', '[aria-busy="true"]'
```

### **Attribute Patterns**
```javascript
// Data attributes
'[data-file]', '[data-path]', '[data-role]'

// ARIA attributes  
'[role="button"]', '[aria-expanded]', '[aria-selected]'

// State classes
'.active', '.selected', '.expanded', '.collapsed'
```

## Automation Strategies

### **Cross-IDE Compatible Approaches**

#### **1. Multiple Selector Strategy**
```javascript
const findElement = async (page, selectors) => {
  for (const selector of selectors) {
    try {
      const element = await page.$(selector);
      if (element) return element;
    } catch (e) {
      continue;
    }
  }
  throw new Error('Element not found with any selector');
};

// Usage
const chatInput = await findElement(page, [
  '.aislash-editor-input[contenteditable="true"]', // Cursor
  '.chat-input-textarea',                          // VS Code
  '.message-input',                                // Generic
  '[placeholder*="message"]'                       // Fallback
]);
```

#### **2. Feature Detection**
```javascript
const detectIDEType = async (page) => {
  // Check for unique elements/classes
  if (await page.$('.aislash-container')) return 'cursor';
  if (await page.$('.monaco-workbench')) return 'vscode';
  if (await page.$('.windsurf-container')) return 'windsurf';
  return 'unknown';
};
```

#### **3. Graceful Degradation**
```javascript
const sendMessage = async (page, message) => {
  // Try contenteditable first
  try {
    const input = await page.$('[contenteditable="true"]');
    if (input) {
      await input.fill(message);
      await page.keyboard.press('Enter');
      return;
    }
  } catch (e) {}
  
  // Fallback to textarea
  try {
    const textarea = await page.$('textarea.chat-input');
    if (textarea) {
      await textarea.fill(message);
      await page.click('.send-button');
      return;
    }
  } catch (e) {}
  
  throw new Error('Could not find chat input');
};
```

## Performance Considerations

### **Efficient Selectors**
- Use specific classes over generic ones
- Avoid complex CSS selectors when possible
- Cache selectors that are used frequently
- Use `data-*` attributes for reliable targeting

### **Timing Strategies**
- Always wait for elements before interaction
- Use `waitForSelector` with reasonable timeouts
- Implement retry logic for flaky elements
- Watch for loading states before proceeding

## Best Practices

1. **Document Edge Cases** - Each IDE has quirks
2. **Version Compatibility** - Track IDE version changes
3. **Error Handling** - Graceful fallbacks
4. **Performance** - Efficient selector strategies
5. **Maintenance** - Regular validation of selectors 