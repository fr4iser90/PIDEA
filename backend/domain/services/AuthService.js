const User = require('@/domain/entities/User');
const UserSession = require('@/domain/entities/UserSession');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

class AuthService {
  constructor(userRepository, userSessionRepository, jwtSecret, jwtRefreshSecret) {
    this.userRepository = userRepository;
    this.userSessionRepository = userSessionRepository;
    this.jwtSecret = jwtSecret;
    this.jwtRefreshSecret = jwtRefreshSecret;
  }

  // Domain methods
  async authenticateUser(email, password) {
    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    console.log('🔍 [AuthService] Attempting login for email:', email);
    console.log('🔍 [AuthService] Password length:', password.length);

    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      console.log('❌ [AuthService] User not found in database for email:', email);
      throw new Error('Invalid credentials');
    }

    console.log('✅ [AuthService] User found in DB:', {
      id: user.id,
      email: user.email,
      role: user.role,
      passwordHashLength: user.passwordHash ? user.passwordHash.length : 0,
      passwordHashStart: user.passwordHash ? user.passwordHash.substring(0, 20) + '...' : 'null'
    });

    const isValidPassword = await user.verifyPassword(password);
    console.log('🔍 [AuthService] Password verification result:', isValidPassword);
    
    if (!isValidPassword) {
      console.log('❌ [AuthService] Password verification failed for user:', email);
      throw new Error('Invalid credentials');
    }

    console.log('✅ [AuthService] Login successful for user:', email);
    return user;
  }

  async createUserSession(user) {
    if (!(user instanceof User)) {
      throw new Error('Invalid user entity');
    }

    console.log('🔍 [AuthService] Creating session for user:', {
      id: user.id,
      email: user.email
    });

    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    console.log('🔍 [AuthService] Generated tokens:', {
      accessTokenLength: accessToken.length,
      refreshTokenLength: refreshToken.length,
      expiresAt: expiresAt.toISOString()
    });

    const session = UserSession.createSession(
      user.id,
      accessToken,
      refreshToken,
      expiresAt,
      {
        userAgent: 'web',
        ipAddress: 'unknown'
      }
    );

    console.log('🔍 [AuthService] Session created:', {
      id: session.id,
      userId: session.userId,
      isActive: session.isActive()
    });

    await this.userSessionRepository.save(session);
    console.log('✅ [AuthService] Session saved to database');
    
    return session;
  }

  async refreshUserSession(refreshToken) {
    if (!refreshToken) {
      throw new Error('Refresh token is required');
    }

    try {
      const decoded = jwt.verify(refreshToken, this.jwtRefreshSecret);
      const session = await this.userSessionRepository.findByRefreshToken(refreshToken);
      
      if (!session || !session.isActive()) {
        throw new Error('Invalid or expired refresh token');
      }

      const user = await this.userRepository.findById(decoded.userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Create new session
      const newSession = await this.createUserSession(user);
      
      // Delete old session
      await this.userSessionRepository.delete(session.id);
      
      return newSession;
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }

  async validateAccessToken(accessToken) {
    if (!accessToken) {
      throw new Error('Access token is required');
    }

    // console.log('🔍 [AuthService] Validating access token:', accessToken.substring(0, 20) + '...');

    try {
      const decoded = jwt.verify(accessToken, this.jwtSecret);
      console.log('🔍 [AuthService] JWT decoded successfully:', {
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role,
        type: decoded.type
      });
      
      const session = await this.userSessionRepository.findByAccessToken(accessToken);
      // console.log('🔍 [AuthService] Session found:', session ? {
      //   id: session.id,
      //   userId: session.userId,
      //   isActive: session.isActive(),
      //   expiresAt: session.expiresAt
      // } : 'null');
      
      if (!session || !session.isActive()) {
        console.log('❌ [AuthService] Session invalid or expired');
        throw new Error('Invalid or expired access token');
      }

      const user = await this.userRepository.findById(decoded.userId);
      // console.log('🔍 [AuthService] User found:', user ? {
      //   id: user.id,
      //   email: user.email,
      //   role: user.role
      // } : 'null');
      
      if (!user) {
        console.log('❌ [AuthService] User not found');
        throw new Error('User not found');
      }

      console.log('✅ [AuthService] Token validation successful');
      return { user, session };
    } catch (error) {
      console.error('❌ [AuthService] Token validation failed:', error.message);
      throw new Error('Invalid access token');
    }
  }

  async logoutUser(userId) {
    if (!userId) {
      throw new Error('User id is required');
    }

    const sessions = await this.userSessionRepository.findActiveSessionsByUserId(userId);
    for (const session of sessions) {
      await this.userSessionRepository.delete(session.id);
    }
  }

  async logoutSession(sessionId) {
    if (!sessionId) {
      throw new Error('Session id is required');
    }

    await this.userSessionRepository.delete(sessionId);
  }

  // Token generation
  generateAccessToken(user) {
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      type: 'access'
    };

    return jwt.sign(payload, this.jwtSecret, { expiresIn: '15m' });
  }

  generateRefreshToken(user) {
    const payload = {
      userId: user.id,
      type: 'refresh'
    };

    return jwt.sign(payload, this.jwtRefreshSecret, { expiresIn: '7d' });
  }

  // Utility methods
  async cleanupExpiredSessions() {
    await this.userSessionRepository.deleteExpiredSessions();
  }

  async getUserSessions(userId) {
    if (!userId) {
      throw new Error('User id is required');
    }

    return await this.userSessionRepository.findActiveSessionsByUserId(userId);
  }
}

module.exports = AuthService; 