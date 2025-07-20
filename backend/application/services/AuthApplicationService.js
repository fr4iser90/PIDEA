const AuthService = require('@services/AuthService');
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

    async logout(token) {
        try {
            this.logger.info('AuthApplicationService: Processing logout');
            
            const result = await this.authService.logout(token);
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

    async validateToken(token) {
        try {
            this.logger.info('AuthApplicationService: Validating token');
            
            const result = await this.authService.validateToken(token);
            return {
                success: true,
                data: result
            };
        } catch (error) {
            this.logger.error('Error validating token:', error);
            throw error;
        }
    }

    async refreshToken(token) {
        try {
            this.logger.info('AuthApplicationService: Refreshing token');
            
            const result = await this.authService.refreshToken(token);
            return {
                success: true,
                data: result
            };
        } catch (error) {
            this.logger.error('Error refreshing token:', error);
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
}

module.exports = AuthApplicationService; 