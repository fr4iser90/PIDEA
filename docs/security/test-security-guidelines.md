# Security Guidelines for Testing

## Overview
This document outlines security best practices for writing tests that won't trigger security scanners like GitHub Secret Scanning, CodeQL, or similar tools.

## Problem
Security scanners often flag test files containing tokens, secrets, or credentials that look like real production data, even when they are intentionally fake test data.

## Solution: Safe Test Patterns

### ✅ **Recommended Approach**

#### 1. Use Clearly Marked Dummy Tokens
```javascript
// ✅ GOOD - Clearly marked as test data
const TEST_JWT = 'test.jwt.token.dummy.header.test.jwt.token.dummy.payload.test.jwt.token.dummy.signature';
const TEST_API_KEY = 'test-api-key-dummy-not-real-secret';
const TEST_PASSWORD = 'test-password-dummy-not-real';
```

#### 2. Add Explicit Comments
```javascript
// TEST-ONLY dummy JWT token - NOT a real secret
const testToken = 'test.jwt.token.dummy.header.test.jwt.token.dummy.payload.test.jwt.token.dummy.signature';
```

#### 3. Use Descriptive Naming
```javascript
// ✅ GOOD - Descriptive naming indicates test data
const DUMMY_JWT_TOKEN = 'test.jwt.token.dummy.header.test.jwt.token.dummy.payload.test.jwt.token.dummy.signature';
const MOCK_API_KEY = 'mock-api-key-for-testing-only';
const FAKE_PASSWORD_HASH = 'fake-password-hash-for-testing';
```

### ❌ **Avoid These Patterns**

#### 1. Real-Looking Tokens
```javascript
// ❌ BAD - Looks like real JWT
const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0LXVzZXIiLCJpYXQiOjE2MzQ1Njc4OTAsImV4cCI6MTYzNDU3MTQ5MH0.test-signature';
```

#### 2. Real-Looking API Keys
```javascript
// ❌ BAD - Looks like real API key
const apiKey = 'sk-1234567890abcdef1234567890abcdef12345678';
```

#### 3. Real-Looking Passwords
```javascript
// ❌ BAD - Could be mistaken for real password
const password = 'MySecurePassword123!';
```

## Implementation Examples

### JWT Token Testing
```javascript
describe('JWT Token Validation', () => {
  // TEST-ONLY dummy JWT token - NOT a real secret
  const validJWT = 'test.jwt.token.dummy.header.test.jwt.token.dummy.payload.test.jwt.token.dummy.signature';
  
  it('should validate token format', () => {
    const token = new Token(validJWT);
    expect(token.isValid()).toBe(true);
  });
});
```

### API Key Testing
```javascript
describe('API Key Validation', () => {
  // TEST-ONLY dummy API key - NOT a real secret
  const testApiKey = 'test-api-key-dummy-not-real-secret-12345';
  
  it('should validate API key format', () => {
    const isValid = validateApiKey(testApiKey);
    expect(isValid).toBe(true);
  });
});
```

### Password Testing
```javascript
describe('Password Validation', () => {
  // TEST-ONLY dummy password - NOT a real secret
  const testPassword = 'test-password-dummy-not-real-123';
  
  it('should hash password correctly', () => {
    const hashedPassword = hashPassword(testPassword);
    expect(hashedPassword).toMatch(/^[a-f0-9]{64}$/i);
  });
});
```

## Security Scanner Configuration

### GitHub Secret Scanning
If you need to use realistic-looking test data for specific test cases, you can configure GitHub Secret Scanning to ignore certain patterns:

1. Go to your repository settings
2. Navigate to Security & analysis
3. Configure Secret scanning
4. Add custom patterns to ignore (only for test files)

### Example .gitattributes
```gitattributes
# Mark test files to help security scanners
*.test.js linguist-detectable=false
*.test.jsx linguist-detectable=false
*.spec.js linguist-detectable=false
*.spec.jsx linguist-detectable=false
```

## Best Practices Summary

1. **Always prefix test data** with `test-`, `dummy-`, `mock-`, or `fake-`
2. **Add explicit comments** indicating the data is for testing only
3. **Use descriptive variable names** that clearly indicate test data
4. **Avoid realistic-looking patterns** that could be mistaken for real secrets
5. **Document test patterns** in your team's coding standards
6. **Review test files** as part of security reviews

## Common Patterns to Avoid

- JWT tokens starting with `eyJ`
- API keys starting with `sk-`, `pk-`, `ak-`
- Passwords that look realistic
- Database connection strings
- OAuth tokens
- SSH keys
- SSL certificates

## Emergency Response

If real secrets are accidentally committed:

1. **Immediately rotate/revoke** the exposed secrets
2. **Remove from git history** using `git filter-repo`
3. **Notify security team** if applicable
4. **Update affected services** with new secrets
5. **Review and update** test patterns to prevent recurrence

## Tools and Resources

- [GitHub Secret Scanning](https://docs.github.com/en/code-security/secret-scanning)
- [GitHub CodeQL](https://docs.github.com/en/code-security/code-scanning)
- [TruffleHog](https://github.com/trufflesecurity/truffleHog)
- [GitLeaks](https://github.com/zricethezav/gitleaks)

---

**Remember**: The goal is to write effective tests while ensuring security scanners don't generate false positives. When in doubt, make your test data obviously fake! 