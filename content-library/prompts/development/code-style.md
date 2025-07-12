# Code Style Guidelines

##  Principles

### Readability
- Write code for humans, not machines
- Use descriptive names for variables, functions, and classes
- Keep functions small and focused
- Limit line length to 80-120 characters

### Consistency
- Follow established patterns in the codebase
- Use consistent formatting and naming conventions
- Maintain uniform indentation and spacing

### Maintainability
- Write self-documenting code
- Avoid magic numbers and hardcoded values
- Use meaningful comments for complex logic
- Keep dependencies minimal

## JavaScript/TypeScript

### Naming Conventions
```javascript
// Variables and functions: camelCase
const userName = 'john';
const getUserData = () => {};

// Classes and constructors: PascalCase
class UserService {}
const userService = new UserService();

// Constants: UPPER_SNAKE_CASE
const API_BASE_URL = 'https://api.example.com';
const MAX_RETRY_ATTEMPTS = 3;

// Private methods: underscore prefix
class User {
  _validateEmail(email) {}
}
```

### Function Structure
```javascript
// Prefer arrow functions for callbacks
const users = data.map(user => ({
  id: user.id,
  name: user.name
}));

// Use default parameters
const createUser = (name, email, role = 'user') => {
  return { name, email, role };
};

// Return early for guard clauses
const processUser = (user) => {
  if (!user) return null;
  if (!user.email) return null;
  
  return user.email.toLowerCase();
};
```

### Error Handling
```javascript
// Use try-catch for async operations
const fetchData = async () => {
  try {
    const response = await fetch('/api/data');
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch data:', error);
    throw new Error('Data fetch failed');
  }
};

// Use optional chaining and nullish coalescing
const userName = user?.profile?.name ?? 'Anonymous';
```

## HTML

### Semantic Structure
```html
<!-- Use semantic elements -->
<header>
  <nav>
    <ul>
      <li><a href="/">Home</a></li>
    </ul>
  </nav>
</header>

<main>
  <article>
    <h1>Article Title</h1>
    <p>Content here</p>
  </article>
</main>

<footer>
  <p>&copy; 2024 Company</p>
</footer>
```

### Attributes
```html
<!-- Use lowercase for attributes -->
<input type="text" id="username" class="form-input" />

<!-- Use double quotes consistently -->
<div class="container" data-testid="main-content">
  Content
</div>
```

## CSS

### Naming Conventions
```css
/* Use BEM methodology */
.block {}
.block__element {}
.block--modifier {}

/* Example */
.user-card {}
.user-card__avatar {}
.user-card--featured {}
```

### Organization
```css
/* Group related properties */
.element {
  /* Layout */
  display: flex;
  position: relative;
  
  /* Spacing */
  margin: 1rem 0;
  padding: 1rem;
  
  /* Typography */
  font-size: 1rem;
  line-height: 1.5;
  
  /* Colors */
  background-color: #fff;
  color: #333;
  
  /* Effects */
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}
```

### Responsive Design
```css
/* Mobile-first approach */
.container {
  width: 100%;
  padding: 1rem;
}

@media (min-width: 768px) {
  .container {
    max-width: 1200px;
    margin: 0 auto;
  }
}
```

## File Organization

### Directory Structure
```
src/
├── components/
│   ├── Button/
│   │   ├── Button.js
│   │   ├── Button.css
│   │   └── Button.test.js
│   └── UserCard/
├── services/
├── utils/
├── constants/
└── types/
```

### Import Order
```javascript
// 1. External libraries
import React from 'react';
import { useState } from 'react';

// 2. Internal modules
import { UserService } from '../services/UserService';
import { formatDate } from '../utils/dateUtils';

// 3. Relative imports
import './Component.css';
```

## Testing

### Test Structure
```javascript
describe('UserService', () => {
  describe('createUser', () => {
    it('should create a user with valid data', async () => {
      // Arrange
      const userData = { name: 'John', email: 'john@example.com' };
      
      // Act
      const result = await UserService.createUser(userData);
      
      // Assert
      expect(result).toHaveProperty('id');
      expect(result.name).toBe(userData.name);
    });
  });
});
```

## Documentation

### JSDoc Comments
```javascript
/**
 * Creates a new user in the system
 * @param {Object} userData - User information
 * @param {string} userData.name - User's full name
 * @param {string} userData.email - User's email address
 * @returns {Promise<Object>} Created user object
 * @throws {Error} When user data is invalid
 */
const createUser = async (userData) => {
  // Implementation
};
```

## Tools and Configuration

### ESLint Configuration
```json
{
  "extends": [
    "eslint:recommended",
    "@typescript-eslint/recommended"
  ],
  "rules": {
    "no-console": "warn",
    "prefer-const": "error",
    "no-unused-vars": "error"
  }
}
```

### Prettier Configuration
```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2
}
```
