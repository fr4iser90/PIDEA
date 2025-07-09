/**
 * TaskTemplates Unit Tests
 * Coverage target: 80%
 */

const TaskTemplates = require('../../../../infrastructure/templates/TaskTemplates');

describe('TaskTemplates', () => {
    let taskTemplates;
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

        taskTemplates = new TaskTemplates({
            logger: mockLogger,
            eventBus: mockEventBus
        });

        // Reset all mocks
        jest.clearAllMocks();
    });

    describe('constructor', () => {
        it('should create instance with default logger when no dependencies provided', () => {
            const instance = new TaskTemplates();
            expect(instance.logger).toBe(console);
            expect(instance.eventBus).toBeUndefined();
        });

        it('should create instance with provided dependencies', () => {
            const instance = new TaskTemplates({
                logger: mockLogger,
                eventBus: mockEventBus
            });
            expect(instance.logger).toBe(mockLogger);
            expect(instance.eventBus).toBe(mockEventBus);
        });

        it('should create instance with partial dependencies', () => {
            const instance = new TaskTemplates({
                logger: mockLogger
            });
            expect(instance.logger).toBe(mockLogger);
            expect(instance.eventBus).toBeUndefined();
        });

        it('should handle undefined dependencies gracefully', () => {
            const instance = new TaskTemplates(undefined);
            expect(instance.logger).toBe(console);
            expect(instance.eventBus).toBeUndefined();
        });

        it('should handle null dependencies gracefully', () => {
            const instance = new TaskTemplates(null);
            expect(instance.logger).toBe(console);
            expect(instance.eventBus).toBeNull();
        });

        it('should handle empty object dependencies', () => {
            const instance = new TaskTemplates({});
            expect(instance.logger).toBe(console);
            expect(instance.eventBus).toBeUndefined();
        });
    });

    describe('getAllTemplates', () => {
        it('should return all templates from all categories', () => {
            const result = taskTemplates.getAllTemplates();

            expect(result).toHaveProperty('analysis');
            expect(result).toHaveProperty('development');
            expect(result).toHaveProperty('testing');
            expect(result).toHaveProperty('deployment');
            expect(result).toHaveProperty('maintenance');
            expect(result).toHaveProperty('security');
            expect(result).toHaveProperty('performance');
            expect(result).toHaveProperty('refactoring');
            expect(result).toHaveProperty('documentation');
            expect(result).toHaveProperty('automation');
        });

        it('should return analysis templates', () => {
            const result = taskTemplates.getAllTemplates();
            const analysisTemplates = result.analysis;

            expect(analysisTemplates).toHaveProperty('projectStructure');
            expect(analysisTemplates).toHaveProperty('codeQuality');
            expect(analysisTemplates).toHaveProperty('dependencyAnalysis');
            expect(analysisTemplates).toHaveProperty('performanceAnalysis');
        });

        it('should return development templates', () => {
            const result = taskTemplates.getAllTemplates();
            const developmentTemplates = result.development;

            expect(developmentTemplates).toHaveProperty('featureDevelopment');
            expect(developmentTemplates).toHaveProperty('bugFix');
            expect(developmentTemplates).toHaveProperty('codeReview');
            expect(developmentTemplates).toHaveProperty('refactoring');
        });
    });

    describe('getAnalysisTemplates', () => {
        it('should return analysis templates with correct structure', () => {
            const templates = taskTemplates.getAnalysisTemplates();

            expect(templates).toHaveProperty('projectStructure');
            expect(templates).toHaveProperty('codeQuality');
            expect(templates).toHaveProperty('dependencyAnalysis');
            expect(templates).toHaveProperty('performanceAnalysis');

            // Check structure of a specific template
            const projectStructure = templates.projectStructure;
            expect(projectStructure).toHaveProperty('name');
            expect(projectStructure).toHaveProperty('description');
            expect(projectStructure).toHaveProperty('category');
            expect(projectStructure).toHaveProperty('priority');
            expect(projectStructure).toHaveProperty('estimatedTime');
            expect(projectStructure).toHaveProperty('steps');
            expect(projectStructure).toHaveProperty('aiPrompts');
            expect(projectStructure).toHaveProperty('outputs');
        });

        it('should have correct template properties', () => {
            const templates = taskTemplates.getAnalysisTemplates();
            const projectStructure = templates.projectStructure;

            expect(projectStructure.name).toBe('Project Structure Analysis');
            expect(projectStructure.category).toBe('analysis');
            expect(projectStructure.priority).toBe('medium');
            expect(projectStructure.estimatedTime).toBe(30);
            expect(Array.isArray(projectStructure.steps)).toBe(true);
            expect(Array.isArray(projectStructure.aiPrompts)).toBe(true);
            expect(Array.isArray(projectStructure.outputs)).toBe(true);
        });
    });

    describe('getDevelopmentTemplates', () => {
        it('should return development templates with correct structure', () => {
            const templates = taskTemplates.getDevelopmentTemplates();

            expect(templates).toHaveProperty('featureDevelopment');
            expect(templates).toHaveProperty('bugFix');
            expect(templates).toHaveProperty('codeReview');
            expect(templates).toHaveProperty('refactoring');

            // Check structure of a specific template
            const featureDevelopment = templates.featureDevelopment;
            expect(featureDevelopment).toHaveProperty('name');
            expect(featureDevelopment).toHaveProperty('description');
            expect(featureDevelopment).toHaveProperty('category');
            expect(featureDevelopment).toHaveProperty('priority');
            expect(featureDevelopment).toHaveProperty('estimatedTime');
            expect(featureDevelopment).toHaveProperty('steps');
            expect(featureDevelopment).toHaveProperty('aiPrompts');
            expect(featureDevelopment).toHaveProperty('outputs');
        });

        it('should have correct template properties', () => {
            const templates = taskTemplates.getDevelopmentTemplates();
            const featureDevelopment = templates.featureDevelopment;

            expect(featureDevelopment.name).toBe('Feature Development');
            expect(featureDevelopment.category).toBe('development');
            expect(featureDevelopment.priority).toBe('high');
            expect(featureDevelopment.estimatedTime).toBe(240);
            expect(Array.isArray(featureDevelopment.steps)).toBe(true);
            expect(Array.isArray(featureDevelopment.aiPrompts)).toBe(true);
            expect(Array.isArray(featureDevelopment.outputs)).toBe(true);
        });
    });

    describe('getTestingTemplates', () => {
        it('should return testing templates with correct structure', () => {
            const templates = taskTemplates.getTestingTemplates();

            expect(templates).toHaveProperty('unitTestCreation');
            expect(templates).toHaveProperty('integrationTestSetup');
            expect(templates).toHaveProperty('e2eTestCreation');
            expect(templates).toHaveProperty('performanceTesting');

            const unitTestCreation = templates.unitTestCreation;
            expect(unitTestCreation).toHaveProperty('name');
            expect(unitTestCreation).toHaveProperty('description');
            expect(unitTestCreation).toHaveProperty('category');
            expect(unitTestCreation).toHaveProperty('priority');
            expect(unitTestCreation).toHaveProperty('estimatedTime');
            expect(unitTestCreation).toHaveProperty('steps');
            expect(unitTestCreation).toHaveProperty('aiPrompts');
            expect(unitTestCreation).toHaveProperty('outputs');
        });

        it('should have correct template properties', () => {
            const templates = taskTemplates.getTestingTemplates();
            const unitTestCreation = templates.unitTestCreation;

            expect(unitTestCreation.name).toBe('Unit Test Creation');
            expect(unitTestCreation.category).toBe('testing');
            expect(unitTestCreation.priority).toBe('high');
            expect(typeof unitTestCreation.estimatedTime).toBe('number');
            expect(Array.isArray(unitTestCreation.steps)).toBe(true);
            expect(Array.isArray(unitTestCreation.aiPrompts)).toBe(true);
            expect(Array.isArray(unitTestCreation.outputs)).toBe(true);
        });
    });

    describe('getDeploymentTemplates', () => {
        it('should return deployment templates with correct structure', () => {
            const templates = taskTemplates.getDeploymentTemplates();

            expect(templates).toHaveProperty('deploymentSetup');
            expect(templates).toHaveProperty('environmentConfiguration');
            expect(templates).toHaveProperty('cloudDeployment');
            expect(templates).toHaveProperty('containerization');

            const deploymentSetup = templates.deploymentSetup;
            expect(deploymentSetup).toHaveProperty('name');
            expect(deploymentSetup).toHaveProperty('description');
            expect(deploymentSetup).toHaveProperty('category');
            expect(deploymentSetup).toHaveProperty('priority');
            expect(deploymentSetup).toHaveProperty('estimatedTime');
            expect(deploymentSetup).toHaveProperty('steps');
            expect(deploymentSetup).toHaveProperty('aiPrompts');
            expect(deploymentSetup).toHaveProperty('outputs');
        });
    });

    describe('getMaintenanceTemplates', () => {
        it('should return maintenance templates with correct structure', () => {
            const templates = taskTemplates.getMaintenanceTemplates();

            expect(templates).toHaveProperty('codeCleanup');
            expect(templates).toHaveProperty('dependencyUpdate');
            expect(templates).toHaveProperty('performanceOptimization');
            expect(templates).toHaveProperty('documentationUpdate');

            const codeCleanup = templates.codeCleanup;
            expect(codeCleanup).toHaveProperty('name');
            expect(codeCleanup).toHaveProperty('description');
            expect(codeCleanup).toHaveProperty('category');
            expect(codeCleanup).toHaveProperty('priority');
            expect(codeCleanup).toHaveProperty('estimatedTime');
            expect(codeCleanup).toHaveProperty('steps');
            expect(codeCleanup).toHaveProperty('aiPrompts');
            expect(codeCleanup).toHaveProperty('outputs');
        });
    });

    describe('getSecurityTemplates', () => {
        it('should return security templates with correct structure', () => {
            const templates = taskTemplates.getSecurityTemplates();

            expect(templates).toHaveProperty('securityAudit');
            expect(templates).toHaveProperty('vulnerabilityFix');
            expect(templates).toHaveProperty('securityHardening');
            expect(templates).toHaveProperty('complianceCheck');

            const securityAudit = templates.securityAudit;
            expect(securityAudit).toHaveProperty('name');
            expect(securityAudit).toHaveProperty('description');
            expect(securityAudit).toHaveProperty('category');
            expect(securityAudit).toHaveProperty('priority');
            expect(securityAudit).toHaveProperty('estimatedTime');
            expect(securityAudit).toHaveProperty('steps');
            expect(securityAudit).toHaveProperty('aiPrompts');
            expect(securityAudit).toHaveProperty('outputs');
        });
    });

    describe('getPerformanceTemplates', () => {
        it('should return performance templates with correct structure', () => {
            const templates = taskTemplates.getPerformanceTemplates();

            expect(templates).toHaveProperty('performanceProfiling');
            expect(templates).toHaveProperty('loadTesting');
            expect(templates).toHaveProperty('databaseOptimization');
            expect(templates).toHaveProperty('cachingImplementation');

            const performanceProfiling = templates.performanceProfiling;
            expect(performanceProfiling).toHaveProperty('name');
            expect(performanceProfiling).toHaveProperty('description');
            expect(performanceProfiling).toHaveProperty('category');
            expect(performanceProfiling).toHaveProperty('priority');
            expect(performanceProfiling).toHaveProperty('estimatedTime');
            expect(performanceProfiling).toHaveProperty('steps');
            expect(performanceProfiling).toHaveProperty('aiPrompts');
            expect(performanceProfiling).toHaveProperty('outputs');
        });
    });

    describe('getRefactoringTemplates', () => {
        it('should return refactoring templates with correct structure', () => {
            const templates = taskTemplates.getRefactoringTemplates();

            expect(templates).toHaveProperty('codeRefactoring');
            expect(templates).toHaveProperty('architectureRefactoring');
            expect(templates).toHaveProperty('dependencyRefactoring');
            expect(templates).toHaveProperty('testRefactoring');

            const codeRefactoring = templates.codeRefactoring;
            expect(codeRefactoring).toHaveProperty('name');
            expect(codeRefactoring).toHaveProperty('description');
            expect(codeRefactoring).toHaveProperty('category');
            expect(codeRefactoring).toHaveProperty('priority');
            expect(codeRefactoring).toHaveProperty('estimatedTime');
            expect(codeRefactoring).toHaveProperty('steps');
            expect(codeRefactoring).toHaveProperty('aiPrompts');
            expect(codeRefactoring).toHaveProperty('outputs');
        });
    });

    describe('getDocumentationTemplates', () => {
        it('should return documentation templates with correct structure', () => {
            const templates = taskTemplates.getDocumentationTemplates();

            expect(templates).toHaveProperty('codeDocumentation');
            expect(templates).toHaveProperty('apiDocumentation');
            expect(templates).toHaveProperty('userDocumentation');
            expect(templates).toHaveProperty('technicalDocumentation');

            const codeDocumentation = templates.codeDocumentation;
            expect(codeDocumentation).toHaveProperty('name');
            expect(codeDocumentation).toHaveProperty('description');
            expect(codeDocumentation).toHaveProperty('category');
            expect(codeDocumentation).toHaveProperty('priority');
            expect(codeDocumentation).toHaveProperty('estimatedTime');
            expect(codeDocumentation).toHaveProperty('steps');
            expect(codeDocumentation).toHaveProperty('aiPrompts');
            expect(codeDocumentation).toHaveProperty('outputs');
        });
    });

    describe('getAutomationTemplates', () => {
        it('should return automation templates with correct structure', () => {
            const templates = taskTemplates.getAutomationTemplates();

            expect(templates).toHaveProperty('ciCdSetup');
            expect(templates).toHaveProperty('testAutomation');
            expect(templates).toHaveProperty('deploymentAutomation');
            expect(templates).toHaveProperty('monitoringAutomation');

            const ciCdSetup = templates.ciCdSetup;
            expect(ciCdSetup).toHaveProperty('name');
            expect(ciCdSetup).toHaveProperty('description');
            expect(ciCdSetup).toHaveProperty('category');
            expect(ciCdSetup).toHaveProperty('priority');
            expect(ciCdSetup).toHaveProperty('estimatedTime');
            expect(ciCdSetup).toHaveProperty('steps');
            expect(ciCdSetup).toHaveProperty('aiPrompts');
            expect(ciCdSetup).toHaveProperty('outputs');
        });
    });

    describe('getTemplate', () => {
        it('should return template when found', () => {
            const template = taskTemplates.getTemplate('analysis', 'projectStructure');
            expect(template).toBeDefined();
            expect(template.name).toBe('Project Structure Analysis');
            expect(template.category).toBe('analysis');
        });

        it('should return null when template not found', () => {
            const template = taskTemplates.getTemplate('analysis', 'nonexistent');
            expect(template).toBeNull();
        });

        it('should return null when category not found', () => {
            const template = taskTemplates.getTemplate('nonexistent', 'projectStructure');
            expect(template).toBeNull();
        });

        it('should handle empty category and name', () => {
            const template = taskTemplates.getTemplate('', '');
            expect(template).toBeNull();
        });

        it('should handle undefined category and name', () => {
            const template = taskTemplates.getTemplate(undefined, undefined);
            expect(template).toBeNull();
        });
    });

    describe('getTemplatesByCategory', () => {
        it('should return templates for valid category', () => {
            const templates = taskTemplates.getTemplatesByCategory('analysis');
            expect(templates).toBeDefined();
            expect(templates).toHaveProperty('projectStructure');
            expect(templates).toHaveProperty('codeQuality');
            expect(templates).toHaveProperty('dependencyAnalysis');
            expect(templates).toHaveProperty('performanceAnalysis');
        });

        it('should return empty object for invalid category', () => {
            const templates = taskTemplates.getTemplatesByCategory('nonexistent');
            expect(templates).toEqual({});
        });

        it('should handle empty category', () => {
            const templates = taskTemplates.getTemplatesByCategory('');
            expect(templates).toEqual({});
        });

        it('should handle undefined category', () => {
            const templates = taskTemplates.getTemplatesByCategory(undefined);
            expect(templates).toEqual({});
        });
    });

    describe('searchTemplates', () => {
        it('should find templates by name', () => {
            const results = taskTemplates.searchTemplates('Project Structure');
            expect(results.length).toBeGreaterThan(0);
            expect(results[0].template.name).toContain('Project Structure');
        });

        it('should find templates by description', () => {
            const results = taskTemplates.searchTemplates('analyze project structure');
            expect(results.length).toBeGreaterThan(0);
            expect(results[0].template.description.toLowerCase()).toContain('analyze project structure');
        });

        it('should find templates by category', () => {
            const results = taskTemplates.searchTemplates('analysis');
            expect(results.length).toBeGreaterThan(0);
            expect(results[0].template.category).toBe('analysis');
        });

        it('should be case insensitive', () => {
            const results1 = taskTemplates.searchTemplates('PROJECT STRUCTURE');
            const results2 = taskTemplates.searchTemplates('project structure');
            expect(results1.length).toBe(results2.length);
        });

        it('should return empty array for no matches', () => {
            const results = taskTemplates.searchTemplates('nonexistentkeyword');
            expect(results).toEqual([]);
        });

        it('should handle empty keyword', () => {
            const results = taskTemplates.searchTemplates('');
            expect(results).toEqual([]);
        });

        it('should handle undefined keyword', () => {
            const results = taskTemplates.searchTemplates(undefined);
            expect(results).toEqual([]);
        });
    });

    describe('getRecommendationsByProjectType', () => {
        it('should return recommendations for react-app', () => {
            const recommendations = taskTemplates.getRecommendationsByProjectType('react-app');
            expect(Array.isArray(recommendations)).toBe(true);
            expect(recommendations).toContain('featureDevelopment');
            expect(recommendations).toContain('unitTestCreation');
            expect(recommendations).toContain('codeReview');
            expect(recommendations).toContain('performanceAnalysis');
        });

        it('should return recommendations for vue-app', () => {
            const recommendations = taskTemplates.getRecommendationsByProjectType('vue-app');
            expect(Array.isArray(recommendations)).toBe(true);
            expect(recommendations).toContain('featureDevelopment');
            expect(recommendations).toContain('unitTestCreation');
            expect(recommendations).toContain('codeReview');
            expect(recommendations).toContain('performanceAnalysis');
        });

        it('should return recommendations for express-app', () => {
            const recommendations = taskTemplates.getRecommendationsByProjectType('express-app');
            expect(Array.isArray(recommendations)).toBe(true);
            expect(recommendations).toContain('apiDocumentation');
            expect(recommendations).toContain('securityAudit');
            expect(recommendations).toContain('performanceOptimization');
            expect(recommendations).toContain('deploymentSetup');
        });

        it('should return recommendations for nest-app', () => {
            const recommendations = taskTemplates.getRecommendationsByProjectType('nest-app');
            expect(Array.isArray(recommendations)).toBe(true);
            expect(recommendations).toContain('apiDocumentation');
            expect(recommendations).toContain('securityAudit');
            expect(recommendations).toContain('performanceOptimization');
            expect(recommendations).toContain('deploymentSetup');
        });

        it('should return recommendations for typescript-library', () => {
            const recommendations = taskTemplates.getRecommendationsByProjectType('typescript-library');
            expect(Array.isArray(recommendations)).toBe(true);
            expect(recommendations).toContain('codeDocumentation');
            expect(recommendations).toContain('unitTestCreation');
            expect(recommendations).toContain('dependencyUpdate');
            expect(recommendations).toContain('codeCleanup');
        });

        it('should return empty array for unknown project type', () => {
            const recommendations = taskTemplates.getRecommendationsByProjectType('unknown-type');
            expect(recommendations).toEqual([]);
        });

        it('should handle empty project type', () => {
            const recommendations = taskTemplates.getRecommendationsByProjectType('');
            expect(recommendations).toEqual([]);
        });

        it('should handle undefined project type', () => {
            const recommendations = taskTemplates.getRecommendationsByProjectType(undefined);
            expect(recommendations).toEqual([]);
        });
    });

    describe('createCustomTemplate', () => {
        it('should create custom template with required properties', () => {
            const templateData = {
                name: 'Custom Test Template',
                description: 'A custom template for testing',
                category: 'testing',
                priority: 'medium',
                estimatedTime: 60,
                steps: ['Step 1', 'Step 2'],
                aiPrompts: ['Prompt 1'],
                outputs: ['output1.txt']
            };

            const customTemplate = taskTemplates.createCustomTemplate(templateData);

            expect(customTemplate).toHaveProperty('id');
            expect(customTemplate).toHaveProperty('isCustom', true);
            expect(customTemplate).toHaveProperty('createdAt');
            expect(customTemplate.name).toBe(templateData.name);
            expect(customTemplate.description).toBe(templateData.description);
            expect(customTemplate.category).toBe(templateData.category);
            expect(customTemplate.priority).toBe(templateData.priority);
            expect(customTemplate.estimatedTime).toBe(templateData.estimatedTime);
            expect(customTemplate.steps).toEqual(templateData.steps);
            expect(customTemplate.aiPrompts).toEqual(templateData.aiPrompts);
            expect(customTemplate.outputs).toEqual(templateData.outputs);
        });

        it('should generate unique id for custom template', () => {
            const templateData = {
                name: 'Template 1',
                description: 'Description 1',
                category: 'testing',
                priority: 'medium',
                estimatedTime: 60,
                steps: ['Step 1'],
                aiPrompts: ['Prompt 1'],
                outputs: ['output1.txt']
            };

            const template1 = taskTemplates.createCustomTemplate(templateData);
            const template2 = taskTemplates.createCustomTemplate(templateData);

            expect(template1.id).not.toBe(template2.id);
            expect(template1.id).toMatch(/^custom_\d+_[a-z0-9]+$/);
            expect(template2.id).toMatch(/^custom_\d+_[a-z0-9]+$/);
        });

        it('should publish event when eventBus is available', () => {
            const templateData = {
                name: 'Event Test Template',
                description: 'Testing event publishing',
                category: 'testing',
                priority: 'medium',
                estimatedTime: 60,
                steps: ['Step 1'],
                aiPrompts: ['Prompt 1'],
                outputs: ['output1.txt']
            };

            taskTemplates.createCustomTemplate(templateData);

            expect(mockEventBus.publish).toHaveBeenCalledWith('template.created', {
                template: expect.objectContaining({
                    name: templateData.name,
                    isCustom: true
                }),
                timestamp: expect.any(Date)
            });
        });

        it('should not publish event when eventBus is not available', () => {
            const instanceWithoutEventBus = new TaskTemplates({ logger: mockLogger });
            const templateData = {
                name: 'No Event Template',
                description: 'Testing without eventBus',
                category: 'testing',
                priority: 'medium',
                estimatedTime: 60,
                steps: ['Step 1'],
                aiPrompts: ['Prompt 1'],
                outputs: ['output1.txt']
            };

            expect(() => {
                instanceWithoutEventBus.createCustomTemplate(templateData);
            }).not.toThrow();
        });
    });

    describe('validateTemplate', () => {
        it('should validate correct template', () => {
            const validTemplate = {
                name: 'Valid Template',
                description: 'A valid template',
                category: 'testing',
                priority: 'medium',
                estimatedTime: 60,
                steps: ['Step 1', 'Step 2'],
                aiPrompts: ['Prompt 1'],
                outputs: ['output1.txt']
            };

            const result = taskTemplates.validateTemplate(validTemplate);

            expect(result.isValid).toBe(true);
            expect(result.errors).toEqual([]);
        });

        it('should reject template without name', () => {
            const invalidTemplate = {
                description: 'A template without name',
                category: 'testing',
                priority: 'medium',
                estimatedTime: 60,
                steps: ['Step 1'],
                aiPrompts: ['Prompt 1'],
                outputs: ['output1.txt']
            };

            const result = taskTemplates.validateTemplate(invalidTemplate);

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Template name is required');
        });

        it('should reject template without description', () => {
            const invalidTemplate = {
                name: 'Template without description',
                category: 'testing',
                priority: 'medium',
                estimatedTime: 60,
                steps: ['Step 1'],
                aiPrompts: ['Prompt 1'],
                outputs: ['output1.txt']
            };

            const result = taskTemplates.validateTemplate(invalidTemplate);

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Template description is required');
        });

        it('should reject template without category', () => {
            const invalidTemplate = {
                name: 'Template without category',
                description: 'A template without category',
                priority: 'medium',
                estimatedTime: 60,
                steps: ['Step 1'],
                aiPrompts: ['Prompt 1'],
                outputs: ['output1.txt']
            };

            const result = taskTemplates.validateTemplate(invalidTemplate);

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Template category is required');
        });

        it('should reject template without steps', () => {
            const invalidTemplate = {
                name: 'Template without steps',
                description: 'A template without steps',
                category: 'testing',
                priority: 'medium',
                estimatedTime: 60,
                aiPrompts: ['Prompt 1'],
                outputs: ['output1.txt']
            };

            const result = taskTemplates.validateTemplate(invalidTemplate);

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Template must have at least one step');
        });

        it('should reject template with empty steps array', () => {
            const invalidTemplate = {
                name: 'Template with empty steps',
                description: 'A template with empty steps',
                category: 'testing',
                priority: 'medium',
                estimatedTime: 60,
                steps: [],
                aiPrompts: ['Prompt 1'],
                outputs: ['output1.txt']
            };

            const result = taskTemplates.validateTemplate(invalidTemplate);

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Template must have at least one step');
        });

        it('should reject template without priority', () => {
            const invalidTemplate = {
                name: 'Template without priority',
                description: 'A template without priority',
                category: 'testing',
                estimatedTime: 60,
                steps: ['Step 1'],
                aiPrompts: ['Prompt 1'],
                outputs: ['output1.txt']
            };

            const result = taskTemplates.validateTemplate(invalidTemplate);

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Template priority is required');
        });

        it('should reject template without estimated time', () => {
            const invalidTemplate = {
                name: 'Template without estimated time',
                description: 'A template without estimated time',
                category: 'testing',
                priority: 'medium',
                steps: ['Step 1'],
                aiPrompts: ['Prompt 1'],
                outputs: ['output1.txt']
            };

            const result = taskTemplates.validateTemplate(invalidTemplate);

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Template estimated time is required');
        });

        it('should collect multiple validation errors', () => {
            const invalidTemplate = {
                // Missing name, description, category, priority, estimatedTime, steps
            };

            const result = taskTemplates.validateTemplate(invalidTemplate);

            expect(result.isValid).toBe(false);
            expect(result.errors.length).toBe(6); // 5 validation errors + 1 for missing steps
            expect(result.errors).toContain('Template name is required');
            expect(result.errors).toContain('Template description is required');
            expect(result.errors).toContain('Template category is required');
            expect(result.errors).toContain('Template priority is required');
            expect(result.errors).toContain('Template estimated time is required');
            expect(result.errors).toContain('Template must have at least one step');
        });

        it('should handle null template', () => {
            const result = taskTemplates.validateTemplate(null);

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Template is required');
        });

        it('should handle undefined template', () => {
            const result = taskTemplates.validateTemplate(undefined);

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Template is required');
        });
    });
}); 