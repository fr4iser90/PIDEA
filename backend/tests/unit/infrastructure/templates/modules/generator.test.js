/**
 * TemplateGenerator Unit Tests
 * Coverage target: 80%
 */

const TemplateGenerator = require('@templates/modules/generator');

// Mock the validation module
jest.mock('@/infrastructure/templates/modules/validation', () => ({
    validateTemplate: jest.fn(),
    validateVariables: jest.fn()
}));

const TemplateValidator = require('@templates/modules/validation');

describe('TemplateGenerator', () => {
    let mockEventBus;

    beforeEach(() => {
        mockEventBus = {
            publish: jest.fn()
        };

        // Reset all mocks
        jest.clearAllMocks();
    });

    describe('generateScript', () => {
        const validTemplate = {
            name: 'Test Template',
            description: 'A test template',
            category: 'test',
            template: 'echo "Hello {{NAME}}" and {{GREETING}}',
            variables: { GREETING: 'Welcome' }
        };

        it('should generate script with provided variables', () => {
            // Mock validation to pass
            TemplateValidator.validateTemplate.mockReturnValue({ isValid: true, errors: [] });
            TemplateValidator.validateVariables.mockReturnValue({ isValid: true, errors: [] });

            const variables = { NAME: 'World' };
            const result = TemplateGenerator.generateScript(validTemplate, variables);

            expect(result).toBe('echo "Hello World" and Welcome');
            expect(TemplateValidator.validateTemplate).toHaveBeenCalledWith(validTemplate);
            expect(TemplateValidator.validateVariables).toHaveBeenCalledWith(variables);
        });

        it('should generate script with default variables when not provided', () => {
            // Mock validation to pass
            TemplateValidator.validateTemplate.mockReturnValue({ isValid: true, errors: [] });
            TemplateValidator.validateVariables.mockReturnValue({ isValid: true, errors: [] });

            const template = {
                ...validTemplate,
                template: 'echo "Hello {{NAME}}" and {{GREETING}}"',
                variables: { NAME: 'Default', GREETING: 'Welcome' }
            };

            const result = TemplateGenerator.generateScript(template, { NAME: 'World' });

            expect(result).toBe('echo "Hello World" and Welcome"');
        });

        it('should generate script with only default variables', () => {
            // Mock validation to pass
            TemplateValidator.validateTemplate.mockReturnValue({ isValid: true, errors: [] });
            TemplateValidator.validateVariables.mockReturnValue({ isValid: true, errors: [] });

            const template = {
                ...validTemplate,
                template: 'echo "Hello {{NAME}}" and {{GREETING}}"',
                variables: { NAME: 'Default', GREETING: 'Welcome' }
            };

            const result = TemplateGenerator.generateScript(template, {});

            expect(result).toBe('echo "Hello Default" and Welcome"');
        });

        it('should handle template without variables', () => {
            // Mock validation to pass
            TemplateValidator.validateTemplate.mockReturnValue({ isValid: true, errors: [] });
            TemplateValidator.validateVariables.mockReturnValue({ isValid: true, errors: [] });

            const template = {
                ...validTemplate,
                template: 'echo "Hello World"'
            };

            const result = TemplateGenerator.generateScript(template, {});

            expect(result).toBe('echo "Hello World"');
        });

        it('should handle template with undefined variables', () => {
            // Mock validation to pass
            TemplateValidator.validateTemplate.mockReturnValue({ isValid: true, errors: [] });
            TemplateValidator.validateVariables.mockReturnValue({ isValid: true, errors: [] });

            const template = {
                ...validTemplate,
                template: 'echo "Hello {{NAME}}" and {{GREETING}}"',
                variables: { NAME: 'Default', GREETING: 'Welcome' }
            };

            const result = TemplateGenerator.generateScript(template, undefined);

            expect(result).toBe('echo "Hello Default" and Welcome"');
        });

        it('should handle template with null variables', () => {
            // Mock validation to pass
            TemplateValidator.validateTemplate.mockReturnValue({ isValid: true, errors: [] });
            TemplateValidator.validateVariables.mockReturnValue({ isValid: true, errors: [] });

            const template = {
                ...validTemplate,
                template: 'echo "Hello {{NAME}}" and {{GREETING}}"',
                variables: { NAME: 'Default', GREETING: 'Welcome' }
            };

            const result = TemplateGenerator.generateScript(template, null);

            expect(result).toBe('echo "Hello Default" and Welcome"');
        });

        it('should handle multiple occurrences of the same placeholder', () => {
            // Mock validation to pass
            TemplateValidator.validateTemplate.mockReturnValue({ isValid: true, errors: [] });
            TemplateValidator.validateVariables.mockReturnValue({ isValid: true, errors: [] });

            const template = {
                ...validTemplate,
                template: 'echo "{{NAME}} says {{NAME}} says {{NAME}}"'
            };

            const result = TemplateGenerator.generateScript(template, { NAME: 'John' });

            expect(result).toBe('echo "John says John says John"');
        });

        it('should handle non-string variable values', () => {
            // Mock validation to pass
            TemplateValidator.validateTemplate.mockReturnValue({ isValid: true, errors: [] });
            TemplateValidator.validateVariables.mockReturnValue({ isValid: true, errors: [] });

            const template = {
                ...validTemplate,
                template: 'echo "Number: {{NUM}}, Boolean: {{BOOL}}"'
            };

            const result = TemplateGenerator.generateScript(template, { NUM: 42, BOOL: true });

            expect(result).toBe('echo "Number: 42, Boolean: true"');
        });

        it('should throw error when template validation fails', () => {
            // Mock validation to fail
            TemplateValidator.validateTemplate.mockReturnValue({ 
                isValid: false, 
                errors: ['Template name is required'] 
            });

            expect(() => {
                TemplateGenerator.generateScript(validTemplate, {});
            }).toThrow('Invalid template: Template name is required');
        });

        it('should throw error when variables validation fails', () => {
            // Mock template validation to pass, variables validation to fail
            TemplateValidator.validateTemplate.mockReturnValue({ isValid: true, errors: [] });
            TemplateValidator.validateVariables.mockReturnValue({ 
                isValid: false, 
                errors: ['Variables must be an object'] 
            });

            expect(() => {
                TemplateGenerator.generateScript(validTemplate, 'invalid');
            }).toThrow('Invalid variables: Variables must be an object');
        });
    });

    describe('createCustomTemplate', () => {
        const validTemplate = {
            name: 'Custom Template',
            description: 'A custom template',
            category: 'test',
            template: 'echo "Hello {{NAME}}"'
        };

        it('should create custom template with valid template', () => {
            // Mock validation to pass
            TemplateValidator.validateTemplate.mockReturnValue({ isValid: true, errors: [] });

            const result = TemplateGenerator.createCustomTemplate(validTemplate, mockEventBus);

            expect(result).toMatchObject({
                name: 'Custom Template',
                description: 'A custom template',
                category: 'test',
                template: 'echo "Hello {{NAME}}"',
                isCustom: true
            });
            expect(result.id).toMatch(/^custom_\d+_[a-z0-9]+$/);
            expect(result.createdAt).toBeInstanceOf(Date);
            expect(TemplateValidator.validateTemplate).toHaveBeenCalledWith(validTemplate);
        });

        it('should create custom template without eventBus', () => {
            // Mock validation to pass
            TemplateValidator.validateTemplate.mockReturnValue({ isValid: true, errors: [] });

            const result = TemplateGenerator.createCustomTemplate(validTemplate);

            expect(result).toMatchObject({
                name: 'Custom Template',
                isCustom: true
            });
            expect(result.id).toMatch(/^custom_\d+_[a-z0-9]+$/);
            expect(result.createdAt).toBeInstanceOf(Date);
        });

        it('should create custom template with null eventBus', () => {
            // Mock validation to pass
            TemplateValidator.validateTemplate.mockReturnValue({ isValid: true, errors: [] });

            const result = TemplateGenerator.createCustomTemplate(validTemplate, null);

            expect(result).toMatchObject({
                name: 'Custom Template',
                isCustom: true
            });
            expect(result.id).toMatch(/^custom_\d+_[a-z0-9]+$/);
            expect(result.createdAt).toBeInstanceOf(Date);
        });

        it('should create custom template with eventBus that has no publish method', () => {
            // Mock validation to pass
            TemplateValidator.validateTemplate.mockReturnValue({ isValid: true, errors: [] });

            const invalidEventBus = { someOtherMethod: jest.fn() };

            const result = TemplateGenerator.createCustomTemplate(validTemplate, invalidEventBus);

            expect(result).toMatchObject({
                name: 'Custom Template',
                isCustom: true
            });
            expect(result.id).toMatch(/^custom_\d+_[a-z0-9]+$/);
            expect(result.createdAt).toBeInstanceOf(Date);
        });

        it('should emit event when eventBus is available', () => {
            // Mock validation to pass
            TemplateValidator.validateTemplate.mockReturnValue({ isValid: true, errors: [] });

            const result = TemplateGenerator.createCustomTemplate(validTemplate, mockEventBus);

            expect(mockEventBus.publish).toHaveBeenCalledWith('script-template.created', {
                template: result,
                timestamp: expect.any(Date)
            });
        });

        it('should throw error when template validation fails', () => {
            // Mock validation to fail
            TemplateValidator.validateTemplate.mockReturnValue({ 
                isValid: false, 
                errors: ['Template name is required'] 
            });

            expect(() => {
                TemplateGenerator.createCustomTemplate(validTemplate, mockEventBus);
            }).toThrow('Invalid template: Template name is required');
        });

        it('should preserve original template properties', () => {
            // Mock validation to pass
            TemplateValidator.validateTemplate.mockReturnValue({ isValid: true, errors: [] });

            const templateWithExtraProps = {
                ...validTemplate,
                extraProp: 'extra value',
                nestedProp: { key: 'value' }
            };

            const result = TemplateGenerator.createCustomTemplate(templateWithExtraProps, mockEventBus);

            expect(result.extraProp).toBe('extra value');
            expect(result.nestedProp).toEqual({ key: 'value' });
            expect(result.isCustom).toBe(true);
        });
    });

    describe('processVariables', () => {
        const templateWithDefaults = {
            name: 'Test Template',
            description: 'A test template',
            category: 'test',
            template: 'echo "Hello {{NAME}} and {{GREETING}}"',
            variables: { 
                NAME: 'Default Name',
                GREETING: 'Welcome',
                UNUSED: 'Not Used'
            }
        };

        it('should merge user variables with template defaults', () => {
            const userVariables = { NAME: 'John' };
            const result = TemplateGenerator.processVariables(templateWithDefaults, userVariables);

            expect(result).toEqual({
                NAME: 'John',
                GREETING: 'Welcome',
                UNUSED: 'Not Used'
            });
        });

        it('should use all template defaults when no user variables provided', () => {
            const result = TemplateGenerator.processVariables(templateWithDefaults, {});

            expect(result).toEqual({
                NAME: 'Default Name',
                GREETING: 'Welcome',
                UNUSED: 'Not Used'
            });
        });

        it('should use all template defaults when user variables is undefined', () => {
            const result = TemplateGenerator.processVariables(templateWithDefaults, undefined);

            expect(result).toEqual({
                NAME: 'Default Name',
                GREETING: 'Welcome',
                UNUSED: 'Not Used'
            });
        });

        it('should use all template defaults when user variables is null', () => {
            const result = TemplateGenerator.processVariables(templateWithDefaults, null);

            expect(result).toEqual({
                NAME: 'Default Name',
                GREETING: 'Welcome',
                UNUSED: 'Not Used'
            });
        });

        it('should handle template without variables', () => {
            const templateWithoutDefaults = {
                name: 'Test Template',
                description: 'A test template',
                category: 'test',
                template: 'echo "Hello World"'
            };

            const userVariables = { NAME: 'John' };
            const result = TemplateGenerator.processVariables(templateWithoutDefaults, userVariables);

            expect(result).toEqual({ NAME: 'John' });
        });

        it('should handle template with undefined variables', () => {
            const templateWithUndefinedVars = {
                name: 'Test Template',
                description: 'A test template',
                category: 'test',
                template: 'echo "Hello World"',
                variables: undefined
            };

            const userVariables = { NAME: 'John' };
            const result = TemplateGenerator.processVariables(templateWithUndefinedVars, userVariables);

            expect(result).toEqual({ NAME: 'John' });
        });

        it('should handle template with null variables', () => {
            const templateWithNullVars = {
                name: 'Test Template',
                description: 'A test template',
                category: 'test',
                template: 'echo "Hello World"',
                variables: null
            };

            const userVariables = { NAME: 'John' };
            const result = TemplateGenerator.processVariables(templateWithNullVars, userVariables);

            expect(result).toEqual({ NAME: 'John' });
        });

        it('should not override user variables with template defaults', () => {
            const userVariables = { 
                NAME: 'John',
                GREETING: 'Hello',
                EXTRA: 'Extra Value'
            };
            const result = TemplateGenerator.processVariables(templateWithDefaults, userVariables);

            expect(result).toEqual({
                NAME: 'John',
                GREETING: 'Hello',
                UNUSED: 'Not Used',
                EXTRA: 'Extra Value'
            });
        });

        it('should handle empty user variables object', () => {
            const result = TemplateGenerator.processVariables(templateWithDefaults, {});

            expect(result).toEqual({
                NAME: 'Default Name',
                GREETING: 'Welcome',
                UNUSED: 'Not Used'
            });
        });

        it('should create a new object and not mutate input', () => {
            const userVariables = { NAME: 'John' };
            const originalUserVars = { ...userVariables };
            const originalTemplateVars = { ...templateWithDefaults.variables };

            const result = TemplateGenerator.processVariables(templateWithDefaults, userVariables);

            expect(result).not.toBe(userVariables);
            expect(result).not.toBe(templateWithDefaults.variables);
            expect(userVariables).toEqual(originalUserVars);
            expect(templateWithDefaults.variables).toEqual(originalTemplateVars);
        });
    });
}); 