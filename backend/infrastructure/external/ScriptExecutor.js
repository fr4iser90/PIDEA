/**
 * ScriptExecutor - Executes scripts with proper error handling and output capture
 */
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const { logger } = require('@infrastructure/logging/Logger');

class ScriptExecutor {
    constructor(dependencies = {}) {
        this.logger = dependencies.logger || console;
        this.eventBus = dependencies.eventBus;
    }

    /**
     * Execute a script with proper error handling
     * @param {string} script - Script content or command
     * @param {Object} options - Execution options
     * @returns {Promise<Object>} Execution result
     */
    async executeScript(script, options = {}) {
        const {
            workingDirectory = process.cwd(),
            timeout = 300000, // 5 minutes default
            environment = {},
            captureOutput = true,
            shell = true
        } = options;

        const executionId = `script_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const startTime = Date.now();

        try {
            this.logger.info('ScriptExecutor: Starting script execution', {
                executionId,
                workingDirectory,
                timeout
            });

            // Determine if script is a file path or content
            const isFilePath = await this.isScriptFile(script);
            const command = isFilePath ? script : this.createTemporaryScript(script, workingDirectory);

            // Execute the script
            const result = await this.executeCommand(command, {
                workingDirectory,
                timeout,
                environment,
                captureOutput,
                shell,
                executionId
            });

            const duration = Date.now() - startTime;

            // Clean up temporary file if created
            if (!isFilePath && command !== script) {
                await this.cleanupTemporaryScript(command);
            }

            this.logger.info('ScriptExecutor: Script execution completed', {
                executionId,
                duration,
                exitCode: result.exitCode
            });

            return {
                ...result,
                executionId,
                duration,
                workingDirectory
            };

        } catch (error) {
            const duration = Date.now() - startTime;
            
            this.logger.error('ScriptExecutor: Script execution failed', {
                executionId,
                duration,
                error: error.message
            });

            return {
                executionId,
                exitCode: -1,
                stdout: '',
                stderr: error.message,
                duration,
                error: error.message,
                workingDirectory
            };
        }
    }

    /**
     * Execute a command with proper process management
     * @param {string} command - Command to execute
     * @param {Object} options - Execution options
     * @returns {Promise<Object>} Execution result
     */
    async executeCommand(command, options = {}) {
        const {
            workingDirectory,
            timeout,
            environment,
            captureOutput,
            shell,
            executionId
        } = options;

        return new Promise((resolve, reject) => {
            let stdout = '';
            let stderr = '';
            let killed = false;

            // Set up environment
            const env = { ...process.env, ...environment };

            // Spawn the process
            const child = spawn(command, [], {
                cwd: workingDirectory,
                env,
                shell,
                stdio: captureOutput ? ['pipe', 'pipe', 'pipe'] : 'inherit'
            });

            // Set up timeout
            const timeoutId = setTimeout(() => {
                killed = true;
                child.kill('SIGTERM');
                reject(new Error(`Script execution timed out after ${timeout}ms`));
            }, timeout);

            // Capture output
            if (captureOutput) {
                child.stdout.on('data', (data) => {
                    stdout += data.toString();
                });

                child.stderr.on('data', (data) => {
                    stderr += data.toString();
                });
            }

            // Handle process completion
            child.on('close', (code) => {
                clearTimeout(timeoutId);
                
                if (killed) {
                    return; // Already handled by timeout
                }

                resolve({
                    exitCode: code,
                    stdout: stdout.trim(),
                    stderr: stderr.trim(),
                    killed
                });
            });

            // Handle process errors
            child.on('error', (error) => {
                clearTimeout(timeoutId);
                reject(error);
            });

            // Publish execution started event
            if (this.eventBus) {
                this.eventBus.publish('script.execution.started', {
                    executionId,
                    command,
                    workingDirectory,
                    timestamp: new Date()
                });
            }
        });
    }

    /**
     * Check if script is a file path
     * @param {string} script - Script content or path
     * @returns {Promise<boolean>} True if it's a file path
     */
    async isScriptFile(script) {
        try {
            await fs.access(script);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Create a temporary script file
     * @param {string} scriptContent - Script content
     * @param {string} workingDirectory - Working directory
     * @returns {string} Path to temporary script
     */
    async createTemporaryScript(scriptContent, workingDirectory) {
        const tempFileName = `temp_script_${Date.now()}.sh`;
        const tempFilePath = path.join(workingDirectory, tempFileName);

        // Add shebang if not present
        const content = scriptContent.startsWith('#!') 
            ? scriptContent 
            : `#!/bin/bash\n${scriptContent}`;

        await fs.writeFile(tempFilePath, content, { mode: 0o755 });
        return tempFilePath;
    }

    /**
     * Clean up temporary script file
     * @param {string} scriptPath - Path to temporary script
     */
    async cleanupTemporaryScript(scriptPath) {
        try {
            await fs.unlink(scriptPath);
        } catch (error) {
            this.logger.warn('ScriptExecutor: Failed to cleanup temporary script', {
                scriptPath,
                error: error.message
            });
        }
    }

    /**
     * Execute npm script
     * @param {string} scriptName - NPM script name
     * @param {Object} options - Execution options
     * @returns {Promise<Object>} Execution result
     */
    async executeNpmScript(scriptName, options = {}) {
        return this.executeScript(`npm run ${scriptName}`, options);
    }

    /**
     * Execute yarn script
     * @param {string} scriptName - Yarn script name
     * @param {Object} options - Execution options
     * @returns {Promise<Object>} Execution result
     */
    async executeYarnScript(scriptName, options = {}) {
        return this.executeScript(`yarn ${scriptName}`, options);
    }

    /**
     * Execute build script
     * @param {Object} options - Execution options
     * @returns {Promise<Object>} Execution result
     */
    async executeBuildScript(options = {}) {
        return this.executeScript('npm run build', options);
    }

    /**
     * Execute test script
     * @param {Object} options - Execution options
     * @returns {Promise<Object>} Execution result
     */
    async executeTestScript(options = {}) {
        return this.executeScript('npm test', options);
    }

    /**
     * Execute lint script
     * @param {Object} options - Execution options
     * @returns {Promise<Object>} Execution result
     */
    async executeLintScript(options = {}) {
        return this.executeScript('npm run lint', options);
    }

    /**
     * Execute format script
     * @param {Object} options - Execution options
     * @returns {Promise<Object>} Execution result
     */
    async executeFormatScript(options = {}) {
        return this.executeScript('npm run format', options);
    }

    /**
     * Execute clean script
     * @param {Object} options - Execution options
     * @returns {Promise<Object>} Execution result
     */
    async executeCleanScript(options = {}) {
        return this.executeScript('npm run clean', options);
    }

    /**
     * Execute dev script
     * @param {Object} options - Execution options
     * @returns {Promise<Object>} Execution result
     */
    async executeDevScript(options = {}) {
        return this.executeScript('npm run dev', options);
    }

    /**
     * Execute start script
     * @param {Object} options - Execution options
     * @returns {Promise<Object>} Execution result
     */
    async executeStartScript(options = {}) {
        return this.executeScript('npm start', options);
    }

    /**
     * Get available scripts from package.json
     * @param {string} projectPath - Project path
     * @returns {Promise<Object>} Available scripts
     */
    async getAvailableScripts(projectPath) {
        try {
            const packageJsonPath = path.join(projectPath, 'package.json');
            const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
            return packageJson.scripts || {};
        } catch (error) {
            this.logger.warn('ScriptExecutor: Failed to read package.json scripts', {
                projectPath,
                error: error.message
            });
            return {};
        }
    }

    /**
     * Validate script execution
     * @param {Object} result - Execution result
     * @returns {boolean} True if execution was successful
     */
    validateExecution(result) {
        return result.exitCode === 0 && !result.error;
    }

    /**
     * Get execution summary
     * @param {Object} result - Execution result
     * @returns {Object} Execution summary
     */
    getExecutionSummary(result) {
        return {
            success: this.validateExecution(result),
            exitCode: result.exitCode,
            duration: result.duration,
            outputLength: result.stdout?.length || 0,
            errorLength: result.stderr?.length || 0,
            hasError: !!result.error || result.exitCode !== 0
        };
    }
}

module.exports = ScriptExecutor; 