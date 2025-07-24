const User = require('@entities/User');
const UserSession = require('@entities/UserSession');
const TokenValidator = require('@infrastructure/auth/TokenValidator');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const Logger = require('@logging/Logger');
const logger = new Logger('AuthService');


class AuthService {
  constructor(userRepository, userSessionRepository, jwtSecret, jwtRefreshSecret) {
    this.userRepository = userRepository;
    this.userSessionRepository = userSessionRepository;
    this.jwtSecret = jwtSecret;
    this.jwtRefreshSecret = jwtRefreshSecret;
    this.tokenValidator = new TokenValidator();
  }

  async login(credentials) {
    if (!credentials || !credentials.email || !credentials.password) {
      throw new Error('Email and password are required');
    }

    logger.info('🔍 Login attempt for email:', credentials.email);

    // Authenticate user
    const user = await this.authenticateUser(credentials.email, credentials.password);
    
    // Create user session
    const session = await this.createUserSession(user);

    logger.info('✅ Login successful for user:', credentials.email);

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name
      },
      session: {
        id: session.id,
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        expiresAt: session.expiresAt
      }
    };
  }

  // Domain methods
  async authenticateUser(email, password) {
    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    logger.debug('🔍 Attempting login for email:', email);
    logger.info('🔍 Password length:', password.length);

    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      logger.info('❌ User not found in database for email:', email);
      throw new Error('Invalid credentials');
    }

    logger.info('✅ User found in DB:', {
      id: user.id,
      email: user.email,
      role: user.role,
      passwordHashLength: user.passwordHash ? user.passwordHash.length : 0,
      passwordHashStart: user.passwordHash ? user.passwordHash.substring(0, 20) + '...' : 'null'
    });

    const isValidPassword = await user.verifyPassword(password);
    logger.info('🔍 Password verification result:', isValidPassword);
    
    if (!isValidPassword) {
      logger.info('❌ Password verification failed for user:', email);
      throw new Error('Invalid credentials');
    }

    logger.info('✅ Login successful for user:', email);
    return user;
  }

  async createUserSession(user) {
    if (!(user instanceof User)) {
      throw new Error('Invalid user entity');
    }

    logger.info('🔍 Creating session for user:', {
      id: user.id,
      email: user.email
    });

    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);
    const expiresIn = process.env.NODE_ENV === 'development' ? 2 * 60 * 60 * 1000 : 15 * 60 * 1000; // 2h dev, 15m prod
    const expiresAt = new Date(Date.now() + expiresIn);

    logger.info('🔍 Generated tokens:', {
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

    logger.info('🔍 Session created:', {
      id: session.id,
      userId: session.userId,
      isActive: session.isActive()
    });

    await this.userSessionRepository.save(session);
    logger.info('✅ Session saved to database');
    
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
        throw new Error('Invalid or expired refresh authentication');
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
      throw new Error('Invalid refresh authentication');
    }
  }

  async validateAccessToken(accessToken) {
    if (!accessToken) {
      throw new Error('Access token is required');
    }

    logger.info('🔍 Validating access token');

    try {
      // Find session by token prefix
      const session = await this.userSessionRepository.findByAccessToken(accessToken);
      if (!session) {
        logger.warn('❌ Session not found for token');
        throw new Error('Invalid or expired authentication');
      }

      // Use secure token validation
      const validationResult = this.tokenValidator.validateSessionToken(accessToken, session);
      if (!validationResult.isValid) {
        logger.warn('❌ Token validation failed:', validationResult.reason);
        
        // Automatically clean up invalid sessions
        try {
          await this.userSessionRepository.delete(session.id);
          logger.info('🧹 [AuthService] Automatically cleaned up invalid session:', session.id);
        } catch (cleanupError) {
          logger.error('❌ [AuthService] Failed to cleanup invalid session:', cleanupError.message);
        }
        
        throw new Error('Invalid authentication');
      }

      // Check if session is active
      if (!session.isActive()) {
        logger.warn('❌ Session is not active');
        
        // Automatically clean up expired sessions
        try {
          await this.userSessionRepository.delete(session.id);
          logger.info('🧹 [AuthService] Automatically cleaned up expired session:', session.id);
        } catch (cleanupError) {
          logger.error('❌ [AuthService] Failed to cleanup expired session:', cleanupError.message);
        }
        
        throw new Error('Invalid or expired authentication');
      }

      // Get user from session
      const user = await this.userRepository.findById(session.userId);
      if (!user) {
        logger.warn('❌ User not found');
        
        // Automatically clean up orphaned sessions
        try {
          await this.userSessionRepository.delete(session.id);
          logger.info('🧹 [AuthService] Automatically cleaned up orphaned session:', session.id);
        } catch (cleanupError) {
          logger.error('❌ [AuthService] Failed to cleanup orphaned session:', cleanupError.message);
        }
        
        throw new Error('User not found');
      }

      logger.info('✅ Access token validated successfully');
      return { user, session };
    } catch (error) {
      logger.error('❌ Access token validation failed:', error.message);
      throw new Error('Invalid authentication');
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

  async logout() {
    logger.info('🔍 Logout request - clearing session cookies');
    return { success: true, message: 'Logged out successfully' };
  }

  async validateToken() {
    logger.info('🔍 Validating authentication from cookies');
    // Authentication is handled via httpOnly cookies
    // This method is called by the frontend to check if user is still authenticated
    return { success: true, message: 'Authentication valid' };
  }

  async refreshToken() {
    logger.info('🔍 Refreshing authentication cookies');
    // Authentication refresh is handled via httpOnly cookies
    return { success: true, message: 'Authentication refreshed' };
  }

  async getUserProfile(userId) {
    logger.info('🔍 Getting user profile for:', userId);
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      createdAt: user.createdAt
    };
  }

  async updateUserProfile(userId, profileData) {
    logger.info('🔍 Updating user profile for:', userId);
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    // Update allowed fields
    if (profileData.name) user.name = profileData.name;
    if (profileData.email) user.email = profileData.email;
    
    await this.userRepository.save(user);
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      updatedAt: new Date()
    };
  }

  async changePassword(userId, oldPassword, newPassword) {
    logger.info('🔍 Changing password for user:', userId);
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Verify old password
    const isValidOldPassword = await user.verifyPassword(oldPassword);
    if (!isValidOldPassword) {
      throw new Error('Invalid old password');
    }

    // Set new password
    await user.setPassword(newPassword);
    await this.userRepository.save(user);
    
    return { success: true, message: 'Password changed successfully' };
  }

  async register(userData) {
    logger.info('🔍 Registering new user:', userData.email);
    
    // Check if user already exists
    const existingUser = await this.userRepository.findByEmail(userData.email);
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Create new user
    const user = new User(userData);
    await this.userRepository.save(user);

    logger.info('✅ User registered successfully:', userData.email);
    
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      createdAt: user.createdAt
    };
  }

  // Authentication token generation
  generateAccessToken(user) {
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      type: 'access'
    };

    const expiresIn = process.env.NODE_ENV === 'development' ? '2h' : '15m';
    return jwt.sign(payload, this.jwtSecret, { expiresIn });
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
    logger.info('🧹 [AuthService] Starting automatic session cleanup');
    
    try {
      // Clean up expired sessions
      const deletedCount = await this.userSessionRepository.deleteExpiredSessions();
      logger.info(`🧹 [AuthService] Cleaned up ${deletedCount} expired sessions`);
      
      // Clean up orphaned sessions (sessions without valid users)
      const orphanedCount = await this.cleanupOrphanedSessions();
      logger.info(`🧹 [AuthService] Cleaned up ${orphanedCount} orphaned sessions`);
      
      return { expired: deletedCount, orphaned: orphanedCount };
    } catch (error) {
      logger.error('❌ [AuthService] Session cleanup failed:', error.message);
      throw error;
    }
  }

  async cleanupOrphanedSessions() {
    try {
      // Get all active sessions
      const allSessions = await this.userSessionRepository.findAll();
      let orphanedCount = 0;
      
      for (const session of allSessions) {
        try {
          // Check if user still exists
          const user = await this.userRepository.findById(session.userId);
          if (!user) {
            // User doesn't exist, clean up session
            await this.userSessionRepository.delete(session.id);
            orphanedCount++;
            logger.debug(`🧹 [AuthService] Cleaned up orphaned session for non-existent user: ${session.userId}`);
          }
        } catch (error) {
          // If user lookup fails, clean up session
          await this.userSessionRepository.delete(session.id);
          orphanedCount++;
          logger.debug(`🧹 [AuthService] Cleaned up session with lookup error: ${session.id}`);
        }
      }
      
      return orphanedCount;
    } catch (error) {
      logger.error('❌ [AuthService] Orphaned session cleanup failed:', error.message);
      return 0;
    }
  }

  async getUserSessions(userId) {
    if (!userId) {
      throw new Error('User id is required');
    }

    return await this.userSessionRepository.findActiveSessionsByUserId(userId);
  }
}

module.exports = AuthService; 