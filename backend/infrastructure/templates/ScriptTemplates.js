/**
 * ScriptTemplates - Comprehensive script generation templates
 * Refactored to use modular structure for better maintainability
 */
const {
    BuildTemplates,
    TestTemplates,
    DeployTemplates,
    MaintenanceTemplates,
    DevelopmentTemplates,
    DatabaseTemplates,
    SecurityTemplates,
    MonitoringTemplates,
    AutomationTemplates,
    UtilityTemplates,
    TemplateValidator,
    TemplateGenerator,
    TemplateSearch,
    TEMPLATE_CATEGORIES
} = require('./modules');

class ScriptTemplates {
    constructor(dependencies = {}) {
        this.logger = dependencies.logger || console;
        this.eventBus = dependencies.eventBus;
    }

    /**
     * Get all available script templates
     * @returns {Object} All script templates
     */
    getAllTemplates() {
        return {
            [TEMPLATE_CATEGORIES.BUILD]: BuildTemplates.getTemplates(),
            [TEMPLATE_CATEGORIES.TEST]: TestTemplates.getTemplates(),
            [TEMPLATE_CATEGORIES.DEPLOY]: DeployTemplates.getTemplates(),
            [TEMPLATE_CATEGORIES.MAINTENANCE]: MaintenanceTemplates.getTemplates(),
            [TEMPLATE_CATEGORIES.DEVELOPMENT]: DevelopmentTemplates.getTemplates(),
            [TEMPLATE_CATEGORIES.DATABASE]: DatabaseTemplates.getTemplates(),
            [TEMPLATE_CATEGORIES.SECURITY]: SecurityTemplates.getTemplates(),
            [TEMPLATE_CATEGORIES.MONITORING]: MonitoringTemplates.getTemplates(),
            [TEMPLATE_CATEGORIES.AUTOMATION]: AutomationTemplates.getTemplates(),
            [TEMPLATE_CATEGORIES.UTILITY]: UtilityTemplates.getTemplates()
        };
    }

    /**
     * Get template by category and name
     * @param {string} category - Template category
     * @param {string} name - Template name
     * @returns {Object|null} Template or null if not found
     */
    getTemplate(category, name) {
        const allTemplates = this.getAllTemplates();
        return TemplateSearch.getTemplate(allTemplates, category, name);
    }

    /**
     * Get templates by category
     * @param {string} category - Template category
     * @returns {Object} Templates in category
     */
    getTemplatesByCategory(category) {
        const allTemplates = this.getAllTemplates();
        return TemplateSearch.searchByCategory(allTemplates, category);
    }

    /**
     * Generate script from template
     * @param {string} category - Template category
     * @param {string} name - Template name
     * @param {Object} variables - Variables to substitute
     * @returns {string} Generated script
     */
    generateScript(category, name, variables = {}) {
        const template = this.getTemplate(category, name);
        if (!template) {
            throw new Error(`Template not found: ${category}/${name}`);
        }

        return TemplateGenerator.generateScript(template, variables);
    }

    /**
     * Search templates by keyword
     * @param {string} keyword - Search keyword
     * @returns {Array} Matching templates
     */
    searchTemplates(keyword) {
        const allTemplates = this.getAllTemplates();
        return TemplateSearch.searchTemplates(allTemplates, keyword);
    }

    /**
     * Create custom template
     * @param {Object} template - Template definition
     * @returns {Object} Created template
     */
    createCustomTemplate(template) {
        return TemplateGenerator.createCustomTemplate(template, this.eventBus);
    }

    /**
     * Validate template
     * @param {Object} template - Template to validate
     * @returns {Object} Validation result
     */
    validateTemplate(template) {
        return TemplateValidator.validateTemplate(template);
    }

    /**
     * Get all template categories
     * @returns {Array} List of categories
     */
    getCategories() {
        const allTemplates = this.getAllTemplates();
        return TemplateSearch.getCategories(allTemplates);
    }

    /**
     * Get template count by category
     * @returns {Object} Template counts by category
     */
    getTemplateCounts() {
        const allTemplates = this.getAllTemplates();
        return TemplateSearch.getTemplateCounts(allTemplates);
    }
}

module.exports = ScriptTemplates; 