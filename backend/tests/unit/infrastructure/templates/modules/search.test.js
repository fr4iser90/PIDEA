/**
 * TemplateSearch Unit Tests
 * Coverage target: 80%
 */

const TemplateSearch = require('../../../../../infrastructure/templates/modules/search');

describe('TemplateSearch', () => {
    let mockTemplates;

    beforeEach(() => {
        mockTemplates = {
            'web-apps': {
                'react-app': {
                    name: 'React Application',
                    description: 'A modern React web application',
                    category: 'web-apps'
                },
                'vue-app': {
                    name: 'Vue Application',
                    description: 'A Vue.js web application',
                    category: 'web-apps'
                }
            },
            'mobile': {
                'react-native': {
                    name: 'React Native App',
                    description: 'Cross-platform mobile app',
                    category: 'mobile'
                },
                'flutter': {
                    name: 'Flutter App',
                    description: 'Google Flutter mobile app',
                    category: 'mobile'
                }
            },
            'backend': {
                'node-api': {
                    name: 'Node.js API',
                    description: 'RESTful API with Node.js',
                    category: 'backend'
                }
            }
        };
    });

    describe('searchTemplates', () => {
        it('should return matching templates by keyword', () => {
            const results = TemplateSearch.searchTemplates(mockTemplates, 'react');

            expect(results).toHaveLength(2);
            expect(results[0]).toMatchObject({
                category: 'web-apps',
                name: 'react-app',
                template: mockTemplates['web-apps']['react-app']
            });
            expect(results[1]).toMatchObject({
                category: 'mobile',
                name: 'react-native',
                template: mockTemplates['mobile']['react-native']
            });
        });

        it('should return matching templates by description', () => {
            const results = TemplateSearch.searchTemplates(mockTemplates, 'modern');

            expect(results).toHaveLength(1);
            expect(results[0]).toMatchObject({
                category: 'web-apps',
                name: 'react-app',
                template: mockTemplates['web-apps']['react-app']
            });
        });

        it('should return matching templates by category', () => {
            const results = TemplateSearch.searchTemplates(mockTemplates, 'mobile');

            expect(results).toHaveLength(2);
            expect(results[0].category).toBe('mobile');
            expect(results[1].category).toBe('mobile');
        });

        it('should return empty array when keyword is null', () => {
            const results = TemplateSearch.searchTemplates(mockTemplates, null);

            expect(results).toEqual([]);
        });

        it('should return empty array when keyword is undefined', () => {
            const results = TemplateSearch.searchTemplates(mockTemplates, undefined);

            expect(results).toEqual([]);
        });

        it('should return empty array when keyword is empty string', () => {
            const results = TemplateSearch.searchTemplates(mockTemplates, '');

            expect(results).toEqual([]);
        });

        it('should return empty array when keyword is not a string', () => {
            const results = TemplateSearch.searchTemplates(mockTemplates, 123);

            expect(results).toEqual([]);
        });

        it('should return empty array when keyword is an object', () => {
            const results = TemplateSearch.searchTemplates(mockTemplates, {});

            expect(results).toEqual([]);
        });

        it('should return empty array when no templates match', () => {
            const results = TemplateSearch.searchTemplates(mockTemplates, 'nonexistent');

            expect(results).toEqual([]);
        });

        it('should be case insensitive', () => {
            const results = TemplateSearch.searchTemplates(mockTemplates, 'REACT');

            expect(results).toHaveLength(2);
            expect(results[0].name).toBe('react-app');
            expect(results[1].name).toBe('react-native');
        });

        it('should handle partial matches', () => {
            const results = TemplateSearch.searchTemplates(mockTemplates, 'app');

            expect(results).toHaveLength(4); // react-app, vue-app, react-native, flutter
        });

        it('should handle empty templates object', () => {
            const results = TemplateSearch.searchTemplates({}, 'react');

            expect(results).toEqual([]);
        });

        it('should handle templates with missing fields', () => {
            const incompleteTemplates = {
                'test': {
                    'incomplete': {
                        name: 'Incomplete Template'
                        // missing description and category
                    }
                }
            };

            const results = TemplateSearch.searchTemplates(incompleteTemplates, 'incomplete');

            expect(results).toHaveLength(1);
            expect(results[0].template.name).toBe('Incomplete Template');
        });
    });

    describe('matchesSearch', () => {
        it('should return true when template name matches', () => {
            const template = {
                name: 'React Application',
                description: 'A test description',
                category: 'test'
            };

            const result = TemplateSearch.matchesSearch(template, 'react');

            expect(result).toBe(true);
        });

        it('should return true when template description matches', () => {
            const template = {
                name: 'Test Template',
                description: 'A modern React application',
                category: 'test'
            };

            const result = TemplateSearch.matchesSearch(template, 'modern');

            expect(result).toBe(true);
        });

        it('should return true when template category matches', () => {
            const template = {
                name: 'Test Template',
                description: 'A test description',
                category: 'web-apps'
            };

            const result = TemplateSearch.matchesSearch(template, 'web');

            expect(result).toBe(true);
        });

        it('should return false when no fields match', () => {
            const template = {
                name: 'Test Template',
                description: 'A test description',
                category: 'test'
            };

            const result = TemplateSearch.matchesSearch(template, 'nonexistent');

            expect(result).toBe(false);
        });

        it('should handle null field values', () => {
            const template = {
                name: null,
                description: 'A test description',
                category: 'test'
            };

            const result = TemplateSearch.matchesSearch(template, 'test');

            expect(result).toBe(true);
        });

        it('should handle undefined field values', () => {
            const template = {
                name: 'Test Template',
                description: undefined,
                category: 'test'
            };

            const result = TemplateSearch.matchesSearch(template, 'test');

            expect(result).toBe(true);
        });

        it('should handle empty string field values', () => {
            const template = {
                name: 'Test Template',
                description: '',
                category: 'test'
            };

            const result = TemplateSearch.matchesSearch(template, 'test');

            expect(result).toBe(true);
        });

        it('should be case insensitive', () => {
            const template = {
                name: 'React Application',
                description: 'A test description',
                category: 'test'
            };

            const result = TemplateSearch.matchesSearch(template, 'react');

            expect(result).toBe(true);
        });
    });

    describe('searchByCategory', () => {
        it('should return templates for valid category', () => {
            const results = TemplateSearch.searchByCategory(mockTemplates, 'web-apps');

            expect(results).toEqual(mockTemplates['web-apps']);
        });

        it('should return empty object for non-existent category', () => {
            const results = TemplateSearch.searchByCategory(mockTemplates, 'nonexistent');

            expect(results).toEqual({});
        });

        it('should return empty object when category is null', () => {
            const results = TemplateSearch.searchByCategory(mockTemplates, null);

            expect(results).toEqual({});
        });

        it('should return empty object when category is undefined', () => {
            const results = TemplateSearch.searchByCategory(mockTemplates, undefined);

            expect(results).toEqual({});
        });

        it('should return empty object when category is empty string', () => {
            const results = TemplateSearch.searchByCategory(mockTemplates, '');

            expect(results).toEqual({});
        });

        it('should return empty object when category is 0', () => {
            const results = TemplateSearch.searchByCategory(mockTemplates, 0);

            expect(results).toEqual({});
        });

        it('should return empty object when category is false', () => {
            const results = TemplateSearch.searchByCategory(mockTemplates, false);

            expect(results).toEqual({});
        });
    });

    describe('getTemplate', () => {
        it('should return template for valid category and name', () => {
            const result = TemplateSearch.getTemplate(mockTemplates, 'web-apps', 'react-app');

            expect(result).toEqual(mockTemplates['web-apps']['react-app']);
        });

        it('should return null for non-existent category', () => {
            const result = TemplateSearch.getTemplate(mockTemplates, 'nonexistent', 'react-app');

            expect(result).toBeNull();
        });

        it('should return null for non-existent template name', () => {
            const result = TemplateSearch.getTemplate(mockTemplates, 'web-apps', 'nonexistent');

            expect(result).toBeNull();
        });

        it('should return null when category is null', () => {
            const result = TemplateSearch.getTemplate(mockTemplates, null, 'react-app');

            expect(result).toBeNull();
        });

        it('should return null when category is undefined', () => {
            const result = TemplateSearch.getTemplate(mockTemplates, undefined, 'react-app');

            expect(result).toBeNull();
        });

        it('should return null when category is empty string', () => {
            const result = TemplateSearch.getTemplate(mockTemplates, '', 'react-app');

            expect(result).toBeNull();
        });

        it('should return null when name is null', () => {
            const result = TemplateSearch.getTemplate(mockTemplates, 'web-apps', null);

            expect(result).toBeNull();
        });

        it('should return null when name is undefined', () => {
            const result = TemplateSearch.getTemplate(mockTemplates, 'web-apps', undefined);

            expect(result).toBeNull();
        });

        it('should return null when name is empty string', () => {
            const result = TemplateSearch.getTemplate(mockTemplates, 'web-apps', '');

            expect(result).toBeNull();
        });

        it('should return null when both category and name are null', () => {
            const result = TemplateSearch.getTemplate(mockTemplates, null, null);

            expect(result).toBeNull();
        });

        it('should handle non-string category parameter', () => {
            const result = TemplateSearch.getTemplate(mockTemplates, 123, 'react-app');

            expect(result).toBeNull();
        });

        it('should handle non-string name parameter', () => {
            const result = TemplateSearch.getTemplate(mockTemplates, 'web-apps', 123);

            expect(result).toBeNull();
        });
    });

    describe('getCategories', () => {
        it('should return all category names', () => {
            const categories = TemplateSearch.getCategories(mockTemplates);

            expect(categories).toEqual(['web-apps', 'mobile', 'backend']);
        });

        it('should return empty array for empty templates object', () => {
            const categories = TemplateSearch.getCategories({});

            expect(categories).toEqual([]);
        });

        it('should return empty array for null templates', () => {
            const categories = TemplateSearch.getCategories(null);

            expect(categories).toEqual([]);
        });

        it('should return empty array for undefined templates', () => {
            const categories = TemplateSearch.getCategories(undefined);

            expect(categories).toEqual([]);
        });

        it('should handle templates with empty categories', () => {
            const emptyTemplates = {
                'empty-category': {}
            };

            const categories = TemplateSearch.getCategories(emptyTemplates);

            expect(categories).toEqual(['empty-category']);
        });
    });

    describe('getTemplateCounts', () => {
        it('should return correct template counts by category', () => {
            const counts = TemplateSearch.getTemplateCounts(mockTemplates);

            expect(counts).toEqual({
                'web-apps': 2,
                'mobile': 2,
                'backend': 1
            });
        });

        it('should return zero counts for empty categories', () => {
            const emptyTemplates = {
                'empty-category': {}
            };

            const counts = TemplateSearch.getTemplateCounts(emptyTemplates);

            expect(counts).toEqual({
                'empty-category': 0
            });
        });

        it('should return empty object for empty templates', () => {
            const counts = TemplateSearch.getTemplateCounts({});

            expect(counts).toEqual({});
        });

        it('should handle null templates', () => {
            const counts = TemplateSearch.getTemplateCounts(null);

            expect(counts).toEqual({});
        });

        it('should handle undefined templates', () => {
            const counts = TemplateSearch.getTemplateCounts(undefined);

            expect(counts).toEqual({});
        });

        it('should handle templates with single template per category', () => {
            const singleTemplates = {
                'category1': { 'template1': { name: 'Template 1' } },
                'category2': { 'template2': { name: 'Template 2' } }
            };

            const counts = TemplateSearch.getTemplateCounts(singleTemplates);

            expect(counts).toEqual({
                'category1': 1,
                'category2': 1
            });
        });
    });

    describe('Integration tests', () => {
        it('should work together for complex search scenarios', () => {
            // Get all categories
            const categories = TemplateSearch.getCategories(mockTemplates);
            expect(categories).toContain('web-apps');

            // Search by category
            const webAppsTemplates = TemplateSearch.searchByCategory(mockTemplates, 'web-apps');
            expect(Object.keys(webAppsTemplates)).toHaveLength(2);

            // Get specific template
            const reactTemplate = TemplateSearch.getTemplate(mockTemplates, 'web-apps', 'react-app');
            expect(reactTemplate.name).toBe('React Application');

            // Search templates
            const searchResults = TemplateSearch.searchTemplates(mockTemplates, 'react');
            expect(searchResults).toHaveLength(2);

            // Get counts
            const counts = TemplateSearch.getTemplateCounts(mockTemplates);
            expect(counts['web-apps']).toBe(2);
        });

        it('should handle edge cases consistently', () => {
            // All methods should handle null/undefined gracefully
            expect(TemplateSearch.searchTemplates(null, 'test')).toEqual([]);
            expect(TemplateSearch.searchByCategory(null, 'test')).toEqual({});
            expect(TemplateSearch.getTemplate(null, 'test', 'test')).toBeNull();
            expect(TemplateSearch.getCategories(null)).toEqual([]);
            expect(TemplateSearch.getTemplateCounts(null)).toEqual({});
        });
    });
}); 