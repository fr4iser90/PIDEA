/**
 * Recommendations service for SingleRepoStrategy
 */
class RecommendationsService {
    constructor(logger) {
        this.logger = logger;
    }

    /**
     * Generate recommendations for single repository
     * @param {Object} analysis - Complete analysis object
     * @returns {Promise<Array>} Recommendations
     */
    async generateRecommendations(analysis) {
        try {
            const recommendations = [];

            // Structure recommendations
            if (!analysis.structure.mainDirectories.src && !analysis.structure.mainDirectories.app) {
                recommendations.push({
                    type: 'structure',
                    priority: 'medium',
                    message: 'Consider organizing code into src/ or app/ directory',
                    action: 'Create src/ directory and move source files there'
                });
            }

            // Testing recommendations
            if (!analysis.testing.hasTests) {
                recommendations.push({
                    type: 'testing',
                    priority: 'high',
                    message: 'Add testing setup to the project',
                    action: 'Install and configure Jest or other testing framework'
                });
            }

            // Linting recommendations
            if (!analysis.linting.hasLinting) {
                recommendations.push({
                    type: 'linting',
                    priority: 'medium',
                    message: 'Add linting and formatting setup',
                    action: 'Install and configure ESLint and Prettier'
                });
            }

            // Security recommendations
            if (!analysis.security.hasSecurityDependencies) {
                recommendations.push({
                    type: 'security',
                    priority: 'high',
                    message: 'Add security dependencies',
                    action: 'Install helmet, bcrypt, or other security packages'
                });
            }

            // Performance recommendations
            if (!analysis.performance.hasMonitoring) {
                recommendations.push({
                    type: 'performance',
                    priority: 'low',
                    message: 'Consider adding monitoring and logging',
                    action: 'Install winston or morgan for logging'
                });
            }

            return recommendations;
        } catch (error) {
            this.logger.error('RecommendationsService: Failed to generate recommendations', {
                error: error.message
            });
            return [];
        }
    }
}

module.exports = RecommendationsService; 