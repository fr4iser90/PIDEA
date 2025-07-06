# Cursor IDE - Chat DOM Structure

## Overview
Documentation of Cursor IDE's AI chat interface DOM structure for programmatic interaction.

## HTML Structure

### **Main Chat Container**
```html
<div class="aislash-container">
  <!-- Chat Input Area -->
  <div class="aislash-editor-container">
    <div class="aislash-editor-input" contenteditable="true" data-lexical-editor="true">
      <!-- User input field -->
    </div>
  </div>
  
  <!-- Chat Messages Area -->
  <div class="chat-messages-container">
    <!-- User Messages -->
    <div class="aislash-editor-input-readonly" contenteditable="false" data-lexical-editor="true">
      <!-- User message content -->
    </div>
    
    <!-- AI Response Messages -->
    <span class="anysphere-markdown-container-root">
      <!-- AI response content -->
    </span>
  </div>
</div>
```

## Key Selectors

### **Input & Interaction**
- **Chat Input:** `.aislash-editor-input[contenteditable="true"]`
- **Send Action:** Press `Enter` key (no separate button)
- **Focus Input:** `.aislash-editor-input[contenteditable="true"]`

### **Message Content**
- **User Messages:** `div.aislash-editor-input-readonly[contenteditable="false"][data-lexical-editor="true"]`
- **AI Messages:** `span.anysphere-markdown-container-root`
- **All Messages:** Combination of both selectors above

### **Chat State**
- **Chat Active:** `.aislash-container` presence
- **Input Ready:** `.aislash-editor-input[contenteditable="true"]` is focusable
- **Loading State:** Look for loading indicators (varies)

## Dynamic Behavior

### **Message Loading**
- Messages load asynchronously after sending
- AI responses stream in gradually
- DOM updates continuously during AI response

### **Input Behavior**  
- `contenteditable="true"` div acts as text input
- Enter key triggers message send
- Shift+Enter for line breaks
- Input clears after sending

### **Scroll Behavior**
- Chat auto-scrolls to bottom on new messages
- Manual scroll affects auto-scroll behavior

## Interaction Methods

### **Send Message**
```javascript
// Focus input
await page.focus('.aislash-editor-input[contenteditable="true"]');

// Type message
await page.fill('.aislash-editor-input[contenteditable="true"]', message);

// Send (Enter key)
await page.keyboard.press('Enter');
```

### **Extract Messages**
```javascript
// Get user messages
const userMessages = await page.$$eval(
  'div.aislash-editor-input-readonly[contenteditable="false"][data-lexical-editor="true"]',
  elements => elements.map(el => el.innerText.trim())
);

// Get AI messages  
const aiMessages = await page.$$eval(
  'span.anysphere-markdown-container-root',
  elements => elements.map(el => el.innerText.trim())
);

// Combine and sort by DOM position
const allMessages = await page.evaluate(() => {
  const messages = [];
  
  // User messages
  document.querySelectorAll('div.aislash-editor-input-readonly[contenteditable="false"][data-lexical-editor="true"]')
    .forEach(el => {
      messages.push({
        type: 'user',
        content: el.innerText.trim(),
        element: el
      });
    });
  
  // AI messages
  document.querySelectorAll('span.anysphere-markdown-container-root')
    .forEach(el => {
      messages.push({
        type: 'ai', 
        content: el.innerText.trim(),
        element: el
      });
    });
  
  // Sort by DOM position
  messages.sort((a, b) => {
    const aRect = a.element.getBoundingClientRect();
    const bRect = b.element.getBoundingClientRect();
    return aRect.top - bRect.top;
  });
  
  return messages.map(msg => ({
    type: msg.type,
    content: msg.content
  }));
});
```

### **Wait for Response**
```javascript
// Wait for new AI message to appear
await page.waitForSelector('span.anysphere-markdown-container-root', { 
  state: 'attached',
  timeout: 30000 
});

// Wait for response to finish (more complex)
await page.waitForFunction(() => {
  // Look for completion indicators or stable message count
  const messages = document.querySelectorAll('span.anysphere-markdown-container-root');
  return messages.length > 0; // Adjust logic as needed
});
```

## Edge Cases & Issues

### **Content Editable Quirks**
- Sometimes `page.fill()` doesn't work - use `page.type()` instead
- Content may have HTML formatting that affects `innerText`
- Focus might be lost between operations

### **Message Parsing**
- AI messages may contain markdown that renders as HTML
- Code blocks have special formatting
- Long messages may be truncated or paginated

### **Timing Issues**
- Messages load asynchronously
- Need proper waits between interactions
- AI responses can take 10-30 seconds

## Version Compatibility
- **Cursor Version:** Latest (2024)
- **Last Updated:** 2024-12-19
- **Tested On:** Linux, Windows
- **Browser:** Chromium-based automation

## Related Files
- `selectors.js` - Exported selectors for programmatic use
- `editor-dom.md` - Cursor editor interface
- `sidebar-dom.md` - Cursor sidebar interface 


