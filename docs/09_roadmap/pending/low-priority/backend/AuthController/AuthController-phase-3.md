# AuthController Refactoring - Phase 3: Core Implementation

**Phase:** 3 - Core Implementation
**Status:** In Progress

## Phase 3 Goals
- Move business logic from AuthController to AuthApplicationService
- Update AuthController to use only AuthApplicationService
- Remove direct domain/infrastructure imports
- Ensure proper error handling

## Implementation Steps

### Step 1: Add Missing Methods to AuthApplicationService
Need to add the following methods to `AuthApplicationService.js`:

1. `getUserProfile(userId)` - Get user profile data
2. `updateUserProfile(userId, profileData)` - Update user profile  
3. `getUserSessions(userId)` - Get user sessions

### Step 2: Refactor AuthController Methods

#### 2.1 Refactor `getProfile()` Method
**Current Violation:**
```javascript
// ❌ Direct domain entity access
res.json({
  success: true,
  data: {
    user: req.user.toJSON() // ❌ Direct domain entity access
  }
});
```

**Target Implementation:**
```javascript
// ✅ Use application service
const result = await this.authApplicationService.getUserProfile(req.user.id);
res.json({
  success: true,
  data: {
    user: result.data.user
  }
});
```

#### 2.2 Refactor `updateProfile()` Method
**Current Violations:**
- Direct repository access: `this.userRepository.findByEmail()`
- Direct domain entity access: `req.user.verifyPassword()`, `req.user.updateLastActivity()`
- Direct domain entity creation: `User.createUser()`
- Direct repository update: `this.userRepository.update()`

**Target Implementation:**
```javascript
// ✅ Use application service
const profileData = { email, currentPassword, newPassword };
const result = await this.authApplicationService.updateUserProfile(req.user.id, profileData);
res.json({
  success: true,
  data: {
    user: result.data.user
  }
});
```

#### 2.3 Refactor `getSessions()` Method
**Current Violation:**
```javascript
// ❌ Direct domain service access
const sessions = await this.authService.getUserSessions(req.user.id);
```

**Target Implementation:**
```javascript
// ✅ Use application service
const result = await this.authApplicationService.getUserSessions(req.user.id);
res.json({
  success: true,
  data: {
    sessions: result.data.sessions
  }
});
```

### Step 3: Remove Direct Imports
Remove any direct imports of domain entities or infrastructure services from AuthController.

## Implementation Details

### AuthApplicationService Method Signatures

```javascript
// Get user profile
async getUserProfile(userId) {
  // Implementation
}

// Update user profile
async updateUserProfile(userId, profileData) {
  // Implementation with validation
}

// Get user sessions
async getUserSessions(userId) {
  // Implementation
}
```

### Error Handling Strategy
- All business logic errors should be caught in AuthApplicationService
- AuthController should only handle HTTP-specific errors
- Consistent error response format across all methods

## Validation Checklist
- [ ] All business logic moved to AuthApplicationService
- [ ] AuthController only handles HTTP concerns
- [ ] No direct domain entity access in controller
- [ ] No direct infrastructure access in controller
- [ ] Proper error handling implemented
- [ ] All methods use application service pattern

## Next Steps
After completing Phase 3:
1. Move to Phase 4: Integration & Connectivity
2. Test all authentication endpoints
3. Validate layer compliance 