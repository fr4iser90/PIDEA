# Accessibility Guidelines

## WCAG 2.1 Compliance

### Perceivable
- Provide text alternatives for non-text content
- Create content that can be presented in different ways
- Make it easier for users to see and hear content

### Operable
- Make all functionality available from a keyboard
- Give users enough time to read and use content
- Do not design content in a way that is known to cause seizures
- Provide ways to help users navigate and find content

### Understandable
- Make text readable and understandable
- Make web pages appear and operate in predictable ways
- Help users avoid and correct mistakes

### Robust
- Maximize compatibility with current and future user tools

## Implementation Guidelines

### Semantic HTML
```html
<!-- Use proper heading hierarchy -->
<h1>Main Title</h1>
<h2>Section Title</h2>
<h3>Subsection Title</h3>

<!-- Use semantic elements -->
<nav>Navigation</nav>
<main>Main content</main>
<aside>Sidebar</aside>
<footer>Footer</footer>
```

### ARIA Labels
```html
<!-- Add descriptive labels -->
<button aria-label="Close dialog">×</button>
<input aria-describedby="password-help" type="password">
<div id="password-help">Password must be at least 8 characters</div>
```

### Keyboard Navigation
```javascript
// Ensure all interactive elements are keyboard accessible
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    // Handle activation
  }
});
```

### Color Contrast
- Maintain minimum contrast ratio of 4.5:1 for normal text
- Use 3:1 ratio for large text
- Test with color blindness simulators

### Focus Management
```javascript
// Manage focus for modals and dialogs
const modal = document.getElementById('modal');
const focusableElements = modal.querySelectorAll(
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
);
```

## Testing

### Automated Testing
- Use axe-core for automated accessibility testing
- Integrate with CI/CD pipelines
- Regular accessibility audits

### Manual Testing
- Test with screen readers (NVDA, JAWS, VoiceOver)
- Keyboard-only navigation testing
- Color contrast verification
- Mobile accessibility testing

## Common Patterns

### Skip Links
```html
<a href="#main-content" class="skip-link">
  Skip to main content
</a>
```

### Error Messages
```html
<div role="alert" aria-live="polite">
  Error: Please enter a valid email address
</div>
```

### Loading States
```html
<div aria-live="polite" aria-busy="true">
  Loading content...
</div>
```

## Resources
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [WebAIM Checklist](https://webaim.org/standards/wcag/checklist)
- [axe-core Testing](https://github.com/dequelabs/axe-core)
