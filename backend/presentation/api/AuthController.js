const AuthService = require('@services/AuthService');
const User = require('@entities/User');
const bcrypt = require('bcryptjs');
const Logger = require('@logging/Logger');
const logger = new Logger('Logger');


class AuthController {
  constructor(authService, userRepository) {
    this.authService = authService;
    this.userRepository = userRepository;
  }

  // POST /api/auth/register
  async register(req, res) {
    try {
      const { email, password, username } = req.body;
      if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Email and password are required' });
      }
      // Hash password IMMER vor dem Speichern
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);
      const user = await this.userRepository.save({
        email,
        passwordHash,
        username,
        role: 'user',
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {}
      });
      res.status(201).json({ success: true, user: user.toJSON() });
    } catch (error) {
      logger.error('[AuthController] Registration error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // POST /api/auth/login
  async login(req, res) {
    try {
      const { email, password } = req.body;

      logger.log('🔍 [AuthController] Login request received:', {
        email: email,
        passwordLength: password ? password.length : 0,
        hasEmail: !!email,
        hasPassword: !!password
      });

      // Validate input
      if (!email || !password) {
        logger.log('❌ [AuthController] Missing email or password');
        return res.status(400).json({
          success: false,
          error: 'Email and password are required'
        });
      }

      // Authenticate user
      const user = await this.authService.authenticateUser(email, password);

      // Create session
      const session = await this.authService.createUserSession(user);

      const responseData = {
        success: true,
        data: {
          user: user.toJSON(),
          accessToken: session.accessToken,
          refreshToken: session.refreshToken,
          expiresAt: session.expiresAt
        }
      };

      logger.log('✅ [AuthController] Login successful, sending response:', {
        success: responseData.success,
        userId: responseData.data.user.id,
        userEmail: responseData.data.user.email,
        accessTokenLength: responseData.data.accessToken.length,
        refreshTokenLength: responseData.data.refreshToken.length
      });

      res.json(responseData);
    } catch (error) {
      logger.error('[AuthController] Login error:', error);
      res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }
  }

  // POST /api/auth/refresh
  async refresh(req, res) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          error: 'Refresh token is required'
        });
      }

      // Refresh session
      const session = await this.authService.refreshUserSession(refreshToken);
      const user = await this.userRepository.findById(session.userId);

      res.json({
        success: true,
        data: {
          user: user.toJSON(),
          accessToken: session.accessToken,
          refreshToken: session.refreshToken,
          expiresAt: session.expiresAt
        }
      });
    } catch (error) {
      logger.error('[AuthController] Refresh error:', error);
      res.status(401).json({
        success: false,
        error: 'Invalid refresh token'
      });
    }
  }

  // POST /api/auth/logout
  async logout(req, res) {
    try {
      const { sessionId } = req.body;

      if (sessionId) {
        // Logout specific session
        await this.authService.logoutSession(sessionId);
      } else if (req.user) {
        // Logout all user sessions
        await this.authService.logoutUser(req.user.id);
      } else {
        return res.status(400).json({
          success: false,
          error: 'Session ID or authentication required'
        });
      }

      res.json({
        success: true,
        message: 'Logged out successfully'
      });
    } catch (error) {
      logger.error('[AuthController] Logout error:', error);
      res.status(500).json({
        success: false,
        error: 'Logout failed'
      });
    }
  }

  // GET /api/auth/profile
  async getProfile(req, res) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      res.json({
        success: true,
        data: {
          user: req.user.toJSON()
        }
      });
    } catch (error) {
      logger.error('[AuthController] Get profile error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get profile'
      });
    }
  }

  // GET /api/auth/validate
  async validateToken(req, res) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Invalid or expired token'
        });
      }

      // Token is valid, return user data
      res.json({
        success: true,
        data: {
          user: req.user.toJSON()
        }
      });
    } catch (error) {
      logger.error('[AuthController] Token validation error:', error);
      res.status(401).json({
        success: false,
        error: 'Token validation failed'
      });
    }
  }

  // PUT /api/auth/profile
  async updateProfile(req, res) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      const { email, currentPassword, newPassword } = req.body;

      // Update email if provided
      if (email && email !== req.user.email) {
        const existingUser = await this.userRepository.findByEmail(email);
        if (existingUser) {
          return res.status(409).json({
            success: false,
            error: 'Email already in use'
          });
        }
        req.user._email = email;
      }

      // Update password if provided
      if (newPassword) {
        if (!currentPassword) {
          return res.status(400).json({
            success: false,
            error: 'Current password is required to change password'
          });
        }

        const isValidPassword = await req.user.verifyPassword(currentPassword);
        if (!isValidPassword) {
          return res.status(400).json({
            success: false,
            error: 'Current password is incorrect'
          });
        }

        const newPasswordHash = await User.createUser('temp', newPassword);
        req.user._passwordHash = newPasswordHash.passwordHash;
      }

      // Update timestamp
      req.user.updateLastActivity();

      // Save updated user
      await this.userRepository.update(req.user);

      res.json({
        success: true,
        data: {
          user: req.user.toJSON()
        }
      });
    } catch (error) {
      logger.error('[AuthController] Update profile error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update profile'
      });
    }
  }

  // GET /api/auth/sessions
  async getSessions(req, res) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      const sessions = await this.authService.getUserSessions(req.user.id);

      res.json({
        success: true,
        data: {
          sessions: sessions.map(session => ({
            id: session.id,
            createdAt: session.createdAt,
            expiresAt: session.expiresAt,
            isActive: session.isActive(),
            metadata: session.metadata
          }))
        }
      });
    } catch (error) {
      logger.error('[AuthController] Get sessions error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get sessions'
      });
    }
  }
}

module.exports = AuthController; 