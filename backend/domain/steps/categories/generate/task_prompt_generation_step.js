
// Dynamic path resolution functions
function getTaskDocumentationPath(task) {
  const { status, priority, category, completedAt } = task;
  
  if (status === 'completed') {
    const quarter = getCompletionQuarter(completedAt);
    return `docs/09_roadmap/completed/${quarter}/${category}/`;
  } else if (status === 'in_progress') {
    return `docs/09_roadmap/in-progress/${category}/`;
  } else if (status === 'pending') {
    return `docs/09_roadmap/pending/${priority}/${category}/`;
  } else if (status === 'blocked') {
    return `docs/09_roadmap/blocked/${category}/`;
  } else if (status === 'cancelled') {
    return `docs/09_roadmap/cancelled/${category}/`;
  }
  
  return `docs/09_roadmap/pending/${priority}/${category}/`;
}

function getCompletionQuarter(completedAt) {
  if (!completedAt) {
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    
    if (month <= 3) return `${year}-q1`;
    if (month <= 6) return `${year}-q2`;
    if (month <= 9) return `${year}-q3`;
    return `${year}-q4`;
  }
  
  const date = new Date(completedAt);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  
  if (month <= 3) return `${year}-q1`;
  if (month <= 6) return `${year}-q2`;
  if (month <= 9) return `${year}-q3`;
  return `${year}-q4`;
}

function getPromptPath(promptType) {
  const promptPaths = {
    'task-create': 'content-library/prompts/task-management/task-create.md',
    'task-execute': 'content-library/prompts/task-management/task-execute.md',
    'task-analyze': 'content-library/prompts/task-management/task-analyze.md',
    'task-review': 'content-library/prompts/task-management/task-review.md'
  };
  
  return promptPaths[promptType] || promptPaths['task-create'];
}

function getWorkflowPath(workflowType) {
  return `backend/framework/workflows/${workflowType}-workflows.json`;
}

/**
 * Task Prompt Generation Step
 * Generates comprehensive task creation prompts using content library
 */

const StepBuilder = require('@steps/StepBuilder');
const Logger = require('@logging/Logger');
const fs = require('fs').promises;
const path = require('path');

const logger = new Logger('TaskPromptGenerationStep');

// Step configuration
const config = {
  name: 'TaskPromptGenerationStep',
  type: 'generate',
  category: 'generate',
  description: 'Generate task creation prompts using content library',
  version: '1.0.0',
  dependencies: ['ProjectAnalyzer', 'ContentLibraryService'],
  settings: {
    includeProjectAnalysis: true,
    includeArchitectureContext: true,
    includeDependencies: true,
    timeout: 30000
  },
  validation: {
    required: ['projectId', 'taskData'],
    optional: ['workspacePath', 'promptType']
  }
};

class TaskPromptGenerationStep {
  constructor() {
    this.name = 'TaskPromptGenerationStep';
    this.description = 'Generate task creation prompts using content library';
    this.category = 'generate';
    this.version = '1.0.0';
  }

  static getConfig() {
    return config;
  }

  async execute(context = {}) {
    const config = TaskPromptGenerationStep.getConfig();
    const step = StepBuilder.build(config, context);
    
    try {
      logger.info('Starting TaskPromptGenerationStep execution');
      
      // Validate context
      this.validateContext(context);
      
      const { 
        projectId, 
        workspacePath = process.cwd(), 
        taskData, 
        promptType = 'task-creation',
        options = {} 
      } = context;

      logger.info(`Generating task prompt for project ${projectId}`, {
        taskTitle: taskData.title,
        promptType,
        includeProjectAnalysis: options.includeProjectAnalysis !== false
      });

      // Get services via dependency injection
      const projectAnalyzer = context.getService('ProjectAnalyzer');
      const contentLibraryService = context.getService('ContentLibraryService');
      
      if (!projectAnalyzer) {
        throw new Error('ProjectAnalyzer not available in context');
      }

      // Step 1: Load prompt template from content library
      const promptTemplate = await this.loadPromptTemplate(promptType, contentLibraryService);
      
      // Step 2: Get project analysis if requested
      let projectAnalysis = '';
      if (options.includeProjectAnalysis !== false) {
        projectAnalysis = await this.getProjectAnalysis(projectAnalyzer, workspacePath, options);
      }

      // Step 3: Generate the final prompt
      const finalPrompt = await this.generateFinalPrompt(
        promptTemplate, 
        taskData, 
        projectAnalysis, 
        options
      );

      logger.info('Task prompt generated successfully', {
        promptLength: finalPrompt.length,
        hasProjectAnalysis: projectAnalysis.length > 0
      });

      return {
        success: true,
        message: 'Task prompt generated successfully',
        data: {
          prompt: finalPrompt,
          promptType,
          taskData,
          projectAnalysis: projectAnalysis.length > 0 ? 'included' : 'excluded',
          promptLength: finalPrompt.length,
          generatedAt: new Date()
        }
      };

    } catch (error) {
      logger.error('Failed to generate task prompt:', error);
      
      return {
        success: false,
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  /**
   * Load prompt template from content library
   */
  async loadPromptTemplate(promptType, contentLibraryService) {
    try {
      // Define prompt paths based on type
      const promptPaths = {
        'task-creation': '{{promptPath("task-create")}}',
        'quick-task': '{{promptPath("task-create")}}',
        'advanced-task': '{{promptPath("task-create")}}'
      };

      const promptPath = promptPaths[promptType] || promptPaths['task-creation'];
      
      // Try to load via content library service first
      if (contentLibraryService) {
        try {
          const content = await contentLibraryService.loadContent(promptPath);
          if (content) {
            logger.info(`Loaded prompt template via ContentLibraryService: ${promptPath}`);
            return content;
          }
        } catch (error) {
          logger.warn(`Failed to load via ContentLibraryService: ${error.message}`);
        }
      }

      // Fallback to direct file system
      const fullPath = path.resolve(process.cwd(), promptPath);
      const content = await fs.readFile(fullPath, 'utf8');
      
      logger.info(`Loaded prompt template from file system: ${promptPath}`);
      return content;

    } catch (error) {
      logger.error(`Failed to load prompt template: ${error.message}`);
      
      // Return a basic fallback template
      return this.getFallbackTemplate();
    }
  }

  /**
   * Get project analysis
   */
  async getProjectAnalysis(projectAnalyzer, workspacePath, options) {
    try {
      logger.info('Getting project analysis for prompt generation');

      const analysisOptions = {
        includeArchitecture: options.includeArchitectureContext !== false,
        includeDependencies: options.includeDependencies !== false,
        includeCodeQuality: true,
        includeSecurity: options.includeSecurityContext !== false,
        includePerformance: options.includePerformanceContext !== false,
        simplified: options.simplified === true
      };

      const analysis = await projectAnalyzer.analyzeProject(workspacePath, analysisOptions);
      
      return this.formatProjectAnalysis(analysis, options);

    } catch (error) {
      logger.warn(`Failed to get project analysis: ${error.message}`);
      return 'Project analysis not available';
    }
  }

  /**
   * Format project analysis for prompt inclusion
   */
  formatProjectAnalysis(analysis, options) {
    try {
      if (options.simplified) {
        return `**Project Context:** ${analysis.summary || 'Standard project structure'}`;
      }

      const sections = [];

      if (analysis.architecture) {
        sections.push(`**Architecture:** ${analysis.architecture.pattern || 'Standard architecture'}`);
      }

      if (analysis.techStack) {
        sections.push(`**Tech Stack:** ${analysis.techStack.join(', ')}`);
      }

      if (analysis.dependencies) {
        sections.push(`**Key Dependencies:** ${analysis.dependencies.slice(0, 5).join(', ')}`);
      }

      if (analysis.codeQuality) {
        sections.push(`**Code Quality:** ${analysis.codeQuality.score || 'Standard'}`);
      }

      return sections.length > 0 ? sections.join('\n') : 'Standard project structure';
      
    } catch (error) {
      logger.warn(`Failed to format project analysis: ${error.message}`);
      return 'Project analysis available but formatting failed';
    }
  }

  /**
   * Generate final prompt by combining template, task data, and analysis
   */
  async generateFinalPrompt(template, taskData, projectAnalysis, options) {
    try {
      const { title, description, category, priority, type, estimatedHours } = taskData;

      // Replace placeholders in template
      let finalPrompt = template
        .replace(/{taskTitle}/g, title || 'New Task')
        .replace(/{taskDescription}/g, description || 'No description provided')
        .replace(/{category}/g, category || 'general')
        .replace(/{priority}/g, priority || 'medium')
        .replace(/{type}/g, type || 'feature')
        .replace(/{estimatedHours}/g, estimatedHours || 'Not specified');

      // Add project analysis section
      if (projectAnalysis && projectAnalysis !== 'Project analysis not available') {
        finalPrompt += `\n\n## Project Context Analysis\n${projectAnalysis}`;
      }

      // Add specific instructions based on options
      if (options.includeArchitectureContext !== false) {
        finalPrompt += `\n\n**IMPORTANT**: Use the project analysis above to:
1. **Leverage existing patterns** - Follow the detected architecture patterns
2. **Respect current structure** - Use the existing folder structure and naming conventions
3. **Consider dependencies** - Account for existing dependencies and tech stack
4. **Follow code standards** - Use the detected linting and formatting rules
5. **Integrate with existing services** - Leverage existing services and utilities`;
      }

      return finalPrompt;

    } catch (error) {
      logger.error(`Failed to generate final prompt: ${error.message}`);
      throw new Error(`Prompt generation failed: ${error.message}`);
    }
  }

  /**
   * Get fallback template if content library is not available
   */
  getFallbackTemplate() {
    return `# Task Implementation Plan

## Task Details
- **Title:** {taskTitle}
- **Description:** {taskDescription}
- **Category:** {category}
- **Priority:** {priority}
- **Type:** {type}
- **Estimated Hours:** {estimatedHours}

## Implementation Requirements
1. Follow existing project architecture and patterns
2. Use current tech stack and dependencies
3. Implement proper error handling and validation
4. Include comprehensive testing strategy
5. Consider security and performance implications
6. Provide clear implementation steps
7. Include file structure and organization
8. Specify integration points with existing services

Please provide a complete, actionable implementation plan in Markdown format.`;
  }

  /**
   * Validate context
   */
  validateContext(context) {
    const { projectId, taskData } = context;
    
    if (!projectId) {
      throw new Error('projectId is required');
    }
    
    if (!taskData || typeof taskData !== 'object') {
      throw new Error('taskData is required and must be an object');
    }
    
    if (!taskData.title && !taskData.description) {
      throw new Error('taskData must contain at least title or description');
    }
  }
}

// Export both the class and a factory function for StepRegistry
module.exports = TaskPromptGenerationStep;
module.exports.default = TaskPromptGenerationStep; 