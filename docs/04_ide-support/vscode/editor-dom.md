# VSCode Editor DOM Documentation

This document describes the DOM structure and patterns used in Visual Studio Code for editor-related elements.

## Overview

VSCode uses a Monaco-based editor with a complex DOM structure. The editor is built on Electron and uses Chromium's rendering engine, making it accessible via Chrome DevTools Protocol (CDP).

## Core Editor Structure

### Main Editor Container
```html
<div class="monaco-workbench">
  <div class="part editor">
    <div class="tabs-container">
      <!-- Editor tabs -->
    </div>
    <div class="editor-container">
      <!-- Monaco editor instance -->
    </div>
  </div>
</div>
```

### Editor Tabs
```html
<div class="tabs-container">
  <div class="tab active" data-resource-uri="file:///path/to/file.js">
    <div class="tab-label">
      <span class="tab-label-text">file.js</span>
    </div>
    <div class="tab-close-button">×</div>
  </div>
</div>
```

### Monaco Editor Instance
```html
<div class="monaco-editor">
  <div class="overflow-guard">
    <div class="margin" role="presentation">
      <!-- Line numbers -->
    </div>
    <div class="monaco-scrollable-element">
      <div class="monaco-editor-background">
        <!-- Editor content -->
      </div>
    </div>
  </div>
</div>
```

## Key Selectors

### Editor Tabs
- **Active Tab**: `.tabs-container .tab.active`
- **All Tabs**: `.tabs-container .tab`
- **Tab Label**: `.tab .tab-label-text`
- **Close Button**: `.tab .tab-close-button`
- **Dirty Tab**: `.tab.dirty`

### Editor Content
- **Editor Container**: `.monaco-editor`
- **Line Numbers**: `.margin .margin-view-overlays`
- **Editor Background**: `.monaco-editor-background`
- **Scrollable Area**: `.monaco-scrollable-element`

### Editor Actions
- **Context Menu**: `.context-view`
- **Command Palette**: `.quick-input-widget`
- **Find Widget**: `.find-widget`

## Editor State Detection

### File Status
- **Modified**: Tab has `.dirty` class
- **Read-only**: Editor has `.readonly` class
- **Focused**: Editor has `.focused` class

### Language Mode
```javascript
// Get current language mode
const languageMode = await page.evaluate(() => {
  const editor = document.querySelector('.monaco-editor');
  return editor ? editor.getAttribute('data-mode') : null;
});
```

### Cursor Position
```javascript
// Get cursor position
const cursorPosition = await page.evaluate(() => {
  const cursor = document.querySelector('.monaco-editor .cursor');
  if (cursor) {
    const rect = cursor.getBoundingClientRect();
    return { x: rect.left, y: rect.top };
  }
  return null;
});
```

## Extension Integration

### GitHub Copilot
```html
<div class="copilot-chat-container">
  <div class="copilot-chat-input" contenteditable="true">
    <!-- Chat input -->
  </div>
  <button class="copilot-chat-send-button">
    <!-- Send button -->
  </button>
</div>
```

### ChatGPT Extension
```html
<div class="chatgpt-container">
  <div class="chatgpt-input" contenteditable="true">
    <!-- Chat input -->
  </div>
  <button class="chatgpt-send-button">
    <!-- Send button -->
  </button>
</div>
```

### CodeGPT Extension
```html
<div class="codegpt-container">
  <div class="codegpt-input" contenteditable="true">
    <!-- Chat input -->
  </div>
  <button class="codegpt-send-button">
    <!-- Send button -->
  </button>
</div>
```

## Common Operations

### Opening a File
```javascript
// Click on a file in the explorer
await page.click('.explorer-viewlet .explorer-item[title="filename.js"]');
```

### Switching Between Tabs
```javascript
// Click on a specific tab
await page.click('.tabs-container .tab[data-resource-uri*="filename.js"]');
```

### Getting Editor Content
```javascript
// Get current editor content
const content = await page.evaluate(() => {
  const editor = document.querySelector('.monaco-editor');
  if (editor && editor.editor) {
    return editor.editor.getValue();
  }
  return null;
});
```

### Setting Editor Content
```javascript
// Set editor content
await page.evaluate((newContent) => {
  const editor = document.querySelector('.monaco-editor');
  if (editor && editor.editor) {
    editor.editor.setValue(newContent);
  }
}, newContent);
```

## Error Handling

### Common Issues
1. **Editor not loaded**: Wait for `.monaco-editor` selector
2. **Tab not found**: Check if file is open in editor
3. **Extension not available**: Verify extension is installed and enabled

### Timeout Handling
```javascript
// Wait for editor to be ready
await page.waitForSelector('.monaco-editor', { timeout: 10000 });

// Wait for specific tab
await page.waitForSelector('.tabs-container .tab[data-resource-uri*="filename.js"]', { timeout: 5000 });
```

## Performance Considerations

### Efficient Selection
- Use specific selectors to avoid scanning entire DOM
- Cache frequently accessed elements
- Use `page.$()` for single elements, `page.$$()` for multiple

### Event Handling
```javascript
// Listen for editor changes
await page.evaluate(() => {
  const editor = document.querySelector('.monaco-editor');
  if (editor && editor.editor) {
    editor.editor.onDidChangeModelContent(() => {
      console.log('Editor content changed');
    });
  }
});
```

## Testing

### Validation Functions
```javascript
// Check if editor is ready
async function isEditorReady(page) {
  try {
    await page.waitForSelector('.monaco-editor', { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

// Check if file is open
async function isFileOpen(page, filename) {
  try {
    await page.waitForSelector(`.tabs-container .tab[data-resource-uri*="${filename}"]`, { timeout: 2000 });
    return true;
  } catch {
    return false;
  }
}
```

## References

- [Monaco Editor API](https://microsoft.github.io/monaco-editor/api/)
- [VSCode Extension API](https://code.visualstudio.com/api)
- [Chrome DevTools Protocol](https://chromedevtools.github.io/devtools-protocol/) 