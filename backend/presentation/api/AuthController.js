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
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
        // Note: No domain specified for development to allow cross-port cookies
      };

      res.cookie('accessToken', result.data.session.accessToken, {
        ...cookieOptions,
        maxAge: 15 * 60 * 1000 // 15 minutes (enterprise standard)
      });
      
      res.cookie('refreshToken', result.data.session.refreshToken, {
        ...cookieOptions,
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
      // Get refresh token from cookies
      const refreshToken = req.cookies?.refreshToken;
      
      if (!refreshToken) {
        logger.info('❌ [AuthController] No refresh token found in cookies');
        return res.status(400).json({
          success: false,
          error: 'Refresh token is required'
        });
      }

      // Refresh authentication using application service with refresh token
      const result = await this.authApplicationService.refresh(refreshToken);
      
      // Set new cookies with proper security settings
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
        // Note: No domain specified for development to allow cross-port cookies
      };

      res.cookie('accessToken', result.data.session.accessToken, {
        ...cookieOptions,
        maxAge: 15 * 60 * 1000 // 15 minutes (enterprise standard)
      });
      
      res.cookie('refreshToken', result.data.session.refreshToken, {
        ...cookieOptions,
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      logger.info('✅ [AuthController] Authentication refreshed successfully', {
        userId: result.data.user.id,
        userEmail: result.data.user.email
      });

      res.json({
        success: true,
        data: {
          user: result.data.user
        }
      });
    } catch (error) {
      logger.error('❌ [AuthController] Refresh error:', error);
      res.status(401).json({
        success: false,
        error: 'Authentication refresh failed'
      });
    }
  }

  // POST /api/auth/logout
  async logout(req, res) {
    try {
      // Try to logout using application service (if user is authenticated)
      try {
        await this.authApplicationService.logout();
        logger.info('✅ [AuthController] User logout successful');
      } catch (authError) {
        // If authentication fails, that's OK - we still want to clear cookies
        logger.info('🔍 [AuthController] User not authenticated, clearing cookies only');
      }

      // ALWAYS clear cookies, regardless of authentication status
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
        // Note: No domain specified for development to allow cross-port cookies
      };

      res.clearCookie('accessToken', cookieOptions);
      res.clearCookie('refreshToken', cookieOptions);
      
      logger.info('✅ [AuthController] Cookies cleared successfully');
      
      res.json({
        success: true,
        message: 'Logged out successfully'
      });
    } catch (error) {
      logger.error('❌ [AuthController] Logout error:', error);
      
      // Even if there's an error, try to clear cookies
      try {
        const cookieOptions = {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
          // Note: No domain specified for development to allow cross-port cookies
        };

        res.clearCookie('accessToken', cookieOptions);
        res.clearCookie('refreshToken', cookieOptions);
        logger.info('✅ [AuthController] Cookies cleared despite error');
      } catch (cookieError) {
        logger.error('❌ [AuthController] Failed to clear cookies:', cookieError);
      }
      
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

      const result = await this.authApplicationService.getUserProfile(req.user.id);
      
      res.json({
        success: true,
        data: {
          user: result.data.user
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
            const cookieOptions = {
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
              // Note: No domain specified for development to allow cross-port cookies
            };

            res.cookie('accessToken', result.data.session.accessToken, {
              ...cookieOptions,
              maxAge: 15 * 60 * 1000 // 15 minutes (enterprise standard)
            });
            
            res.cookie('refreshToken', result.data.session.refreshToken, {
              ...cookieOptions,
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

      // Validate required fields for password change
      if (newPassword && !currentPassword) {
        return res.status(400).json({
          success: false,
          error: 'Current password is required to change password'
        });
      }

      const profileData = { email, currentPassword, newPassword };
      const result = await this.authApplicationService.updateUserProfile(req.user.id, profileData);

      res.json({
        success: true,
        data: {
          user: result.data.user
        }
      });
    } catch (error) {
      logger.error('Update profile error:', error);
      
      // Handle specific error types
      if (error.message === 'Email already in use') {
        return res.status(409).json({
          success: false,
          error: 'Email already in use'
        });
      }
      
      if (error.message === 'Current password is incorrect') {
        return res.status(400).json({
          success: false,
          error: 'Current password is incorrect'
        });
      }
      
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

      const result = await this.authApplicationService.getUserSessions(req.user.id);

      res.json({
        success: true,
        data: {
          sessions: result.data.sessions
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