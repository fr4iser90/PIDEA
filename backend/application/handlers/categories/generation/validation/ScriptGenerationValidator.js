/**
 * Script Generation Validator
 * Handles validation logic for script generation commands and results
 */

const { VALID_SCRIPT_TYPES } = require('../constants/ScriptGenerationConstants');

class ScriptGenerationValidator {
    /**
     * Validate script generation command
     * @param {Object} command - Script generation command
     * @returns {Object} Validation result
     */
    static validateCommand(command) {
        const errors = [];
        const warnings = [];

        // Validate command structure
        if (!command.projectPath) {
            errors.push('Project path is required');
        }

        if (!command.requestedBy) {
            errors.push('Requested by is required');
        }

        if (!command.scriptType) {
            errors.push('Script type is required');
        }

        // Validate script type
        if (!VALID_SCRIPT_TYPES.includes(command.scriptType)) {
            errors.push(`Invalid script type. Must be one of: ${VALID_SCRIPT_TYPES.join(', ')}`);
        }

        // Validate options
        if (command.options) {
            if (command.options.autoExecute && typeof command.options.autoExecute !== 'boolean') {
                errors.push('Auto execute must be a boolean');
            }

            if (command.options.overwrite && typeof command.options.overwrite !== 'boolean') {
                errors.push('Overwrite must be a boolean');
            }

            if (command.options.scriptName && typeof command.options.scriptName !== 'string') {
                errors.push('Script name must be a string');
            }

            if (command.options.environment && typeof command.options.environment !== 'object') {
                errors.push('Environment must be an object');
            }
        }

        // Check business rules if available
        if (command.validateBusinessRules) {
            const businessValidation = command.validateBusinessRules();
            if (!businessValidation.isValid) {
                errors.push(...businessValidation.errors);
            }
            warnings.push(...businessValidation.warnings);
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * Validate script result
     * @param {Object} scriptResult - AI-generated script result
     * @returns {Object} Validation result
     */
    static validateScript(scriptResult) {
        const errors = [];

        if (!scriptResult.content || typeof scriptResult.content !== 'string') {
            errors.push('Script content is required and must be a string');
        }

        if (scriptResult.content && scriptResult.content.length < 10) {
            errors.push('Script content is too short');
        }

        if (scriptResult.content && scriptResult.content.length > 10000) {
            errors.push('Script content is too long');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Validate project path
     * @param {string} projectPath - Project path
     * @returns {Object} Validation result
     */
    static validateProjectPath(projectPath) {
        const errors = [];

        if (!projectPath) {
            errors.push('Project path is required');
        }

        if (typeof projectPath !== 'string') {
            errors.push('Project path must be a string');
        }

        if (projectPath && projectPath.trim() === '') {
            errors.push('Project path cannot be empty');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Validate script options
     * @param {Object} options - Script options
     * @returns {Object} Validation result
     */
    static validateScriptOptions(options) {
        const errors = [];
        const warnings = [];

        if (!options) {
            return { isValid: true, errors: [], warnings: [] };
        }

        if (options.autoExecute && typeof options.autoExecute !== 'boolean') {
            errors.push('Auto execute must be a boolean');
        }

        if (options.overwrite && typeof options.overwrite !== 'boolean') {
            errors.push('Overwrite must be a boolean');
        }

        if (options.scriptName) {
            if (typeof options.scriptName !== 'string') {
                errors.push('Script name must be a string');
            } else if (options.scriptName.trim() === '') {
                errors.push('Script name cannot be empty');
            }
        }

        if (options.environment) {
            if (typeof options.environment !== 'object') {
                errors.push('Environment must be an object');
            } else if (Array.isArray(options.environment)) {
                errors.push('Environment must be an object, not an array');
            }
        }

        if (options.complex && typeof options.complex !== 'boolean') {
            errors.push('Complex option must be a boolean');
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }
}

module.exports = ScriptGenerationValidator; 