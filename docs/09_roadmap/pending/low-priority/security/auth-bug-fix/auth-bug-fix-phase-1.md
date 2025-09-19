# Auth Bug Fix - Phase 1: Immediate Fixes

**Phase:** 1 - Immediate Fixes
**Status:** In Progress
**Priority:** CRITICAL

## Phase 1 Goals
- Fix the incomplete refresh endpoint implementation
- Ensure proper cookie security settings
- Complete the authentication flow

## Critical Issue Identified

### **Refresh Endpoint Problem**
The `/api/auth/refresh` endpoint is **INCOMPLETE**:

**Current Implementation (WRONG):**
```javascript
// backend/presentation/api/AuthController.js - Line 101-122
async refresh(req, res) {
  try {
    // ❌ WRONG: Calls refreshToken() without parameters
    const result = await this.authApplicationService.refreshToken();
    
    res.json({
      success: true,
      data: {
        message: 'Authentication refreshed successfully' // ❌ No new tokens!
      }
    });
  } catch (error) {
    // ...
  }
}
```

**Required Implementation (CORRECT):**
```javascript
async refresh(req, res) {
  try {
    // ✅ CORRECT: Get refresh token from cookies
    const refreshToken = req.cookies?.refreshToken;
    
    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'Refresh token is required'
      });
    }

    // ✅ CORRECT: Call refresh() with refresh token
    const result = await this.authApplicationService.refresh(refreshToken);
    
    // ✅ CORRECT: Set new cookies
    res.cookie('accessToken', result.data.session.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 15 * 60 * 1000 // 15 minutes
    });
    
    res.cookie('refreshToken', result.data.session.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({
      success: true,
      data: {
        user: result.data.user
      }
    });
  } catch (error) {
    logger.error('Refresh error:', error);
    res.status(401).json({
      success: false,
      error: 'Authentication refresh failed'
    });
  }
}
```

## Implementation Steps

### Step 1: Fix Refresh Endpoint
- [ ] Update `backend/presentation/api/AuthController.js` refresh method
- [ ] Extract refresh token from cookies
- [ ] Call `authApplicationService.refresh(refreshToken)` instead of `refreshToken()`
- [ ] Set new cookies with proper security settings
- [ ] Return user data in response

### Step 2: Cookie Security Improvements
- [ ] Update sameSite settings for better security
- [ ] Align token expiry times with enterprise standards
- [ ] Ensure consistent cookie settings across all endpoints

### Step 3: Validation
- [ ] Test refresh endpoint with valid refresh token
- [ ] Test refresh endpoint with invalid/expired token
- [ ] Verify new cookies are set correctly
- [ ] Confirm user data is returned properly

## Success Criteria
- [ ] Refresh endpoint accepts refresh token from cookies
- [ ] New access and refresh tokens are generated
- [ ] New cookies are set with proper security settings
- [ ] User data is returned in response
- [ ] Error handling works correctly for invalid tokens

## Dependencies
- None (uses existing AuthApplicationService.refresh() method)

## Estimated Time
- **30 minutes** (immediate fix) 