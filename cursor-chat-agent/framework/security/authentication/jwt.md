# JWT Authentication

## Overview
JSON Web Tokens (JWT) provide a secure way to transmit information between parties as a JSON object. This guide covers JWT implementation, security best practices, and common authentication patterns.

## JWT Structure
```javascript
// JWT consists of three parts: Header.Payload.Signature
const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

// Decoded structure:
// Header: { "alg": "HS256", "typ": "JWT" }
// Payload: { "sub": "1234567890", "name": "John Doe", "iat": 1516239022 }
// Signature: HMACSHA256(base64UrlEncode(header) + "." + base64UrlEncode(payload), secret)
```

## Basic Implementation
```javascript
// jwt-service.js
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

class JWTService {
  constructor() {
    this.secret = process.env.JWT_SECRET;
    this.refreshSecret = process.env.JWT_REFRESH_SECRET;
    this.accessTokenExpiry = '15m';
    this.refreshTokenExpiry = '7d';
  }

  // Generate access token
  generateAccessToken(payload) {
    return jwt.sign(payload, this.secret, {
      expiresIn: this.accessTokenExpiry,
      issuer: 'myapp',
      audience: 'myapp-users'
    });
  }

  // Generate refresh token
  generateRefreshToken(payload) {
    return jwt.sign(payload, this.refreshSecret, {
      expiresIn: this.refreshTokenExpiry,
      issuer: 'myapp',
      audience: 'myapp-users'
    });
  }

  // Verify access token
  verifyAccessToken(token) {
    try {
      return jwt.verify(token, this.secret, {
        issuer: 'myapp',
        audience: 'myapp-users'
      });
    } catch (error) {
      throw new Error('Invalid access token');
    }
  }

  // Verify refresh token
  verifyRefreshToken(token) {
    try {
      return jwt.verify(token, this.refreshSecret, {
        issuer: 'myapp',
        audience: 'myapp-users'
      });
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }

  // Decode token without verification
  decodeToken(token) {
    return jwt.decode(token);
  }
}

export default new JWTService();
```

## Authentication Middleware
```javascript
// auth-middleware.js
import jwtService from '../services/jwt-service.js';
import { UserRepository } from '../repositories/UserRepository.js';

export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ 
        error: 'Access token required' 
      });
    }

    const decoded = jwtService.verifyAccessToken(token);
    
    // Check if user still exists
    const user = await UserRepository.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ 
        error: 'User not found' 
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({ 
        error: 'User account is deactivated' 
      });
    }

    req.user = user;
    req.token = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expired' 
      });
    }
    
    return res.status(403).json({ 
      error: 'Invalid token' 
    });
  }
};

export const authenticateRefreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({ 
        error: 'Refresh token required' 
      });
    }

    const decoded = jwtService.verifyRefreshToken(refreshToken);
    
    // Check if refresh token is in database
    const storedToken = await RefreshTokenRepository.findByToken(refreshToken);
    if (!storedToken || storedToken.isRevoked) {
      return res.status(401).json({ 
        error: 'Invalid refresh token' 
      });
    }

    req.user = decoded;
    req.refreshToken = refreshToken;
    next();
  } catch (error) {
    return res.status(403).json({ 
      error: 'Invalid refresh token' 
    });
  }
};

export const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required' 
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Insufficient permissions' 
      });
    }

    next();
  };
};
```

## Login and Token Management
```javascript
// auth-controller.js
import jwtService from '../services/jwt-service.js';
import bcrypt from 'bcrypt';
import { UserRepository } from '../repositories/UserRepository.js';
import { RefreshTokenRepository } from '../repositories/RefreshTokenRepository.js';

class AuthController {
  async login(req, res) {
    try {
      const { email, password } = req.body;

      // Validate input
      if (!email || !password) {
        return res.status(400).json({
          error: 'Email and password are required'
        });
      }

      // Find user
      const user = await UserRepository.findByEmail(email);
      if (!user) {
        return res.status(401).json({
          error: 'Invalid credentials'
        });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({
          error: 'Invalid credentials'
        });
      }

      // Check if user is active
      if (!user.isActive) {
        return res.status(401).json({
          error: 'Account is deactivated'
        });
      }

      // Generate tokens
      const accessToken = jwtService.generateAccessToken({
        userId: user.id,
        email: user.email,
        role: user.role
      });

      const refreshToken = jwtService.generateRefreshToken({
        userId: user.id,
        tokenId: crypto.randomUUID()
      });

      // Store refresh token
      await RefreshTokenRepository.create({
        userId: user.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip
      });

      // Update last login
      await UserRepository.updateLastLogin(user.id);

      res.json({
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        }
      });
    } catch (error) {
      res.status(500).json({
        error: 'Login failed'
      });
    }
  }

  async refresh(req, res) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          error: 'Refresh token is required'
        });
      }

      // Verify refresh token
      const decoded = jwtService.verifyRefreshToken(refreshToken);
      
      // Check if token exists and is not revoked
      const storedToken = await RefreshTokenRepository.findByToken(refreshToken);
      if (!storedToken || storedToken.isRevoked) {
        return res.status(401).json({
          error: 'Invalid refresh token'
        });
      }

      // Get user
      const user = await UserRepository.findById(decoded.userId);
      if (!user || !user.isActive) {
        return res.status(401).json({
          error: 'User not found or inactive'
        });
      }

      // Generate new tokens
      const newAccessToken = jwtService.generateAccessToken({
        userId: user.id,
        email: user.email,
        role: user.role
      });

      const newRefreshToken = jwtService.generateRefreshToken({
        userId: user.id,
        tokenId: crypto.randomUUID()
      });

      // Revoke old refresh token
      await RefreshTokenRepository.revoke(refreshToken);

      // Store new refresh token
      await RefreshTokenRepository.create({
        userId: user.id,
        token: newRefreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip
      });

      res.json({
        accessToken: newAccessToken,
        refreshToken: newRefreshToken
      });
    } catch (error) {
      res.status(401).json({
        error: 'Token refresh failed'
      });
    }
  }

  async logout(req, res) {
    try {
      const { refreshToken } = req.body;

      if (refreshToken) {
        // Revoke refresh token
        await RefreshTokenRepository.revoke(refreshToken);
      }

      res.json({
        message: 'Logged out successfully'
      });
    } catch (error) {
      res.status(500).json({
        error: 'Logout failed'
      });
    }
  }

  async logoutAll(req, res) {
    try {
      // Revoke all refresh tokens for user
      await RefreshTokenRepository.revokeAllForUser(req.user.id);

      res.json({
        message: 'Logged out from all devices'
      });
    } catch (error) {
      res.status(500).json({
        error: 'Logout failed'
      });
    }
  }
}

export default new AuthController();
```

## Security Best Practices

### Token Security
```javascript
// Enhanced JWT service with security features
class SecureJWTService {
  constructor() {
    this.secret = process.env.JWT_SECRET;
    this.refreshSecret = process.env.JWT_REFRESH_SECRET;
    this.accessTokenExpiry = '15m';
    this.refreshTokenExpiry = '7d';
  }

  generateAccessToken(payload) {
    return jwt.sign(payload, this.secret, {
      expiresIn: this.accessTokenExpiry,
      issuer: 'myapp',
      audience: 'myapp-users',
      algorithm: 'HS256',
      keyid: 'access-key-1' // Key rotation support
    });
  }

  generateRefreshToken(payload) {
    return jwt.sign(payload, this.refreshSecret, {
      expiresIn: this.refreshTokenExpiry,
      issuer: 'myapp',
      audience: 'myapp-users',
      algorithm: 'HS256',
      keyid: 'refresh-key-1',
      jti: crypto.randomUUID() // Unique token ID
    });
  }

  // Rate limiting for token generation
  async generateTokenWithRateLimit(userId, type = 'access') {
    const key = `token_rate_limit:${userId}:${type}`;
    const limit = type === 'access' ? 10 : 5; // 10 access tokens, 5 refresh tokens per hour
    
    const current = await redis.incr(key);
    if (current === 1) {
      await redis.expire(key, 3600); // 1 hour
    }
    
    if (current > limit) {
      throw new Error('Rate limit exceeded');
    }

    return type === 'access' 
      ? this.generateAccessToken({ userId })
      : this.generateRefreshToken({ userId });
  }
}
```

### Token Blacklisting
```javascript
// Token blacklist service
class TokenBlacklistService {
  constructor() {
    this.redis = redis.createClient();
  }

  async blacklistToken(token, expiresIn = 3600) {
    const decoded = jwt.decode(token);
    const ttl = decoded.exp - Math.floor(Date.now() / 1000);
    
    if (ttl > 0) {
      await this.redis.setex(`blacklist:${token}`, ttl, '1');
    }
  }

  async isBlacklisted(token) {
    const result = await this.redis.get(`blacklist:${token}`);
    return result === '1';
  }

  async cleanupExpiredTokens() {
    // Cleanup expired blacklisted tokens
    const keys = await this.redis.keys('blacklist:*');
    for (const key of keys) {
      const ttl = await this.redis.ttl(key);
      if (ttl <= 0) {
        await this.redis.del(key);
      }
    }
  }
}
```

### Password Security
```javascript
// Password service with security features
class PasswordService {
  constructor() {
    this.saltRounds = 12;
  }

  async hashPassword(password) {
    return await bcrypt.hash(password, this.saltRounds);
  }

  async verifyPassword(password, hash) {
    return await bcrypt.compare(password, hash);
  }

  validatePasswordStrength(password) {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    const errors = [];
    
    if (password.length < minLength) {
      errors.push(`Password must be at least ${minLength} characters long`);
    }
    if (!hasUpperCase) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (!hasLowerCase) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (!hasNumbers) {
      errors.push('Password must contain at least one number');
    }
    if (!hasSpecialChar) {
      errors.push('Password must contain at least one special character');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
```

### Session Management
```javascript
// Session tracking service
class SessionService {
  constructor() {
    this.redis = redis.createClient();
  }

  async trackSession(userId, sessionData) {
    const sessionId = crypto.randomUUID();
    const session = {
      id: sessionId,
      userId,
      createdAt: new Date(),
      lastActivity: new Date(),
      userAgent: sessionData.userAgent,
      ipAddress: sessionData.ipAddress,
      isActive: true
    };

    await this.redis.setex(
      `session:${sessionId}`,
      7 * 24 * 60 * 60, // 7 days
      JSON.stringify(session)
    );

    await this.redis.sadd(`user_sessions:${userId}`, sessionId);
    
    return sessionId;
  }

  async updateSessionActivity(sessionId) {
    const sessionData = await this.redis.get(`session:${sessionId}`);
    if (sessionData) {
      const session = JSON.parse(sessionData);
      session.lastActivity = new Date();
      await this.redis.setex(
        `session:${sessionId}`,
        7 * 24 * 60 * 60,
        JSON.stringify(session)
      );
    }
  }

  async revokeSession(sessionId) {
    await this.redis.del(`session:${sessionId}`);
  }

  async getUserSessions(userId) {
    const sessionIds = await this.redis.smembers(`user_sessions:${userId}`);
    const sessions = [];
    
    for (const sessionId of sessionIds) {
      const sessionData = await this.redis.get(`session:${sessionId}`);
      if (sessionData) {
        sessions.push(JSON.parse(sessionData));
      }
    }
    
    return sessions;
  }
}
```

## Error Handling
```javascript
// Custom JWT errors
class JWTError extends Error {
  constructor(message, code, statusCode = 401) {
    super(message);
    this.name = 'JWTError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

// Error handling middleware
export const handleAuthErrors = (error, req, res, next) => {
  if (error instanceof JWTError) {
    return res.status(error.statusCode).json({
      error: error.message,
      code: error.code
    });
  }

  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Token expired',
      code: 'TOKEN_EXPIRED'
    });
  }

  if (error.name === 'JsonWebTokenError') {
    return res.status(403).json({
      error: 'Invalid token',
      code: 'INVALID_TOKEN'
    });
  }

  next(error);
};
```

## Best Practices

### Security
- Use strong, unique secrets for signing
- Implement token expiration
- Use HTTPS in production
- Implement rate limiting
- Store refresh tokens securely
- Implement token blacklisting

### Performance
- Use Redis for session storage
- Implement token caching
- Use efficient algorithms
- Monitor token usage

### Monitoring
- Log authentication events
- Monitor failed login attempts
- Track token usage patterns
- Set up alerts for suspicious activity 