const AuthService = require('@domain/services/security/AuthService');
const User = require('@entities/User');
const Logger = require('@logging/Logger');

class AuthApplicationService {
    constructor(dependencies = {}) {
        this.authService = dependencies.authService || new AuthService(dependencies);
        this.logger = dependencies.logger || new Logger('AuthApplicationService');
        this.eventBus = dependencies.eventBus;
    }

    async login(credentials) {
        try {
            this.logger.info('AuthApplicationService: Processing login');
            
            const result = await this.authService.login(credentials);
            return {
                success: true,
                data: result
            };
        } catch (error) {
            this.logger.error('Error during login:', error);
            throw error;
        }
    }

    async logout() {
        try {
            this.logger.info('AuthApplicationService: Processing logout');
            
            const result = await this.authService.logout();
            return {
                success: true,
                data: result
            };
        } catch (error) {
            this.logger.error('Error during logout:', error);
            throw error;
        }
    }

    async register(userData) {
        try {
            this.logger.info('AuthApplicationService: Processing registration');
            
            const user = new User(userData);
            const result = await this.authService.register(user);
            return {
                success: true,
                data: result
            };
        } catch (error) {
            this.logger.error('Error during registration:', error);
            throw error;
        }
    }

    async validateToken() {
        try {
            this.logger.info('AuthApplicationService: Validating authentication');
            
            const result = await this.authService.validateToken();
            return {
                success: true,
                data: result
            };
        } catch (error) {
            this.logger.error('Error validating authentication:', error);
            throw error;
        }
    }

    async validateAccessToken(accessToken) {
        try {
            this.logger.info('AuthApplicationService: Validating access token');
            
            const result = await this.authService.validateAccessToken(accessToken);
            return {
                success: true,
                data: result
            };
        } catch (error) {
            this.logger.error('Error validating access token:', error);
            throw error;
        }
    }

    async refreshToken() {
        try {
            this.logger.info('AuthApplicationService: Refreshing authentication');
            
            const result = await this.authService.refreshToken();
            return {
                success: true,
                data: result
            };
        } catch (error) {
            this.logger.error('Error refreshing authentication:', error);
            throw error;
        }
    }

    async refresh(refreshToken) {
        try {
            this.logger.info('AuthApplicationService: Refreshing authentication with refresh token');
            
            const newSession = await this.authService.refreshUserSession(refreshToken);
            
            // Get user from the session
            const user = await this.authService.userRepository.findById(newSession.userId);
            
            return {
                success: true,
                data: {
                    user: {
                        id: user.id,
                        email: user.email,
                        role: user.role,
                        name: user.name
                    },
                    session: {
                        accessToken: newSession.accessToken,
                        refreshToken: newSession.refreshToken,
                        expiresAt: newSession.expiresAt
                    }
                }
            };
        } catch (error) {
            this.logger.error('Error refreshing authentication:', error);
            throw error;
        }
    }

    async getUserProfile(userId) {
        try {
            this.logger.info('AuthApplicationService: Getting user profile', { userId });
            
            const result = await this.authService.getUserProfile(userId);
            return {
                success: true,
                data: result
            };
        } catch (error) {
            this.logger.error('Error getting user profile:', error);
            throw error;
        }
    }

    async updateUserProfile(userId, profileData) {
        try {
            this.logger.info('AuthApplicationService: Updating user profile', { userId });
            
            const result = await this.authService.updateUserProfile(userId, profileData);
            return {
                success: true,
                data: result
            };
        } catch (error) {
            this.logger.error('Error updating user profile:', error);
            throw error;
        }
    }

    async changePassword(userId, oldPassword, newPassword) {
        try {
            this.logger.info('AuthApplicationService: Changing password', { userId });
            
            const result = await this.authService.changePassword(userId, oldPassword, newPassword);
            return {
                success: true,
                data: result
            };
        } catch (error) {
            this.logger.error('Error changing password:', error);
            throw error;
        }
    }

    async getUserSessions(userId) {
        try {
            this.logger.info('AuthApplicationService: Getting user sessions', { userId });
            
            const sessions = await this.authService.getUserSessions(userId);
            return {
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
            };
        } catch (error) {
            this.logger.error('Error getting user sessions:', error);
            throw error;
        }
    }
}

module.exports = AuthApplicationService; 