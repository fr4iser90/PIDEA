const FrameworkRegistry = require('@frameworks/FrameworkRegistry');
const WorkflowRegistry = require('@workflows/WorkflowRegistry');
const DocumentationWorkflow = require('@workflows/categories/documentation/DocumentationWorkflow');
const Logger = require('@logging/Logger');
const ServiceLogger = require('@logging/ServiceLogger');
const logger = new ServiceLogger('AnalyzeAllController');


class AnalyzeAllController {
  constructor() {
    this.name = 'AnalyzeAllController';
    this.description = 'Controller for comprehensive analysis using all available frameworks and workflows';
  }

  async analyzeAll(req, res) {
    try {
      logger.info('🚀 Starting comprehensive analysis for project');
      
      const { projectPath, options = {} } = req.body;
      
      if (!projectPath) {
        return res.status(400).json({
          success: false,
          error: 'Project path is required'
        });
      }

      // Get all available frameworks
      const frameworks = await this.getAllFrameworks();
      
      // Get all available workflows
      const workflows = await this.getAllWorkflows();
      
      // Execute all frameworks
      const frameworkResults = await this.executeAllFrameworks(frameworks, projectPath, options);
      
      // Execute all workflows
      const workflowResults = await this.executeAllWorkflows(workflows, projectPath, options);
      
      // Execute documentation workflow specifically
      const documentationResult = await this.executeDocumentationWorkflow(projectPath, options);
      
      // Compile comprehensive results
      const comprehensiveResults = this.compileResults({
        frameworks: frameworkResults,
        workflows: workflowResults,
        documentation: documentationResult
      });
      
      logger.info('✅ Comprehensive analysis completed');
      
      return res.status(200).json({
        success: true,
        message: 'Comprehensive analysis completed successfully',
        results: comprehensiveResults,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      logger.error('❌ Analyze All failed:', error.message);
      return res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  async getAllFrameworks() {
    try {
      const categories = ['analysis', 'testing', 'refactoring', 'deployment'];
      const frameworks = [];
      
      for (const category of categories) {
        const categoryFrameworks = await FrameworkRegistry.getByCategory(category);
        frameworks.push(...categoryFrameworks);
      }
      
      return frameworks;
    } catch (error) {
      logger.warn('⚠️ Could not retrieve all frameworks:', error.message);
      return [];
    }
  }

  async getAllWorkflows() {
    try {
      const categories = ['analysis', 'testing', 'refactoring', 'documentation'];
      const workflows = [];
      
      for (const category of categories) {
        const categoryWorkflows = await WorkflowRegistry.getByCategory(category);
        workflows.push(...categoryWorkflows);
      }
      
      return workflows;
    } catch (error) {
      logger.warn('⚠️ Could not retrieve all workflows:', error.message);
      return [];
    }
  }

  async executeAllFrameworks(frameworks, projectPath, options) {
    const results = [];
    
    for (const framework of frameworks) {
      try {
        logger.info(`🔧 Executing framework: ${framework.name} for project`);
        
        const result = await framework.execute({
          projectPath,
          ...options,
          analyzeAll: true
        });
        
        results.push({
          framework: framework.name,
          category: framework.category,
          success: result.success,
          results: result.results,
          error: result.error,
          timestamp: result.timestamp
        });
        
        logger.info(`✅ Framework ${framework.name} completed successfully`);
      } catch (error) {
        logger.error(`❌ Framework ${framework.name} failed:`, error.message);
        results.push({
          framework: framework.name,
          category: framework.category,
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    return results;
  }

  async executeAllWorkflows(workflows, projectPath, options) {
    const results = [];
    
    for (const workflow of workflows) {
      try {
        logger.info(`🔄 Executing workflow: ${workflow.name} for project`);
        
        const result = await workflow.execute({
          projectPath,
          ...options,
          analyzeAll: true
        });
        
        results.push({
          workflow: workflow.name,
          category: workflow.category,
          success: result.success,
          results: result.results,
          error: result.error,
          timestamp: result.timestamp
        });
        
        logger.info(`✅ Workflow ${workflow.name} completed successfully`);
      } catch (error) {
        logger.error(`❌ Workflow ${workflow.name} failed:`, error.message);
        results.push({
          workflow: workflow.name,
          category: workflow.category,
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    return results;
  }

  async executeDocumentationWorkflow(projectPath, options) {
    try {
      logger.info('📚 Executing documentation workflow for project');
      
      const result = await DocumentationWorkflow.executeForAnalyzeAll({
        projectPath,
        ...options,
        useFramework: true,
        generateComprehensiveDocs: true
      });
      
      return {
        workflow: 'DocumentationWorkflow',
        category: 'documentation',
        success: result.success,
        results: result.results,
        error: result.error,
        timestamp: result.timestamp
      };
    } catch (error) {
      logger.error('❌ Documentation workflow failed:', error.message);
      return {
        workflow: 'DocumentationWorkflow',
        category: 'documentation',
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  compileResults(allResults) {
    const { frameworks, workflows, documentation } = allResults;
    
    // Calculate overall statistics
    const totalExecutions = frameworks.length + workflows.length + 1; // +1 for documentation
    const successfulExecutions = frameworks.filter(f => f.success).length + 
                                workflows.filter(w => w.success).length + 
                                (documentation.success ? 1 : 0);
    
    const successRate = (successfulExecutions / totalExecutions) * 100;
    
    // Compile by category
    const resultsByCategory = {
      analysis: {
        frameworks: frameworks.filter(f => f.category === 'analysis'),
        workflows: workflows.filter(w => w.category === 'analysis')
      },
      testing: {
        frameworks: frameworks.filter(f => f.category === 'testing'),
        workflows: workflows.filter(w => w.category === 'testing')
      },
      refactoring: {
        frameworks: frameworks.filter(f => f.category === 'refactoring'),
        workflows: workflows.filter(w => w.category === 'refactoring')
      },
      documentation: {
        workflows: [documentation]
      },
      deployment: {
        frameworks: frameworks.filter(f => f.category === 'deployment')
      }
    };
    
    // Generate summary
    const summary = {
      totalExecutions,
      successfulExecutions,
      failedExecutions: totalExecutions - successfulExecutions,
      successRate: Math.round(successRate * 100) / 100,
      categories: Object.keys(resultsByCategory),
      executionTime: new Date().toISOString()
    };
    
    return {
      summary,
      resultsByCategory,
      allResults: {
        frameworks,
        workflows,
        documentation
      }
    };
  }

  // API endpoint for getting available frameworks
  async getAvailableFrameworks(req, res) {
    try {
      const frameworks = await this.getAllFrameworks();
      
      return res.status(200).json({
        success: true,
        frameworks,
        count: frameworks.length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  // API endpoint for getting available workflows
  async getAvailableWorkflows(req, res) {
    try {
      const workflows = await this.getAllWorkflows();
      
      return res.status(200).json({
        success: true,
        workflows,
        count: workflows.length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
}

module.exports = AnalyzeAllController; 