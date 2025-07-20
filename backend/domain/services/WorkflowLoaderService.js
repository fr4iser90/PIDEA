/**
 * WorkflowLoaderService - Lädt und verwaltet JSON-Workflow-Definitionen
 */
const fs = require('fs').promises;
const path = require('path');
const Logger = require('@logging/Logger');

class WorkflowLoaderService {
    constructor() {
        this.logger = new Logger('WorkflowLoaderService');
        this.workflows = new Map();
        this.workflowsPath = path.join(__dirname, '../../framework/workflows/task-workflows.json');
        this.promptsPath = path.join(__dirname, '../../framework/prompts');
    }

    /**
     * Load all workflows from JSON file
     */
    async loadWorkflows() {
        try {
            this.logger.info('Loading workflows from JSON file...');
            
            const workflowsData = await fs.readFile(this.workflowsPath, 'utf8');
            const workflowsConfig = JSON.parse(workflowsData);
            
            // Load workflows
            for (const [workflowId, workflow] of Object.entries(workflowsConfig.workflows)) {
                this.workflows.set(workflowId, workflow);
                this.logger.info(`Loaded workflow: ${workflowId} - ${workflow.name}`);
            }
            
            // Store task type mapping
            this.taskTypeMapping = workflowsConfig.taskTypeMapping || {};
            
            // Store prompts
            this.prompts = workflowsConfig.prompts || {};
            
            this.logger.info(`Successfully loaded ${this.workflows.size} workflows`);
            return true;
            
        } catch (error) {
            this.logger.error('Failed to load workflows:', error);
            throw error;
        }
    }

    /**
     * Get workflow by ID
     */
    getWorkflow(workflowId) {
        const workflow = this.workflows.get(workflowId);
        if (!workflow) {
            throw new Error(`Workflow not found: ${workflowId}`);
        }
        return this.resolveWorkflow(workflow);
    }

    /**
     * Get workflow by task type
     */
    getWorkflowByTaskType(taskType) {
        const workflowId = this.taskTypeMapping[taskType] || this.taskTypeMapping.default;
        return this.getWorkflow(workflowId);
    }

    /**
     * Resolve workflow inheritance (extends)
     */
    resolveWorkflow(workflow) {
        if (!workflow.extends) {
            return workflow;
        }

        const baseWorkflow = this.workflows.get(workflow.extends);
        if (!baseWorkflow) {
            throw new Error(`Base workflow not found: ${workflow.extends}`);
        }

        // Resolve base workflow first
        const resolvedBase = this.resolveWorkflow(baseWorkflow);

        // Merge workflows
        return {
            ...resolvedBase,
            ...workflow,
            steps: [
                ...(resolvedBase.steps || []),
                ...(workflow.steps || [])
            ]
        };
    }

    /**
     * Get prompt by name
     */
    getPrompt(promptName) {
        const prompt = this.prompts[promptName];
        if (!prompt) {
            throw new Error(`Prompt not found: ${promptName}`);
        }
        return prompt;
    }

    /**
     * Replace placeholders in prompt
     */
    formatPrompt(promptName, data) {
        let prompt = this.getPrompt(promptName);
        
        // Replace placeholders
        for (const [key, value] of Object.entries(data)) {
            prompt = prompt.replace(new RegExp(`{${key}}`, 'g'), value);
        }
        
        return prompt;
    }

    /**
     * Format prompt for step execution
     */
    formatPromptForStep(step, taskData) {
        if (!step.options?.message) {
            return null;
        }

        const promptName = step.options.message;
        return this.formatPrompt(promptName, {
            taskTitle: taskData.title || 'Task',
            taskDescription: taskData.description || 'No description provided'
        });
    }

    /**
     * Get all available workflows
     */
    getAllWorkflows() {
        return Array.from(this.workflows.entries()).map(([id, workflow]) => ({
            id,
            name: workflow.name,
            description: workflow.description
        }));
    }

    /**
     * Get all available task types
     */
    getAvailableTaskTypes() {
        return Object.keys(this.taskTypeMapping);
    }

    /**
     * Validate workflow configuration
     */
    validateWorkflow(workflow) {
        const errors = [];

        if (!workflow.name) {
            errors.push('Workflow must have a name');
        }

        if (!workflow.steps || !Array.isArray(workflow.steps)) {
            errors.push('Workflow must have steps array');
        }

        for (const step of workflow.steps || []) {
            if (!step.name) {
                errors.push('Step must have a name');
            }
            if (!step.type) {
                errors.push(`Step ${step.name} must have a type`);
            }
        }

        return errors;
    }

    /**
     * Reload workflows from file
     */
    async reloadWorkflows() {
        this.workflows.clear();
        return await this.loadWorkflows();
    }
}

module.exports = WorkflowLoaderService; 