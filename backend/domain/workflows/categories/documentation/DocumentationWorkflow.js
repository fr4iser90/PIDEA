const BaseWorkflowStep = require('@workflows/BaseWorkflowStep');
const StepRegistry = require('@steps/StepRegistry');
const FrameworkRegistry = require('@frameworks/FrameworkRegistry');

class DocumentationWorkflow extends BaseWorkflowStep {
  constructor() {
    super();
    this.name = 'DocumentationWorkflow';
    this.description = 'Comprehensive documentation generation and validation workflow';
    this.category = 'documentation';
    this.steps = [
      'generate_api_docs',
      'create_user_guides',
      'validate_documentation',
      'update_readme'
    ];
  }

  static getConfig() {
    return {
      name: 'DocumentationWorkflow',
      description: 'Comprehensive documentation generation and validation workflow',
      category: 'documentation',
      steps: [
        {
          name: 'generate_api_docs',
          description: 'Generate comprehensive API documentation',
          step: 'generate_api_docs',
          category: 'documentation',
          required: true
        },
        {
          name: 'create_user_guides',
          description: 'Create user guides and tutorials',
          step: 'create_user_guides',
          category: 'documentation',
          required: true
        },
        {
          name: 'validate_documentation',
          description: 'Validate documentation quality and completeness',
          step: 'validate_documentation',
          category: 'documentation',
          required: true
        },
        {
          name: 'update_readme',
          description: 'Update README files with latest information',
          step: 'update_readme',
          category: 'documentation',
          required: false
        }
      ],
      settings: {
        parallelExecution: true,
        failOnFirstError: false,
        timeout: 600000,
        retryAttempts: 2
      },
      validation: {
        requiredSteps: ['generate_api_docs', 'create_user_guides'],
        minDocumentationCoverage: 90,
        maxGenerationTime: 600
      }
    };
  }

  async execute(context = {}) {
    const config = DocumentationWorkflow.getConfig();
    
    try {
      console.log(`🚀 Executing ${this.name}...`);
      
      // Validate context
      this.validateContext(context);
      
      // Load documentation framework if specified
      if (context.useFramework) {
        await this.loadDocumentationFramework(context);
      }
      
      // Initialize workflow state
      const workflowState = {
        startTime: new Date(),
        results: {},
        errors: [],
        warnings: [],
        documentationGenerated: [],
        apiDocsGenerated: false,
        userGuidesCreated: false
      };
      
      // Execute steps
      const { parallelExecution = true } = config.settings;
      
      if (parallelExecution) {
        await this.executeStepsParallel(config.steps, context, workflowState);
      } else {
        await this.executeStepsSequential(config.steps, context, workflowState);
      }
      
      // Validate overall results
      const validation = await this.validateWorkflowResults(workflowState);
      
      workflowState.endTime = new Date();
      workflowState.duration = workflowState.endTime - workflowState.startTime;
      workflowState.validation = validation;
      
      console.log(`✅ ${this.name} completed successfully`);
      return {
        success: validation.overallSuccess,
        workflow: this.name,
        results: workflowState,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`❌ ${this.name} failed:`, error.message);
      return {
        success: false,
        workflow: this.name,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  async loadDocumentationFramework(context) {
    try {
      const framework = await FrameworkRegistry.get('DocumentationFramework', 'documentation');
      if (framework) {
        context.framework = framework;
        console.log('📚 Documentation framework loaded successfully');
      }
    } catch (error) {
      console.warn('⚠️ Could not load documentation framework, proceeding without it');
    }
  }

  async executeStepsSequential(steps, context, workflowState) {
    for (const stepConfig of steps) {
      try {
        console.log(`📋 Executing step: ${stepConfig.name}`);
        
        const step = await StepRegistry.get(stepConfig.step, stepConfig.category);
        const stepResult = await step.execute({
          ...context,
          workflowState
        });
        
        workflowState.results[stepConfig.name] = stepResult;
        
        // Track specific documentation generation
        if (stepConfig.name === 'generate_api_docs' && stepResult.success) {
          workflowState.apiDocsGenerated = true;
        }
        if (stepConfig.name === 'create_user_guides' && stepResult.success) {
          workflowState.userGuidesCreated = true;
        }
        
        if (!stepResult.success && stepConfig.required) {
          throw new Error(`Required step ${stepConfig.name} failed: ${stepResult.error}`);
        }
        
        console.log(`✅ Step ${stepConfig.name} completed`);
      } catch (error) {
        console.error(`❌ Step ${stepConfig.name} failed:`, error.message);
        workflowState.errors.push({
          step: stepConfig.name,
          error: error.message
        });
        
        if (stepConfig.required) {
          throw error;
        }
      }
    }
  }

  async executeStepsParallel(steps, context, workflowState) {
    const stepPromises = steps.map(async (stepConfig) => {
      try {
        console.log(`📋 Executing step: ${stepConfig.name}`);
        
        const step = await StepRegistry.get(stepConfig.step, stepConfig.category);
        const stepResult = await step.execute({
          ...context,
          workflowState
        });
        
        return {
          step: stepConfig.name,
          result: stepResult,
          success: stepResult.success
        };
      } catch (error) {
        console.error(`❌ Step ${stepConfig.name} failed:`, error.message);
        return {
          step: stepConfig.name,
          result: { success: false, error: error.message },
          success: false
        };
      }
    });
    
    const stepResults = await Promise.all(stepPromises);
    
    // Process results
    stepResults.forEach(({ step, result }) => {
      workflowState.results[step] = result;
      
      // Track specific documentation generation
      if (step === 'generate_api_docs' && result.success) {
        workflowState.apiDocsGenerated = true;
      }
      if (step === 'create_user_guides' && result.success) {
        workflowState.userGuidesCreated = true;
      }
      
      if (!result.success) {
        workflowState.errors.push({
          step,
          error: result.error
        });
      }
    });
  }

  async validateWorkflowResults(workflowState) {
    const { validation } = DocumentationWorkflow.getConfig();
    const { minDocumentationCoverage = 90, maxGenerationTime = 600 } = validation;
    
    const validationResults = {
      stepsCompleted: Object.keys(workflowState.results).length,
      totalSteps: DocumentationWorkflow.getConfig().steps.length,
      errors: workflowState.errors.length,
      warnings: workflowState.warnings.length,
      apiDocsGenerated: workflowState.apiDocsGenerated,
      userGuidesCreated: workflowState.userGuidesCreated,
      coverageMet: false,
      performanceMet: false,
      overallSuccess: false
    };
    
    // Check documentation coverage
    const coverageResult = workflowState.results.validate_documentation;
    if (coverageResult && coverageResult.success) {
      validationResults.coverageMet = coverageResult.results.coverage >= minDocumentationCoverage;
    }
    
    // Check performance
    validationResults.performanceMet = workflowState.duration <= maxGenerationTime * 1000;
    
    // Overall success
    validationResults.overallSuccess = 
      validationResults.errors === 0 && 
      validationResults.apiDocsGenerated && 
      validationResults.userGuidesCreated &&
      validationResults.coverageMet;
    
    return validationResults;
  }

  validateContext(context) {
    const required = ['projectPath'];
    const missing = required.filter(key => !context[key]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required context: ${missing.join(', ')}`);
    }
    
    return true;
  }

  // Frontend "Analyze All" Integration
  static async executeForAnalyzeAll(context = {}) {
    const workflow = new DocumentationWorkflow();
    
    // Add analyze all specific context
    const analyzeAllContext = {
      ...context,
      analyzeAll: true,
      includeAllFrameworks: true,
      generateComprehensiveDocs: true
    };
    
    return await workflow.execute(analyzeAllContext);
  }
}

module.exports = DocumentationWorkflow; 