const User = require('@entities/User');
const UserSession = require('@entities/UserSession');
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

    // logger.info('🔍 Validating access token:', accessToken.substring(0, 20) + '...');

    try {
      const decoded = jwt.verify(accessToken, this.jwtSecret);
      // logger.info('🔍 JWT decoded successfully:', {
      //   userId: decoded.userId,
      //   email: decoded.email,
      //   role: decoded.role,
      //   type: decoded.type
      // });
      
      const session = await this.userSessionRepository.findByAccessToken(accessToken);
      // logger.info('🔍 Session found:', session ? {
      //   id: session.id,
      //   userId: session.userId,
      //   isActive: session.isActive(),
      //   expiresAt: session.expiresAt
      // } : 'null');
      
      if (!session || !session.isActive()) {
        logger.info('❌ Session invalid or expired');
        throw new Error('Invalid or expired access token');
      }

      const user = await this.userRepository.findById(decoded.userId);
      // logger.info('🔍 User found:', user ? {
      //   id: user.id,
      //   email: user.email,
      //   role: user.role
      // } : 'null');
      
      if (!user) {
        logger.info('❌ User not found');
        throw new Error('User not found');
      }

      // logger.info('✅ Token validation successful');
      return { user, session };
    } catch (error) {
      logger.error('❌ Token validation failed:', error.message);
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

  async logout(userId) {
    logger.info('🔍 Logout request for user:', userId);
    await this.logoutUser(userId);
    return { success: true, message: 'Logged out successfully' };
  }

  async validateToken(token) {
    logger.info('🔍 Validating token');
    const result = await this.validateAccessToken(token);
    return result;
  }

  async refreshToken(refreshToken) {
    logger.info('🔍 Refreshing token');
    const session = await this.refreshUserSession(refreshToken);
    return {
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      expiresAt: session.expiresAt
    };
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

  // Token generation
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