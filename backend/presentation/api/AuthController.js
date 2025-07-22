const Logger = require('@logging/Logger');
const ServiceLogger = require('@logging/ServiceLogger');
const logger = new ServiceLogger('AuthController');


class AuthController {
  constructor(dependencies = {}) {
    this.authApplicationService = dependencies.authApplicationService;
    if (!this.authApplicationService) {
      throw new Error('AuthController requires authApplicationService dependency');
    }
  }

  // POST /api/auth/register
  async register(req, res) {
    try {
      const { email, password, username } = req.body;
      if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Email and password are required' });
      }

      const userData = { email, password, username };
      const result = await this.authApplicationService.register(userData);
      
      res.status(201).json({ 
        success: result.success, 
        user: result.data 
      });
    } catch (error) {
      logger.error('Registration error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // POST /api/auth/login
  async login(req, res) {
    try {
      const { email, password } = req.body;

      logger.info('🔍 [AuthController] Login request received:', {
        email: email,
        passwordLength: password ? password.length : 0,
        hasEmail: !!email,
        hasPassword: !!password
      });

      // Validate input
      if (!email || !password) {
        logger.info('❌ [AuthController] Missing email or password');
        return res.status(400).json({
          success: false,
          error: 'Email and password are required'
        });
      }

      // Authenticate user and create session
      const credentials = { email, password };
      const result = await this.authApplicationService.login(credentials);

      const responseData = {
        success: true,
        data: {
          user: result.data.user,
          accessToken: result.data.session.accessToken,
          refreshToken: result.data.session.refreshToken,
          expiresAt: result.data.session.expiresAt
        }
      };

      logger.info('✅ [AuthController] Login successful, sending response:', {
        success: responseData.success,
        userId: responseData.data.user.id,
        userEmail: responseData.data.user.email,
        accessTokenLength: responseData.data.accessToken.length,
        refreshTokenLength: responseData.data.refreshToken.length
      });

      // Set httpOnly cookies for security
      res.cookie('accessToken', result.data.session.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax', // Allow cross-origin requests in development
        maxAge: 2 * 60 * 60 * 1000 // 2 hours
      });
      
      res.cookie('refreshToken', result.data.session.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax', // Allow cross-origin requests in development
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      res.json(responseData);
    } catch (error) {
      logger.error('Login error:', error);
      res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }
  }

  // POST /api/auth/refresh
  async refresh(req, res) {
    try {
      // Refresh authentication using application service
      const result = await this.authApplicationService.refreshToken();

      res.json({
        success: true,
        data: {
          message: 'Authentication refreshed successfully'
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

  // POST /api/auth/logout
  async logout(req, res) {
    try {
      // Logout using application service
      await this.authApplicationService.logout();

      // Clear cookies
      res.clearCookie('accessToken');
      res.clearCookie('refreshToken');
      
      res.json({
        success: true,
        message: 'Logged out successfully'
      });
    } catch (error) {
      logger.error('Logout error:', error);
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
      logger.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get profile'
      });
    }
  }

  // GET /api/auth/validate
  async validateToken(req, res) {
    try {
      // Check for cookies directly since this is a public route
      const accessToken = req.cookies?.accessToken;
      const refreshToken = req.cookies?.refreshToken;
      
      if (!accessToken && !refreshToken) {
        logger.info('❌ [AuthController] No authentication tokens found in cookies');
        return res.status(401).json({
          success: false,
          error: 'No valid session found',
          code: 'SESSION_EXPIRED'
        });
      }

      // Try to validate access token first
      if (accessToken) {
        try {
          const result = await this.authApplicationService.validateAccessToken(accessToken);
          if (result.success) {
            logger.info('✅ [AuthController] Access token validation successful');
            return res.json({
              success: true,
              data: {
                user: result.data.user
              }
            });
          }
        } catch (error) {
          logger.debug('❌ [AuthController] Access token validation failed, trying refresh token');
        }
      }

      // Try refresh token if access token failed
      if (refreshToken) {
        try {
          const result = await this.authApplicationService.refresh(refreshToken);
          if (result.success) {
            // Set new cookies
            res.cookie('accessToken', result.data.session.accessToken, {
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
              maxAge: 2 * 60 * 60 * 1000 // 2 hours
            });
            
            res.cookie('refreshToken', result.data.session.refreshToken, {
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
              maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
            });

            logger.info('✅ [AuthController] Token refreshed and validated successfully');
            return res.json({
              success: true,
              data: {
                user: result.data.user
              }
            });
          }
        } catch (error) {
          logger.debug('❌ [AuthController] Refresh token validation failed');
        }
      }

      // All validation attempts failed
      logger.info('❌ [AuthController] All authentication attempts failed');
      return res.status(401).json({
        success: false,
        error: 'No valid session found',
        code: 'SESSION_EXPIRED'
      });
    } catch (error) {
      logger.error('❌ [AuthController] Authentication validation error:', error);
      res.status(401).json({
        success: false,
        error: 'Authentication validation failed',
        code: 'VALIDATION_ERROR'
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
      logger.error('Update profile error:', error);
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
      logger.error('Get sessions error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get sessions'
      });
    }
  }
}

module.exports = AuthController; 