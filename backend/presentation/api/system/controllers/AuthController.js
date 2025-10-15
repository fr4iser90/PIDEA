const Logger = require("@logging/Logger");
const ServiceLogger = require("@logging/ServiceLogger");
const logger = new ServiceLogger("AuthController");

class AuthController {
  constructor(dependencies = {}) {
    this.authApplicationService = dependencies.authApplicationService;
    if (!this.authApplicationService) {
      throw new Error(
        "AuthController requires authApplicationService dependency",
      );
    }
  }

  // POST /api/auth/register
  async register(req, res) {
    try {
      const { email, password, username } = req.body;
      if (!email || !password) {
        return res.badRequest("Email and password are required");
      }

      const userData = { email, password, username };
      const result = await this.authApplicationService.register(userData);

      res.created({
        user: result.data,
      });
    } catch (error) {
      logger.error("Registration error:", error);
      res.error(error.message, 500);
    }
  }

  // POST /api/auth/login
  async login(req, res) {
    try {
      const { email, password } = req.body;

      logger.info("🔍 [AuthController] Login request received:", {
        email: email,
        passwordLength: password ? password.length : 0,
        hasEmail: !!email,
        hasPassword: !!password,
      });

      // Validate input
      if (!email || !password) {
        logger.info("❌ [AuthController] Missing email or password");
        return res.badRequest("Email and password are required");
      }

      // Authenticate user and create session
      const credentials = { email, password };
      const result = await this.authApplicationService.login(credentials);

      const responseData = {
        user: result.data.user,
        accessToken: result.data.session.accessToken,
        refreshToken: result.data.session.refreshToken,
        expiresAt: result.data.session.expiresAt,
      };

      logger.info("✅ [AuthController] Login successful, sending response:", {
        userId: responseData.user.id,
        userEmail: responseData.user.email,
        accessTokenLength: responseData.accessToken.length,
        refreshTokenLength: responseData.refreshToken.length,
      });

      // Set httpOnly cookies for security with cross-port support
      const cookieOptions = {
        httpOnly: false, // Set to false in development to allow JavaScript access for debugging
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        // Remove domain restriction to allow cross-port access in development
      };

      logger.info(
        "🔍 [AuthController] Setting cookies with options:",
        cookieOptions,
      );

      res.cookie("accessToken", responseData.accessToken, {
        ...cookieOptions,
        maxAge:
          process.env.NODE_ENV === "development"
            ? 2 * 60 * 60 * 1000
            : 15 * 60 * 1000, // 2h dev, 15m prod
      });

      res.cookie("refreshToken", responseData.refreshToken, {
        ...cookieOptions,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      logger.info("✅ [AuthController] Cookies set successfully");
      res.ok(responseData);
    } catch (error) {
      logger.error("Login error:", error);
      res.unauthorized("Invalid credentials");
    }
  }

  // POST /api/auth/refresh
  async refresh(req, res) {
    try {
      // Get refresh token from cookies
      const refreshToken = req.cookies?.refreshToken;

      if (!refreshToken) {
        logger.info("❌ [AuthController] No refresh token found in cookies");
        return res.badRequest("Refresh token is required");
      }

      // Refresh authentication using application service with refresh token
      const result = await this.authApplicationService.refresh(refreshToken);

      // Set new cookies with proper security settings and cross-port support
      const cookieOptions = {
        httpOnly: false, // Set to false in development to allow JavaScript access for debugging
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        // Remove domain restriction to allow cross-port access in development
      };

      res.cookie("accessToken", responseData.accessToken, {
        ...cookieOptions,
        maxAge:
          process.env.NODE_ENV === "development"
            ? 2 * 60 * 60 * 1000
            : 15 * 60 * 1000, // 2h dev, 15m prod
      });

      res.cookie("refreshToken", responseData.refreshToken, {
        ...cookieOptions,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      logger.info("✅ [AuthController] Authentication refreshed successfully", {
        userId: result.data.user.id,
        userEmail: result.data.user.email,
      });

      res.ok({
        user: result.data.user,
      });
    } catch (error) {
      logger.error("❌ [AuthController] Refresh error:", error);
      res.unauthorized("Authentication refresh failed");
    }
  }

  // POST /api/auth/logout
  async logout(req, res) {
    try {
      // Try to logout using application service (if user is authenticated)
      try {
        await this.authApplicationService.logout();
        logger.info("✅ [AuthController] User logout successful");
      } catch (authError) {
        // If authentication fails, that's OK - we still want to clear cookies
        logger.info(
          "🔍 [AuthController] User not authenticated, clearing cookies only",
        );
      }

      // ALWAYS clear cookies, regardless of authentication status
      const cookieOptions = {
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        // Remove domain restriction to allow cross-port access in development
      };

      res.clearCookie("accessToken", cookieOptions);
      res.clearCookie("refreshToken", cookieOptions);

      logger.info("✅ [AuthController] Cookies cleared successfully");

      res.ok({ message: "Logged out successfully" });
    } catch (error) {
      logger.error("❌ [AuthController] Logout error:", error);

      // Even if there's an error, try to clear cookies
      try {
        const cookieOptions = {
          httpOnly: false,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
          // Remove domain restriction to allow cross-port access in development
        };

        res.clearCookie("accessToken", cookieOptions);
        res.clearCookie("refreshToken", cookieOptions);
        logger.info("✅ [AuthController] Cookies cleared despite error");
      } catch (cookieError) {
        logger.error(
          "❌ [AuthController] Failed to clear cookies:",
          cookieError,
        );
      }

      res.error("Logout failed", 500);
    }
  }

  // GET /api/auth/profile
  async getProfile(req, res) {
    try {
      if (!req.user) {
        return res.unauthorized("Authentication required");
      }

      const result = await this.authApplicationService.getUserProfile(
        req.user.id,
      );

      res.ok({
        user: result.data.user,
      });
    } catch (error) {
      logger.error("Get profile error:", error);
      res.error("Failed to get profile", 500);
    }
  }

  // GET /api/auth/validate
  async validateToken(req, res) {
    try {
      logger.info("🔍 [AuthController] Token validation request received");
      logger.info("🔍 [AuthController] Cookies received:", req.cookies);

      // Check for cookies directly since this is a public route
      const accessToken = req.cookies?.accessToken;
      const refreshToken = req.cookies?.refreshToken;

      logger.info("🔍 [AuthController] Extracted tokens:", {
        hasAccessToken: !!accessToken,
        hasRefreshToken: !!refreshToken,
        accessTokenLength: accessToken ? accessToken.length : 0,
        accessToken: accessToken,
        refreshToken: refreshToken,
      });

      if (!accessToken && !refreshToken) {
        logger.info(
          "❌ [AuthController] No authentication tokens found in cookies",
        );
        return res.unauthorized("No valid session found", {
          code: "SESSION_EXPIRED",
        });
      }

      // Try to validate access token first
      if (accessToken) {
        logger.info("🔍 [AuthController] About to validate access token...");
        try {
          const result =
            await this.authApplicationService.validateAccessToken(accessToken);
          logger.info("🔍 [AuthController] validateAccessToken result:", result);
          if (result.success) {
            logger.info(
              "✅ [AuthController] Access token validation successful",
            );
            return res.ok({
              user: result.user,
            });
          }
        } catch (error) {
          logger.debug(
            "❌ [AuthController] Access token validation failed, trying refresh token",
          );
        }
      }

      // Try to refresh token if access token validation failed
      if (refreshToken) {
        try {
          logger.info("🔄 [AuthController] Attempting to refresh token...");
          const result =
            await this.authApplicationService.refresh(refreshToken);
          if (result.success) {
            // Set new cookies
            const cookieOptions = {
              httpOnly: false,
              secure: process.env.NODE_ENV === "production",
              sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
              // Remove domain restriction to allow cross-port access in development
            };

            res.cookie("accessToken", result.accessToken, {
              ...cookieOptions,
              maxAge:
                process.env.NODE_ENV === "development"
                  ? 2 * 60 * 60 * 1000
                  : 15 * 60 * 1000, // 2h dev, 15m prod
            });

            res.cookie("refreshToken", result.refreshToken, {
              ...cookieOptions,
              maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            });

            logger.info(
              "✅ [AuthController] Token refreshed and validated successfully",
            );
            return res.ok({
              user: result.user,
            });
          }
        } catch (error) {
          logger.debug(
            "❌ [AuthController] Refresh token validation failed:",
            error.message,
          );
        }
      }

      // All validation attempts failed
      logger.info("❌ [AuthController] All authentication attempts failed");
      return res.unauthorized("No valid session found", {
        code: "SESSION_EXPIRED",
      });
    } catch (error) {
      logger.error(
        "❌ [AuthController] Authentication validation error:",
        error,
      );
      res.unauthorized("Authentication validation failed", {
        code: "VALIDATION_ERROR",
      });
    }
  }

  // PUT /api/auth/profile
  async updateProfile(req, res) {
    try {
      if (!req.user) {
        return res.unauthorized("Authentication required");
      }

      const { email, currentPassword, newPassword } = req.body;

      // Validate required fields for password change
      if (newPassword && !currentPassword) {
        return res.badRequest(
          "Current password is required to change password",
        );
      }

      const profileData = { email, currentPassword, newPassword };
      const result = await this.authApplicationService.updateUserProfile(
        req.user.id,
        profileData,
      );

      res.ok({
        user: result.data.user,
      });
    } catch (error) {
      logger.error("Update profile error:", error);

      // Handle specific error types
      if (error.message === "Email already in use") {
        return res.conflict("Email already in use");
      }

      if (error.message === "Current password is incorrect") {
        return res.badRequest("Current password is incorrect");
      }

      res.error("Failed to update profile", 500);
    }
  }

  // GET /api/auth/sessions
  async getSessions(req, res) {
    try {
      if (!req.user) {
        return res.unauthorized("Authentication required");
      }

      const result = await this.authApplicationService.getUserSessions(
        req.user.id,
      );

      res.ok({
        sessions: result.data.sessions,
      });
    } catch (error) {
      logger.error("Get sessions error:", error);
      res.error("Failed to get sessions", 500);
    }
  }
}

module.exports = AuthController;
