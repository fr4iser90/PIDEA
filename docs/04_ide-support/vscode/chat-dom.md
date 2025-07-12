# VS Code - Chat DOM Structure

## Overview
Documentation of VS Code's chat interface DOM structure (GitHub Copilot Chat, other AI extensions).

> **Note:** VS Code's chat interface varies significantly depending on the extension used.
> This documentation covers common patterns for GitHub Copilot Chat and similar extensions.

## HTML Structure

### **GitHub Copilot Chat**
```html
<div class="chat-container">
  <!-- Chat Input Area -->
  <div class="chat-input-container">
    <textarea class="chat-input-textarea" placeholder="Ask Copilot..."></textarea>
    <button class="chat-send-button">Send</button>
  </div>
  
  <!-- Chat Messages Area -->
  <div class="chat-messages">
    <!-- User Message -->
    <div class="chat-message user">
      <div class="message-content">User message content</div>
    </div>
    
    <!-- AI Response -->
    <div class="chat-message assistant">
      <div class="message-content">
        <div class="markdown-content">
          <!-- AI response with markdown -->
        </div>
      </div>
    </div>
  </div>
</div>
```

## Key Selectors

### **Input & Interaction**
- **Chat Input:** `.chat-input-textarea` or `textarea[placeholder*="Copilot"]`
- **Send Button:** `.chat-send-button` or `.send-button`
- **Chat Panel:** `.chat-container` or `.copilot-chat`

### **Message Content**
- **User Messages:** `.chat-message.user` or `[data-role="user"]`
- **AI Messages:** `.chat-message.assistant` or `[data-role="assistant"]`
- **Message Content:** `.message-content` or `.chat-message-content`

### **Chat State**
- **Chat Active:** `.chat-container` or `.chat-panel`
- **Loading State:** `.loading` or `.thinking` indicators
- **Input Ready:** Textarea is enabled and focusable

## Dynamic Behavior

### **Extension-Dependent**
- Different extensions use different DOM structures
- Some use React/Vue components with dynamic classes
- Selectors may change with extension updates

### **Message Loading**
- Messages typically append to chat container
- AI responses may stream in or appear at once
- Loading indicators vary by extension

## Interaction Methods

### **Send Message**
```javascript
// Standard textarea approach
await page.fill('textarea.chat-input-textarea', message);
await page.click('.chat-send-button');

// Alternative approach
await page.fill('[placeholder*="Copilot"]', message);
await page.keyboard.press('Enter');
```

### **Extract Messages**
```javascript
// Generic approach for most extensions
const messages = await page.$$eval('.chat-message', elements => {
  return elements.map(el => ({
    type: el.classList.contains('user') ? 'user' : 'ai',
    content: el.querySelector('.message-content')?.innerText || el.innerText
  }));
});
```

## Common Extensions

### **GitHub Copilot Chat**
- Selectors: `.copilot-chat`, `.chat-input-textarea`
- Features: Code suggestions, explanations

### **ChatGPT Extension**
- Selectors: `.chatgpt-container`, `.chatgpt-input`
- Features:  AI assistance

### **CodeGPT**
- Selectors: `.codegpt-chat`, `.codegpt-input`
- Features: Code generation, debugging

## Edge Cases & Issues

### **Extension Variability**
- Each extension has different DOM structure
- Frequent updates can break selectors
- Some use shadow DOM or iframe isolation

### **VS Code API Integration**
- Some extensions use VS Code's webview API
- May require different automation approaches
- Extension permissions affect functionality

## Version Compatibility
- **VS Code Version:** 1.80+
- **GitHub Copilot:** Latest
- **Last Updated:** 2024-12-19
- **Browser:** VS Code Webview (Chromium-based)

## Related Files
- `selectors.js` - VS Code specific selectors
- `editor-dom.md` - VS Code editor interface
- `sidebar-dom.md` - VS Code sidebar interface

## TODO
- [ ] Test with different chat extensions
- [ ] Document shadow DOM handling
- [ ] Add screenshots for each extension type
- [ ] Test VS Code insider builds 