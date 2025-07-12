const AIPrompts = require('@templates/AIPrompts');

describe('AIPrompts', () => {
    let aiPrompts;
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
            publish: jest.fn(),
            subscribe: jest.fn()
        };

        aiPrompts = new AIPrompts({
            logger: mockLogger,
            eventBus: mockEventBus
        });
    });

    describe('constructor', () => {
        it('should initialize with default dependencies', () => {
            const defaultPrompts = new AIPrompts();
            expect(defaultPrompts.logger).toBe(console);
            expect(defaultPrompts.eventBus).toBeUndefined();
        });

        it('should initialize with custom dependencies', () => {
            expect(aiPrompts.logger).toBe(mockLogger);
            expect(aiPrompts.eventBus).toBe(mockEventBus);
        });
    });

    describe('getAllPrompts', () => {
        it('should return all prompt categories', () => {
            const allPrompts = aiPrompts.getAllPrompts();

            expect(allPrompts).toHaveProperty('analysis');
            expect(allPrompts).toHaveProperty('development');
            expect(allPrompts).toHaveProperty('testing');
            expect(allPrompts).toHaveProperty('optimization');
            expect(allPrompts).toHaveProperty('security');
            expect(allPrompts).toHaveProperty('documentation');
            expect(allPrompts).toHaveProperty('refactoring');
            expect(allPrompts).toHaveProperty('debugging');
            expect(allPrompts).toHaveProperty('architecture');
            expect(allPrompts).toHaveProperty('deployment');
        });

        it('should return non-empty prompt objects', () => {
            const allPrompts = aiPrompts.getAllPrompts();

            Object.values(allPrompts).forEach(category => {
                expect(typeof category).toBe('object');
                expect(Object.keys(category).length).toBeGreaterThan(0);
            });
        });
    });

    describe('getAnalysisPrompts', () => {
        it('should return analysis prompts with correct structure', () => {
            const analysisPrompts = aiPrompts.getAnalysisPrompts();

            expect(analysisPrompts).toHaveProperty('projectAnalysis');
            expect(analysisPrompts).toHaveProperty('codeQualityAnalysis');
            expect(analysisPrompts).toHaveProperty('dependencyAnalysis');
            expect(analysisPrompts).toHaveProperty('performanceAnalysis');

            // Check structure of each prompt
            Object.values(analysisPrompts).forEach(prompt => {
                expect(prompt).toHaveProperty('name');
                expect(prompt).toHaveProperty('description');
                expect(prompt).toHaveProperty('category');
                expect(prompt).toHaveProperty('prompt');
                expect(prompt).toHaveProperty('variables');
                expect(prompt.category).toBe('analysis');
            });
        });

        it('should have valid prompt content', () => {
            const analysisPrompts = aiPrompts.getAnalysisPrompts();

            Object.values(analysisPrompts).forEach(prompt => {
                expect(typeof prompt.name).toBe('string');
                expect(prompt.name.length).toBeGreaterThan(0);
                expect(typeof prompt.description).toBe('string');
                expect(prompt.description.length).toBeGreaterThan(0);
                expect(typeof prompt.prompt).toBe('string');
                expect(prompt.prompt.length).toBeGreaterThan(0);
                expect(typeof prompt.variables).toBe('object');
            });
        });
    });

    describe('getDevelopmentPrompts', () => {
        it('should return development prompts with correct structure', () => {
            const developmentPrompts = aiPrompts.getDevelopmentPrompts();

            expect(developmentPrompts).toHaveProperty('featureImplementation');
            expect(developmentPrompts).toHaveProperty('codeReview');

            Object.values(developmentPrompts).forEach(prompt => {
                expect(prompt).toHaveProperty('name');
                expect(prompt).toHaveProperty('description');
                expect(prompt).toHaveProperty('category');
                expect(prompt).toHaveProperty('prompt');
                expect(prompt).toHaveProperty('variables');
                expect(prompt.category).toBe('development');
            });
        });
    });

    describe('getTestingPrompts', () => {
        it('should return testing prompts with correct structure', () => {
            const testingPrompts = aiPrompts.getTestingPrompts();

            expect(testingPrompts).toHaveProperty('testStrategy');
            expect(testingPrompts).toHaveProperty('testGeneration');
            expect(testingPrompts).toHaveProperty('testOptimization');

            Object.values(testingPrompts).forEach(prompt => {
                expect(prompt).toHaveProperty('name');
                expect(prompt).toHaveProperty('description');
                expect(prompt).toHaveProperty('category');
                expect(prompt).toHaveProperty('prompt');
                expect(prompt).toHaveProperty('variables');
                expect(prompt.category).toBe('testing');
            });
        });
    });

    describe('getOptimizationPrompts', () => {
        it('should return optimization prompts with correct structure', () => {
            const optimizationPrompts = aiPrompts.getOptimizationPrompts();

            expect(optimizationPrompts).toHaveProperty('performanceOptimization');
            expect(optimizationPrompts).toHaveProperty('bundleOptimization');
            expect(optimizationPrompts).toHaveProperty('databaseOptimization');

            Object.values(optimizationPrompts).forEach(prompt => {
                expect(prompt).toHaveProperty('name');
                expect(prompt).toHaveProperty('description');
                expect(prompt).toHaveProperty('category');
                expect(prompt).toHaveProperty('prompt');
                expect(prompt).toHaveProperty('variables');
                expect(prompt.category).toBe('optimization');
            });
        });
    });

    describe('getSecurityPrompts', () => {
        it('should return security prompts with correct structure', () => {
            const securityPrompts = aiPrompts.getSecurityPrompts();

            expect(securityPrompts).toHaveProperty('securityAudit');
            expect(securityPrompts).toHaveProperty('vulnerabilityAssessment');

            Object.values(securityPrompts).forEach(prompt => {
                expect(prompt).toHaveProperty('name');
                expect(prompt).toHaveProperty('description');
                expect(prompt).toHaveProperty('category');
                expect(prompt).toHaveProperty('prompt');
                expect(prompt).toHaveProperty('variables');
                expect(prompt.category).toBe('security');
            });
        });
    });

    describe('getDocumentationPrompts', () => {
        it('should return documentation prompts with correct structure', () => {
            const documentationPrompts = aiPrompts.getDocumentationPrompts();

            expect(documentationPrompts).toHaveProperty('apiDocumentation');
            expect(documentationPrompts).toHaveProperty('codeDocumentation');

            Object.values(documentationPrompts).forEach(prompt => {
                expect(prompt).toHaveProperty('name');
                expect(prompt).toHaveProperty('description');
                expect(prompt).toHaveProperty('category');
                expect(prompt).toHaveProperty('prompt');
                expect(prompt).toHaveProperty('variables');
                expect(prompt.category).toBe('documentation');
            });
        });
    });

    describe('getRefactoringPrompts', () => {
        it('should return refactoring prompts with correct structure', () => {
            const refactoringPrompts = aiPrompts.getRefactoringPrompts();

            expect(refactoringPrompts).toHaveProperty('codeRefactoring');
            expect(refactoringPrompts).toHaveProperty('architectureRefactoring');

            Object.values(refactoringPrompts).forEach(prompt => {
                expect(prompt).toHaveProperty('name');
                expect(prompt).toHaveProperty('description');
                expect(prompt).toHaveProperty('category');
                expect(prompt).toHaveProperty('prompt');
                expect(prompt).toHaveProperty('variables');
                expect(prompt.category).toBe('refactoring');
            });
        });
    });

    describe('getDebuggingPrompts', () => {
        it('should return debugging prompts with correct structure', () => {
            const debuggingPrompts = aiPrompts.getDebuggingPrompts();

            expect(debuggingPrompts).toHaveProperty('errorDebugging');
            expect(debuggingPrompts).toHaveProperty('performanceDebugging');

            Object.values(debuggingPrompts).forEach(prompt => {
                expect(prompt).toHaveProperty('name');
                expect(prompt).toHaveProperty('description');
                expect(prompt).toHaveProperty('category');
                expect(prompt).toHaveProperty('prompt');
                expect(prompt).toHaveProperty('variables');
                expect(prompt.category).toBe('debugging');
            });
        });
    });

    describe('getArchitecturePrompts', () => {
        it('should return architecture prompts with correct structure', () => {
            const architecturePrompts = aiPrompts.getArchitecturePrompts();

            expect(architecturePrompts).toHaveProperty('systemDesign');
            expect(architecturePrompts).toHaveProperty('microservicesDesign');

            Object.values(architecturePrompts).forEach(prompt => {
                expect(prompt).toHaveProperty('name');
                expect(prompt).toHaveProperty('description');
                expect(prompt).toHaveProperty('category');
                expect(prompt).toHaveProperty('prompt');
                expect(prompt).toHaveProperty('variables');
                expect(prompt.category).toBe('architecture');
            });
        });
    });

    describe('getDeploymentPrompts', () => {
        it('should return deployment prompts with correct structure', () => {
            const deploymentPrompts = aiPrompts.getDeploymentPrompts();

            expect(deploymentPrompts).toHaveProperty('deploymentStrategy');
            expect(deploymentPrompts).toHaveProperty('infrastructureDesign');

            Object.values(deploymentPrompts).forEach(prompt => {
                expect(prompt).toHaveProperty('name');
                expect(prompt).toHaveProperty('description');
                expect(prompt).toHaveProperty('category');
                expect(prompt).toHaveProperty('prompt');
                expect(prompt).toHaveProperty('variables');
                expect(prompt.category).toBe('deployment');
            });
        });
    });

    describe('getPrompt', () => {
        it('should return prompt when category and name exist', () => {
            const prompt = aiPrompts.getPrompt('analysis', 'projectAnalysis');

            expect(prompt).toBeDefined();
            expect(prompt.name).toBe('Project Analysis');
            expect(prompt.category).toBe('analysis');
        });

        it('should return null when category does not exist', () => {
            const prompt = aiPrompts.getPrompt('nonexistent', 'projectAnalysis');

            expect(prompt).toBeNull();
        });

        it('should return null when name does not exist in category', () => {
            const prompt = aiPrompts.getPrompt('analysis', 'nonexistent');

            expect(prompt).toBeNull();
        });

        it('should return null when both category and name do not exist', () => {
            const prompt = aiPrompts.getPrompt('nonexistent', 'nonexistent');

            expect(prompt).toBeNull();
        });
    });

    describe('getPromptsByCategory', () => {
        it('should return all prompts for existing category', () => {
            const analysisPrompts = aiPrompts.getPromptsByCategory('analysis');

            expect(analysisPrompts).toHaveProperty('projectAnalysis');
            expect(analysisPrompts).toHaveProperty('codeQualityAnalysis');
            expect(analysisPrompts).toHaveProperty('dependencyAnalysis');
            expect(analysisPrompts).toHaveProperty('performanceAnalysis');
        });

        it('should return empty object for non-existing category', () => {
            const prompts = aiPrompts.getPromptsByCategory('nonexistent');

            expect(prompts).toEqual({});
        });
    });

    describe('generatePrompt', () => {
        it('should generate prompt with provided variables', () => {
            const variables = {
                PROJECT_TYPE: 'mobile-app',
                TECH_STACK: 'React Native, Node.js',
                PROJECT_SIZE: 'large'
            };

            const generatedPrompt = aiPrompts.generatePrompt('analysis', 'projectAnalysis', variables);

            expect(generatedPrompt).toContain('mobile-app');
            expect(generatedPrompt).toContain('React Native, Node.js');
            expect(generatedPrompt).toContain('large');
            expect(generatedPrompt).not.toContain('{{PROJECT_TYPE}}');
            expect(generatedPrompt).not.toContain('{{TECH_STACK}}');
            expect(generatedPrompt).not.toContain('{{PROJECT_SIZE}}');
        });

        it('should use default variables when not provided', () => {
            const generatedPrompt = aiPrompts.generatePrompt('analysis', 'projectAnalysis', {});

            expect(generatedPrompt).toContain('web-application');
            expect(generatedPrompt).toContain('Node.js, React, Express');
            expect(generatedPrompt).toContain('medium');
            expect(generatedPrompt).not.toContain('{{PROJECT_TYPE}}');
            expect(generatedPrompt).not.toContain('{{TECH_STACK}}');
            expect(generatedPrompt).not.toContain('{{PROJECT_SIZE}}');
        });

        it('should mix provided and default variables', () => {
            const variables = {
                PROJECT_TYPE: 'mobile-app'
            };

            const generatedPrompt = aiPrompts.generatePrompt('analysis', 'projectAnalysis', variables);

            expect(generatedPrompt).toContain('mobile-app');
            expect(generatedPrompt).toContain('Node.js, React, Express');
            expect(generatedPrompt).toContain('medium');
        });

        it('should throw error for non-existing prompt', () => {
            expect(() => {
                aiPrompts.generatePrompt('nonexistent', 'nonexistent', {});
            }).toThrow('Prompt not found: nonexistent/nonexistent');
        });

        it('should handle multiple occurrences of same variable', () => {
            const variables = {
                LANGUAGE: 'TypeScript'
            };

            const generatedPrompt = aiPrompts.generatePrompt('analysis', 'codeQualityAnalysis', variables);

            const occurrences = (generatedPrompt.match(/TypeScript/g) || []).length;
            expect(occurrences).toBeGreaterThan(0);
            expect(generatedPrompt).not.toContain('{{LANGUAGE}}');
        });

        it('should handle variables with special characters', () => {
            const variables = {
                FILE_PATH: 'src/components/UserProfile.tsx'
            };

            const generatedPrompt = aiPrompts.generatePrompt('analysis', 'codeQualityAnalysis', variables);

            expect(generatedPrompt).toContain('src/components/UserProfile.tsx');
            expect(generatedPrompt).not.toContain('{{FILE_PATH}}');
        });
    });

    describe('searchPrompts', () => {
        it('should find prompts by name', () => {
            const results = aiPrompts.searchPrompts('Project Analysis');

            expect(results.length).toBeGreaterThan(0);
            expect(results[0].prompt.name).toBe('Project Analysis');
        });

        it('should find prompts by description', () => {
            const results = aiPrompts.searchPrompts('Analyze project structure');

            expect(results.length).toBeGreaterThan(0);
            expect(results[0].prompt.description).toContain('Analyze project structure');
        });

        it('should find prompts by category', () => {
            const results = aiPrompts.searchPrompts('analysis');

            expect(results.length).toBeGreaterThan(0);
            results.forEach(result => {
                expect(result.category).toBe('analysis');
            });
        });

        it('should be case insensitive', () => {
            const results1 = aiPrompts.searchPrompts('project analysis');
            const results2 = aiPrompts.searchPrompts('PROJECT ANALYSIS');

            expect(results1.length).toBe(results2.length);
        });

        it('should return empty array for non-matching keyword', () => {
            const results = aiPrompts.searchPrompts('nonexistentkeyword');

            expect(results).toEqual([]);
        });

        it('should return all prompts for empty keyword', () => {
            const results = aiPrompts.searchPrompts('');

            expect(results.length).toBeGreaterThan(0);
            expect(Array.isArray(results)).toBe(true);
        });

        it('should include category and name in results', () => {
            const results = aiPrompts.searchPrompts('Project Analysis');

            expect(results[0]).toHaveProperty('category');
            expect(results[0]).toHaveProperty('name');
            expect(results[0]).toHaveProperty('prompt');
        });
    });

    describe('createCustomPrompt', () => {
        it('should create custom prompt with required properties', () => {
            const promptData = {
                name: 'Custom Test Prompt',
                description: 'A custom test prompt',
                category: 'testing',
                prompt: 'This is a custom prompt content'
            };

            const customPrompt = aiPrompts.createCustomPrompt(promptData);

            expect(customPrompt.name).toBe('Custom Test Prompt');
            expect(customPrompt.description).toBe('A custom test prompt');
            expect(customPrompt.category).toBe('testing');
            expect(customPrompt.prompt).toBe('This is a custom prompt content');
            expect(customPrompt.isCustom).toBe(true);
            expect(customPrompt.id).toMatch(/^custom_\d+_[a-z0-9]+$/);
            expect(customPrompt.createdAt).toBeInstanceOf(Date);
        });

        it('should publish event when eventBus is available', () => {
            const promptData = {
                name: 'Custom Test Prompt',
                description: 'A custom test prompt',
                category: 'testing',
                prompt: 'This is a custom prompt content'
            };

            aiPrompts.createCustomPrompt(promptData);

            expect(mockEventBus.publish).toHaveBeenCalledWith('ai-prompt.created', {
                prompt: expect.objectContaining({
                    name: 'Custom Test Prompt',
                    isCustom: true
                }),
                timestamp: expect.any(Date)
            });
        });

        it('should not publish event when eventBus is not available', () => {
            const aiPromptsWithoutEventBus = new AIPrompts();
            const promptData = {
                name: 'Custom Test Prompt',
                description: 'A custom test prompt',
                category: 'testing',
                prompt: 'This is a custom prompt content'
            };

            expect(() => {
                aiPromptsWithoutEventBus.createCustomPrompt(promptData);
            }).not.toThrow();
        });

        it('should generate unique IDs for different prompts', () => {
            const promptData = {
                name: 'Custom Test Prompt',
                description: 'A custom test prompt',
                category: 'testing',
                prompt: 'This is a custom prompt content'
            };

            const prompt1 = aiPrompts.createCustomPrompt(promptData);
            const prompt2 = aiPrompts.createCustomPrompt(promptData);

            expect(prompt1.id).not.toBe(prompt2.id);
        });
    });

    describe('validatePrompt', () => {
        it('should validate correct prompt', () => {
            const validPrompt = {
                name: 'Test Prompt',
                description: 'Test Description',
                category: 'testing',
                prompt: 'Test prompt content'
            };

            const result = aiPrompts.validatePrompt(validPrompt);

            expect(result.isValid).toBe(true);
            expect(result.errors).toEqual([]);
        });

        it('should return error for missing name', () => {
            const invalidPrompt = {
                description: 'Test Description',
                category: 'testing',
                prompt: 'Test prompt content'
            };

            const result = aiPrompts.validatePrompt(invalidPrompt);

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Prompt name is required');
        });

        it('should return error for missing description', () => {
            const invalidPrompt = {
                name: 'Test Prompt',
                category: 'testing',
                prompt: 'Test prompt content'
            };

            const result = aiPrompts.validatePrompt(invalidPrompt);

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Prompt description is required');
        });

        it('should return error for missing category', () => {
            const invalidPrompt = {
                name: 'Test Prompt',
                description: 'Test Description',
                prompt: 'Test prompt content'
            };

            const result = aiPrompts.validatePrompt(invalidPrompt);

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Prompt category is required');
        });

        it('should return error for missing prompt content', () => {
            const invalidPrompt = {
                name: 'Test Prompt',
                description: 'Test Description',
                category: 'testing'
            };

            const result = aiPrompts.validatePrompt(invalidPrompt);

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Prompt content is required');
        });

        it('should return multiple errors for multiple missing fields', () => {
            const invalidPrompt = {
                name: 'Test Prompt'
            };

            const result = aiPrompts.validatePrompt(invalidPrompt);

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Prompt description is required');
            expect(result.errors).toContain('Prompt category is required');
            expect(result.errors).toContain('Prompt content is required');
            expect(result.errors.length).toBe(3);
        });

        it('should handle empty string values', () => {
            const invalidPrompt = {
                name: '',
                description: '',
                category: '',
                prompt: ''
            };

            const result = aiPrompts.validatePrompt(invalidPrompt);

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Prompt name is required');
            expect(result.errors).toContain('Prompt description is required');
            expect(result.errors).toContain('Prompt category is required');
            expect(result.errors).toContain('Prompt content is required');
        });

        it('should handle null values', () => {
            const invalidPrompt = {
                name: null,
                description: null,
                category: null,
                prompt: null
            };

            const result = aiPrompts.validatePrompt(invalidPrompt);

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Prompt name is required');
            expect(result.errors).toContain('Prompt description is required');
            expect(result.errors).toContain('Prompt category is required');
            expect(result.errors).toContain('Prompt content is required');
        });
    });

    describe('edge cases and error handling', () => {
        it('should handle undefined variables in generatePrompt', () => {
            const variables = {
                PROJECT_TYPE: undefined,
                TECH_STACK: null
            };

            const generatedPrompt = aiPrompts.generatePrompt('analysis', 'projectAnalysis', variables);

            // Should handle undefined/null variables gracefully
            expect(generatedPrompt).toContain('undefined');
            expect(generatedPrompt).toContain('null');
            expect(generatedPrompt).toContain('medium'); // default value
        });

        it('should handle empty variables object', () => {
            const generatedPrompt = aiPrompts.generatePrompt('analysis', 'projectAnalysis', {});

            expect(generatedPrompt).toContain('web-application');
            expect(generatedPrompt).toContain('Node.js, React, Express');
            expect(generatedPrompt).toContain('medium');
        });

        it('should handle search with whitespace-only keyword', () => {
            const results = aiPrompts.searchPrompts('   ');

            expect(results).toEqual([]);
        });

        it('should handle search with special characters', () => {
            const results = aiPrompts.searchPrompts('@#$%^&*()');

            expect(results).toEqual([]);
        });

        it('should handle createCustomPrompt with minimal data', () => {
            const promptData = {
                name: 'Minimal',
                description: 'Minimal description',
                category: 'test',
                prompt: 'Minimal content'
            };

            const customPrompt = aiPrompts.createCustomPrompt(promptData);

            expect(customPrompt.name).toBe('Minimal');
            expect(customPrompt.isCustom).toBe(true);
            expect(customPrompt.id).toBeDefined();
        });

        it('should handle validatePrompt with undefined input', () => {
            expect(() => {
                aiPrompts.validatePrompt(undefined);
            }).toThrow();
        });
    });
}); 