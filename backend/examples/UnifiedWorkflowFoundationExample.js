/**
 * Unified Workflow Foundation 1B - Example Usage
 * 
 * This file demonstrates how to use the Unified Workflow Foundation 1B feature,
 * including the builder pattern and common workflow steps.
 */

const UnifiedWorkflowService = require('../domain/services/UnifiedWorkflowService');
const {
  WorkflowBuilder,
  WorkflowStepBuilder,
  WorkflowComposer,
  WorkflowTemplateRegistry,
  StepRegistry
} = require('../domain/workflows');

/**
 * Example class demonstrating Unified Workflow Foundation usage
 */
class UnifiedWorkflowFoundationExample {
  constructor() {
    this.unifiedWorkflowService = new UnifiedWorkflowService({
      logger: console,
      eventBus: {
        emit: (event, data) => console.log(`Event: ${event}`, data)
      }
    });
  }

  /**
   * Example 1: Create a simple analysis workflow using the builder pattern
   */
  async example1_SimpleAnalysisWorkflow() {
    console.log('\n=== Example 1: Simple Analysis Workflow ===');

    // Create analysis workflow using the service
    const analysisWorkflow = this.unifiedWorkflowService.createAnalysisWorkflow({
      analysisType: 'comprehensive',
      includeMetrics: true,
      includeArchitecture: true,
      reportFormat: 'markdown'
    });

    console.log('Created analysis workflow:', analysisWorkflow.getMetadata());

    // Execute the workflow
    const result = await this.unifiedWorkflowService.executeWorkflow(analysisWorkflow, {
      metadata: {
        projectPath: '/path/to/project',
        analysisScope: 'full'
      },
      data: {
        files: ['src/**/*.js'],
        excludePatterns: ['node_modules/**']
      }
    });

    console.log('Analysis workflow result:', result);
  }

  /**
   * Example 2: Create a refactoring workflow using the builder pattern
   */
  async example2_RefactoringWorkflow() {
    console.log('\n=== Example 2: Refactoring Workflow ===');

    // Create refactoring workflow using the service
    const refactoringWorkflow = this.unifiedWorkflowService.createRefactoringWorkflow({
      refactoringType: 'general',
      generateCode: true,
      improveQuality: true,
      maintainTests: true
    });

    console.log('Created refactoring workflow:', refactoringWorkflow.getMetadata());

    // Execute the workflow
    const result = await this.unifiedWorkflowService.executeWorkflow(refactoringWorkflow, {
      metadata: {
        projectPath: '/path/to/project',
        targetFile: 'src/components/UserProfile.js'
      },
      data: {
        refactoringGoals: ['improve readability', 'reduce complexity'],
        preserveBehavior: true
      }
    });

    console.log('Refactoring workflow result:', result);
  }

  /**
   * Example 3: Create a feature development workflow using the builder pattern
   */
  async example3_FeatureWorkflow() {
    console.log('\n=== Example 3: Feature Development Workflow ===');

    // Create feature workflow using the service
    const featureWorkflow = this.unifiedWorkflowService.createFeatureWorkflow({
      featureName: 'User Authentication',
      includeTests: true,
      includeDocumentation: true
    });

    console.log('Created feature workflow:', featureWorkflow.getMetadata());

    // Execute the workflow
    const result = await this.unifiedWorkflowService.executeWorkflow(featureWorkflow, {
      metadata: {
        projectPath: '/path/to/project',
        featureName: 'User Authentication'
      },
      data: {
        requirements: [
          'User login with email/password',
          'JWT token generation',
          'Password reset functionality'
        ],
        targetFramework: 'React'
      }
    });

    console.log('Feature workflow result:', result);
  }

  /**
   * Example 4: Create a custom workflow from step types
   */
  async example4_CustomWorkflow() {
    console.log('\n=== Example 4: Custom Workflow from Step Types ===');

    // Create custom workflow using specific step types
    const customWorkflow = this.unifiedWorkflowService.createCustomWorkflow(
      ['analysis', 'refactoring', 'testing', 'documentation'],
      {
        name: 'Custom Code Improvement Workflow',
        description: 'Custom workflow for code improvement',
        analysis: {
          type: 'code-analysis',
          includeMetrics: true
        },
        refactoring: {
          type: 'general',
          improveQuality: true
        },
        testing: {
          runTests: true,
          validateCoverage: true
        },
        documentation: {
          generateDocs: true,
          format: 'markdown'
        }
      }
    );

    console.log('Created custom workflow:', customWorkflow.getMetadata());

    // Execute the workflow
    const result = await this.unifiedWorkflowService.executeWorkflow(customWorkflow, {
      metadata: {
        projectPath: '/path/to/project'
      },
      data: {
        improvementGoals: ['better performance', 'cleaner code']
      }
    });

    console.log('Custom workflow result:', result);
  }

  /**
   * Example 5: Create workflow from template
   */
  async example5_TemplateWorkflow() {
    console.log('\n=== Example 5: Workflow from Template ===');

    // Get available templates
    const availableTemplates = this.unifiedWorkflowService.getAvailableTemplates();
    console.log('Available templates:', availableTemplates.map(t => t.name));

    // Create workflow from template
    const templateWorkflow = this.unifiedWorkflowService.createFromTemplate('testing', {
      runTests: true,
      generateTests: true,
      validateCoverage: true,
      fixFailingTests: true
    });

    console.log('Created template workflow:', templateWorkflow.getMetadata());

    // Execute the workflow
    const result = await this.unifiedWorkflowService.executeWorkflow(templateWorkflow, {
      metadata: {
        projectPath: '/path/to/project'
      },
      data: {
        testFramework: 'Jest',
        coverageThreshold: 80
      }
    });

    console.log('Template workflow result:', result);
  }

  /**
   * Example 6: Direct builder pattern usage
   */
  async example6_DirectBuilderUsage() {
    console.log('\n=== Example 6: Direct Builder Pattern Usage ===');

    // Create workflow using WorkflowBuilder directly
    const workflow = new WorkflowBuilder()
      .setMetadata({
        name: 'Direct Builder Example',
        description: 'Workflow created using WorkflowBuilder directly',
        type: 'custom',
        version: '1.0.0'
      })
      .addStep(
        WorkflowStepBuilder.analysis({
          type: 'performance-analysis',
          includeMetrics: true
        }).build()
      )
      .addStep(
        WorkflowStepBuilder.optimization({
          type: 'performance-optimization',
          improveSpeed: true,
          reduceMemory: true
        }).build()
      )
      .addStep(
        WorkflowStepBuilder.validation({
          validatePerformance: true,
          checkMetrics: true
        }).build()
      )
      .build();

    console.log('Created workflow with direct builder:', workflow.getMetadata());

    // Execute the workflow
    const result = await this.unifiedWorkflowService.executeWorkflow(workflow, {
      metadata: {
        projectPath: '/path/to/project'
      },
      data: {
        performanceTargets: {
          loadTime: '< 2s',
          memoryUsage: '< 100MB'
        }
      }
    });

    console.log('Direct builder workflow result:', result);
  }

  /**
   * Example 7: Workflow composer usage
   */
  async example7_ComposerUsage() {
    console.log('\n=== Example 7: Workflow Composer Usage ===');

    // Create workflow using WorkflowComposer
    const composer = new WorkflowComposer();
    const composedWorkflow = composer.composeSecurityWorkflow({
      securityScan: true,
      vulnerabilityCheck: true,
      complianceCheck: true
    });

    console.log('Created composed workflow:', composedWorkflow.getMetadata());

    // Execute the workflow
    const result = await this.unifiedWorkflowService.executeWorkflow(composedWorkflow, {
      metadata: {
        projectPath: '/path/to/project'
      },
      data: {
        securityStandards: ['OWASP', 'CWE'],
        complianceFrameworks: ['SOC2', 'GDPR']
      }
    });

    console.log('Composed workflow result:', result);
  }

  /**
   * Example 8: Step registry usage
   */
  async example8_StepRegistryUsage() {
    console.log('\n=== Example 8: Step Registry Usage ===');

    // Get available step types
    const availableSteps = this.unifiedWorkflowService.getAvailableStepTypes();
    console.log('Available step types:', availableSteps);

    // Get step templates
    const stepTemplates = this.unifiedWorkflowService.getStepTemplates();
    console.log('Available step templates:', stepTemplates);

    // Create step using registry
    const analysisStep = this.unifiedWorkflowService.getStepRegistry().createStep('analysis', {
      type: 'comprehensive',
      includeMetrics: true
    });

    console.log('Created analysis step:', analysisStep.getMetadata());

    // Create workflow with registry step
    const workflow = new WorkflowBuilder()
      .setMetadata({
        name: 'Registry Step Example',
        description: 'Workflow using step from registry',
        type: 'custom',
        version: '1.0.0'
      })
      .addStep(analysisStep)
      .build();

    console.log('Created workflow with registry step:', workflow.getMetadata());
  }

  /**
   * Example 9: Template registry usage
   */
  async example9_TemplateRegistryUsage() {
    console.log('\n=== Example 9: Template Registry Usage ===');

    // Get available templates
    const availableTemplates = this.unifiedWorkflowService.getAvailableTemplates();
    console.log('Available workflow templates:', availableTemplates);

    // Validate template
    const validationResult = this.unifiedWorkflowService.validateTemplate('analysis');
    console.log('Template validation result:', validationResult);

    // Register custom template
    this.unifiedWorkflowService.registerTemplate('custom-analysis', (builder, options = {}) => {
      return builder
        .setMetadata({
          name: 'Custom Analysis',
          description: 'Custom analysis workflow template',
          type: 'analysis',
          version: '1.0.0'
        })
        .addStep(
          WorkflowStepBuilder.analysis({
            type: 'custom-analysis',
            includeCustomMetrics: true
          }).build()
        )
        .build();
    });

    console.log('Registered custom template');

    // Create workflow from custom template
    const customWorkflow = this.unifiedWorkflowService.createFromTemplate('custom-analysis', {
      includeCustomMetrics: true
    });

    console.log('Created workflow from custom template:', customWorkflow.getMetadata());
  }

  /**
   * Example 10: Complete workflow lifecycle
   */
  async example10_CompleteWorkflowLifecycle() {
    console.log('\n=== Example 10: Complete Workflow Lifecycle ===');

    // Step 1: Create workflow
    const workflow = this.unifiedWorkflowService.createRefactoringWorkflow({
      refactoringType: 'general',
      generateCode: true,
      improveQuality: true,
      maintainTests: true
    });

    console.log('Step 1: Created workflow');

    // Step 2: Validate workflow
    const context = this.unifiedWorkflowService.createContext({
      metadata: {
        projectPath: '/path/to/project'
      },
      data: {
        targetFiles: ['src/components/**/*.js']
      }
    });

    const validationResult = await workflow.validate(context);
    console.log('Step 2: Validation result:', validationResult.isValid);

    // Step 3: Execute workflow
    const executionResult = await this.unifiedWorkflowService.executeWorkflow(workflow, {
      metadata: {
        projectPath: '/path/to/project'
      },
      data: {
        refactoringGoals: ['improve readability', 'reduce complexity']
      }
    });

    console.log('Step 3: Execution completed:', executionResult.success);

    // Step 4: Get workflow metadata
    const metadata = workflow.getMetadata();
    console.log('Step 4: Workflow metadata:', metadata);

    // Step 5: Get workflow steps
    const steps = workflow.getSteps();
    console.log('Step 5: Workflow steps count:', steps.length);
  }

  /**
   * Run all examples
   */
  async runAllExamples() {
    console.log('🚀 Starting Unified Workflow Foundation 1B Examples\n');

    try {
      await this.example1_SimpleAnalysisWorkflow();
      await this.example2_RefactoringWorkflow();
      await this.example3_FeatureWorkflow();
      await this.example4_CustomWorkflow();
      await this.example5_TemplateWorkflow();
      await this.example6_DirectBuilderUsage();
      await this.example7_ComposerUsage();
      await this.example8_StepRegistryUsage();
      await this.example9_TemplateRegistryUsage();
      await this.example10_CompleteWorkflowLifecycle();

      console.log('\n✅ All examples completed successfully!');
    } catch (error) {
      console.error('\n❌ Example failed:', error.message);
    }
  }
}

// Export the example class
module.exports = UnifiedWorkflowFoundationExample;

// Run examples if this file is executed directly
if (require.main === module) {
  const example = new UnifiedWorkflowFoundationExample();
  example.runAllExamples().catch(console.error);
} 