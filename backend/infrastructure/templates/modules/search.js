/**
 * Template Search Module
 */
class TemplateSearch {
    /**
     * Search templates by keyword
     * @param {Object} allTemplates - All available templates
     * @param {string} keyword - Search keyword
     * @returns {Array} Matching templates
     */
    static searchTemplates(allTemplates, keyword) {
        if (!keyword || typeof keyword !== 'string') {
            return [];
        }

        const results = [];
        const searchTerm = keyword.toLowerCase();

        for (const [category, templates] of Object.entries(allTemplates)) {
            for (const [name, template] of Object.entries(templates)) {
                if (this.matchesSearch(template, searchTerm)) {
                    results.push({
                        category,
                        name,
                        template
                    });
                }
            }
        }

        return results;
    }

    /**
     * Check if template matches search term
     * @param {Object} template - Template object
     * @param {string} searchTerm - Search term (lowercase)
     * @returns {boolean} Matches search
     */
    static matchesSearch(template, searchTerm) {
        const searchableFields = [
            template.name,
            template.description,
            template.category
        ];

        return searchableFields.some(field => 
            field && field.toLowerCase().includes(searchTerm)
        );
    }

    /**
     * Search templates by category
     * @param {Object} allTemplates - All available templates
     * @param {string} category - Category to search
     * @returns {Object} Templates in category
     */
    static searchByCategory(allTemplates, category) {
        if (!category) {
            return {};
        }

        return allTemplates[category] || {};
    }

    /**
     * Get template by category and name
     * @param {Object} allTemplates - All available templates
     * @param {string} category - Template category
     * @param {string} name - Template name
     * @returns {Object|null} Template or null if not found
     */
    static getTemplate(allTemplates, category, name) {
        if (!category || !name) {
            return null;
        }

        return allTemplates[category]?.[name] || null;
    }

    /**
     * Get all template categories
     * @param {Object} allTemplates - All available templates
     * @returns {Array} List of categories
     */
    static getCategories(allTemplates) {
        return Object.keys(allTemplates);
    }

    /**
     * Get template count by category
     * @param {Object} allTemplates - All available templates
     * @returns {Object} Template counts by category
     */
    static getTemplateCounts(allTemplates) {
        const counts = {};

        for (const [category, templates] of Object.entries(allTemplates)) {
            counts[category] = Object.keys(templates).length;
        }

        return counts;
    }
}

module.exports = TemplateSearch; 