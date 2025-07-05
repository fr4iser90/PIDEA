/**
 * Template Generator Module
 */
const TemplateValidator = require('./validation');

class TemplateGenerator {
    /**
     * Generate script from template
     * @param {Object} template - Template object
     * @param {Object} variables - Variables to substitute
     * @returns {string} Generated script
     */
    static generateScript(template, variables = {}) {
        // Validate template
        const templateValidation = TemplateValidator.validateTemplate(template);
        if (!templateValidation.isValid) {
            throw new Error(`Invalid template: ${templateValidation.errors.join(', ')}`);
        }

        // Validate variables
        const variablesValidation = TemplateValidator.validateVariables(variables);
        if (!variablesValidation.isValid) {
            throw new Error(`Invalid variables: ${variablesValidation.errors.join(', ')}`);
        }

        let script = template.template;

        // Substitute provided variables
        for (const [key, value] of Object.entries(variables)) {
            const placeholder = `{{${key}}}`;
            script = script.replace(new RegExp(placeholder, 'g'), String(value));
        }

        // Substitute default variables if not provided
        for (const [key, defaultValue] of Object.entries(template.variables || {})) {
            const placeholder = `{{${key}}}`;
            if (!variables[key] && script.includes(placeholder)) {
                script = script.replace(new RegExp(placeholder, 'g'), String(defaultValue));
            }
        }

        return script;
    }

    /**
     * Create custom template
     * @param {Object} template - Template definition
     * @param {Object} eventBus - Event bus for notifications
     * @returns {Object} Created template
     */
    static createCustomTemplate(template, eventBus = null) {
        // Validate template
        const validation = TemplateValidator.validateTemplate(template);
        if (!validation.isValid) {
            throw new Error(`Invalid template: ${validation.errors.join(', ')}`);
        }

        const customTemplate = {
            ...template,
            id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            isCustom: true,
            createdAt: new Date()
        };

        // Emit event if eventBus is available
        if (eventBus && typeof eventBus.publish === 'function') {
            eventBus.publish('script-template.created', {
                template: customTemplate,
                timestamp: new Date()
            });
        }

        return customTemplate;
    }

    /**
     * Process template variables
     * @param {Object} template - Template object
     * @param {Object} variables - User provided variables
     * @returns {Object} Processed variables
     */
    static processVariables(template, variables = {}) {
        const processed = { ...variables };

        // Merge with template defaults
        if (template.variables) {
            for (const [key, defaultValue] of Object.entries(template.variables)) {
                if (!processed.hasOwnProperty(key)) {
                    processed[key] = defaultValue;
                }
            }
        }

        return processed;
    }
}

module.exports = TemplateGenerator; 