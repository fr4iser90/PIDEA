/**
 * Template Validation Module
 */
const { VALIDATION_RULES } = require('./constants');

class TemplateValidator {
    /**
     * Validate template
     * @param {Object} template - Template to validate
     * @returns {Object} Validation result
     */
    static validateTemplate(template) {
        const errors = [];

        // Check required fields
        for (const field of VALIDATION_RULES.REQUIRED_FIELDS) {
            if (!template[field]) {
                errors.push(`Template ${field} is required`);
            }
        }

        // Check field lengths
        if (template.name && template.name.length > VALIDATION_RULES.MAX_NAME_LENGTH) {
            errors.push(`Template name exceeds maximum length of ${VALIDATION_RULES.MAX_NAME_LENGTH}`);
        }

        if (template.description && template.description.length > VALIDATION_RULES.MAX_DESCRIPTION_LENGTH) {
            errors.push(`Template description exceeds maximum length of ${VALIDATION_RULES.MAX_DESCRIPTION_LENGTH}`);
        }

        if (template.template && template.template.length > VALIDATION_RULES.MAX_TEMPLATE_LENGTH) {
            errors.push(`Template content exceeds maximum length of ${VALIDATION_RULES.MAX_TEMPLATE_LENGTH}`);
        }

        // Validate category
        if (template.category && !Object.values(require('./constants').TEMPLATE_CATEGORIES).includes(template.category)) {
            errors.push(`Invalid template category: ${template.category}`);
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Validate variables object
     * @param {Object} variables - Variables to validate
     * @returns {Object} Validation result
     */
    static validateVariables(variables) {
        const errors = [];

        if (variables && typeof variables !== 'object') {
            errors.push('Variables must be an object');
        }

        if (variables) {
            for (const [key, value] of Object.entries(variables)) {
                if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') {
                    errors.push(`Variable ${key} must be a string, number, or boolean`);
                }
            }
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Validate template category
     * @param {string} category - Category to validate
     * @returns {boolean} Is valid category
     */
    static isValidCategory(category) {
        return Object.values(require('./constants').TEMPLATE_CATEGORIES).includes(category);
    }
}

module.exports = TemplateValidator; 