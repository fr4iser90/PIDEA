/**
 * ScriptTemplates Unit Tests
 * Coverage target: 80%
 */

const ScriptTemplates = require('@templates/ScriptTemplates');

// Mock the modules
jest.mock('@/infrastructure/templates/modules', () => {
    const mockTemplates = {
        testTemplate: {
            name: 'Test Template',
            description: 'A test template',
            category: 'test',
            template: 'echo "Hello {{NAME}}"',
            variables: { NAME: 'World' }
        }
    };

    const mockTemplateCategories = {
        BUILD: 'build',
        TEST: 'test',
        DEPLOY: 'deploy',
        MAINTENANCE: 'maintenance',
        DEVELOPMENT: 'development',
        DATABASE: 'database',
        SECURITY: 'security',
        MONITORING: 'monitoring',
        AUTOMATION: 'automation',
        UTILITY: 'utility'
    };

    return {
        BuildTemplates: {
            getTemplates: jest.fn().mockReturnValue(mockTemplates)
        },
        TestTemplates: {
            getTemplates: jest.fn().mockReturnValue(mockTemplates)
        },
        DeployTemplates: {
            getTemplates: jest.fn().mockReturnValue(mockTemplates)
        },
        MaintenanceTemplates: {
            getTemplates: jest.fn().mockReturnValue(mockTemplates)
        },
        DevelopmentTemplates: {
            getTemplates: jest.fn().mockReturnValue(mockTemplates)
        },
        DatabaseTemplates: {
            getTemplates: jest.fn().mockReturnValue(mockTemplates)
        },
        SecurityTemplates: {
            getTemplates: jest.fn().mockReturnValue(mockTemplates)
        },
        MonitoringTemplates: {
            getTemplates: jest.fn().mockReturnValue(mockTemplates)
        },
        AutomationTemplates: {
            getTemplates: jest.fn().mockReturnValue(mockTemplates)
        },
        UtilityTemplates: {
            getTemplates: jest.fn().mockReturnValue(mockTemplates)
        },
        TemplateValidator: {
            validateTemplate: jest.fn().mockReturnValue({ isValid: true, errors: [] })
        },
        TemplateGenerator: {
            generateScript: jest.fn().mockReturnValue('echo "Hello World"'),
            createCustomTemplate: jest.fn().mockReturnValue({
                id: 'custom_123',
                name: 'Custom Template',
                isCustom: true
            })
        },
        TemplateSearch: {
            getTemplate: jest.fn().mockReturnValue(mockTemplates.testTemplate),
            searchByCategory: jest.fn().mockReturnValue(mockTemplates),
            searchTemplates: jest.fn().mockReturnValue([]),
            getCategories: jest.fn().mockReturnValue(['build', 'test', 'deploy']),
            getTemplateCounts: jest.fn().mockReturnValue({ build: 1, test: 1, deploy: 1 })
        },
        TEMPLATE_CATEGORIES: mockTemplateCategories
    };
});

describe('ScriptTemplates', () => {
    let scriptTemplates;
    let mockLogger;
    let mockEventBus;

    beforeEach(() => {
        mockLogger = {
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            info: jest.fn()
        };

        mockEventBus = {
            publish: jest.fn()
        };

        scriptTemplates = new ScriptTemplates({
            logger: mockLogger,
            eventBus: mockEventBus
        });

        // Reset all mocks
        jest.clearAllMocks();
    });

    describe('constructor', () => {
        it('should create instance with default logger when no dependencies provided', () => {
            const instance = new ScriptTemplates();
            expect(instance.logger).toBe(console);
            expect(instance.eventBus).toBeUndefined();
        });

        it('should create instance with provided dependencies', () => {
            const instance = new ScriptTemplates({
                logger: mockLogger,
                eventBus: mockEventBus
            });
            expect(instance.logger).toBe(mockLogger);
            expect(instance.eventBus).toBe(mockEventBus);
        });

        it('should create instance with partial dependencies', () => {
            const instance = new ScriptTemplates({
                logger: mockLogger
            });
            expect(instance.logger).toBe(mockLogger);
            expect(instance.eventBus).toBeUndefined();
        });

        it('should handle undefined dependencies gracefully', () => {
            const instance = new ScriptTemplates(undefined);
            expect(instance.logger).toBe(console);
            expect(instance.eventBus).toBeUndefined();
        });

        it('should handle null dependencies gracefully', () => {
            const instance = new ScriptTemplates(null);
            expect(instance.logger).toBe(console);
            expect(instance.eventBus).toBeNull();
        });

        it('should handle empty object dependencies', () => {
            const instance = new ScriptTemplates({});
            expect(instance.logger).toBe(console);
            expect(instance.eventBus).toBeUndefined();
        });
    });

    describe('getAllTemplates', () => {
        it('should return all templates from all categories', () => {
            const result = scriptTemplates.getAllTemplates();

            // Get the mocked TEMPLATE_CATEGORIES
            const { TEMPLATE_CATEGORIES } = require('@templates/modules');

            expect(result).toHaveProperty(TEMPLATE_CATEGORIES.BUILD);
            expect(result).toHaveProperty(TEMPLATE_CATEGORIES.TEST);
            expect(result).toHaveProperty(TEMPLATE_CATEGORIES.DEPLOY);
            expect(result).toHaveProperty(TEMPLATE_CATEGORIES.MAINTENANCE);
            expect(result).toHaveProperty(TEMPLATE_CATEGORIES.DEVELOPMENT);
            expect(result).toHaveProperty(TEMPLATE_CATEGORIES.DATABASE);
            expect(result).toHaveProperty(TEMPLATE_CATEGORIES.SECURITY);
            expect(result).toHaveProperty(TEMPLATE_CATEGORIES.MONITORING);
            expect(result).toHaveProperty(TEMPLATE_CATEGORIES.AUTOMATION);
            expect(result).toHaveProperty(TEMPLATE_CATEGORIES.UTILITY);
        });
    });

    describe('getTemplate', () => {
        it('should return template when found', () => {
            const result = scriptTemplates.getTemplate('build', 'testTemplate');
            expect(result).toBeDefined();
            expect(result.name).toBe('Test Template');
        });

        it('should return null when template not found', () => {
            const { TemplateSearch } = require('@templates/modules');
            TemplateSearch.getTemplate.mockReturnValue(null);

            const result = scriptTemplates.getTemplate('build', 'nonexistent');
            expect(result).toBeNull();
        });

        it('should handle empty category and name', () => {
            const { TemplateSearch } = require('@templates/modules');
            TemplateSearch.getTemplate.mockReturnValue(null);

            const result = scriptTemplates.getTemplate('', '');
            expect(result).toBeNull();
        });
    });

    describe('getTemplatesByCategory', () => {
        it('should return templates for valid category', () => {
            const result = scriptTemplates.getTemplatesByCategory('build');
            expect(result).toBeDefined();
            expect(result).toHaveProperty('testTemplate');
        });

        it('should return empty object for invalid category', () => {
            const { TemplateSearch } = require('@templates/modules');
            TemplateSearch.searchByCategory.mockReturnValue({});

            const result = scriptTemplates.getTemplatesByCategory('invalid');
            expect(result).toEqual({});
        });

        it('should handle empty category', () => {
            const { TemplateSearch } = require('@templates/modules');
            TemplateSearch.searchByCategory.mockReturnValue({});

            const result = scriptTemplates.getTemplatesByCategory('');
            expect(result).toEqual({});
        });
    });

    describe('generateScript', () => {
        it('should generate script successfully', () => {
            const result = scriptTemplates.generateScript('build', 'testTemplate', { NAME: 'World' });
            expect(result).toBe('echo "Hello World"');
        });

        it('should throw error when template not found', () => {
            const { TemplateSearch } = require('@templates/modules');
            TemplateSearch.getTemplate.mockReturnValue(null);

            expect(() => {
                scriptTemplates.generateScript('build', 'nonexistent', {});
            }).toThrow('Template not found: build/nonexistent');
        });

        it('should use empty variables object when not provided', () => {
            scriptTemplates.generateScript('build', 'testTemplate');
            // Should not throw and should call TemplateGenerator.generateScript
            expect(scriptTemplates.generateScript('build', 'testTemplate')).toBe('echo "Hello World"');
        });
    });

    describe('searchTemplates', () => {
        it('should search templates with keyword', () => {
            const mockResults = [
                { category: 'build', name: 'test', template: {} }
            ];
            const { TemplateSearch } = require('@templates/modules');
            TemplateSearch.searchTemplates.mockReturnValue(mockResults);

            const result = scriptTemplates.searchTemplates('test');
            expect(result).toEqual(mockResults);
        });

        it('should return empty array for empty keyword', () => {
            const result = scriptTemplates.searchTemplates('');
            expect(result).toEqual([]);
        });

        it('should handle null keyword', () => {
            const result = scriptTemplates.searchTemplates(null);
            expect(result).toEqual([]);
        });
    });

    describe('createCustomTemplate', () => {
        it('should create custom template successfully', () => {
            const mockTemplate = { name: 'Custom Template' };
            const result = scriptTemplates.createCustomTemplate(mockTemplate);
            expect(result).toBeDefined();
            expect(result.id).toBe('custom_123');
            expect(result.isCustom).toBe(true);
        });

        it('should create custom template without eventBus when not provided', () => {
            const scriptTemplatesWithoutEventBus = new ScriptTemplates({ logger: mockLogger });
            const mockTemplate = { name: 'Custom Template' };
            const result = scriptTemplatesWithoutEventBus.createCustomTemplate(mockTemplate);
            expect(result).toBeDefined();
            expect(result.id).toBe('custom_123');
        });
    });

    describe('validateTemplate', () => {
        it('should validate template successfully', () => {
            const mockTemplate = { name: 'Test Template' };
            const result = scriptTemplates.validateTemplate(mockTemplate);
            expect(result).toBeDefined();
            expect(result.isValid).toBe(true);
            expect(result.errors).toEqual([]);
        });

        it('should return validation result with errors', () => {
            const mockTemplate = { name: 'Test Template' };
            const mockValidationResult = { isValid: false, errors: ['Name is required'] };
            const { TemplateValidator } = require('@templates/modules');
            TemplateValidator.validateTemplate.mockReturnValue(mockValidationResult);

            const result = scriptTemplates.validateTemplate(mockTemplate);
            expect(result).toEqual(mockValidationResult);
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Name is required');
        });
    });

    describe('getCategories', () => {
        it('should return all template categories', () => {
            const result = scriptTemplates.getCategories();
            expect(result).toEqual(['build', 'test', 'deploy']);
        });

        it('should return empty array when no categories exist', () => {
            const { TemplateSearch } = require('@templates/modules');
            TemplateSearch.getCategories.mockReturnValue([]);

            const result = scriptTemplates.getCategories();
            expect(result).toEqual([]);
        });
    });

    describe('getTemplateCounts', () => {
        it('should return template counts by category', () => {
            const result = scriptTemplates.getTemplateCounts();
            expect(result).toEqual({ build: 1, test: 1, deploy: 1 });
        });

        it('should return empty object when no templates exist', () => {
            const { TemplateSearch } = require('@templates/modules');
            TemplateSearch.getTemplateCounts.mockReturnValue({});

            const result = scriptTemplates.getTemplateCounts();
            expect(result).toEqual({});
        });
    });

    describe('error handling', () => {
        it('should handle errors in getAllTemplates gracefully', () => {
            const { BuildTemplates } = require('@templates/modules');
            BuildTemplates.getTemplates.mockImplementation(() => {
                throw new Error('Template loading failed');
            });

            expect(() => {
                scriptTemplates.getAllTemplates();
            }).toThrow('Template loading failed');
        });
    });
}); 