# VSCode Sidebar DOM Documentation

This document describes the DOM structure and patterns used in Visual Studio Code for sidebar-related elements.

## Overview

VSCode's sidebar contains various viewlets including the file explorer, search, source control, and extensions. Each viewlet has its own DOM structure and can be accessed via Chrome DevTools Protocol (CDP).

## Core Sidebar Structure

### Main Sidebar Container
```html
<div class="monaco-workbench">
  <div class="part sidebar">
    <div class="composite">
      <div class="composite-bar">
        <!-- Viewlet tabs -->
      </div>
      <div class="composite-parts">
        <!-- Active viewlet content -->
      </div>
    </div>
  </div>
</div>
```

### Viewlet Tabs
```html
<div class="composite-bar">
  <div class="action-item" data-id="workbench.view.explorer">
    <a class="action-label" title="Explorer">
      <span class="codicon codicon-files"></span>
    </a>
  </div>
  <div class="action-item" data-id="workbench.view.search">
    <a class="action-label" title="Search">
      <span class="codicon codicon-search"></span>
    </a>
  </div>
</div>
```

## File Explorer Viewlet

### Explorer Container
```html
<div class="composite-parts">
  <div class="composite-part explorer-viewlet">
    <div class="explorer-viewlet-content">
      <div class="explorer-item">
        <!-- File/folder items -->
      </div>
    </div>
  </div>
</div>
```

### File/Folder Items
```html
<div class="explorer-item">
  <div class="explorer-item-label">
    <span class="label-name">filename.js</span>
  </div>
  <div class="explorer-item-children">
    <!-- Nested items -->
  </div>
</div>
```

### Folder Structure
```html
<div class="explorer-item expanded">
  <div class="explorer-item-label">
    <span class="codicon codicon-folder"></span>
    <span class="label-name">src</span>
  </div>
  <div class="explorer-item-children">
    <div class="explorer-item">
      <span class="codicon codicon-file"></span>
      <span class="label-name">index.js</span>
    </div>
  </div>
</div>
```

## Key Selectors

### Sidebar Container
- **Main Sidebar**: `.monaco-workbench .part.sidebar`
- **Composite Container**: `.part.sidebar .composite`
- **Viewlet Tabs**: `.composite-bar .action-item`
- **Active Viewlet**: `.composite-parts .composite-part.active`

### File Explorer
- **Explorer Container**: `.explorer-viewlet`
- **Explorer Content**: `.explorer-viewlet-content`
- **File Items**: `.explorer-item`
- **File Labels**: `.explorer-item-label .label-name`
- **Folder Icons**: `.explorer-item .codicon-folder`
- **File Icons**: `.explorer-item .codicon-file`

### Viewlet Tabs
- **Explorer Tab**: `.action-item[data-id="workbench.view.explorer"]`
- **Search Tab**: `.action-item[data-id="workbench.view.search"]`
- **Source Control Tab**: `.action-item[data-id="workbench.view.scm"]`
- **Extensions Tab**: `.action-item[data-id="workbench.view.extensions"]`

## Common Operations

### Switching Viewlets
```javascript
// Switch to explorer viewlet
await page.click('.action-item[data-id="workbench.view.explorer"]');

// Switch to search viewlet
await page.click('.action-item[data-id="workbench.view.search"]');
```

### Opening Files
```javascript
// Click on a file in the explorer
await page.click('.explorer-item .label-name:has-text("filename.js")');

// Click on a file with specific path
await page.click('.explorer-item[title*="src/index.js"]');
```

### Expanding/Collapsing Folders
```javascript
// Expand a folder
await page.click('.explorer-item .codicon-folder');

// Collapse a folder
await page.click('.explorer-item.expanded .codicon-folder');
```

### Getting File List
```javascript
// Get all visible files
const files = await page.evaluate(() => {
  const items = document.querySelectorAll('.explorer-item .label-name');
  return Array.from(items).map(item => item.textContent);
});
```

## Search Viewlet

### Search Container
```html
<div class="composite-part search-viewlet">
  <div class="search-viewlet-content">
    <div class="search-widget">
      <input class="search-input" placeholder="Search">
      <button class="search-button">Search</button>
    </div>
    <div class="search-results">
      <!-- Search results -->
    </div>
  </div>
</div>
```

### Search Results
```html
<div class="search-results">
  <div class="search-result">
    <div class="search-result-file">
      <span class="file-name">filename.js</span>
    </div>
    <div class="search-result-matches">
      <div class="search-result-match">
        <span class="match-line">Line 10: const example = "test";</span>
      </div>
    </div>
  </div>
</div>
```

## Source Control Viewlet

### SCM Container
```html
<div class="composite-part scm-viewlet">
  <div class="scm-viewlet-content">
    <div class="scm-provider">
      <div class="scm-provider-header">
        <span class="scm-provider-name">Git</span>
      </div>
      <div class="scm-resource-group">
        <!-- Changed files -->
      </div>
    </div>
  </div>
</div>
```

### Changed Files
```html
<div class="scm-resource-group">
  <div class="scm-resource">
    <span class="scm-resource-name">modified-file.js</span>
    <span class="scm-resource-status">M</span>
  </div>
</div>
```

## Extensions Viewlet

### Extensions Container
```html
<div class="composite-part extensions-viewlet">
  <div class="extensions-viewlet-content">
    <div class="extensions-list">
      <div class="extension">
        <div class="extension-header">
          <span class="extension-name">Extension Name</span>
        </div>
        <div class="extension-description">
          Extension description
        </div>
      </div>
    </div>
  </div>
</div>
```

## State Detection

### Active Viewlet
```javascript
// Get active viewlet
const activeViewlet = await page.evaluate(() => {
  const activePart = document.querySelector('.composite-parts .composite-part.active');
  return activePart ? activePart.className : null;
});
```

### File Selection
```javascript
// Check if file is selected
const isSelected = await page.evaluate((filename) => {
  const item = document.querySelector(`.explorer-item .label-name:has-text("${filename}")`);
  return item && item.closest('.explorer-item').classList.contains('selected');
}, 'filename.js');
```

### Folder State
```javascript
// Check if folder is expanded
const isExpanded = await page.evaluate((foldername) => {
  const item = document.querySelector(`.explorer-item .label-name:has-text("${foldername}")`);
  return item && item.closest('.explorer-item').classList.contains('expanded');
}, 'src');
```

## Error Handling

### Common Issues
1. **Viewlet not loaded**: Wait for specific viewlet selector
2. **File not found**: Check if file exists in explorer
3. **Permission denied**: Check file permissions

### Timeout Handling
```javascript
// Wait for explorer to load
await page.waitForSelector('.explorer-viewlet', { timeout: 10000 });

// Wait for specific file
await page.waitForSelector('.explorer-item .label-name:has-text("filename.js")', { timeout: 5000 });
```

## Performance Considerations

### Efficient Navigation
- Use specific selectors to avoid scanning entire sidebar
- Cache frequently accessed elements
- Use `page.$()` for single elements, `page.$$()` for multiple

### Lazy Loading
```javascript
// Wait for items to load before accessing
await page.waitForSelector('.explorer-item', { timeout: 5000 });

// Get items after they're loaded
const items = await page.$$('.explorer-item');
```

## Testing

### Validation Functions
```javascript
// Check if explorer is ready
async function isExplorerReady(page) {
  try {
    await page.waitForSelector('.explorer-viewlet', { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

// Check if file exists in explorer
async function fileExistsInExplorer(page, filename) {
  try {
    await page.waitForSelector(`.explorer-item .label-name:has-text("${filename}")`, { timeout: 2000 });
    return true;
  } catch {
    return false;
  }
}

// Get explorer file count
async function getExplorerFileCount(page) {
  return await page.evaluate(() => {
    return document.querySelectorAll('.explorer-item .label-name').length;
  });
}
```

## References

- [VSCode Extension API](https://code.visualstudio.com/api)
- [Monaco Workbench](https://github.com/microsoft/vscode/tree/main/src/vs/workbench)
- [Chrome DevTools Protocol](https://chromedevtools.github.io/devtools-protocol/) 